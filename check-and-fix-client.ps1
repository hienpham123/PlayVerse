# Script kiểm tra và fix client
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   KIỂM TRA VÀ FIX CLIENT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "$PSScriptRoot\client"

# Kiểm tra node_modules
Write-Host "[1/5] Kiểm tra node_modules..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "❌ node_modules không tồn tại!" -ForegroundColor Red
    Write-Host "Cần cài đặt: npm install" -ForegroundColor Yellow
    Set-Location "$PSScriptRoot"
    exit 1
}
Write-Host "✅ node_modules tồn tại" -ForegroundColor Green

# Kiểm tra cross-spawn
Write-Host "[2/5] Kiểm tra cross-spawn..." -ForegroundColor Yellow
$enoentPath = "node_modules\cross-spawn\lib\enoent.js"
if (-not (Test-Path $enoentPath)) {
    Write-Host "❌ cross-spawn BỊ HỎNG - đây là nguyên nhân lỗi!" -ForegroundColor Red
    Write-Host "[3/5] Đang fix cross-spawn..." -ForegroundColor Yellow
    
    # Xóa cross-spawn cũ
    if (Test-Path "node_modules\cross-spawn") {
        Remove-Item -Recurse -Force "node_modules\cross-spawn" -ErrorAction SilentlyContinue
    }
    
    # Cài đặt lại
    Write-Host "Đang cài đặt cross-spawn@7.0.3..." -ForegroundColor Gray
    npm install cross-spawn@7.0.3 --save-dev --no-save --force 2>&1 | Out-Null
    
    Start-Sleep -Seconds 2
    
    if (Test-Path $enoentPath) {
        Write-Host "✅ Đã fix cross-spawn!" -ForegroundColor Green
    } else {
        Write-Host "❌ Vẫn lỗi, thử cách khác..." -ForegroundColor Red
        Write-Host "Đang cài đặt lại react-dev-utils..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force "node_modules\react-dev-utils" -ErrorAction SilentlyContinue
        npm install react-dev-utils@^11.0.4 --save-dev --no-save --force 2>&1 | Out-Null
    }
} else {
    Write-Host "✅ cross-spawn OK" -ForegroundColor Green
}

# Kiểm tra react-scripts
Write-Host "[4/5] Kiểm tra react-scripts..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules\react-scripts")) {
    Write-Host "❌ react-scripts không tồn tại!" -ForegroundColor Red
    Write-Host "Cần cài đặt lại: npm install" -ForegroundColor Yellow
} else {
    Write-Host "✅ react-scripts OK" -ForegroundColor Green
}

# Kiểm tra lại cross-spawn
Write-Host "[5/5] Kiểm tra lại cross-spawn..." -ForegroundColor Yellow
if (Test-Path $enoentPath) {
    Write-Host "✅ cross-spawn đã được fix!" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   CLIENT ĐÃ SẴN SÀNG!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Bây giờ bạn có thể chạy:" -ForegroundColor Cyan
    Write-Host "  npm start" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "❌ cross-spawn vẫn bị lỗi!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Cần cài đặt lại toàn bộ:" -ForegroundColor Yellow
    Write-Host "  Remove-Item -Recurse -Force node_modules" -ForegroundColor White
    Write-Host "  npm install --legacy-peer-deps" -ForegroundColor White
    Write-Host ""
    Write-Host "Hoặc chạy: .\fix-client-complete.ps1" -ForegroundColor Yellow
}

Set-Location "$PSScriptRoot"

