const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'souk_tn',
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0
});

(async () => {
  try {
    const conn = await db.getConnection();
    
    // Simulate the exact query from the seller/orders endpoint
    // First get a store ID
    const [stores] = await conn.query(`
      SELECT id FROM stores LIMIT 1
    `);
    
    if (!stores.length) {
      console.log('No stores found');
      process.exit(1);
    }
    
    const storeId = stores[0].id;
    console.log('Store ID:', storeId);
    
    // Get orders for this store
    const [orders] = await conn.query(`
      SELECT o.id
      FROM orders o
      WHERE o.store_id = ?
      LIMIT 1
    `, [storeId]);
    
    if (!orders.length) {
      console.log('No orders found');
      process.exit(1);
    }
    
    const orderId = orders[0].id;
    console.log('Order ID:', orderId);
    
    // Run the exact query from the endpoint
    const [items] = await conn.query(`
      SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.price as unit_price, p.name as product_name, pi.image_url
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.sort_order = 0
      WHERE oi.order_id = ?
    `, [orderId]);
    
    console.log('\nOrder items with image_url:');
    console.log(JSON.stringify(items, null, 2));
    
    conn.release();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
