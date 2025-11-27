Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   GAME BAI ONLINE - Starting..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/2] Starting Server on port 2023..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\server'; node index.js"

Start-Sleep -Seconds 3

Write-Host "[2/2] Starting Client on port 1999..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\client'; npm start"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Servers are starting..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Server: http://localhost:2023" -ForegroundColor White
Write-Host "Client: http://localhost:1999" -ForegroundColor White
Write-Host ""
Write-Host "From other devices: http://YOUR_IP:1999" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

