const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function checkUsers() {
  let db;
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'souk_tn'
    });
    console.log('✅ Connected to MySQL database');

    const [rows] = await db.execute('SELECT id, email, full_name, role, password_hash FROM profiles WHERE email LIKE ?', ['%seller%']);
    console.log('Sellers:');
    rows.forEach(row => {
      console.log(`${row.email}: ${row.password_hash ? 'has password' : 'no password'}`);
    });

  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    if (db) await db.end();
  }
}

checkUsers();