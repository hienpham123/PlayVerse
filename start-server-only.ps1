# Script chỉ khởi động server
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Starting Server Only" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kiểm tra xem server đã chạy chưa
$server = netstat -ano | Select-String ":2023.*LISTENING"
if ($server) {
    Write-Host "✅ Server đã đang chạy trên port 2023" -ForegroundColor Green
    Write-Host ""
    Write-Host "Kiểm tra kết nối..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:2023/api/health" -UseBasicParsing -TimeoutSec 2
        Write-Host "✅ Server hoạt động bình thường!" -ForegroundColor Green
        Write-Host "Response: $($response.Content)" -ForegroundColor Gray
    } catch {
        Write-Host "⚠️ Server đang chạy nhưng không phản hồi" -ForegroundColor Yellow
        Write-Host "Có thể cần restart server" -ForegroundColor Yellow
    }
    Write-Host ""
    exit 0
}

# Kill process cũ nếu có
Write-Host "[1/2] Checking for old processes..." -ForegroundColor Yellow
$oldProcesses = Get-Process | Where-Object {$_.ProcessName -eq "node"}
if ($oldProcesses) {
    Write-Host "Found $($oldProcesses.Count) node process(es)" -ForegroundColor Gray
}

# Start server
Write-Host "[2/2] Starting Server on port 2023..." -ForegroundColor Yellow
$serverScript = @"
cd '$PSScriptRoot\server'
Write-Host '========================================' -ForegroundColor Green
Write-Host '   GAME BAI SERVER' -ForegroundColor Green
Write-Host '========================================' -ForegroundColor Green
Write-Host ''
Write-Host 'Server starting on port 2023...' -ForegroundColor Cyan
Write-Host 'Access from other devices: http://192.168.3.69:2023' -ForegroundColor Gray
Write-Host ''
node index.js
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $serverScript

Write-Host "Server is starting..." -ForegroundColor Green
Write-Host ""

# Đợi và kiểm tra
Start-Sleep -Seconds 5

$check = netstat -ano | Select-String ":2023.*LISTENING"
if ($check) {
    Write-Host "✅ Server đã khởi động thành công!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Server URL: http://localhost:2023" -ForegroundColor Cyan
    Write-Host "API Health: http://localhost:2023/api/health" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Bây giờ bạn có thể chạy client!" -ForegroundColor Yellow
} else {
    Write-Host "⏳ Server đang khởi động..." -ForegroundColor Yellow
    Write-Host "Kiểm tra cửa sổ PowerShell để xem log" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Nếu có lỗi, kiểm tra:" -ForegroundColor Yellow
    Write-Host "  1. Port 2023 có bị chiếm không" -ForegroundColor White
    Write-Host "  2. File server/index.js có tồn tại không" -ForegroundColor White
    Write-Host "  3. Dependencies đã được cài đặt chưa (cd server && npm install)" -ForegroundColor White
}

Write-Host ""

