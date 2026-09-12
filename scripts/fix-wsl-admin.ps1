# Anonimus - elevated WSL repair. MUST run as Administrator (UAC).
# Steps: stop Docker cleanly -> restart WSLService -> upgrade WSL platform ->
#        start service -> reset WSL -> write status to project log.
$ErrorActionPreference = 'Continue'
$log = 'C:\Users\USER\OneDrive\Documents\Anonimus\.tmp\fix-wsl-admin.log'
Start-Transcript -Path $log -Force

Write-Host '== 1/5 Stopping Docker Desktop (it depends on WSL) =='
Stop-Process -Name 'Docker Desktop','com.docker.backend','com.docker.build','com.docker.dev-envs' -Force -ErrorAction SilentlyContinue
Stop-Service -Name 'com.docker.service' -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

Write-Host '== 2/5 Restarting WSLService =='
Stop-Service -Name 'WSLService' -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3
Get-Service WSLService | Format-List Name,Status

Write-Host '== 3/5 Upgrading WSL platform (admin) =='
winget upgrade --id Microsoft.WSL --source winget --accept-source-agreements --accept-package-agreements --silent
Write-Host "winget exit: $LASTEXITCODE"
# Belt and braces: direct update from System32 binary in admin context
& "$env:SystemRoot\System32\wsl.exe" --update
Write-Host "wsl --update exit: $LASTEXITCODE"

Write-Host '== 4/5 Starting WSLService =='
Start-Service -Name 'WSLService' -ErrorAction Continue
Start-Sleep -Seconds 3
Get-Service WSLService | Format-List Name,Status

Write-Host '== 5/5 Reset WSL and show status =='
& "$env:SystemRoot\System32\wsl.exe" --shutdown
Start-Sleep -Seconds 3
& "$env:SystemRoot\System32\wsl.exe" --status
Write-Host "wsl --status exit: $LASTEXITCODE"
& "$env:SystemRoot\System32\wsl.exe" -l -v
Write-Host 'DONE - you can close this window.'
Stop-Transcript
