const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config({path:'.env'});

(async () => {
  try {
    const db = await mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10
    });

    console.log('=== Orders table sample ===');
    const [orders] = await db.execute(
      'SELECT id, total, payment_status, status, admin_commission FROM orders LIMIT 5'
    );
    console.log('Total orders in sample:', orders.length);
    console.log(JSON.stringify(orders, null, 2));

    console.log('\n=== Seller Subscriptions table sample ===');
    const [subs] = await db.execute(
      'SELECT id, amount, payment_status, status FROM seller_subscriptions LIMIT 5'
    );
    console.log('Total subscriptions in sample:', subs.length);
    console.log(JSON.stringify(subs, null, 2));

    console.log('\n=== Paid Orders Revenue ===');
    const [[orderRevenue]] = await db.execute(
      "SELECT SUM(total) as totalOrderRevenue, COUNT(*) as count FROM orders WHERE (payment_status = 'paid' OR payment_status = 'paid_confirmed' OR status = 'paid_confirmed')"
    );
    console.log(JSON.stringify(orderRevenue, null, 2));

    console.log('\n=== Total Commission Revenue ===');
    const [[commission]] = await db.execute(
      "SELECT SUM(admin_commission) as totalCommission, COUNT(*) as count FROM orders WHERE (payment_status = 'paid' OR payment_status = 'paid_confirmed' OR status = 'paid_confirmed')"
    );
    console.log(JSON.stringify(commission, null, 2));

    console.log('\n=== Subscription Revenue ===');
    const [[subRevenue]] = await db.execute(
      "SELECT SUM(amount) as totalSubscriptionRevenue, COUNT(*) as count FROM seller_subscriptions WHERE payment_status = 'paid'"
    );
    console.log(JSON.stringify(subRevenue, null, 2));

    console.log('\n=== All payment statuses in orders ===');
    const [statuses] = await db.execute(
      "SELECT DISTINCT payment_status, status FROM orders"
    );
    console.log(JSON.stringify(statuses, null, 2));

    console.log('\n=== All payment statuses in subscriptions ===');
    const [subStatuses] = await db.execute(
      "SELECT DISTINCT payment_status FROM seller_subscriptions"
    );
    console.log(JSON.stringify(subStatuses, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
    process.exit(1);
  }
})();
