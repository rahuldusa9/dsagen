@echo off
title DSAGen - Starting All Services
echo.
echo  ============================================
echo    DSAGen - AI-Powered DSA Practice Platform
echo  ============================================
echo.

echo [1/2] Starting Backend Server (port 5000)...
cd /d "%~dp0server"
start "DSAGen-Backend" cmd /k "title DSAGen Backend && color 0A && echo Starting backend... && npm run dev"

echo [2/2] Starting Frontend Server (port 3000)...
cd /d "%~dp0client"
start "DSAGen-Frontend" cmd /k "title DSAGen Frontend && color 0B && echo Starting frontend... && npm run dev"

echo.
echo  All services started!
echo  Backend:  http://localhost:5000
echo  Frontend: http://localhost:3000
echo.

timeout /t 5 /nobreak >nul
start http://localhost:3000
