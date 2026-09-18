$ErrorActionPreference = "Stop"
$repository = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node -ErrorAction Stop).Source
$environmentFile = Join-Path $repository ".env.local"
$serverFile = Join-Path $repository "server\agent.mjs"
$taskName = "Kitchen CAD Sync Server"

if (-not (Test-Path -LiteralPath (Join-Path $repository ".env.local"))) {
  Push-Location $repository
  try {
    & npm run sync:init
  } finally {
    Pop-Location
  }
}

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
  Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
}

$action = New-ScheduledTaskAction `
  -Execute $node `
  -Argument "--no-warnings `"--env-file=$environmentFile`" `"$serverFile`"" `
  -WorkingDirectory $repository
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Runs the local Kitchen CAD SQLite API and its automatic Cloudflare Quick Tunnel." `
  -Force | Out-Null

Start-ScheduledTask -TaskName $taskName
Write-Output "Installed and started scheduled task: $taskName"
