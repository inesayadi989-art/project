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
  const [rows] = await db.execute('SELECT id, name, price, category_id FROM products WHERE name LIKE "%café%" OR name LIKE "%cadeau%" OR name LIKE "%tunisien%"');
  console.log('New products:', rows);
  await db.end();
})();