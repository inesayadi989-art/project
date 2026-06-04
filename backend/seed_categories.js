const mysql = require('mysql2/promise');
require('dotenv').config();

async function seedCategories() {
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

    // Insert default categories
    const categories = [
      { name: '📱 Électronique', slug: 'electronique', description: 'Produits électroniques et gadgets', display_order: 1 },
      { name: '👕 Mode & Vêtements', slug: 'mode-vetements', description: 'Vêtements et accessoires de mode', display_order: 2 },
      { name: '🏠 Maison & Déco', slug: 'maison-deco', description: 'Articles pour la maison et décoration', display_order: 3 },
      { name: '💄 Santé & Beauté', slug: 'sante-beaute', description: 'Produits bien-être, beauté et santé', display_order: 4 },
      { name: '🧸 Sport & Loisirs', slug: 'sport-loisirs', description: 'Équipements de sport et activités de loisir', display_order: 5 },
      { name: '🎨 Artisanat & Art', slug: 'artisanat-art', description: 'Produits artisanaux et œuvres d\'art', display_order: 6 }
    ];

    for (const category of categories) {
      await db.execute(
        `INSERT IGNORE INTO categories (name, slug, description, display_order, is_active, created_at)
         VALUES (?, ?, ?, ?, true, NOW())`,
        [category.name, category.slug, category.description, category.display_order]
      );
    }

    console.log('✅ Categories seeded successfully');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    if (db) await db.end();
  }
}

seedCategories();