const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createTestUser() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'souk_tn'
  });

  console.log('Connected to database');

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 12);
    console.log('Password hashed');

    // Insert user
    const [result] = await db.execute(
      'INSERT INTO profiles (email, full_name, role, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      ['test@seller.com', 'Test Seller', 'seller', hashedPassword]
    );

    console.log('Inserted user with ID:', result.insertId);

    // Create store
    const slug = `boutique-test-seller-${Date.now()}`;
    await db.execute(
      'INSERT INTO stores (owner_id, name, slug, is_approved, is_active, commission_rate, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [result.insertId, 'Boutique Test Seller', slug, true, true, 10]
    );

    console.log('Created store for user');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.end();
  }
}

createTestUser();