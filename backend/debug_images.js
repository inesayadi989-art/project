const mysql = require('mysql2/promise');

async function debug() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'souk_tn'
  });

  try {
    console.log('🔍 Checking products with images...\n');

    const [products] = await connection.execute(`
      SELECT p.id, p.name, COUNT(pi.id) as image_count
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      GROUP BY p.id
      LIMIT 10
    `);

    console.log('📦 Products found:', products.length);
    products.forEach(p => {
      console.log(`  - ID: ${p.id}, Name: ${p.name}, Images: ${p.image_count}`);
    });

    console.log('\n🖼️  Checking product images...\n');

    const [images] = await connection.execute(`
      SELECT pi.id, pi.product_id, pi.image_url, pi.sort_order, p.name
      FROM product_images pi
      JOIN products p ON pi.product_id = p.id
      WHERE pi.sort_order = 0
      LIMIT 10
    `);

    console.log('🖼️  Images found:', images.length);
    images.forEach(img => {
      console.log(`  - Product: ${img.name} (${img.product_id}), Image URL: ${img.image_url}`);
    });

    console.log('\n📋 Checking order items with images...\n');

    const [orderItems] = await connection.execute(`
      SELECT oi.id, oi.order_id, oi.product_id, p.name, pi.image_url
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.sort_order = 0
      LIMIT 10
    `);

    console.log('📋 Order items found:', orderItems.length);
    orderItems.forEach(item => {
      console.log(`  - Order: #${item.order_id}, Product: ${item.name}, Image URL: ${item.image_url}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

debug();
