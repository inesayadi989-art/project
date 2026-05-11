const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function createStores() {
  let db;
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'souk_tn'
    });
    console.log('✅ Connected to MySQL database');

    // Get all sellers
    const [sellers] = await db.execute('SELECT id, email, full_name FROM profiles WHERE role = ?', ['seller']);

    for (const seller of sellers) {
      const slug = `vendeur-${seller.id}`;
      const name = `Magasin ${seller.full_name}`;

      // Insert store
      await db.execute(
        'INSERT IGNORE INTO stores (owner_id, name, slug, description, is_approved, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [seller.id, name, slug, `Magasin de ${seller.full_name}`, true, true]
      );
    }

    console.log('✅ Stores created successfully');

  } catch (error) {
    console.error('❌ Creation failed:', error);
  } finally {
    if (db) await db.end();
  }
}

createStores();