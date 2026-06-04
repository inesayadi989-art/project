const mysql = require('mysql2/promise');
require('dotenv').config();

async function listSellers() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'souk_tn'
  });

  const [sellers] = await db.execute(
    'SELECT id, email, full_name FROM profiles WHERE role = ? ORDER BY id',
    ['seller']
  );

  console.log('\n📊 Vendeurs actuels:');
  sellers.forEach((s, i) => {
    console.log(`${i + 1}. ${s.email} - ${s.full_name} (ID: ${s.id})`);
  });

  await db.end();
  process.exit(0);
}

listSellers();
