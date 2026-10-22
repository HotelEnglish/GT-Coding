@echo off
title GT-Coding Launcher
echo Starting GT-Coding...

rem Root = directory containing this .bat (trailing backslash is intentional)
set "ROOT=%~dp0"

rem Backend first: Express API on :3001 (loads server/.env, Postgres + AI provider)
start "GT Backend" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%ROOT%server'; npm run dev"

rem Frontend: Vite dev server on :5173
start "GT Frontend" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%ROOT%'; npm run dev"

rem Wait a moment, then open the app in the default browser
timeout /t 6 /nobreak >nul
start "" http://localhost:5173

echo.
echo  Frontend:  http://localhost:5173
echo  Backend:   http://localhost:3001  /health
echo  Postgres:  localhost:5432/gt_coding  (must be running)
echo.
echo  Close the two PowerShell windows to stop services.
echo  If ports are already in use, the old instance is still running - just use the browser tab.pause
