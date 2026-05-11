const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function checkProducts() {
  let db;
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'souk_tn'
    });
    console.log('✅ Connected to MySQL database');

    const [rows] = await db.execute('SELECT COUNT(*) as count FROM products');
    console.log(`📊 Number of products in database: ${rows[0].count}`);

  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    if (db) await db.end();
  }
}

checkProducts();