const mysql = require('mysql2/promise');
require('dotenv').config();

async function createSubscriptionPlans() {
  let db;
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'souk_tn'
    });

    console.log('✅ Connected to database');

    // Create subscription_plans table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'TND',
        interval_type ENUM('month', 'year') DEFAULT 'month',
        interval_count INT DEFAULT 1,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Subscription plans table created');

    // Create subscriptions table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        plan_id INT NOT NULL,
        status ENUM('pending', 'active', 'canceled', 'failed', 'processing') DEFAULT 'pending',
        payment_method VARCHAR(50),
        current_period_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        current_period_end TIMESTAMP NULL,
        cancel_at_period_end BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Subscriptions table created');

    // Create notifications table for subscription events
    await db.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        seller_id INT NULL,
        recipient_id INT NULL,
        recipient_role ENUM('seller','admin','customer') DEFAULT 'seller',
        subscription_id INT NULL,
        type VARCHAR(100) NULL,
        title VARCHAR(255) NULL,
        message TEXT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Notifications table created (if not exists)');

    // Insert default plan
    const [existingPlans] = await db.execute('SELECT id FROM subscription_plans WHERE slug = ?', ['single-plan']);

    if (existingPlans.length === 0) {
      await db.execute(
        `INSERT INTO subscription_plans (name, slug, description, amount, currency, interval_type, interval_count, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['Souk Business', 'single-plan', 'Un seul forfait pour tout le business vendeur, facturation locale en TND.', 30.00, 'TND', 'month', 1, true]
      );
      console.log('✅ Default subscription plan created');
    } else {
      console.log('✅ Default subscription plan already exists');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (db) await db.end();
  }
}

createSubscriptionPlans();