const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const { authenticateToken, requireSubscription } = require('../middleware/auth');
const { buildImageUrl } = require('../helpers/formatting');
const { parseBudget, normalizeAssistantQuery } = require('../services/textUtils');
const { parseMessage, rankProducts, generateResponse } = require('../services/assistantService');

const router = express.Router();

// Upload configuration
const uploadDir = path.join(__dirname, '../uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    cb(allowed.includes(file.mimetype) ? null : new Error('Only images allowed'), allowed.includes(file.mimetype));
  },
});

// Helper: Format product response
const formatProduct = (product, req) => {
  const imageUrls = product.images ? product.images.split('||').filter(Boolean) : [];
  return {
    ...product,
    product_images: imageUrls.map((url, i) => ({ url: buildImageUrl(req, url), is_primary: i === 0 })),
    stock_qty: product.stock ?? 0,
    compare_price: product.compare_price ?? null,
    tags: product.tags ? (Array.isArray(product.tags) ? product.tags : product.tags.split(',').map(t => t.trim()).filter(Boolean)) : [],
    is_featured: product.is_featured ?? false,
    is_published: product.is_published ?? true,
    sold_count: product.sold_count ?? 0,
  };
};

// Smart Assistant (AI Shopping)
router.post('/smart-assistant', async (req, res) => {
  try {
    const db = req.db;
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

    const parsed = parseMessage(message, { 
      arabicDigitsToLatin: require('../services/textUtils').arabicDigitsToLatin,
      normalizeAssistantQuery 
    });
    const searchTerms = parsed.keywords || [];

    let sql = `SELECT p.*, s.name as store_name, s.slug as store_slug, c.name as category_name, c.slug as category_slug,
                     GROUP_CONCAT(pi.image_url SEPARATOR '||') as images
              FROM products p LEFT JOIN stores s ON p.store_id = s.id
              LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN product_images pi ON p.id = pi.product_id
              WHERE p.is_approved = true AND p.is_active = true`;
    
    const params = [];
    const conditions = [];

    if (parsed.strictFilter) {
      conditions.push(`(${parsed.strictFilter})`);
    } else if (parsed.categoryId) {
      conditions.push('p.category_id = ?');
      params.push(parsed.categoryId);
    }

    if (searchTerms.length > 0 && !parsed.strictFilter) {
      const termConds = searchTerms.map(() => '(p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)').join(' OR ');
      conditions.push(`(${termConds})`);
      searchTerms.forEach(t => { const q = `%${t}%`; params.push(q, q, q); });
    }

    if (parsed.budget) {
      conditions.push('p.price <= ?');
      params.push(parsed.budget);
    }

    if (conditions.length) sql += ' AND ' + conditions.join(' AND ');
    sql += ' GROUP BY p.id LIMIT 50';

    const [allProducts] = await db.execute(sql, params);
    allProducts.forEach(p => { p.images = p.images ? p.images.split('||').filter(Boolean) : []; });

    const rankedProds = rankProducts(allProducts, parsed).filter(p => !p.rejected);
    const top = rankedProds.slice(0, 5);
    const alternatives = rankedProds.slice(5, 10);

    res.json({
      message: generateResponse(parsed, rankedProds),
      parsed: { budget: parsed.budget, intent: parsed.intent, categoryId: parsed.categoryId },
      total_matches: rankedProds.length,
      top, alternatives,
      recommendations: {
        bestForYou: rankedProds.filter(p => p.score >= 70 && p.rating_avg >= 3.5).slice(0, 3),
        cheaperOption: rankedProds.filter(p => p.rating_avg >= 3 && p.stock > 0).sort((a, b) => a.price - b.price).slice(0, 2),
        premiumOption: rankedProds.filter(p => p.rating_avg >= 4).sort((a, b) => b.price - a.price).slice(0, 2)
      }
    });
  } catch (error) {
    console.error('Assistant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get products with filters
router.get('/', async (req, res) => {
  try {
    const { category, search, store, minPrice, maxPrice, page = 1, limit = 20, sort = 'newest' } = req.query;
    const db = req.db;

    let query = `SELECT p.*, s.name as store_name, s.slug as store_slug, c.name as category_name, c.slug as category_slug,
                       GROUP_CONCAT(pi.image_url SEPARATOR '||') as images
                FROM products p LEFT JOIN stores s ON p.store_id = s.id
                LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN product_images pi ON p.id = pi.product_id
                WHERE p.is_approved = true AND p.is_active = true`;

    const params = [];
    const conditions = [];

    if (category) {
      conditions.push(/^\d+$/.test(category) ? 'c.id = ?' : 'c.slug = ?');
      params.push(category);
    }
    if (store) { conditions.push('s.slug = ?'); params.push(store); }
    if (search) { conditions.push('(p.name LIKE ? OR p.description LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    if (minPrice !== undefined && minPrice !== '') { 
      const v = Number(minPrice);
      if (!isNaN(v)) { conditions.push('p.price >= ?'); params.push(v); }
    }
    if (maxPrice !== undefined && maxPrice !== '') { 
      const v = Number(maxPrice);
      if (!isNaN(v)) { conditions.push('p.price <= ?'); params.push(v); }
    }

    if (conditions.length) query += ' AND ' + conditions.join(' AND ');
    query += ' GROUP BY p.id';

    const sortMap = { newest: 'p.created_at DESC', price_asc: 'p.price ASC', price_desc: 'p.price DESC', popular: 'p.view_count DESC', rating: 'p.rating_avg DESC' };
    query += ` ORDER BY ${sortMap[sort] || sortMap.newest} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), (page - 1) * limit);

    const [products] = await db.execute(query, params);
    res.json({ products: products.map(p => formatProduct(p, req)), page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const [products] = await req.db.execute(`
      SELECT p.*, s.name as store_name, s.slug as store_slug, c.name as category_name, c.slug as category_slug
      FROM products p LEFT JOIN stores s ON p.store_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? AND p.is_approved = true AND p.is_active = true
    `, [req.params.id]);

    if (!products.length) return res.status(404).json({ error: 'Product not found' });

    const product = products[0];
    const [images] = await req.db.execute(
      'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order',
      [req.params.id]
    );
    product.images = images.map(i => i.image_url).join('||');

    await req.db.execute('UPDATE products SET view_count = view_count + 1 WHERE id = ?', [req.params.id]);

    res.json({ product: formatProduct(product, req) });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Seller store operations
router.get('/stores/seller/:sellerId', async (req, res) => {
  try {
    const [stores] = await req.db.execute('SELECT * FROM stores WHERE owner_id = ? AND is_active = true LIMIT 1', [req.params.sellerId]);
    res.json({ store: stores[0] || null });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/stores/seller/:sellerId', authenticateToken, requireSubscription, upload.single('logo'), async (req, res) => {
  try {
    if (req.user.role !== 'seller' || req.user.userId != req.params.sellerId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const [existing] = await req.db.execute('SELECT id FROM stores WHERE owner_id = ? AND is_active = true', [req.params.sellerId]);
    if (existing.length) return res.status(400).json({ error: 'Store already exists' });

    const { name = 'Boutique', description, phone, email, governorate, address } = req.body;
    const slugBase = name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
    const slug = slugBase || `store-${Date.now()}`;

    await req.db.execute(
      `INSERT INTO stores (owner_id, name, slug, description, logo_url, phone, email, governorate, address, is_approved, is_active, commission_rate, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, false, true, 10, NOW(), NOW())`,
      [req.params.sellerId, name, slug, description, req.file ? `/uploads/${req.file.filename}` : null, phone, email, governorate, address]
    );

    const [stores] = await req.db.execute('SELECT * FROM stores WHERE owner_id = ? AND is_active = true LIMIT 1', [req.params.sellerId]);
    res.status(201).json({ store: stores[0] });
  } catch (error) {
    console.error('Create store error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/stores/seller/:sellerId', authenticateToken, requireSubscription, upload.single('logo'), async (req, res) => {
  try {
    if (req.user.role !== 'seller' || req.user.userId != req.params.sellerId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const [stores] = await req.db.execute('SELECT * FROM stores WHERE owner_id = ? AND is_active = true LIMIT 1', [req.params.sellerId]);
    if (!stores.length) return res.status(404).json({ error: 'Store not found' });

    const store = stores[0];
    const { name = store.name, description = store.description, phone = store.phone, email = store.email, governorate = store.governorate, address = store.address } = req.body;

    await req.db.execute(
      `UPDATE stores SET name = ?, description = ?, logo_url = ?, phone = ?, email = ?, governorate = ?, address = ?, updated_at = NOW()
       WHERE owner_id = ? AND is_active = true`,
      [name, description, req.file ? `/uploads/${req.file.filename}` : store.logo_url, phone, email, governorate, address, req.params.sellerId]
    );

    const [updated] = await req.db.execute('SELECT * FROM stores WHERE owner_id = ? AND is_active = true LIMIT 1', [req.params.sellerId]);
    res.json({ store: updated[0] });
  } catch (error) {
    console.error('Update store error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Seller products management
router.get('/stores/manage/:storeSlug', authenticateToken, requireSubscription, async (req, res) => {
  try {
    if (req.user.role !== 'seller') return res.status(403).json({ error: 'Unauthorized' });

    const [stores] = await req.db.execute('SELECT id FROM stores WHERE slug = ? AND owner_id = ? AND is_active = true LIMIT 1', [req.params.storeSlug, req.user.userId]);
    if (!stores.length) return res.status(404).json({ error: 'Store not found' });

    const [products] = await req.db.execute(`
      SELECT p.*, GROUP_CONCAT(pi.image_url SEPARATOR '||') as images
      FROM products p LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.store_id = ? GROUP BY p.id ORDER BY p.created_at DESC
    `, [stores[0].id]);

    res.json({ products: products.map(p => formatProduct(p, req)) });
  } catch (error) {
    console.error('Get managed products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stores & Categories
router.get('/stores/list', async (req, res) => {
  try {
    const [stores] = await req.db.execute(`
      SELECT s.id, s.name, s.slug, s.description, s.logo_url, COUNT(p.id) as product_count, AVG(p.rating_avg) as avg_rating
      FROM stores s LEFT JOIN products p ON s.id = p.store_id AND p.is_approved = true AND p.is_active = true
      WHERE s.is_approved = true AND s.is_active = true GROUP BY s.id ORDER BY s.created_at DESC
    `);
    res.json({ stores });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/categories/list', async (req, res) => {
  try {
    const [categories] = await req.db.execute('SELECT id, name, slug, description, icon_url FROM categories WHERE is_active = true ORDER BY display_order');
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create product
router.post('/', authenticateToken, requireSubscription, upload.array('images', 8), [
  body('name').trim().isLength({ min: 2 }),
  body('price').isFloat({ min: 0 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (req.user.role !== 'seller') return res.status(403).json({ error: 'Unauthorized' });

    const db = req.db;
    const { name, description = '', price, stock = 0, category_id } = req.body;
    const sellerId = req.user.userId || req.user.id;

    const [stores] = await db.execute('SELECT id FROM stores WHERE owner_id = ? AND is_approved = true', [sellerId]);
    if (!stores.length) return res.status(400).json({ error: 'Seller must have approved store' });

    const [result] = await db.execute(
      `INSERT INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, true, true)`,
      [stores[0].id, category_id || null, name, name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), description, price, stock]
    );

    if (req.files?.length) {
      const values = req.files.map((f, i) => `(${result.insertId}, '${db.escape(`/uploads/${f.filename}`).slice(1, -1)}', ${i})`).join(',');
      await db.execute(`INSERT INTO product_images (product_id, image_url, sort_order) VALUES ${values}`);
    }

    const [product] = await db.execute('SELECT * FROM products WHERE id = ?', [result.insertId]);
    res.status(201).json({ product: product[0] });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product
router.put('/:id', authenticateToken, requireSubscription, upload.array('images', 8), async (req, res) => {
  try {
    if (req.user.role !== 'seller') return res.status(403).json({ error: 'Unauthorized' });

    const { name, description, price, stock, category_id } = req.body;
    await req.db.execute(
      'UPDATE products SET name = ?, description = ?, price = ?, stock = ?, category_id = ?, updated_at = NOW() WHERE id = ?',
      [name, description, price, stock, category_id, req.params.id]
    );

    if (req.files?.length) {
      await req.db.execute('DELETE FROM product_images WHERE product_id = ?', [req.params.id]);
      const values = req.files.map((f, i) => `(${req.params.id}, '${db.escape(`/uploads/${f.filename}`).slice(1, -1)}', ${i})`).join(',');
      await req.db.execute(`INSERT INTO product_images (product_id, image_url, sort_order) VALUES ${values}`);
    }

    const [product] = await req.db.execute('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json({ product: product[0] });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product
router.delete('/:id', authenticateToken, requireSubscription, async (req, res) => {
  try {
    if (req.user.role !== 'seller') return res.status(403).json({ error: 'Unauthorized' });
    
    await req.db.execute('DELETE FROM product_images WHERE product_id = ?', [req.params.id]);
    await req.db.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
