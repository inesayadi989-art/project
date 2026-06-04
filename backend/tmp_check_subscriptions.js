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

    const sellerId = 22;
    const [rows] = await pool.execute(
      'SELECT * FROM seller_subscriptions WHERE seller_id = ? ORDER BY created_at DESC LIMIT 5',
      [sellerId]
    );

    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
