const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedFullData() {
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

    // Delete existing test data
    await db.execute('DELETE FROM profiles WHERE email IN (?, ?, ?)', 
      ['admin@souk.tn', 'seller@souk.tn', 'customer@souk.tn']);
    console.log('✅ Cleaned up old test users');

    // 1. Create admin user
    const [adminResult] = await db.execute(
      `INSERT INTO profiles (email, full_name, role, password_hash, phone, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      ['admin@souk.tn', 'Admin Souk', 'admin', adminPasswordHash, '+216 00 000 000']
    );
    console.log('✅ Admin user created (ID: ' + adminResult.insertId + ')');

    // 2. Create seller user
    const [sellerResult] = await db.execute(
      `INSERT INTO profiles (email, full_name, role, password_hash, phone, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      ['seller@souk.tn', 'Seller Test', 'seller', sellerPasswordHash, '+216 00 000 001']
    );
    console.log('✅ Seller user created (ID: ' + sellerResult.insertId + ')');

    // 3. Create store for seller
    const slug = `boutique-test-${Date.now()}`;
    const [storeResult] = await db.execute(
      `INSERT INTO stores (owner_id, name, slug, is_approved, is_active, commission_rate, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [sellerResult.insertId, 'Boutique Test', slug, true, true, 10]
    );
    console.log('✅ Store created for seller (ID: ' + storeResult.insertId + ')');

    // 4. Get subscription plan
    const [plans] = await db.execute(
      `SELECT id FROM subscription_plans WHERE slug = 'single-plan' LIMIT 1`
    );
    const planId = plans.length > 0 ? plans[0].id : 1;

    // 5. Create active subscription for seller
    const now = new Date();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    
    const [subResult] = await db.execute(
      `INSERT INTO subscriptions 
       (user_id, plan_id, status, current_period_start, current_period_end, created_at, updated_at) 
       VALUES (?, ?, ?, NOW(), ?, NOW(), NOW())`,
      [sellerResult.insertId, planId, 'active', nextMonth]
    );
    console.log('✅ Active subscription created (ID: ' + subResult.insertId + ')');

    // 6. Add some products for seller
    const products = [
      { name: 'Téléphone Moderne', price: 500, category: 1 },
      { name: 'Laptop Pro', price: 1200, category: 1 },
      { name: 'T-Shirt Designer', price: 45, category: 2 },
      { name: 'Jeans Premium', price: 80, category: 2 },
      { name: 'Lampe LED', price: 35, category: 3 },
    ];

    for (const product of products) {
      await db.execute(
        `INSERT INTO products 
         (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          storeResult.insertId,
          product.category,
          product.name,
          product.name.toLowerCase().replace(/\s+/g, '-'),
          `Description for ${product.name}`,
          product.price,
          100,
          true,
          true
        ]
      );
    }
    console.log('✅ Products added for seller');

    // 7. Create customer user
    const [customerResult] = await db.execute(
      `INSERT INTO profiles (email, full_name, role, password_hash, phone, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      ['customer@souk.tn', 'Customer Test', 'customer', customerPasswordHash, '+216 00 000 002']
    );
    console.log('✅ Customer user created (ID: ' + customerResult.insertId + ')');

    console.log('\n========================================');
    console.log('✅ DATABASE SEEDING COMPLETE!');
    console.log('========================================\n');

    console.log('📊 Test Data Created:');
    console.log('  - 1 Admin User');
    console.log('  - 1 Seller User (ACTIVE subscription)');
    console.log('  - 1 Store (5 products)');
    console.log('  - 1 Customer User\n');

    console.log('📧 Credentials:');
    console.log('\n  Admin:');
    console.log('    Email: admin@souk.tn');
    console.log('    Password: admin123\n');
    console.log('  Seller (ACTIVE):');
    console.log('    Email: seller@souk.tn');
    console.log('    Password: seller123\n');
    console.log('  Customer:');
    console.log('    Email: customer@souk.tn');
    console.log('    Password: customer123\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (db) await db.end();
  }
}

seedFullData();
