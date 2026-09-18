$ErrorActionPreference = "Stop"
$repository = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node -ErrorAction Stop).Source
$environmentFile = Join-Path $repository ".env.local"
$serverFile = Join-Path $PSScriptRoot "agent.mjs"
$dataDirectory = if ($env:LOCALAPPDATA) {
  Join-Path $env:LOCALAPPDATA "KitchenCAD"
} else {
  Join-Path $repository ".local-data"
}
$logFile = Join-Path $dataDirectory "server.log"

New-Item -ItemType Directory -Force -Path $dataDirectory | Out-Null
if (-not (Test-Path -LiteralPath $environmentFile)) {
  throw "Missing $environmentFile. Run npm run sync:init first."
}

Set-Location -LiteralPath $repository
& $node --no-warnings "--env-file=$environmentFile" $serverFile *>> $logFile
