const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

async function testOrdersWithImages() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'souk_tn'
  });

  try {
    console.log('🔍 Testing API responses for orders...\n');

    // Get a test customer ID
    const [customers] = await connection.execute(`
      SELECT DISTINCT customer_id FROM orders LIMIT 1
    `);

    if (customers.length === 0) {
      console.log('❌ No orders found in database');
      return;
    }

    const customerId = customers[0].customer_id;
    console.log('✅ Found customer:', customerId);

    // Get orders for this customer
    const [orders] = await connection.execute(`
      SELECT o.id, o.order_number, o.status, o.total
      FROM orders o
      WHERE o.customer_id = ?
      LIMIT 2
    `, [customerId]);

    console.log('📋 Found', orders.length, 'orders\n');

    // For each order, get items WITH images
    for (const order of orders) {
      console.log(`\n📦 Order #${order.order_number} (ID: ${order.id})`);
      
      const [items] = await connection.execute(`
        SELECT oi.id, oi.product_id, oi.quantity, oi.price as unit_price, 
               p.name as product_name, pi.image_url
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.sort_order = 0
        WHERE oi.order_id = ?
      `, [order.id]);

      console.log(`   Items in order: ${items.length}`);
      items.forEach((item, idx) => {
        console.log(`   [${idx + 1}] ${item.product_name}`);
        console.log(`       Image URL: ${item.image_url || 'NULL'}`);
        console.log(`       Quantity: ${item.quantity}`);
      });
    }

    // Also test seller orders
    console.log('\n\n🔍 Testing seller orders...\n');

    const [sellers] = await connection.execute(`
      SELECT DISTINCT store_id FROM orders LIMIT 1
    `);

    if (sellers.length > 0) {
      const storeId = sellers[0].store_id;
      console.log('✅ Found store:', storeId);

      const [sellerOrders] = await connection.execute(`
        SELECT o.id, o.order_number, o.status, o.total
        FROM orders o
        WHERE o.store_id = ?
        LIMIT 2
      `, [storeId]);

      console.log('📋 Found', sellerOrders.length, 'seller orders\n');

      for (const order of sellerOrders) {
        console.log(`\n📦 Seller Order #${order.order_number} (ID: ${order.id})`);
        
        const [items] = await connection.execute(`
          SELECT oi.id, oi.product_id, oi.quantity, oi.price as unit_price, 
                 p.name as product_name, pi.image_url
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.sort_order = 0
          WHERE oi.order_id = ?
        `, [order.id]);

        console.log(`   Items in order: ${items.length}`);
        items.forEach((item, idx) => {
          console.log(`   [${idx + 1}] ${item.product_name}`);
          console.log(`       Image URL: ${item.image_url || 'NULL'}`);
          console.log(`       Quantity: ${item.quantity}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

testOrdersWithImages();
