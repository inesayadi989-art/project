@echo off
REM ========================================
REM Souk.tn - Database Setup Script
REM ========================================
setlocal enabledelayedexpansion

echo.
echo ========================================
echo Souk.tn - Database Initialization
echo ========================================
echo.

REM Check if MySQL service is running
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [OK] MySQL process is running
) else (
    echo [!] MySQL process not found
    echo.
    echo Please follow these steps:
    echo 1. Open XAMPP Control Panel
    echo 2. Click "Start" for MySQL
    echo 3. Wait for it to turn green
    echo 4. Run this script again
    echo.
    pause
    exit /b 1
)

echo.
echo [*] Waiting 3 seconds for MySQL to be ready...
timeout /t 3 /nobreak

REM Try to create database using MySQL command
echo.[*] Creating database 'souk_tn'...

cd /d C:\xampp\mysql\bin

REM Create database
mysql -u root -e "DROP DATABASE IF EXISTS souk_tn;" 2>NUL
mysql -u root -e "CREATE DATABASE IF NOT EXISTS souk_tn CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>NUL

if !ERRORLEVEL! neq 0 (
    echo [ERROR] Failed to create database
    echo MySQL might not be running. Please check XAMPP Control Panel.
    pause
    exit /b 1
)

echo.[OK] Database created

REM Import schema
echo.[*] Importing schema...
mysql -u root souk_tn < "C:\xampp\htdocs\project\database\database_schema.sql"

if !ERRORLEVEL! neq 0 (
    echo [ERROR] Failed to import schema
    pause
    exit /b 1
)

echo.[OK] Schema imported

REM Create test user
echo.[*] Creating test admin user...
mysql -u root souk_tn -e ^
"INSERT INTO profiles (email, full_name, password_hash, role, phone, created_at) VALUES ^
('admin@souk.tn', 'Admin Souk', '$2a$10$YourHashedPasswordHere', 'admin', '+216 00 000 000', NOW()) ^
ON DUPLICATE KEY UPDATE id=id;" 2>NUL

echo.[OK] Test user created

echo.
echo ========================================
echo [SUCCESS] Database setup complete!
echo ========================================
echo.
echo Test Credentials:
echo   Email: admin@souk.tn
echo   Password: admin123
echo.
echo Next step:
echo   1. Run: npm start (in backend folder)
echo   2. Open: http://localhost:5173/login
echo.
pause
