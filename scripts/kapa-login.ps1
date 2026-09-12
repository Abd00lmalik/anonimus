# One-shot Kapa MCP login helper for Anonimus.
# Generates a fresh login URL, opens it in the default browser, then waits for
# the OAuth callback and stores tokens in .env. Re-run any time; safe to repeat.
# Usage: powershell -ExecutionPolicy Bypass -File scripts/kapa-login.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Generating fresh Kapa login URL..." -ForegroundColor Cyan
node scripts/kapa-auth.mjs url
$url = (Get-Content .kapa-login-url.txt -Raw).Trim()

Write-Host ""
Write-Host "Opening browser for Kapa sign-in..." -ForegroundColor Cyan
Start-Process $url

Write-Host ""
Write-Host "Waiting for the login callback (up to 9 minutes)..." -ForegroundColor Cyan
Write-Host "Complete the Google/GitHub sign-in in the browser window that just opened."
node scripts/kapa-auth.mjs wait

if (Test-Path .env) {
    $envContent = Get-Content .env -Raw
    if ($envContent -match "KAPA_MCP_ACCESS_TOKEN") {
        Write-Host ""
        Write-Host "SUCCESS: Kapa MCP tokens stored in .env" -ForegroundColor Green
    }
}
