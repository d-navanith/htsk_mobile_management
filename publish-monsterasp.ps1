# HTSK Mobile Management — MonsterASP.NET (Free) Production Build & Publish Script
$ErrorActionPreference = "Stop"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  HTSK MOBILE MANAGEMENT - MonsterASP.NET Publisher   " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# 1. Build React Frontend
Write-Host "`n[1/4] Building React Frontend (Vite)..." -ForegroundColor Yellow
Push-Location "$PSScriptRoot\frontend"
npm run build
Pop-Location

# 2. Copy Frontend Build into backend/wwwroot
Write-Host "`n[2/4] Copying Frontend static assets to backend\wwwroot..." -ForegroundColor Yellow
$wwwroot = "$PSScriptRoot\backend\wwwroot"
if (Test-Path $wwwroot) {
    Remove-Item "$wwwroot\*" -Recurse -Force
} else {
    New-Item -ItemType Directory -Path $wwwroot | Out-Null
}
Copy-Item "$PSScriptRoot\frontend\dist\*" -Destination $wwwroot -Recurse -Force

# 3. Publish ASP.NET Core Web API + Static Frontend to ./publish folder
Write-Host "`n[3/4] Publishing ASP.NET Core Web API to .\publish..." -ForegroundColor Yellow
$publishDir = "$PSScriptRoot\publish"
if (Test-Path $publishDir) {
    Remove-Item $publishDir -Recurse -Force
}
dotnet publish "$PSScriptRoot\backend\backend.csproj" -c Release -o $publishDir

# 4. Create MonsterASP.NET Ready ZIP Archive
Write-Host "`n[4/4] Creating htsk-monsterasp-deploy.zip for MonsterASP.NET..." -ForegroundColor Yellow
$zipPath = "$PSScriptRoot\htsk-monsterasp-deploy.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}
Compress-Archive -Path "$publishDir\*" -DestinationPath $zipPath

Write-Host "`n✓ SUCCESS! MonsterASP.NET deployment package created at:" -ForegroundColor Green
Write-Host "  -> Folder: $publishDir" -ForegroundColor White
Write-Host "  -> ZIP:    $zipPath" -ForegroundColor White
