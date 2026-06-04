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

    console.log('Connected. Backfilling subscription notifications...');

    // Ensure notifications table exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        seller_id INT NULL,
        recipient_id INT NULL,
        recipient_role ENUM('seller','admin','customer') DEFAULT 'seller',
        subscription_id INT NULL,
        type VARCHAR(100) NULL,
        title VARCHAR(255) NULL,
        message TEXT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Find rejected or expired seller subscriptions that don't have a corresponding notification
    const [subs] = await db.execute(`
      SELECT ss.* FROM seller_subscriptions ss
      LEFT JOIN notifications n ON n.subscription_id = ss.id AND n.recipient_role = 'seller'
      WHERE (ss.status = 'rejected' OR ss.status = 'expired')
        AND (n.id IS NULL)
      LIMIT 500
    `);

    if (!subs || subs.length === 0) {
      console.log('No subscriptions to backfill.');
      return;
    }

    for (const s of subs) {
      const type = s.status === 'rejected' ? 'rejected' : 'expired';
      const title = s.status === 'rejected' ? 'Demande d abonnement rejetée' : 'Abonnement expiré';
      const message = s.status === 'rejected'
        ? `Votre demande d abonnement (ID ${s.id}) a été rejetée.`
        : `Votre abonnement (ID ${s.id}) a expiré.`;

      await db.execute(
        `INSERT INTO notifications (seller_id, recipient_id, recipient_role, subscription_id, type, title, message, is_read, created_at)
         VALUES (?, ?, 'seller', ?, ?, ?, ?, FALSE, NOW())`,
        [s.seller_id, s.seller_id, s.id, type, title, message]
      );

      console.log(`Inserted notification for subscription ${s.id} (seller ${s.seller_id})`);
    }

    console.log('Backfill complete.');
  } catch (err) {
    console.error('Backfill failed:', err);
  } finally {
    if (db) await db.end();
  }
}

if (require.main === module) run();

module.exports = { run };
