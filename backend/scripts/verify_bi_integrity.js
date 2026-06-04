const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const VerificationService = require('../services/VerificationService');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function run() {
  let db;
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'souk_tn'
    });

    console.log('🔍 Running BI integrity verification...');

    const verificationService = new VerificationService(db);
    const report = await verificationService.generateHealthReport();

    console.log(`\nBI integrity isValid: ${report.integrity.isValid}`);
    console.log(`Issues: ${report.integrity.issues.length}`);

    if (report.integrity.issues.length > 0) {
      console.log('--- ISSUES ---');
      report.integrity.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }

    console.log('\nBI statistics:');
    console.log(JSON.stringify(report.statistics, null, 2));
    console.log(`\nVerification saved to bi_verification_log and bi_audit_log at ${report.timestamp}`);

    if (!report.integrity.isValid) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Error running BI integrity verification:', error);
    process.exitCode = 1;
  } finally {
    if (db) await db.end();
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
