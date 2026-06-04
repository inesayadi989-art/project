const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

(async () => {
  const db = await mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('Testing fixed queries...');
  
  const [[sub]] = await db.execute(
    'SELECT COALESCE(SUM(amount), 0) as total FROM seller_subscriptions WHERE payment_status = ?',
    ['paid']
  );
  console.log('Subscription Revenue:', sub.total);
  
  const [[com]] = await db.execute(
    'SELECT COALESCE(SUM(admin_commission), 0) as total FROM orders WHERE payment_status = ? OR payment_status = ? OR status = ?',
    ['paid', 'paid_confirmed', 'paid_confirmed']
  );
  console.log('Commission Revenue:', com.total);
  
  const platformTotal = parseFloat(com.total || 0) + parseFloat(sub.total || 0);
  console.log('Platform Total:', platformTotal);
  
  process.exit(0);
})();
