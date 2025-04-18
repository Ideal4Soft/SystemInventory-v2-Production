@echo off
echo Starting SystemInventory Client...

:: Set the root directory of the application
set APP_DIR=%~dp0
cd %APP_DIR%\client

:: Start the client
npm run dev

pause 