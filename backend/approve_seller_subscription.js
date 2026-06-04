const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'souk_tn'
});

(async () => {
  try {
    // Check seller subscriptions
    const [subs] = await db.execute('SELECT * FROM seller_subscriptions WHERE seller_id = 34 ORDER BY created_at DESC LIMIT 1');
    console.log('Current subscription:', JSON.stringify(subs, null, 2));
    
    if (subs.length > 0) {
      // Update to active
      const today = new Date();
      const endDate = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year
      
      const result = await db.execute(
        'UPDATE seller_subscriptions SET status = ?, payment_status = ?, end_date = ?, start_date = ? WHERE id = ?',
        ['active', 'paid', endDate, today, subs[0].id]
      );
      console.log('✅ Updated subscription to active');
      
      // Verify update
      const [updated] = await db.execute('SELECT * FROM seller_subscriptions WHERE id = ?', [subs[0].id]);
      console.log('Updated subscription:', JSON.stringify(updated, null, 2));
    } else {
      console.log('❌ No subscription found for seller ID 34 - creating new one...');
      
      // Create new subscription
      const today = new Date();
      const endDate = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year
      
      const [result] = await db.execute(
        'INSERT INTO seller_subscriptions (seller_id, status, payment_status, start_date, end_date, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [34, 'active', 'paid', today, endDate, today]
      );
      console.log('✅ Created new subscription:', result.insertId);
      
      // Verify creation
      const [created] = await db.execute('SELECT * FROM seller_subscriptions WHERE id = ?', [result.insertId]);
      console.log('Created subscription:', JSON.stringify(created, null, 2));
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    db.end();
  }
})();
