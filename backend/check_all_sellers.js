const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'souk_tn'
});

(async () => {
  try {
    // Find all sellers with stores
    const [sellers] = await db.execute(`
      SELECT DISTINCT p.id, p.email, p.full_name, s.id as store_id, s.name as store_name
      FROM profiles p
      LEFT JOIN stores s ON p.id = s.owner_id
      WHERE p.role = 'seller'
      LIMIT 5
    `);
    
    console.log('All sellers:');
    for (const seller of sellers) {
      const [subs] = await db.execute(
        'SELECT status, payment_status FROM seller_subscriptions WHERE seller_id = ? ORDER BY created_at DESC LIMIT 1',
        [seller.id]
      );
      const subStatus = subs.length > 0 ? subs[0].status : 'NONE';
      console.log(`  ID: ${seller.id}, Email: ${seller.email}, Store: ${seller.store_id}, Subscription: ${subStatus}`);
      
      // If no subscription or not active, create one
      if (subs.length === 0 || subs[0].status !== 'active') {
        const today = new Date();
        const endDate = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000);
        
        if (subs.length > 0) {
          // Update existing
          await db.execute(
            'UPDATE seller_subscriptions SET status = ?, payment_status = ?, end_date = ?, start_date = ? WHERE seller_id = ?',
            ['active', 'paid', endDate, today, seller.id]
          );
          console.log(`    ✅ Updated subscription to active`);
        } else {
          // Create new
          await db.execute(
            'INSERT INTO seller_subscriptions (seller_id, status, payment_status, start_date, end_date, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [seller.id, 'active', 'paid', today, endDate, today]
          );
          console.log(`    ✅ Created active subscription`);
        }
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    db.end();
  }
})();
