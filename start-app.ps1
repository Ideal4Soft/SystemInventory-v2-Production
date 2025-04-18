Write-Host "Starting SystemInventory application..." -ForegroundColor Green

# Set the root directory of the application
$APP_DIR = $PSScriptRoot
Set-Location -Path $APP_DIR

Write-Host ""
Write-Host "Choose which part of the application to start:" -ForegroundColor Cyan
Write-Host "1. Full application (Server + Client)"
Write-Host "2. Client only"
Write-Host "3. Server only"
Write-Host ""

$choice = Read-Host "Enter your choice (1-3)"

switch ($choice) {
    "1" {
        Write-Host "Starting full application..." -ForegroundColor Green
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -Path '$APP_DIR'; npm run dev"
    }
    "2" {
        Write-Host "Starting client only..." -ForegroundColor Green
        $clientPath = Join-Path -Path $APP_DIR -ChildPath "client"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -Path '$clientPath'; npm run dev"
    }
    "3" {
        Write-Host "Starting server only..." -ForegroundColor Green
        $serverPath = Join-Path -Path $APP_DIR -ChildPath "server"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -Path '$serverPath'; node index.js"
    }
    default {
        Write-Host "Invalid choice. Please try again." -ForegroundColor Red
        exit
    }
}

Write-Host ""
Write-Host "Application started successfully!" -ForegroundColor Green
Write-Host "You can close this window now." 