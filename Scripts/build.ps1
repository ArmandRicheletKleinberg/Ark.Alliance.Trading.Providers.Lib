# Build script for Ark Alliance Trading Providers Library
# This script builds the TypeScript library for distribution

$ErrorActionPreference = "Stop"

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Building Ark Alliance Trading Providers Library" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Navigate to library directory
$libPath = Join-Path $PSScriptRoot "..\src\Ark.Alliance.Trading.Providers.Lib"
Set-Location $libPath

# Clean previous build
Write-Host "`n[1/3] Cleaning previous build..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "✓ Cleaned dist directory" -ForegroundColor Green
}

# Install dependencies
Write-Host "`n[2/3] Installing dependencies..." -ForegroundColor Yellow
npm ci
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install dependencies" -Foreground Color Red
    exit 1
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green

# Build TypeScript
Write-Host "`n[3/3] Compiling TypeScript..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ TypeScript compilation failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Build successful" -ForegroundColor Green

# Show build summary
Write-Host "`n===================================" -ForegroundColor Cyan
Write-Host "Build Summary" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Output Directory: $libPath\dist" -ForegroundColor White
Write-Host "Package Name: ark-alliance-trading-providers-lib" -ForegroundColor White  
Write-Host "Status: ✓ Ready for publishing" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Cyan
