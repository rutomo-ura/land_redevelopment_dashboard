param(
  [string]$RepoRoot = "C:\srv\GISWebApp\land_redevelopment_dashboard",
  [string]$Python = "$RepoRoot\.venv\Scripts\python.exe",
  [string]$Psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe",
  [string]$LogRoot = "C:\srv\logs\land-redevelopment-dashboard",
  [string]$Branch = "main",
  [string]$StatusPath = ""
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $RepoRoot

New-Item -ItemType Directory -Force -Path $LogRoot | Out-Null
$runDate = Get-Date -Format "yyyy-MM-dd"
$logPath = Join-Path $LogRoot "daily-refresh-$runDate.log"
$datedStatusPath = Join-Path $LogRoot "daily-refresh-status-$runDate.json"
if (-not $StatusPath) { $StatusPath = Join-Path $LogRoot "daily-refresh-status.json" }

$startedAt = Get-Date
$currentStage = "initializing"
$outcome = "failed"
$message = ""
$commitBefore = ""
$commitAfter = ""
$publishedDataChanges = $false
$parcelCount = $null
$publishPaths = @("docs/data", "webmap/data", "docs/latest_ownership_qa.md")

function Get-GitCommit {
  $commit = git rev-parse HEAD 2>$null
  if ($LASTEXITCODE -eq 0) { return ($commit | Select-Object -First 1) }
  return ""
}

function Write-RunStatus {
  param([string]$Status, [string]$Outcome, [string]$Message = "", [string]$FailedStage = "")
  $finishedAt = Get-Date
  $payload = [ordered]@{
    schema_version = 1
    app = "vacant-land-redevelopment-explorer"
    status = $Status
    outcome = $Outcome
    run_date = $runDate
    started_at = $startedAt.ToString("o")
    finished_at = $finishedAt.ToString("o")
    duration_seconds = [math]::Round(($finishedAt - $startedAt).TotalSeconds, 3)
    repo_root = $RepoRoot
    branch = $Branch
    commit_before = $commitBefore
    commit_after = $commitAfter
    parcel_count = $parcelCount
    published_data_changes = $publishedDataChanges
    log_path = $logPath
    failed_stage = $FailedStage
    message = $Message
  }
  $json = $payload | ConvertTo-Json -Depth 4
  Set-Content -LiteralPath $StatusPath -Value $json -Encoding UTF8
  Set-Content -LiteralPath $datedStatusPath -Value $json -Encoding UTF8
}

function Invoke-Checked {
  param([string]$Label, [scriptblock]$Command)
  $script:currentStage = $Label
  Write-Host "[$(Get-Date -Format o)] Starting: $Label"
  & $Command
  if ($LASTEXITCODE -ne 0) { throw "$Label failed with exit code $LASTEXITCODE" }
  Write-Host "[$(Get-Date -Format o)] Finished: $Label"
}

Start-Transcript -Path $logPath -Append | Out-Null
try {
  $commitBefore = Get-GitCommit

  if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
      if ($_ -match "^\s*#" -or $_ -notmatch "=") { return }
      $name, $value = $_ -split "=", 2
      [Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim(), "Process")
    }
  }
  $env:REQUIRE_POSTGRES_EPP = "1"

  $trackedDataChanges = git status --porcelain --untracked-files=no -- $publishPaths
  if ($trackedDataChanges) { throw "Published data paths are not clean; refusing automated refresh." }

  Invoke-Checked "Pull latest repository changes" { git pull --ff-only origin $Branch }

  if (-not (Test-Path -LiteralPath $Python)) {
    $launcher = Get-Command py -ErrorAction SilentlyContinue
    if ($launcher) { & py -3 -m venv (Join-Path $RepoRoot ".venv") }
    else { & python -m venv (Join-Path $RepoRoot ".venv") }
    if ($LASTEXITCODE -ne 0) { throw "Python virtual environment creation failed." }
  }
  if (-not (Test-Path -LiteralPath $Psql)) {
    $Psql = (Get-Command psql -ErrorAction Stop).Source
  }

  Invoke-Checked "Install refresh requirements" {
    & $Python -m pip install --disable-pip-version-check -r requirements-vacant-land-refresh.txt
  }
  Invoke-Checked "Export read-only PostgreSQL snapshot" {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\export_postgres_snapshot.ps1 -PsqlPath $Psql -OutDir exports
  }
  Invoke-Checked "Export current Tolemi screening data" {
    & $Python scripts\export_tolemi_building_tax_status.py
  }

  $pliCache = [System.IO.Path]::GetFullPath((Join-Path $RepoRoot "exports\wprdc_condemned_properties.csv"))
  $exportsRoot = [System.IO.Path]::GetFullPath((Join-Path $RepoRoot "exports"))
  if (-not $pliCache.StartsWith($exportsRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "PLI cache resolved outside the repository exports directory."
  }
  Remove-Item -LiteralPath $pliCache -Force -ErrorAction SilentlyContinue

  Invoke-Checked "Build parcel bundle and refresh EPP/PLI" { & $Python scripts\build_public_web_geojson.py }
  Invoke-Checked "Refresh WPRDC boundary assignments" { & $Python scripts\enrich_public_boundaries.py }
  Invoke-Checked "Refresh ownership reference summary" { & $Python scripts\update_ownership_reference_summary.py }
  Invoke-Checked "Write refresh manifest" { & $Python scripts\write_refresh_manifest.py --qa-status RUNNING }
  Invoke-Checked "Validate ownership refresh" { & $Python scripts\validate_ownership_refresh.py }
  Invoke-Checked "Validate daily data and freshness" { & $Python scripts\validate_daily_refresh.py --expected-date $runDate }
  Invoke-Checked "Mark refresh manifest passed" { & $Python scripts\write_refresh_manifest.py --qa-status PASS }

  $manifest = Get-Content docs\data\refresh_manifest.json -Raw | ConvertFrom-Json
  $parcelCount = $manifest.parcelCount

  Invoke-Checked "Stage validated dashboard data" {
    git add -- $publishPaths
  }
  $stagedPaths = @(git diff --cached --name-only)
  $unexpectedPaths = @($stagedPaths | Where-Object {
    $_ -ne "docs/latest_ownership_qa.md" -and
    -not $_.StartsWith("docs/data/") -and
    -not $_.StartsWith("webmap/data/")
  })
  if ($unexpectedPaths.Count -gt 0) {
    throw "Refusing to publish staged files outside the data allowlist: $($unexpectedPaths -join ', ')"
  }
  git diff --cached --quiet -- $publishPaths
  if ($LASTEXITCODE -eq 0) {
    $commitAfter = Get-GitCommit
    $outcome = "unchanged"
    $message = "Daily refresh and QA passed; published data was unchanged."
    Write-RunStatus -Status "success" -Outcome $outcome -Message $message
    return
  }
  if ($LASTEXITCODE -gt 1) { throw "git diff failed with exit code $LASTEXITCODE" }

  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
  Invoke-Checked "Commit refreshed dashboard data" {
    git commit -m "Refresh vacant land dashboard data $stamp" -- $publishPaths
  }
  Invoke-Checked "Push refreshed dashboard data" { git push origin $Branch }
  $publishedDataChanges = $true
  $commitAfter = Get-GitCommit
  $outcome = "published"
  $message = "Daily refresh and QA passed; changed dashboard data was published."
  Write-RunStatus -Status "success" -Outcome $outcome -Message $message
}
catch {
  $commitAfter = Get-GitCommit
  $message = $_.Exception.Message
  Write-RunStatus -Status "failed" -Outcome "failed" -Message $message -FailedStage $currentStage
  throw
}
finally {
  Stop-Transcript | Out-Null
}
