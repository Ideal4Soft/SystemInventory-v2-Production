# Simple script to start both client and server
Write-Host "Starting SystemInventory application..." -ForegroundColor Green

# Get current directory
$rootDir = $PSScriptRoot
Write-Host "Root directory: $rootDir" -ForegroundColor Cyan

# Start the server in a new PowerShell window
Write-Host "Starting server..." -ForegroundColor Yellow
$serverScript = Join-Path -Path $rootDir -ChildPath "run-server.ps1"
Start-Process powershell -ArgumentList "-File `"$serverScript`""

# Wait a moment to let server start
Start-Sleep -Seconds 2

# Start the client in a new PowerShell window
Write-Host "Starting client..." -ForegroundColor Yellow
$clientScript = Join-Path -Path $rootDir -ChildPath "run-client.ps1"
Start-Process powershell -ArgumentList "-File `"$clientScript`""

Write-Host "Both client and server have been started in separate windows." -ForegroundColor Green
Write-Host "You can close this window now." -ForegroundColor Green 