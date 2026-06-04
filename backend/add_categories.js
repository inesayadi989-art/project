const mysql = require('mysql2/promise');
require('dotenv').config();

async function addCategories() {
  let db;
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'souk_tn'
    });

    console.log('✅ Connected to database');

    await db.execute("DELETE FROM categories WHERE slug = 'alimentation-produits-locaux'");

    // Categories to add
    const categories = [
      { id: 32, name: '📱 Électronique', slug: 'electronique', description: null, icon_url: null, display_order: 1, is_active: 1, created_at: '2026-05-07 17:30:09' },
      { id: 33, name: '👕 Mode & Vêtements', slug: 'mode-vetements', description: null, icon_url: null, display_order: 2, is_active: 1, created_at: '2026-05-07 17:30:09' },
      { id: 34, name: '🏠 Maison & Déco', slug: 'maison-deco', description: null, icon_url: null, display_order: 3, is_active: 1, created_at: '2026-05-07 17:30:09' },
      { id: 35, name: '💄 Santé & Beauté', slug: 'sante-beaute', description: null, icon_url: null, display_order: 4, is_active: 1, created_at: '2026-05-07 17:30:09' },
      { id: 37, name: '🧸 Sport & Loisirs', slug: 'sport-loisirs', description: null, icon_url: null, display_order: 5, is_active: 1, created_at: '2026-05-07 17:30:09' },
      { id: 38, name: '🎨 Artisanat & Art', slug: 'artisanat-art', description: null, icon_url: null, display_order: 6, is_active: 1, created_at: '2026-05-07 17:30:09' }
    ];

    for (const category of categories) {
      await db.execute(
        `INSERT INTO categories (id, name, slug, description, icon_url, display_order, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         slug = VALUES(slug),
         description = VALUES(description),
         icon_url = VALUES(icon_url),
         display_order = VALUES(display_order),
         is_active = VALUES(is_active),
         created_at = VALUES(created_at)`,
        [category.id, category.name, category.slug, category.description, category.icon_url, category.display_order, category.is_active, category.created_at]
      );
    }

    console.log('✅ Categories added/updated successfully');

  } catch (error) {
    console.error('❌ Adding categories failed:', error);
  } finally {
    if (db) await db.end();
  }
}

addCategories();