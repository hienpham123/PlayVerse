# Script để restart server
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Restarting Game Bai Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kill process on port 2023
Write-Host "[1/2] Killing process on port 2023..." -ForegroundColor Yellow
& "$PSScriptRoot\kill-port.ps1" -Port 2023

Start-Sleep -Seconds 2

# Start server
Write-Host "[2/2] Starting server..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\server"
node index.js

