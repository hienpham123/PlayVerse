# Script để kill process đang dùng port
param(
    [int]$Port = 2023
)

Write-Host "Checking port $Port..." -ForegroundColor Yellow

$connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue

if ($connection) {
    $processId = $connection.OwningProcess | Select-Object -Unique
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    
    if ($process) {
        Write-Host "Found process: $($process.ProcessName) (PID: $processId)" -ForegroundColor Red
        Write-Host "Killing process..." -ForegroundColor Yellow
        Stop-Process -Id $processId -Force
        Write-Host "Process killed successfully!" -ForegroundColor Green
        Start-Sleep -Seconds 1
    }
} else {
    Write-Host "No process found on port $Port" -ForegroundColor Green
}

