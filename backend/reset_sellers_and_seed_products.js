const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const sellers = [
  {
    email: 'seller1@souk.tn',
    fullName: 'Hamza Ben Ali',
    password: 'seller123',
    phone: '21612345678',
    storeName: 'Tech Store Sousse',
    description: 'Électronique et technologie à Sousse.',
    products: [
      {
        name: 'Écouteurs Bluetooth Premium',
        price: 89.99,
        categorySlug: 'electronique',
        image: 'https://source.unsplash.com/featured/?wireless-earbuds,audio',
        stock: 25,
      },
      {
        name: 'Clavier Gaming RGB',
        price: 129.99,
        categorySlug: 'electronique',
        image: 'https://source.unsplash.com/featured/?gaming-keyboard',
        stock: 30,
      },
      {
        name: 'Support Téléphone Ajustable',
        price: 24.99,
        categorySlug: 'electronique',
        image: 'https://source.unsplash.com/featured/?phone-stand',
        stock: 50,
      },
    ],
  },
  {
    email: 'seller2@souk.tn',
    fullName: 'Lina Gharbi',
    password: 'seller123',
    phone: '21622345678',
    storeName: 'Boutique Lina Fashion',
    description: 'Mode et vêtements tendance.',
    products: [
      {
        name: 'Pull Femme Hiver Cosy',
        price: 59.99,
        categorySlug: 'mode',
        image: 'https://source.unsplash.com/featured/?woman-sweater',
        stock: 35,
      },
      {
        name: 'Sac à Main Cuir Authentique',
        price: 119.99,
        categorySlug: 'mode',
        image: 'https://source.unsplash.com/featured/?leather-handbag',
        stock: 15,
      },
      {
        name: 'Sneakers Homme Confort',
        price: 89.99,
        categorySlug: 'mode',
        image: 'https://source.unsplash.com/featured/?mens-sneakers',
        stock: 28,
      },
    ],
  },
  {
    email: 'seller3@souk.tn',
    fullName: 'Mohamed Ayouni',
    password: 'seller123',
    phone: '21632345678',
    storeName: 'Maison Artisanale TN',
    description: 'Décoration et artisanat tunisien.',
    products: [
      {
        name: 'Lampe Décorative Artisanale',
        price: 79.99,
        categorySlug: 'maison-deco',
        image: 'https://source.unsplash.com/featured/?decorative-lamp',
        stock: 20,
      },
      {
        name: 'Miroir Mural Marocain',
        price: 94.99,
        categorySlug: 'maison-deco',
        image: 'https://source.unsplash.com/featured/?wall-mirror',
        stock: 18,
      },
      {
        name: 'Tapis Artisanal Fait Main',
        price: 189.99,
        categorySlug: 'maison-deco',
        image: 'https://source.unsplash.com/featured/?handmade-rug,carpet',
        stock: 12,
      },
    ],
  },
  {
    email: 'seller4@souk.tn',
    fullName: 'Amira Khaled',
    password: 'seller123',
    phone: '21642345678',
    storeName: 'Beauty Shop Tunis',
    description: 'Beauté et soins naturels.',
    products: [
      {
        name: 'Crème Visage Naturelle Bio',
        price: 54.99,
        categorySlug: 'beaute',
        image: 'https://source.unsplash.com/featured/?skincare,cream',
        stock: 40,
      },
      {
        name: 'Parfum Femme Oriental',
        price: 74.99,
        categorySlug: 'beaute',
        image: 'https://source.unsplash.com/featured/?perfume,fragrance',
        stock: 25,
      },
      {
        name: 'Bougie Parfumée Artisanale',
        price: 49.99,
        categorySlug: 'beaute',
        image: 'https://source.unsplash.com/featured/?scented-candle',
        stock: 60,
      },
    ],
  },
  {
    email: 'seller6@souk.tn',
    fullName: 'Riad Sport',
    password: 'seller123',
    phone: '21652345678',
    storeName: 'Sport & Wellness',
    description: 'Équipement sport et bien-être.',
    products: [],
  },
  {
    email: 'seller8@souk.tn',
    fullName: 'Nadia Beauty',
    password: 'seller123',
    phone: '21662345678',
    storeName: 'Natural Beauty',
    description: 'Produits beauté naturels.',
    products: [
      {
        name: "Savon naturel à l'huile d'olive",
        price: 45.0,
        categorySlug: 'beaute',
        image: 'https://source.unsplash.com/featured/?olive-soap',
        stock: 90,
      },
    ],
  },
];

function slugify(value) {
  return value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .replace(/-+/g, '-');
}

async function resetSellers() {
  let db;
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'souk_tn',
      multipleStatements: true,
    });

    console.log('✅ Connected to database');

    const [categoryRows] = await db.execute('SELECT id, slug FROM categories');
    const categoryMap = new Map(categoryRows.map((category) => [category.slug, category.id]));

    const [planRows] = await db.execute(
      'SELECT id FROM subscription_plans WHERE slug = ? LIMIT 1',
      ['single-plan']
    );
    const planId = planRows.length > 0 ? planRows[0].id : null;

    await db.beginTransaction();

    console.log('🧹 Suppression des vendeurs existants...');
    await db.execute('DELETE FROM profiles WHERE role = ?', ['seller']);

    for (const seller of sellers) {
      const passwordHash = await bcrypt.hash(seller.password, 12);

      const [profileResult] = await db.execute(
        `INSERT INTO profiles
          (email, full_name, role, password_hash, phone, created_at, updated_at)
         VALUES (?, ?, 'seller', ?, ?, NOW(), NOW())`,
        [seller.email, seller.fullName, passwordHash, seller.phone]
      );
      const sellerId = profileResult.insertId;
      console.log(`✅ Seller created: ${seller.email} (ID ${sellerId})`);

      const storeSlug = slugify(`${seller.storeName}-${sellerId}`);
      const [storeResult] = await db.execute(
        `INSERT INTO stores
          (owner_id, name, slug, description, phone, email, is_approved, is_active, commission_rate, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, TRUE, TRUE, 10.00, NOW(), NOW())`,
        [sellerId, seller.storeName, storeSlug, seller.description, seller.phone, seller.email]
      );
      const storeId = storeResult.insertId;
      console.log(`   → Store created: ${seller.storeName} (ID ${storeId})`);

      if (planId) {
        const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await db.execute(
          `INSERT INTO subscriptions
            (user_id, plan_id, status, current_period_start, current_period_end, created_at, updated_at)
           VALUES (?, ?, 'active', NOW(), ?, NOW(), NOW())`,
          [sellerId, planId, nextMonth]
        );
        console.log('   → Active subscription created');
      }

      for (const product of seller.products) {
        const categoryId = categoryMap.get(product.categorySlug) || null;
        const productSlug = slugify(product.name);

        const [productResult] = await db.execute(
          `INSERT INTO products
            (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, TRUE, NOW(), NOW())`,
          [
            storeId,
            categoryId,
            product.name,
            productSlug,
            product.description || `${product.name} - produit de qualité.`,
            product.price,
            product.stock || 100,
          ]
        );

        if (product.image) {
          await db.execute(
            `INSERT INTO product_images (product_id, image_url, sort_order, created_at)
             VALUES (?, ?, 1, NOW())`,
            [productResult.insertId, product.image]
          );
        }
      }

      console.log(`   → ${seller.products.length} products added`);
    }

    await db.commit();
    console.log('\n🎉 Reset complet. Tous les vendeurs ont été recréés avec leurs produits.');

  } catch (error) {
    if (db) {
      await db.rollback();
    }
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    if (db) await db.end();
  }
}

resetSellers();
