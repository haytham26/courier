# Runs the GitHub CLI with the token from .env.local.
# The token is read at runtime and never printed, logged or committed.
#
#   powershell -ExecutionPolicy Bypass -File scripts\gh.ps1 pr list
$ErrorActionPreference = "Stop"

$envFile = Join-Path $PSScriptRoot "..\.env.local"
if (-not (Test-Path -LiteralPath $envFile)) {
    throw "No .env.local found (expected $envFile)"
}

$line = Get-Content -LiteralPath $envFile | Where-Object { $_ -match "^\s*GITHUB_TOKEN\s*=" } | Select-Object -First 1
if (-not $line) {
    throw "GITHUB_TOKEN is not set in .env.local"
}

$env:GH_TOKEN = ($line -split "=", 2)[1].Trim()
if (-not $env:GH_TOKEN) {
    throw "GITHUB_TOKEN is empty in .env.local"
}

& gh @args
exit $LASTEXITCODE
