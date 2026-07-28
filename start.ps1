# Start CallFlow AI (API + Dashboard)
Write-Host "`n  Starting CallFlow AI...`n" -ForegroundColor Cyan

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

# Free ports if stuck from a previous run
foreach ($port in 3000, 3001) {
  $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn) {
    Write-Host "  Stopping old process on port $port..." -ForegroundColor Yellow
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
  }
}

Write-Host "  Dashboard will be at: http://localhost:3000/dashboard" -ForegroundColor Green
Write-Host "  API will be at:       http://localhost:3001`n" -ForegroundColor Green

npm run dev:all
