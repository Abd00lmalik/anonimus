# Anonimus - elevated WSL repair STAGE 2: force-kill the deadlocked
# WSLService host, start the freshly upgraded service, verify WSL, restart Docker.
$ErrorActionPreference = 'Continue'
$log = 'C:\Users\USER\OneDrive\Documents\Anonimus\.tmp\fix-wsl-stage2.log'
Start-Transcript -Path $log -Force
$wsl = "$env:SystemRoot\System32\wsl.exe"

Write-Host '== 1/4 Force-killing deadlocked wslservice.exe =='
taskkill /F /IM wslservice.exe 2>&1
Start-Sleep -Seconds 3
Get-Service WSLService | Format-List Name,Status

Write-Host '== 2/4 Starting WSLService (fresh 2.7.13 binary) =='
Start-Service -Name 'WSLService' -ErrorAction Continue
Start-Sleep -Seconds 5
Get-Service WSLService | Format-List Name,Status

Write-Host '== 3/4 Verify WSL =='
& $wsl --version
Write-Host "version exit: $LASTEXITCODE"
& $wsl --status
Write-Host "status exit: $LASTEXITCODE"
& $wsl -l -v
Write-Host "list exit: $LASTEXITCODE"

Write-Host '== 4/4 Starting Docker Desktop =='
Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe' -ErrorAction Continue
Write-Host 'DONE - you can close this window.'
Stop-Transcript
