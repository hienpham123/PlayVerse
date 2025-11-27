# Git push script
Write-Host "=== Initializing Git ===" -ForegroundColor Cyan
if (-not (Test-Path .git)) {
    git init
    Write-Host "Git repository initialized" -ForegroundColor Green
}

Write-Host "`n=== Configuring Git ===" -ForegroundColor Cyan
git config user.name "hienpham123"
git config user.email "phamthehien2303@gmail.com"
Write-Host "Git user configured" -ForegroundColor Green

Write-Host "`n=== Adding files ===" -ForegroundColor Cyan
git add .
Write-Host "Files added" -ForegroundColor Green

Write-Host "`n=== Committing ===" -ForegroundColor Cyan
git commit -m "Initial commit: Add chess game and all features" 2>&1
Write-Host "Committed" -ForegroundColor Green

Write-Host "`n=== Configuring remote ===" -ForegroundColor Cyan
git remote remove origin 2>&1 | Out-Null
git remote add origin https://hienpham123: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@github.com/hienpham123/PlayVerse.git
Write-Host "Remote configured" -ForegroundColor Green

Write-Host "`n=== Setting branch to main ===" -ForegroundColor Cyan
git branch -M main
Write-Host "Branch set to main" -ForegroundColor Green

Write-Host "`n=== Pushing to GitHub ===" -ForegroundColor Cyan
$env:GIT_TERMINAL_PROMPT = 0
git push -u origin main 2>&1
Write-Host "`nPush completed!" -ForegroundColor Green

