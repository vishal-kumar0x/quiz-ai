@echo off
echo ===================================================
echo   AI Quiz Platform - Production Single-Click Runner
echo ===================================================
echo [0/2] Hunting and destroying background Ghost Servers...
taskkill /F /IM go.exe /T 2>NUL
taskkill /F /IM backend.exe /T 2>NUL
echo [SUCCESS] Port 8081 is clean.

echo [1/2] Compiling React Frontend...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed! Please check the output above.
    pause
    exit /b %errorlevel%
)
cd ..
echo [SUCCESS] Frontend compilation complete.

echo [2/2] Starting Unified Go Backend Server...
cd backend
echo Launching your browser to http://localhost:8081...
timeout /t 2 /nobreak > NUL
start http://localhost:8081

echo ===================================================
echo Server is LIVE! Press Ctrl+C in this window to stop.
echo ===================================================
go run .
pause
