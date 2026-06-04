const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
(async () => {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'souk_tn',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    const [rows] = await pool.execute('SHOW CREATE TABLE seller_subscriptions');
    console.log(JSON.stringify(rows, null, 2));
    const [count] = await pool.execute('SELECT COUNT(*) AS cnt FROM seller_subscriptions');
    console.log('COUNT', count[0]);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
