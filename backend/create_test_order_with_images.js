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
    
    // Get the new seller's store
    const [stores] = await conn.query(`
      SELECT id FROM stores WHERE owner_id = (
        SELECT id FROM profiles WHERE email = 'seller@souk.tn'
      )
    `);
    
    const storeId = stores[0].id;
    console.log('Store ID:', storeId);
    
    // Get a customer
    const [customers] = await conn.query(`
      SELECT id FROM profiles WHERE role = 'customer' LIMIT 1
    `);
    
    const customerId = customers[0].id;
    
    // Get the first product with an image from ANY store
    const [productsWithImages] = await conn.query(`
      SELECT DISTINCT p.id, p.price, p.store_id, pi.image_url
      FROM products p
      JOIN product_images pi ON p.id = pi.product_id
      WHERE pi.sort_order = 0
      LIMIT 2
    `);
    
    if (!productsWithImages.length) {
      console.log('No products with images found');
      process.exit(1);
    }
    
    console.log('Found products with images:');
    productsWithImages.forEach(p => {
      console.log(`  - Product ${p.id} (Store ${p.store_id}): ${p.image_url}`);
    });
    
    // Create an order with the new seller's store
    const [orderResult] = await conn.query(`
      INSERT INTO orders (customer_id, store_id, total, status, payment_status, payment_method, shipping_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      customerId,
      storeId,
      productsWithImages[0].price * 2,
      'pending_vendor_confirmation',
      'unpaid',
      'card',
      JSON.stringify({
        full_name: 'Test Address',
        phone: '+216 00 000 100',
        address_line1: '123 Test St',
        city: 'Tunis',
        governorate: 'Sfax'
      })
    ]);
    
    const orderId = orderResult.insertId;
    console.log('\nOrder created with ID:', orderId);
    
    // Add the products with images to the order
    for (const product of productsWithImages) {
      await conn.query(`
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES (?, ?, ?, ?)
      `, [orderId, product.id, 1, product.price]);
    }
    
    // Verify the order items
    const [orderItems] = await conn.query(`
      SELECT oi.id, oi.product_id, p.name, oi.price, pi.image_url
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.sort_order = 0
      WHERE oi.order_id = ?
    `, [orderId]);
    
    console.log('\nOrder items with images:');
    orderItems.forEach(item => {
      console.log(`  - ${item.product_id} (${item.name}): ${item.image_url}`);
    });
    
    conn.release();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
