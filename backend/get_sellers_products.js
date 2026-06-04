const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2/promise');

async function getSellerProducts() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'souk_tn'
    });

    const [rows] = await conn.execute(`
      SELECT
        p.id AS seller_id,
        p.email AS seller_email,
        p.full_name AS seller_name,
        p.phone AS seller_phone,
        p.city AS seller_city,
        s.id AS store_id,
        s.name AS store_name,
        s.is_approved AS store_approved,
        s.is_active AS store_active,
        s.commission_rate AS store_commission_rate,
        pr.id AS product_id,
        pr.name AS product_name,
        pr.price AS product_price,
        pr.stock AS product_stock,
        pr.is_approved AS product_approved,
        pr.is_active AS product_active,
        c.name AS category_name
      FROM profiles p
      LEFT JOIN stores s ON p.id = s.owner_id
      LEFT JOIN products pr ON s.id = pr.store_id
      LEFT JOIN categories c ON pr.category_id = c.id
      WHERE p.role = 'seller'
      ORDER BY p.id, s.id, pr.id
    `);

    const result = {};

    rows.forEach(row => {
      if (!result[row.seller_email]) {
        result[row.seller_email] = {
          seller_id: row.seller_id,
          seller_name: row.seller_name,
          seller_email: row.seller_email,
          seller_phone: row.seller_phone,
          seller_city: row.seller_city,
          stores: []
        };
      }

      if (row.store_id && !result[row.seller_email].stores.find(store => store.store_id === row.store_id)) {
        result[row.seller_email].stores.push({
          store_id: row.store_id,
          store_name: row.store_name,
          is_approved: row.store_approved,
          is_active: row.store_active,
          commission_rate: row.store_commission_rate,
          products: []
        });
      }

      if (row.product_id && row.store_id) {
        const store = result[row.seller_email].stores.find(store => store.store_id === row.store_id);
        if (store && !store.products.find(prod => prod.product_id === row.product_id)) {
          store.products.push({
            product_id: row.product_id,
            product_name: row.product_name,
            price: row.product_price != null ? Number(row.product_price) : null,
            stock: row.product_stock,
            category: row.category_name || 'N/A',
            is_approved: row.product_approved,
            is_active: row.product_active
          });
        }
      }
    });

    const sellers = Object.values(result);
    const totalSellers = sellers.length;
    const totalStores = sellers.reduce((sum, seller) => sum + seller.stores.length, 0);
    const totalProducts = sellers.reduce(
      (sum, seller) => sum + seller.stores.reduce((storeSum, store) => storeSum + store.products.length, 0),
      0
    );
    const commissionRates = sellers.flatMap(seller => seller.stores
      .map(store => Number(store.commission_rate))
      .filter(rate => !Number.isNaN(rate)));
    const averageCommission = commissionRates.length > 0
      ? commissionRates.reduce((sum, value) => sum + value, 0) / commissionRates.length
      : 0;

    console.log("\n========== RÉSUMÉ DES VENDEURS ET PRODUITS ==========");

    sellers.forEach((seller, idx) => {
      console.log(`\n### ${idx + 1}. ${seller.seller_name}`);
      console.log(`- Email: ${seller.seller_email}`);
      console.log(`- Téléphone: ${seller.seller_phone}`);
      console.log(`- Ville: ${seller.seller_city || 'N/A'}`);

      if (seller.stores.length === 0) {
        console.log('- Boutique: ❌ Aucune boutique');
      } else {
        seller.stores.forEach((store) => {
          console.log(`- Boutique: ${store.store_name} (${store.is_approved ? 'Approuvée ✅' : 'En attente ❌'})`);
          if (store.products.length === 0) {
            console.log('  - Produits: ❌ Aucun produit');
          } else {
            console.log(`  - Produits (${store.products.length}):`);
            store.products.forEach((prod) => {
              console.log(`    - ${prod.product_name} - ${prod.price.toFixed(2)} DT (${prod.stock} en stock)`);
            });
          }
        });
      }
    });

    console.log('\n---\n');
    console.log('📈 Statistiques Globales');
    console.log(`- Total Vendeurs: ${totalSellers}`);
    console.log(`- Total Boutiques: ${totalStores}`);
    console.log(`- Total Produits: ${totalProducts}`);
    console.log(`- Commission moyenne: ${averageCommission.toFixed(2)}%`);

    const output = {
      summary: {
        totalSellers,
        totalStores,
        totalProducts,
        averageCommission: Number(averageCommission.toFixed(2))
      },
      sellers
    };

    const outputPath = path.resolve(__dirname, 'seller_products_summary.json');
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8');

    console.log(`\n✅ Rapport sauvegardé: ${outputPath}`);

    await conn.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

getSellerProducts();
