@echo off
title AI Quiz Platform Launcher
color 0B
echo ========================================================
echo               AI MCQ Quiz System Launcher
echo ========================================================
echo.
echo Welcome to the AI Quiz Platform!
echo This script will start both the backend and frontend servers.
echo.

echo [1/4] Cleaning up any old instances...
taskkill /F /IM go.exe /T 2>NUL
taskkill /F /IM backend.exe /T 2>NUL
:: We won't tightly kill node.exe as it might kill other react projects, but usually Go is the port hog.
echo.

echo [2/4] Starting Go Backend Server (Port 8081)...
:: The /k flag keeps the window open so you can see the logs
start "AI Quiz Backend Server" cmd /k "cd backend && color 0A && echo Starting Go Server... && go run ."

echo [3/4] Starting React Frontend Server (Vite)...
:: The /k flag keeps the window open
start "AI Quiz Frontend Server" cmd /k "cd frontend && color 0D && echo Starting Vite Dev Server... && npm run dev -- --open"

echo.
echo [4/4] System is launching!
echo.
echo Successfully spawned server processes.
echo Your default web browser will open automatically in a few seconds.
echo.
echo IMPORTANT: 
echo Please keep the two new command prompt windows open. 
echo Closing them will shut down the platform.
echo.
pause
