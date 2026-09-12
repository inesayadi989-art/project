const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createTestUsers() {
  let db;
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'souk_tn'
    });

    console.log('✅ Connected to database');

    // Hash passwords
    const adminPasswordHash = await bcrypt.hash('admin123', 12);
    const sellerPasswordHash = await bcrypt.hash('seller123', 12);
    const customerPasswordHash = await bcrypt.hash('customer123', 12);

    console.log('✅ Passwords hashed');

    // Delete existing test users to avoid conflicts
    await db.execute('DELETE FROM profiles WHERE email IN (?, ?, ?)', 
      ['admin@souk.tn', 'seller@souk.tn', 'customer@souk.tn']);
    console.log('✅ Cleaned up old test users');

    // Create admin user
    const [adminResult] = await db.execute(
      `INSERT INTO profiles (email, full_name, role, password_hash, phone, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      ['admin@souk.tn', 'Admin Souk', 'admin', adminPasswordHash, '+216 51 555 333']
    );
    console.log('✅ Admin user created (ID: ' + adminResult.insertId + ')');

    // Create seller user
    const [sellerResult] = await db.execute(
      `INSERT INTO profiles (email, full_name, role, password_hash, phone, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      ['seller@souk.tn', 'Seller Test', 'seller', sellerPasswordHash, '+216 51 555 333']
    );
    console.log('✅ Seller user created (ID: ' + sellerResult.insertId + ')');

    // Create store for seller
    const slug = `boutique-test-${Date.now()}`;
    await db.execute(
      `INSERT INTO stores (owner_id, name, slug, is_approved, is_active, commission_rate, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [sellerResult.insertId, 'Boutique Test', slug, true, true, 10]
    );
    console.log('✅ Store created for seller');

    // Create active subscription for seller
    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const [subResult] = await db.execute(
      `INSERT INTO seller_subscriptions (seller_id, plan_name, plan_price, amount, status, payment_status, start_date, end_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), NOW())`,
      [sellerResult.insertId, 'Souk Business', 30, 30, 'active', 'paid', endDate.toISOString().split('T')[0]]
    );
    console.log('✅ Active subscription created for seller (ID: ' + subResult.insertId + ')');

    // Create customer user
    const [customerResult] = await db.execute(
      `INSERT INTO profiles (email, full_name, role, password_hash, phone, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      ['customer@souk.tn', 'Customer Test', 'customer', customerPasswordHash, '+216 51 555 333']
    );
    console.log('✅ Customer user created (ID: ' + customerResult.insertId + ')');

    console.log('\n========================================');
    console.log('✅ TEST USERS CREATED SUCCESSFULLY');
    console.log('========================================\n');
    console.log('Admin Account:');
    console.log('  📧 Email: admin@souk.tn');
    console.log('  🔐 Password: admin123\n');
    console.log('Seller Account:');
    console.log('  📧 Email: seller@souk.tn');
    console.log('  🔐 Password: seller123');
    console.log('  📦 Store: Boutique Test');
    console.log('  ✅ Subscription: ACTIVE (30 days)\n');
    console.log('Customer Account:');
    console.log('  📧 Email: customer@souk.tn');
    console.log('  🔐 Password: customer123\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (db) await db.end();
  }
}

createTestUsers();
