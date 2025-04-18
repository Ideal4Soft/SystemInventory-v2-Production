# Simple script to run the server
Write-Host "Starting the server..." -ForegroundColor Green

# Set path to server directory
$serverPath = Join-Path -Path $PSScriptRoot -ChildPath "server"

# Change to server directory
Set-Location -Path $serverPath
Write-Host "Changed directory to: $serverPath" -ForegroundColor Cyan

# Run node command
Write-Host "Running: node index.js" -ForegroundColor Yellow
node index.js

# Keep window open if it exits
Write-Host "Press any key to exit..." -ForegroundColor Red
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 