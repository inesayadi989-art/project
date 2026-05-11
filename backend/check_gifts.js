const mysql = require('mysql2/promise');
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'souk_tn',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

(async () => {
  const [rows] = await db.execute('SELECT id, name, price FROM products WHERE price <= 200 AND (name LIKE "%cadeau%" OR name LIKE "%هدية%")');
  console.log('Gift products:', rows);
  await db.end();
})();