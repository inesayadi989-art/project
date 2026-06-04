const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'souk_tn',
  });

  try {
    console.log('Running order workflow migration...');

    await connection.execute(`
      ALTER TABLE orders
      MODIFY COLUMN status ENUM('pending', 'pending_vendor', 'pending_vendor_confirmation', 'confirmed', 'paid_confirmed', 'completed', 'rejected_by_vendor', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending'
    `);
    console.log('✅ orders.status enum updated');

    await connection.execute(`
      ALTER TABLE stores
      ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) DEFAULT 0.00 AFTER total_revenue,
      ADD COLUMN IF NOT EXISTS threshold_notified BOOLEAN DEFAULT FALSE AFTER wallet_balance
    `);
    console.log('✅ stores.wallet_balance and threshold_notified added if missing');

    await connection.execute(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS admin_commission DECIMAL(10,2) DEFAULT 0.00 AFTER payment_id,
      ADD COLUMN IF NOT EXISTS vendor_amount DECIMAL(10,2) DEFAULT 0.00 AFTER admin_commission
    `);
    console.log('✅ orders.admin_commission and orders.vendor_amount added if missing');

    console.log('Migration complete');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
