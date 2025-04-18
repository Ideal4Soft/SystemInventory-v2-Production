# Simple script to run the client
Write-Host "Starting the client application..." -ForegroundColor Green

# Set path to client directory
$clientPath = Join-Path -Path $PSScriptRoot -ChildPath "client"

# Change to client directory
Set-Location -Path $clientPath
Write-Host "Changed directory to: $clientPath" -ForegroundColor Cyan

# Run npm command
Write-Host "Running: npm run dev" -ForegroundColor Yellow
npm run dev

# Keep window open if it exits
Write-Host "Press any key to exit..." -ForegroundColor Red
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 