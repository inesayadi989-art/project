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
    
    // Check if images exist
    const [images] = await conn.query(`
      SELECT pi.product_id, pi.image_url, p.name 
      FROM product_images pi
      JOIN products p ON pi.product_id = p.id
      WHERE p.name LIKE '%Écouteurs%' OR p.name LIKE '%Clavier%'
      LIMIT 5
    `);
    
    console.log('Images trouvées:', JSON.stringify(images, null, 2));
    
    // Also check all products with their images
    const [allProducts] = await conn.query(`
      SELECT p.id, p.name, COUNT(pi.id) as image_count
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.name LIKE '%Écouteurs%' OR p.name LIKE '%Clavier%'
      GROUP BY p.id
    `);
    
    console.log('\nProduits et count d\'images:', JSON.stringify(allProducts, null, 2));
    
    conn.release();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
