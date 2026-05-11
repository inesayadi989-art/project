const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    const [cols] = await db.execute('SHOW COLUMNS FROM subscription_plans');
    console.log('COLUMNS:', cols.map((c) => `${c.Field} (${c.Type})`).join('; '));
    const [rows] = await db.execute('SELECT id, name, slug, amount, interval_type, description FROM subscription_plans');
    console.log('ROWS:', JSON.stringify(rows, null, 2));
    await db.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
