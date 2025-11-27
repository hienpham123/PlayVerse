@echo off
echo ========================================
echo    GAME BAI ONLINE - Starting...
echo ========================================
echo.

echo [0/2] Checking and killing old processes on port 2023...
powershell -Command "& { $conn = Get-NetTCPConnection -LocalPort 2023 -ErrorAction SilentlyContinue; if ($conn) { $pid = $conn.OwningProcess | Select-Object -Unique; Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue; Write-Host 'Killed old process' } }"

timeout /t 2 /nobreak >nul

echo [1/2] Starting Server on port 2023...
start "Game Bai Server" cmd /k "cd server && node index.js"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Client on port 1999...
start "Game Bai Client" cmd /k "cd client && npm start"

echo.
echo ========================================
echo    Servers are starting...
echo ========================================
echo.
echo Server: http://localhost:2023
echo Client: http://localhost:1999
echo.
echo From other devices: http://YOUR_IP:1999
echo.
echo Press any key to exit this window...
echo (Servers will continue running in separate windows)
pause >nul

