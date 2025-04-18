@echo off
echo Starting SystemInventory application...

:: Set the root directory of the application
set APP_DIR=%~dp0
cd %APP_DIR%

echo.
echo Choose which part of the application to start:
echo 1. Full application (Server + Client)
echo 2. Client only
echo 3. Server only
echo.

set /p choice=Enter your choice (1-3): 

if "%choice%"=="1" (
    echo Starting full application...
    start cmd /k "title Server && npm run dev"
) else if "%choice%"=="2" (
    echo Starting client only...
    cd client
    start cmd /k "title Client && npm run dev"
) else if "%choice%"=="3" (
    echo Starting server only...
    cd server
    start cmd /k "title Server && node index.js"
) else (
    echo Invalid choice. Please try again.
    pause
    exit /b
)

echo.
echo Application started successfully!
echo You can close this window now.
echo. 