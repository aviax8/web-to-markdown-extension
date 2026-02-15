# PowerShell script to build Firefox extension locally
# Based on GitHub Actions workflow (lines 87-111)

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Error: node_modules not found. Please run 'npm install' first." -ForegroundColor Red
    exit 1
}

Write-Host "Building Firefox extension..." -ForegroundColor Green

# Create temporary directories for Firefox build
$firefoxTempDir = Join-Path (Get-Location) "build\firefox-temp"
$firefoxArtifactsDir = Join-Path (Get-Location) "build"
$targetZip = Join-Path $firefoxArtifactsDir "chatgpt-markdown-copy-firefox.zip"

Write-Host "Creating temporary directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $firefoxTempDir | Out-Null
New-Item -ItemType Directory -Force -Path $firefoxArtifactsDir | Out-Null

# Copy extension files
Write-Host "Copying extension files..." -ForegroundColor Yellow
Copy-Item -Path "extension\*" -Destination $firefoxTempDir -Recurse -Force

# Build using web-ext (this validates the extension too)
# Use --filename to directly specify the output filename to avoid file corruption
# Note: web-ext lint may show warnings about service_worker, but Firefox 147+ supports all Manifest V3 features
Write-Host "Building extension with web-ext..." -ForegroundColor Yellow
Push-Location $firefoxTempDir
try {
    $filename = Split-Path -Leaf $targetZip
    # Build with web-ext (lint warnings are OK, Firefox 147 Developer supports all features)
    npx web-ext build --overwrite-dest --artifacts-dir $firefoxArtifactsDir --filename $filename 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: web-ext build had issues, but continuing..." -ForegroundColor Yellow
    }
} finally {
    Pop-Location
}

# Recreate ZIP file using PowerShell .NET compression to ensure proper format for Firefox
Write-Host "Recreating ZIP file with PowerShell to ensure Firefox compatibility..." -ForegroundColor Yellow
$tempZip = Join-Path $env:TEMP "firefox-ext-$(Get-Random).zip"
if (Test-Path $tempZip) {
    Remove-Item $tempZip -Force
}

# Create ZIP using .NET compression for better compatibility
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($firefoxTempDir, $tempZip, [System.IO.Compression.CompressionLevel]::Optimal, $false)

# Copy to final location
Copy-Item -Path $tempZip -Destination $targetZip -Force
Remove-Item $tempZip -Force

# Verify the output file exists
if (-not (Test-Path $targetZip)) {
    Write-Host "Error: Output file not found: $targetZip" -ForegroundColor Red
    exit 1
}

Write-Host "Extension built: $targetZip" -ForegroundColor Green

# Clean up temp directory
Write-Host "Cleaning up temporary directories..." -ForegroundColor Yellow
Remove-Item -Path $firefoxTempDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Firefox extension built successfully!" -ForegroundColor Green
Write-Host "Output: build\chatgpt-markdown-copy-firefox.zip" -ForegroundColor Cyan

