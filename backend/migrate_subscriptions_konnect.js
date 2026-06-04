const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateSubscriptionsTable() {
  let db;
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'souk_tn'
    });

    console.log('✅ Connected to database');

    // Add Konnect-related columns to subscriptions
    const alterStatements = [
      `ALTER TABLE subscriptions ADD COLUMN payment_id INT AFTER plan_id`,
      `ALTER TABLE subscriptions ADD COLUMN konnect_payment_id VARCHAR(255) UNIQUE AFTER payment_id`,
      `ALTER TABLE subscriptions ADD COLUMN konnect_session_id VARCHAR(255) UNIQUE AFTER konnect_payment_id`,
      `ALTER TABLE subscriptions ADD COLUMN merchant_reference VARCHAR(255) AFTER konnect_session_id`,
      `ALTER TABLE subscriptions ADD COLUMN next_payment_date DATE AFTER current_period_end`,
      `ALTER TABLE subscriptions ADD CONSTRAINT fk_subscription_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL`,
    ];

    for (const stmt of alterStatements) {
      try {
        await db.execute(stmt);
        console.log(`✅ ${stmt.split('ADD')[1].trim().split(' ')[0]} added successfully`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`⚠️  Column already exists (skipping)`);
        } else {
          throw error;
        }
      }
    }

    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration error:', error.message);
  } finally {
    if (db) await db.end();
  }
}

migrateSubscriptionsTable();
