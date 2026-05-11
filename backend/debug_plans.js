const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    
    console.log('\n=== SUBSCRIPTION PLANS ===');
    const [plans] = await db.execute('SELECT * FROM subscription_plans');
    console.log(JSON.stringify(plans, null, 2));
    
    console.log('\n=== TESTING QUERY ===');
    const [result] = await db.execute('SELECT id, name, slug, description, amount, interval_type, interval_count FROM subscription_plans WHERE slug = ?', ['single-plan']);
    console.log('Query result:', JSON.stringify(result, null, 2));
    
    await db.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
