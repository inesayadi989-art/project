const mysql = require('mysql2/promise');
(async () => {
  try {
    const c = await mysql.createConnection({host:'localhost', user:'root', password:'', database:'souk_tn'});
    console.log('Connected to DB');
    const [idx] = await c.execute("SELECT COUNT(*) as cnt FROM information_schema.statistics WHERE table_schema = 'souk_tn' AND table_name = 'seller_subscriptions' AND index_name = 'unique_active_seller_subscription'");
    if (idx[0].cnt > 0) {
      console.log('Dropping index unique_active_seller_subscription');
      await c.execute('DROP INDEX unique_active_seller_subscription ON seller_subscriptions');
    } else {
      console.log('Index unique_active_seller_subscription not found');
    }
    console.log('Altering status enum...');
    await c.execute("ALTER TABLE seller_subscriptions MODIFY COLUMN status ENUM('pending_admin','active','rejected','expired') DEFAULT 'pending_admin'");
    console.log('Note: seller_subscription_notifications table has been removed - notifications are now displayed in the navbar only');
    console.log('Done');
    await c.end();
  } catch (e) {
    console.error('DB alter error', e);
    process.exit(1);
  }
})();
