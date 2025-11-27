# Script chuyên fix lỗi cross-spawn
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   FIX CROSS-SPAWN ERROR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "$PSScriptRoot\client"

# Kiểm tra xem file có tồn tại không
$enoentPath = "node_modules\cross-spawn\lib\enoent.js"
if (Test-Path $enoentPath) {
    Write-Host "File exists, but still getting error. Reinstalling..." -ForegroundColor Yellow
}

# Xóa cross-spawn
Write-Host "[1/3] Removing cross-spawn..." -ForegroundColor Yellow
if (Test-Path "node_modules\cross-spawn") {
    Remove-Item -Recurse -Force "node_modules\cross-spawn" -ErrorAction SilentlyContinue
    Write-Host "Removed!" -ForegroundColor Green
}

# Xóa react-dev-utils để cài lại
Write-Host "[2/3] Removing react-dev-utils..." -ForegroundColor Yellow
if (Test-Path "node_modules\react-dev-utils") {
    Remove-Item -Recurse -Force "node_modules\react-dev-utils" -ErrorAction SilentlyContinue
    Write-Host "Removed!" -ForegroundColor Green
}

# Cài đặt lại cross-spawn với version cụ thể
Write-Host "[3/3] Installing cross-spawn@7.0.3..." -ForegroundColor Yellow
npm install cross-spawn@7.0.3 --save-dev --no-save --force

# Kiểm tra lại
Start-Sleep -Seconds 2
if (Test-Path $enoentPath) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   SUCCESS! cross-spawn is fixed!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Now you can run: npm start" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "   Still having issues..." -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Trying alternative: Reinstalling react-dev-utils..." -ForegroundColor Yellow
    npm install react-dev-utils@^11.0.4 --save-dev --no-save --force
    
    Start-Sleep -Seconds 2
    if (Test-Path $enoentPath) {
        Write-Host "SUCCESS after reinstalling react-dev-utils!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Please try:" -ForegroundColor Yellow
        Write-Host "  1. Delete node_modules completely" -ForegroundColor White
        Write-Host "  2. Run: npm install --legacy-peer-deps" -ForegroundColor White
        Write-Host "  3. Or run: .\fix-client-complete.ps1" -ForegroundColor White
    }
}

Set-Location "$PSScriptRoot"

