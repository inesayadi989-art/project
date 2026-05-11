const mysql = require('mysql2/promise');

async function checkSellers() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'souk_tn'
    });

    const [rows] = await conn.execute('SELECT email, role FROM profiles WHERE role = "seller"');
    console.log('Existing sellers:', rows);

    conn.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSellers();