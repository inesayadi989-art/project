const mysql = require('mysql2/promise');
require('dotenv').config();

async function addProductColumns() {
  let db;
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'souk_tn'
    });

    console.log('✅ Connected to database');

    // Check if columns exist
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products'
      AND COLUMN_NAME IN ('compare_price', 'is_featured')
    `, [process.env.DB_NAME || 'souk_tn']);

    const existingColumns = columns.map(col => col.COLUMN_NAME);

    if (!existingColumns.includes('compare_price')) {
      await db.execute(`
        ALTER TABLE products ADD COLUMN compare_price DECIMAL(10,2) NULL AFTER price
      `);
      console.log('✅ Added compare_price column');
    } else {
      console.log('ℹ️  compare_price column already exists');
    }

    if (!existingColumns.includes('is_featured')) {
      await db.execute(`
        ALTER TABLE products ADD COLUMN is_featured BOOLEAN DEFAULT FALSE AFTER stock
      `);
      console.log('✅ Added is_featured column');
    } else {
      console.log('ℹ️  is_featured column already exists');
    }

    // Check if product_tags table exists
    const [tables] = await db.execute(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'product_tags'
    `, [process.env.DB_NAME || 'souk_tn']);

    if (tables.length === 0) {
      await db.execute(`
        CREATE TABLE product_tags (
          id INT AUTO_INCREMENT PRIMARY KEY,
          product_id INT NOT NULL,
          tag VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
          UNIQUE KEY unique_product_tag (product_id, tag)
        )
      `);
      console.log('✅ Created product_tags table');
    } else {
      console.log('ℹ️  product_tags table already exists');
    }

    console.log('✅ Database schema updated successfully');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (db) await db.end();
  }
}

addProductColumns();