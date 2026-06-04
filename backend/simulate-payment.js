const fs = require('fs');
const env = fs.readFileSync('./.env','utf8').split(/\r?\n/).filter(Boolean).reduce((m,l)=>{const p=l.split('=');m[p[0]]=p.slice(1).join('=');return m},{});
const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: env.DB_HOST,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME
    });
    
    // Update payment status to completed
    await conn.execute('UPDATE payments SET status = ?, updated_at = NOW() WHERE id = ?', ['completed', 23]);
    
    // Update order status to confirmed and paid
    await conn.execute('UPDATE orders SET status = ?, payment_status = ?, paid_at = NOW() WHERE id = ?', ['confirmed', 'paid', 29]);
    
    // Verify updates
    const [payments] = await conn.execute('SELECT id, status FROM payments WHERE id = 23');
    const [orders] = await conn.execute('SELECT id, status, payment_status FROM orders WHERE id = 29');
    
    console.log('✅ PAYMENT UPDATED:', JSON.stringify(payments, null, 2));
    console.log('✅ ORDER UPDATED:', JSON.stringify(orders, null, 2));
    
    conn.end();
  } catch(e) {
    console.log('ERROR:', e.message);
  }
})();
