Write-Host "Starting GT-Coding..." -ForegroundColor Cyan

$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -PassThru
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; npm run dev" -PassThru

Write-Host ""
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "Backend:  http://localhost:3001" -ForegroundColor Green
Write-Host ""
Write-Host "Press Enter to stop all services..."
Read-Host

Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
Write-Host "All services stopped." -ForegroundColor Yellow
