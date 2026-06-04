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
      SELECT id, owner_id FROM stores WHERE owner_id = (
        SELECT id FROM profiles WHERE email = 'seller@souk.tn'
      )
    `);
    
    if (!stores.length) {
      console.log('No store found for seller@souk.tn');
      conn.release();
      process.exit(1);
    }
    
    const storeId = stores[0].id;
    const sellerId = stores[0].owner_id;
    console.log('Seller ID:', sellerId, 'Store ID:', storeId);
    
    // Get a customer
    const [customers] = await conn.query(`
      SELECT id FROM profiles WHERE role = 'customer' LIMIT 1
    `);
    
    let customerId = customers[0]?.id;
    
    if (!customerId) {
      console.log('No customer found, creating one...');
      const [result] = await conn.query(`
        INSERT INTO profiles (email, full_name, role, phone, created_at, updated_at)
        VALUES (?, ?, ?, ?, NOW(), NOW())
      `, ['test_customer@souk.tn', 'Test Customer', 'customer', '+216 00 000 100']);
      customerId = result.insertId;
    }
    
    console.log('Customer ID:', customerId);
    
    // Get a product to add to the order
    const [products] = await conn.query(`
      SELECT p.id, p.price FROM products p
      WHERE p.store_id = ? AND p.is_active = true
      LIMIT 2
    `, [storeId]);
    
    if (!products.length) {
      console.log('No products found in the store');
      // Create a test product
      const [productResult] = await conn.query(`
        INSERT INTO products (store_id, name, description, price, stock, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [storeId, 'Test Product', 'A test product', 100, 10, true]);
      
      products.push({ id: productResult.insertId, price: 100 });
    }
    
    console.log('Found', products.length, 'products');
    
    // Create an order
    const [orderResult] = await conn.query(`
      INSERT INTO orders (customer_id, store_id, total, status, payment_status, payment_method, shipping_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      customerId,
      storeId,
      products[0].price * 2,
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
    console.log('Order created with ID:', orderId);
    
    // Add items to the order
    for (let i = 0; i < Math.min(2, products.length); i++) {
      await conn.query(`
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES (?, ?, ?, ?)
      `, [orderId, products[i].id, 2, products[i].price]);
    }
    
    console.log('Order items added');
    
    // Verify the order was created with product details
    const [orderItems] = await conn.query(`
      SELECT oi.id, oi.product_id, p.name, p.price, pi.image_url
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.sort_order = 0
      WHERE oi.order_id = ?
    `, [orderId]);
    
    console.log('\nOrder items details:', JSON.stringify(orderItems, null, 2));
    
    conn.release();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
