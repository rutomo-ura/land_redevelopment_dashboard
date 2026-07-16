param(
  [string]$RepoRoot = "C:\srv\GISWebApp\land_redevelopment_dashboard",
  [string]$TaskName = "Vacant-Land-Daily-Dashboard-Refresh",
  [string]$TaskPath = "\GIS Automations\",
  [string]$StartTime = "07:30",
  [Parameter(Mandatory=$true)][string]$TaskUser,
  [SecureString]$TaskPassword,
  [switch]$PromptForTaskPassword
)

$ErrorActionPreference = "Stop"
$scriptPath = Join-Path $RepoRoot "scripts\refresh_vacant_land_dashboard.ps1"
if (-not (Test-Path -LiteralPath $scriptPath)) { throw "Refresh script not found: $scriptPath" }
if (-not $TaskPassword -and $PromptForTaskPassword) {
  $TaskPassword = Read-Host -AsSecureString "Password for scheduled-task account $TaskUser"
}
if (-not $TaskPassword) { throw "Provide -TaskPassword or -PromptForTaskPassword." }
if ($StartTime -notmatch '^([01]\d|2[0-3]):[0-5]\d$') { throw "StartTime must be HH:mm." }

$normalizedTaskPath = if ($TaskPath.StartsWith("\")) { $TaskPath } else { "\$TaskPath" }
if (-not $normalizedTaskPath.EndsWith("\")) { $normalizedTaskPath = "$normalizedTaskPath\" }
$startAt = [datetime]::ParseExact($StartTime, "HH:mm", $null)
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -RepoRoot `"$RepoRoot`""
$trigger = New-ScheduledTaskTrigger -Daily -At $startAt
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 15) -ExecutionTimeLimit (New-TimeSpan -Hours 2) -MultipleInstances IgnoreNew
$plainPassword = [System.Net.NetworkCredential]::new('', $TaskPassword).Password
try {
  Register-ScheduledTask -TaskName $TaskName -TaskPath $normalizedTaskPath -Action $action -Trigger $trigger -Settings $settings -User $TaskUser -Password $plainPassword -RunLevel Highest -Force | Out-Null
} finally {
  $plainPassword = $null
}

$registered = Get-ScheduledTask -TaskName $TaskName -TaskPath $normalizedTaskPath
if ($registered.Principal.UserId -ne $TaskUser -or $registered.Principal.LogonType -ne "Password") {
  throw "Task principal validation failed."
}
Write-Host "Registered '$normalizedTaskPath$TaskName' daily at $StartTime as $TaskUser."
