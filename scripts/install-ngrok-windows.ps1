# ngrok Installation Script for Windows
Write-Host "[INSTALL] ngrok Installation Script for Windows" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

# Set installation directory
$installDir = "$env:USERPROFILE\ngrok"
$ngrokExe = "$installDir\ngrok.exe"

# Create directory if not exists
if (!(Test-Path $installDir)) {
    Write-Host "[INFO] Creating installation directory: $installDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
}

# Check if ngrok already exists
if (Test-Path $ngrokExe) {
    Write-Host "[CHECK] ngrok already exists at: $ngrokExe" -ForegroundColor Green
    & $ngrokExe version
    $reinstall = Read-Host "Do you want to reinstall? (y/n)"
    if ($reinstall -ne 'y') {
        Write-Host "[INFO] Using existing installation" -ForegroundColor Yellow
        exit 0
    }
}

# Download ngrok
Write-Host "[DOWNLOAD] Downloading ngrok for Windows..." -ForegroundColor Yellow
$downloadUrl = "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip"
$zipFile = "$env:TEMP\ngrok.zip"

try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipFile -UseBasicParsing
    Write-Host "[SUCCESS] Download completed" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to download ngrok: $_" -ForegroundColor Red
    exit 1
}

# Extract ngrok
Write-Host "[EXTRACT] Extracting ngrok..." -ForegroundColor Yellow
try {
    Expand-Archive -Path $zipFile -DestinationPath $installDir -Force
    Write-Host "[SUCCESS] Extraction completed" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to extract ngrok: $_" -ForegroundColor Red
    exit 1
}

# Clean up
Remove-Item $zipFile -Force

# Add to PATH if not already there
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$installDir*") {
    Write-Host "[PATH] Adding ngrok to user PATH..." -ForegroundColor Yellow
    [Environment]::SetEnvironmentVariable("Path", "$userPath;$installDir", "User")
    Write-Host "[SUCCESS] Added to PATH (restart terminal to take effect)" -ForegroundColor Green
} else {
    Write-Host "[INFO] ngrok already in PATH" -ForegroundColor Green
}

# Test installation
Write-Host "`n[TEST] Testing ngrok installation..." -ForegroundColor Yellow
& $ngrokExe version

Write-Host "`n[SUCCESS] ngrok installed successfully!" -ForegroundColor Green
Write-Host "[INFO] Installation path: $ngrokExe" -ForegroundColor Yellow
Write-Host "`n[NEXT STEPS]" -ForegroundColor Cyan
Write-Host "1. Sign up for free account: https://dashboard.ngrok.com/signup" -ForegroundColor White
Write-Host "2. Get your authtoken: https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor White
Write-Host "3. Configure authtoken: ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor White
Write-Host "4. Restart your terminal to use ngrok from anywhere" -ForegroundColor White