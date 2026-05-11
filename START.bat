@echo off
REM Souk.tn - Quick Start Script for Windows

setlocal enabledelayedexpansion

echo.
echo ================================================
echo     Souk.tn - Quick Start
echo ================================================
echo.

REM Check if MySQL is running
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] MySQL is running
) else (
    echo [ERROR] MySQL is NOT running!
    echo.
    echo Please:
    echo   1. Open XAMPP Control Panel (C:\xampp\xampp-control.exe)
    echo   2. Click "Start" for MySQL
    echo   3. Wait for it to turn GREEN
    echo   4. Run this script again
    echo.
    pause
    exit /b 1
)

echo.
echo [INFO] Setting up test users...
cd /d "%~dp0backend"
call npm run seed-test-users 2>NUL
cd /d "%~dp0"

echo.
echo ================================================
echo     Starting Services
echo ================================================
echo.

REM Open new windows for backend and frontend
echo [INFO] Starting Backend Server (http://localhost:5000)...
start "Souk.tn Backend" cmd /k "cd /d %~dp0backend && npm start"

timeout /t 3 /nobreak

echo [INFO] Starting Frontend Server (http://localhost:5173)...
start "Souk.tn Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo [INFO] Opening browser in 3 seconds...
timeout /t 3 /nobreak
start "" "http://localhost:5173/login"

echo.
echo ================================================
echo     Services Started!
echo ================================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Test Credentials:
echo   Email:    admin@souk.tn
echo   Password: admin123
echo.
echo ================================================
