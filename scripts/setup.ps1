# Windows wrapper: powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
$ErrorActionPreference = "Stop"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host "Node 20+ is required: https://nodejs.org  (winget install OpenJS.NodeJS.LTS)"; exit 1 }
node "$PSScriptRoot\setup.mjs" @args
