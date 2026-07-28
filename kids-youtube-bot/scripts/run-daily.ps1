# Run once: create video + upload to YouTube (used by Task Scheduler)
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectRoot

# Ensure Node is on PATH for scheduled tasks
$env:Path = "$env:ProgramFiles\nodejs;$env:Path"

npm run run 2>&1 | Tee-Object -FilePath (Join-Path $ProjectRoot "logs\task-run.log") -Append
