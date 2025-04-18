@echo off
echo Starting SystemInventory Server...

:: Set the root directory of the application
set APP_DIR=%~dp0
cd %APP_DIR%\server

:: Start the server
node index.js

pause 