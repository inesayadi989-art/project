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

    // Insert default categories
    const categories = [
      { name: 'Électronique', slug: 'electronique', description: 'Produits électroniques et gadgets', display_order: 1 },
      { name: 'Mode & Vêtements', slug: 'mode-vetements', description: 'Vêtements et accessoires de mode', display_order: 2 },
      { name: 'Maison & Déco', slug: 'maison-deco', description: 'Articles pour la maison et décoration', display_order: 3 },
      { name: 'Alimentation', slug: 'alimentation', description: 'Produits alimentaires et boissons', display_order: 4 },
      { name: 'Artisanat & Art', slug: 'artisanat-art', description: 'Produits artisanaux et œuvres d\'art', display_order: 5 },
      { name: 'Sport & Loisirs', slug: 'sport-loisirs', description: 'Équipements sportifs et loisirs', display_order: 6 },
      { name: 'Livres & Papeterie', slug: 'livres-papeterie', description: 'Livres et fournitures scolaires', display_order: 7 },
      { name: 'Santé & Beauté', slug: 'sante-beaute', description: 'Produits de santé et beauté', display_order: 8 },
      { name: 'Jardinage', slug: 'jardinage', description: 'Outils et plantes de jardinage', display_order: 9 },
      { name: 'Animaux', slug: 'animaux', description: 'Produits pour animaux de compagnie', display_order: 10 }
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