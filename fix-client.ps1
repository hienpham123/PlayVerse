# Script để fix lỗi client dependencies
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Fixing Client Dependencies" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "$PSScriptRoot\client"

Write-Host "[1/3] Removing old node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force node_modules
    Write-Host "Removed!" -ForegroundColor Green
} else {
    Write-Host "Not found, skipping..." -ForegroundColor Gray
}

Write-Host "[2/3] Removing package-lock.json..." -ForegroundColor Yellow
if (Test-Path "package-lock.json") {
    Remove-Item -Force package-lock.json
    Write-Host "Removed!" -ForegroundColor Green
} else {
    Write-Host "Not found, skipping..." -ForegroundColor Gray
}

Write-Host "[3/3] Installing dependencies..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   Dependencies installed successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now run: npm start" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "   Installation failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try running: npm cache clean --force" -ForegroundColor Yellow
    Write-Host "Then run this script again." -ForegroundColor Yellow
}

Set-Location "$PSScriptRoot"

