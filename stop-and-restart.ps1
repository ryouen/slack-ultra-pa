# Kill all node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait a moment
Start-Sleep -Seconds 2

# Start the app
Write-Host "Starting application..."
npm run dev