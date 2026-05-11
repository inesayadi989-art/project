const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

async function seedDatabase() {
  let db;
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'souk_tn',
      multipleStatements: true
    });
    console.log('✅ Connected to MySQL database for seeding');

    const sqlFile = path.join(__dirname, '..', 'database', 'seed_products.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    await db.execute(sql);
    console.log('✅ Products seeded successfully');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    if (db) await db.end();
  }
}

seedDatabase();