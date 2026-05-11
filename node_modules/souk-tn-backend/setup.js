#!/usr/bin/env node

/**
 * Souk.tn - Complete Setup Guide
 * This script helps you set up and start the full application
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(50));
  log(title, 'cyan');
  console.log('='.repeat(50) + '\n');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  section('🚀 Souk.tn - Setup Guide');

  // Step 1: Check if MySQL is running
  log('Step 1: Checking MySQL status...', 'blue');
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);

  try {
    await execPromise('tasklist | findstr mysqld');
    log('✅ MySQL is running', 'green');
  } catch (e) {
    log('❌ MySQL is NOT running!', 'red');
    log('\nPlease:');
    log('  1. Open XAMPP Control Panel (C:\\xampp\\xampp-control.exe)', 'yellow');
    log('  2. Click "Start" for MySQL', 'yellow');
    log('  3. Wait for it to turn GREEN', 'yellow');
    log('  4. Run this script again', 'yellow');
    process.exit(1);
  }

  // Step 2: Create database and import schema
  log('\nStep 2: Setting up database...', 'blue');
  try {
    // Create database
    await execPromise('cd C:\\xampp\\mysql\\bin && mysql -u root -e "CREATE DATABASE IF NOT EXISTS souk_tn CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"', 
      { encoding: 'utf8' });
    log('✅ Database created', 'green');

    // Import schema
    await sleep(1000);
    await execPromise(`cd C:\xampp\mysql\bin && mysql -u root souk_tn < "${path.join(__dirname, '..', 'database', 'database_schema.sql')}"`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    log('✅ Schema imported', 'green');
  } catch (e) {
    log('❌ Database setup failed: ' + e.message, 'red');
    log('\nTroubleshooting:', 'yellow');
    log('  - Ensure MySQL is running in XAMPP', 'yellow');
    log('  - Check that C:\\xampp\\mysql\\bin exists', 'yellow');
    process.exit(1);
  }

  // Step 3: Seed test users
  log('\nStep 3: Creating test users...', 'blue');
  try {
    await execPromise('npm run seed-test-users', { 
      cwd: __dirname,
      encoding: 'utf8'
    });
    log('✅ Test users created', 'green');
  } catch (e) {
    log('⚠️  Warning: Could not create test users automatically', 'yellow');
    log('   You can run: npm run seed-test-users later', 'yellow');
  }

  // Step 4: Instructions for next steps
  section('✅ Setup Complete!');

  log('Next Steps:', 'cyan');
  log('\n1️⃣  Start the Backend Server:', 'blue');
  log('   cd backend', 'yellow');
  log('   npm start', 'yellow');
  log('   (should show: ✅ Connected to MySQL database)');
  
  log('\n2️⃣  In another terminal, start Frontend Dev Server:', 'blue');
  log('   npm run dev', 'yellow');
  log('   (should show: Local: http://localhost:5173)');

  log('\n3️⃣  Open login page:', 'blue');
  log('   http://localhost:5173/login', 'yellow');

  log('\n📧 Test Credentials:', 'cyan');
  log('   Admin:', 'blue');
  log('     Email: admin@souk.tn', 'green');
  log('     Password: admin123', 'green');
  log('\n   Seller:', 'blue');
  log('     Email: seller@souk.tn', 'green');
  log('     Password: seller123', 'green');

  log('\n🎯 Ready to develop!', 'green');
  log('\nFor troubleshooting, check:', 'cyan');
  log('   - Backend logs: Check terminal for errors', 'yellow');
  log('   - Frontend logs: Check browser console (F12)', 'yellow');
}

main().catch(err => {
  log('\n❌ Setup failed: ' + err.message, 'red');
  process.exit(1);
});
