# Script để chạy server và client, sau đó kiểm tra
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Starting Server and Client" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kill old processes
Write-Host "[1/3] Stopping old processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start Server
Write-Host "[2/3] Starting Server on port 2023..." -ForegroundColor Yellow
$serverScript = @"
cd '$PSScriptRoot\server'
Write-Host 'Server running on port 2023...' -ForegroundColor Green
node index.js
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $serverScript

Start-Sleep -Seconds 3

# Start Client
Write-Host "[3/3] Starting Client on port 1999..." -ForegroundColor Yellow
$clientScript = @"
cd '$PSScriptRoot\client'
Write-Host 'Client starting on port 1999...' -ForegroundColor Green
Write-Host 'This may take 30-60 seconds to compile...' -ForegroundColor Gray
`$env:PORT='1999'
npm start
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $clientScript

Write-Host ""
Write-Host "Waiting 20 seconds for servers to start..." -ForegroundColor Gray
Start-Sleep -Seconds 20

# Check status
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Status Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$server = netstat -ano | Select-String ":2023.*LISTENING"
$client = netstat -ano | Select-String ":1999.*LISTENING"

if ($server) {
    Write-Host "✅ Server (port 2023): RUNNING" -ForegroundColor Green
    try {
        $health = Invoke-WebRequest -Uri "http://localhost:2023/api/health" -UseBasicParsing -TimeoutSec 2
        Write-Host "   Health check: OK" -ForegroundColor Green
    } catch {
        Write-Host "   Health check: Failed (may still be starting)" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Server (port 2023): NOT RUNNING" -ForegroundColor Red
}

if ($client) {
    Write-Host "✅ Client (port 1999): RUNNING" -ForegroundColor Green
} else {
    Write-Host "⏳ Client (port 1999): Starting..." -ForegroundColor Yellow
    Write-Host "   (May take 30-60 seconds to compile)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Access Game" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Open your browser and go to:" -ForegroundColor White
Write-Host "  http://localhost:1999" -ForegroundColor Cyan
Write-Host ""
Write-Host "From other devices (same WiFi):" -ForegroundColor White
Write-Host "  http://192.168.3.69:1999" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Check the PowerShell windows for detailed logs." -ForegroundColor Gray
Write-Host ""

