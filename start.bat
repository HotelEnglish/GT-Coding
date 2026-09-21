@echo off
title GT-Coding Launcher
echo Starting GT-Coding...

start "Frontend" powershell -NoExit -Command "cd /d %~dp0 && npm run dev"
start "Backend" powershell -NoExit -Command "cd /d %~dp0server && npm run dev"

echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3001
echo.
echo Close the two PowerShell windows to stop services.
pause
