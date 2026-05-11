const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

async function updatePasswords() {
  let db;
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'souk_tn'
    });
    console.log('✅ Connected to MySQL database');

    const saltRounds = 12;

    // Hash passwords
    const adminHash = await bcrypt.hash('admin123', saltRounds);
    const sellerHash = await bcrypt.hash('seller123', saltRounds);

    // Update admin
    await db.execute('UPDATE profiles SET password_hash = ? WHERE email = ?', [adminHash, 'admin@souk.tn']);

    // Update sellers
    for (let i = 1; i <= 10; i++) {
      await db.execute('UPDATE profiles SET password_hash = ? WHERE email = ?', [sellerHash, `seller${i}@souk.tn`]);
    }

    console.log('✅ Passwords updated successfully');

  } catch (error) {
    console.error('❌ Update failed:', error);
  } finally {
    if (db) await db.end();
  }
}

updatePasswords();