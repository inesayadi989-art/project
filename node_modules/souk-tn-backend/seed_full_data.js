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

    // 6. Add some products for seller - Realistic small business products
    const products = [
      { name: 'Écouteurs Bluetooth', price: 89.99, category: 1, image: 'https://source.unsplash.com/featured/?wireless-earbuds' },
      { name: 'Pull Femme Hiver', price: 59.99, category: 2, image: 'https://source.unsplash.com/featured/?woman-sweater' },
      { name: 'Lampe Artisanale', price: 79.99, category: 3, image: 'https://source.unsplash.com/featured/?ceramic-lamp' },
      { name: 'Crème Visage Bio', price: 54.99, category: 4, image: 'https://source.unsplash.com/featured/?skincare' },
      { name: 'Huile d\'Olive Bio', price: 39.99, category: 5, image: 'https://source.unsplash.com/featured/?olive-oil' },
    ];

    for (const product of products) {
      const [productResult] = await db.execute(
        `INSERT INTO products 
         (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          storeResult.insertId,
          product.category,
          product.name,
          product.name.toLowerCase().replace(/\s+/g, '-'),
          `${product.name} - Produit authentique de petite boutique tunisienne`,
          product.price,
          100,
          true,
          true
        ]
      );
      
      // Insert product image
      if (product.image) {
        await db.execute(
          `INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)`,
          [productResult.insertId, product.image, 1]
        );
      }
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
