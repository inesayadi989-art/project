/**
 * Migration: Add Financial Integrity Tables
 * 
 * إضافة الجداول اللازمة للـ BI Integrity
 */

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
    console.log('🔧 Running BI Integrity migration...');

    // 1️⃣ Create financial_transactions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS financial_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NULL,
        store_id INT NULL,
        type ENUM('order_payment', 'vendor_payout', 'subscription', 'refund') NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        vendor_amount DECIMAL(10,2) NOT NULL,
        platform_amount DECIMAL(10,2) NOT NULL,
        description VARCHAR(255) NOT NULL,
        reference VARCHAR(100) UNIQUE,
        status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL,
        INDEX idx_type (type),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),
        INDEX idx_store_id (store_id)
      ) ENGINE=InnoDB;
    `);
    console.log('✅ financial_transactions table created');

    // 2️⃣ Create bi_audit_log table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS bi_audit_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_id INT NULL,
        action VARCHAR(100) NOT NULL,
        details JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (transaction_id) REFERENCES financial_transactions(id) ON DELETE SET NULL,
        INDEX idx_action (action),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB;
    `);
    console.log('✅ bi_audit_log table created');

    // 3️⃣ Create bi_verification_log table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS bi_verification_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        report JSON NOT NULL,
        is_valid BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_is_valid (is_valid),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB;
    `);
    console.log('✅ bi_verification_log table created');

    // 4️⃣ Ensure vendor_settlements table exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS vendor_settlements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        store_id INT NOT NULL,
        seller_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        admin_id INT NULL,
        note TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
        FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (admin_id) REFERENCES profiles(id) ON DELETE SET NULL,
        INDEX idx_store_id (store_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB;
    `);
    console.log('✅ vendor_settlements table verified');

    // 5️⃣ Add missing columns if not exist
    const [[orderColumns]] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'orders' AND COLUMN_NAME IN ('admin_commission', 'vendor_amount')
    `);

    if (orderColumns.length < 2) {
      await connection.execute(`
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS admin_commission DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS vendor_amount DECIMAL(10,2) DEFAULT 0
      `);
      console.log('✅ Added missing columns to orders table');
    }

    // 6️⃣ Add wallet columns to stores if not exist
    const [[storeColumns]] = await connection.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'stores' AND COLUMN_NAME IN ('wallet_balance', 'threshold_notified')
    `);

    if (storeColumns.length < 2) {
      await connection.execute(`
        ALTER TABLE stores
        ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS threshold_notified BOOLEAN DEFAULT FALSE
      `);
      console.log('✅ Added wallet columns to stores table');
    }

    console.log('✅ BI Integrity migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
