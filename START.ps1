#!/usr/bin/env pwsh
# Souk.tn - Quick Start Script
# Usage: .\START.ps1

$ErrorActionPreference = "Continue"

function Write-Header {
    Write-Host "`n" + ("=" * 50) -ForegroundColor Cyan
    Write-Host $args -ForegroundColor Cyan
    Write-Host ("=" * 50) -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success {
    Write-Host "✅ $args" -ForegroundColor Green
}

function Write-Error {
    Write-Host "❌ $args" -ForegroundColor Red
}

function Write-Warning {
    Write-Host "⚠️  $args" -ForegroundColor Yellow
}

function Write-Info {
    Write-Host "ℹ️  $args" -ForegroundColor Blue
}

Write-Header "Souk.tn - Quick Start"

# Check if MySQL is running
Write-Info "Checking MySQL status..."
$mysqlRunning = Get-Process mysqld -ErrorAction SilentlyContinue

if ($mysqlRunning) {
    Write-Success "MySQL is running"
} else {
    Write-Error "MySQL is NOT running!"
    Write-Warning "Please:"
    Write-Info "  1. Open XAMPP Control Panel (C:\xampp\xampp-control.exe)"
    Write-Info "  2. Click 'Start' for MySQL"
    Write-Info "  3. Wait for it to turn GREEN"
    Write-Info "  4. Run this script again"
    Read-Host "Press any key to exit..."
    exit 1
}

# Setup database if first run
$setupScript = "$PSScriptRoot\backend\seed_test_users.js"
if (Test-Path $setupScript) {
    Write-Info "Setting up test users..."
    Push-Location "$PSScriptRoot\backend"
    & npm run seed-test-users 2>&1 | Out-Null
    Pop-Location
    Write-Success "Test users ready"
}

Write-Header "Starting Services"

# Start backend
Write-Info "Starting Backend Server in background..."
Push-Location "$PSScriptRoot\backend"
Write-Host ""
Write-Host "Backend Server:" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Start-Process npm -ArgumentList "start" -WorkingDirectory "$PSScriptRoot\backend" -WindowStyle Normal
Pop-Location

Start-Sleep 3

# Start frontend
Write-Info "Starting Frontend Dev Server..."
Write-Host ""
Write-Host "Frontend Server:" -ForegroundColor Cyan
Write-Host "================" -ForegroundColor Cyan
Push-Location "$PSScriptRoot"
& npm run dev
Pop-Location

Write-Header "Services Started"
Write-Host ""
Write-Success "Backend:  http://localhost:5000"
Write-Success "Frontend: http://localhost:5173"
Write-Host ""
Write-Info "Opening browser..."
Start-Process "http://localhost:5173/login"

Write-Host ""
Write-Info "Test Credentials:"
Write-Host "  Email:    admin@souk.tn"
Write-Host "  Password: admin123"
Write-Host ""

Read-Host "Press any key to continue..."
