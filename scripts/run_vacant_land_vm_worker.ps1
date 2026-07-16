param(
  [string]$RepoRoot = "C:\srv\GISWebApp\land_redevelopment_dashboard",
  [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot ".git"))) {
  throw "Worker repository not found: $RepoRoot"
}

Write-Host "Updating the data worker to origin/$Branch..."
git -C $RepoRoot pull --ff-only origin $Branch
if ($LASTEXITCODE -ne 0) { throw "Worker update failed with exit code $LASTEXITCODE." }

$refreshScript = Join-Path $RepoRoot "scripts\refresh_vacant_land_dashboard.ps1"
if (-not (Test-Path -LiteralPath $refreshScript)) {
  throw "Refresh script not found after update: $refreshScript"
}

Write-Host "Starting the fail-closed data refresh..."
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $refreshScript -RepoRoot $RepoRoot -Branch $Branch
if ($LASTEXITCODE -ne 0) { throw "Data refresh failed with exit code $LASTEXITCODE." }
