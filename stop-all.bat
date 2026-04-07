@echo off
title DSAGen - Stopping All Services
echo.
echo  ============================================
echo    DSAGen - Stopping All Services
echo  ============================================
echo.

echo Stopping Node.js processes on port 5000 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo Stopping Node.js processes on port 3000 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo Closing DSAGen terminal windows...
taskkill /FI "WINDOWTITLE eq DSAGen Backend" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq DSAGen Frontend" /F >nul 2>&1

echo.
echo  All services stopped!
echo.
pause
