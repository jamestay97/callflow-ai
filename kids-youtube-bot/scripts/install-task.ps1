# Register a Windows Task Scheduler job for daily automated uploads
param(
    [string]$Time = "09:00",
    [string]$TaskName = "KidsYouTubeBot-DailyUpload"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$RunScript = Join-Path $ProjectRoot "scripts\run-daily.ps1"
$LogsDir = Join-Path $ProjectRoot "logs"

if (-not (Test-Path $RunScript)) {
    Write-Error "Run script not found: $RunScript"
}

New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$RunScript`"" `
    -WorkingDirectory $ProjectRoot

$trigger = New-ScheduledTaskTrigger -Daily -At $Time
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null

Write-Host ""
Write-Host "Scheduled task installed: $TaskName"
Write-Host "Runs daily at: $Time"
Write-Host "Script: $RunScript"
Write-Host ""
Write-Host "Before the first run, complete setup:"
Write-Host "  cd $ProjectRoot"
Write-Host "  npm run setup"
Write-Host "  npm run auth"
Write-Host ""
Write-Host "Test manually: npm run run"
Write-Host "View logs:     logs\automation.log"
Write-Host ""
