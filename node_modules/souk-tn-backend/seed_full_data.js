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

    // 4. Create active subscription for seller
    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const [subResult] = await db.execute(
      `INSERT INTO seller_subscriptions (seller_id, plan_name, plan_price, amount, status, payment_status, start_date, end_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), NOW())`,
      [sellerResult.insertId, 'Souk Business', 30, 30, 'active', 'paid', endDate.toISOString().split('T')[0]]
    );
    console.log('✅ Active subscription created for seller (ID: ' + subResult.insertId + ')');

    // 5. Add sample products
    const [categoryResult] = await db.execute(
      'SELECT id FROM categories WHERE slug = ? LIMIT 1',
      ['electronique']
    );
    const categoryId = categoryResult.length > 0 ? categoryResult[0].id : 1;

    const products = [
      {
        name: 'Écouteurs Bluetooth Premium',
        description: 'Écouteurs sans fil de haute qualité',
        price: 89.99,
        stock: 25
      },
      {
        name: 'Clavier Gaming RGB',
        description: 'Clavier mécanique avec éclairage RGB',
        price: 129.99,
        stock: 30
      },
      {
        name: 'Support Téléphone Ajustable',
        description: 'Support universel pour téléphone',
        price: 24.99,
        stock: 50
      },
      {
        name: 'Câble USB-C 2m',
        description: 'Câble de charge rapide',
        price: 14.99,
        stock: 100
      },
      {
        name: 'Souris Gaming Ergonomique',
        description: 'Souris avec capteur haute précision',
        price: 49.99,
        stock: 40
      }
    ];

    for (const product of products) {
      const slug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      await db.execute(
        `INSERT INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [storeResult.insertId, categoryId, product.name, slug, product.description, product.price, product.stock, true, true]
      );
    }
    console.log('✅ 5 sample products added');

    // 6. Create customer user
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
