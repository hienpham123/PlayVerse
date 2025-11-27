# Script hoàn chỉnh để fix lỗi client
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   FIX CLIENT - Complete Solution" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "$PSScriptRoot\client"

# Bước 1: Dừng tất cả process node
Write-Host "[1/5] Stopping all node processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "Done!" -ForegroundColor Green

# Bước 2: Xóa node_modules và package-lock.json
Write-Host "[2/5] Removing node_modules and package-lock.json..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force node_modules
    Write-Host "Removed node_modules" -ForegroundColor Green
}
if (Test-Path "package-lock.json") {
    Remove-Item -Force package-lock.json
    Write-Host "Removed package-lock.json" -ForegroundColor Green
}
Write-Host "Done!" -ForegroundColor Green

# Bước 3: Clear npm cache
Write-Host "[3/5] Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force
Write-Host "Done!" -ForegroundColor Green

# Bước 4: Cài đặt lại dependencies
Write-Host "[4/5] Installing dependencies..." -ForegroundColor Yellow
Write-Host "This will take 3-5 minutes, please wait..." -ForegroundColor Gray
npm install --legacy-peer-deps

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "First install failed, trying alternative method..." -ForegroundColor Yellow
    npm install
}

# Bước 5: Kiểm tra và fix cross-spawn
Write-Host "[5/5] Verifying cross-spawn..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules\cross-spawn\lib\enoent.js")) {
    Write-Host "cross-spawn is broken, reinstalling..." -ForegroundColor Red
    npm install cross-spawn@7.0.3 --save-dev --force
}

if (Test-Path "node_modules\cross-spawn\lib\enoent.js") {
    Write-Host "cross-spawn verified!" -ForegroundColor Green
} else {
    Write-Host "WARNING: cross-spawn still has issues" -ForegroundColor Red
    Write-Host "Trying to install specific version..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules\cross-spawn" -ErrorAction SilentlyContinue
    npm install cross-spawn@7.0.3 --save-dev
}

Set-Location "$PSScriptRoot"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Fix Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Now try running: cd client && npm start" -ForegroundColor Cyan
Write-Host ""

