const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  let db;
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'souk_tn'
    });

    console.log('Connected to DB, checking expired seller subscriptions...');

    const [expiredSubs] = await db.execute(
      `SELECT * FROM seller_subscriptions WHERE status != 'expired' AND end_date IS NOT NULL AND end_date < NOW()`
    );

    if (!expiredSubs || expiredSubs.length === 0) {
      console.log('No expired subscriptions found.');
      return;
    }

    for (const sub of expiredSubs) {
      try {
        console.log(`Expiring subscription id=${sub.id} for seller=${sub.seller_id}`);
        await db.execute(`UPDATE seller_subscriptions SET status = 'expired', updated_at = NOW() WHERE id = ?`, [sub.id]);

        // Hide seller products
        await db.execute(
          `UPDATE products p JOIN stores s ON p.store_id = s.id SET p.is_active = FALSE WHERE s.owner_id = ?`,
          [sub.seller_id]
        );

        // Log / create notification (the app currently logs notification creation)
        console.log(`Notification -> seller ${sub.seller_id}: Votre abonnement a expiré (subscription ${sub.id})`);

        // If you have a notification table, insert here. Currently the backend logs notifications only.
      } catch (err) {
        console.error('Failed to process expired subscription', sub.id, err);
      }
    }

    console.log('Expired subscriptions processing completed.');
  } catch (error) {
    console.error('Error checking expired subscriptions:', error);
  } finally {
    if (db) await db.end();
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
