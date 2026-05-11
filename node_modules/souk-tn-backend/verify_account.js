const mysql = require('mysql2/promise');

async function verifyAccount() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'souk_tn'
    });

    const [rows] = await conn.execute(
      'SELECT id, email, full_name, role FROM profiles WHERE email = ?',
      ['ayadiin275@gmail.com']
    );

    if (rows.length > 0) {
      console.log('✅ Account created successfully:');
      console.log('ID:', rows[0].id);
      console.log('Email:', rows[0].email);
      console.log('Full Name:', rows[0].full_name);
      console.log('Role:', rows[0].role);
    } else {
      console.log('❌ Account not found');
    }

    conn.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

verifyAccount();
