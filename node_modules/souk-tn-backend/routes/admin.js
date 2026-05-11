const express = require('express');

const router = express.Router();

// Middleware to verify JWT and admin role
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = user;
    next();
  });
};

// Get dashboard stats
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const db = req.db;

    // Get counts
    const [[{ totalUsers }]] = await db.execute('SELECT COUNT(*) as totalUsers FROM profiles');
    const [[{ totalStores }]] = await db.execute('SELECT COUNT(*) as totalStores FROM stores WHERE is_approved = true');
    const [[{ pendingStores }]] = await db.execute('SELECT COUNT(*) as pendingStores FROM stores WHERE is_approved = false');
    const [[{ totalProducts }]] = await db.execute('SELECT COUNT(*) as totalProducts FROM products WHERE is_approved = true');
    const [[{ pendingProducts }]] = await db.execute('SELECT COUNT(*) as pendingProducts FROM products WHERE is_approved = false');
    const [[{ totalOrders }]] = await db.execute('SELECT COUNT(*) as totalOrders FROM orders');

    // Get revenue data (last 12 months)
    const [revenueData] = await db.execute(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') as month,
             SUM(total) as revenue,
             COUNT(*) as order_count
      FROM orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month DESC
    `);

    res.json({
      stats: {
        totalUsers,
        totalStores,
        pendingStores,
        totalProducts,
        pendingProducts,
        totalOrders
      },
      revenue: revenueData
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const db = req.db;
    const { page = 1, limit = 20, role, banned } = req.query;

    const offset = (page - 1) * limit;
    let query = 'SELECT id, email, full_name, role, is_banned, created_at FROM profiles WHERE 1=1';
    const params = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    if (banned !== undefined) {
      query += ' AND is_banned = ?';
      params.push(banned === 'true' ? 1 : 0);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [users] = await db.execute(query, params);

    res.json({ users, page: parseInt(page), limit: parseInt(limit) });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ban/unban user
router.put('/users/:id/ban', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { banned } = req.body;
    const db = req.db;

    await db.execute(
      'UPDATE profiles SET is_banned = ?, updated_at = NOW() WHERE id = ?',
      [banned ? 1 : 0, id]
    );

    res.json({ message: `User ${banned ? 'banned' : 'unbanned'} successfully` });

  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all stores
router.get('/stores', authenticateAdmin, async (req, res) => {
  try {
    const db = req.db;
    const { page = 1, limit = 20, approved, subscriptionStatus } = req.query;

    const offset = (page - 1) * limit;
    let query = `
      SELECT s.*, p.full_name as owner_name, p.email as owner_email,
             (SELECT COUNT(*) FROM products p2 WHERE p2.store_id = s.id) as product_count,
             (SELECT ss2.status FROM seller_subscriptions ss2 WHERE ss2.store_id = s.id ORDER BY ss2.created_at DESC LIMIT 1) as subscription_status,
             (SELECT ss2.plan_id FROM seller_subscriptions ss2 WHERE ss2.store_id = s.id ORDER BY ss2.created_at DESC LIMIT 1) as subscription_plan_id,
             (SELECT ss2.interval FROM seller_subscriptions ss2 WHERE ss2.store_id = s.id ORDER BY ss2.created_at DESC LIMIT 1) as subscription_interval,
             (SELECT ss2.current_period_end FROM seller_subscriptions ss2 WHERE ss2.store_id = s.id ORDER BY ss2.created_at DESC LIMIT 1) as subscription_current_period_end,
             (SELECT ss2.next_payment_date FROM seller_subscriptions ss2 WHERE ss2.store_id = s.id ORDER BY ss2.created_at DESC LIMIT 1) as subscription_next_payment_date
      FROM stores s
      LEFT JOIN profiles p ON s.owner_id = p.id
      WHERE 1=1
    `;

    const params = [];

    if (approved !== undefined) {
      query += ' AND s.is_approved = ?';
      params.push(approved === 'true' ? 1 : 0);
    }

    if (subscriptionStatus) {
      query += ` AND (SELECT ss2.status FROM seller_subscriptions ss2 WHERE ss2.store_id = s.id ORDER BY ss2.created_at DESC LIMIT 1) = ?`;
      params.push(subscriptionStatus);
    }

    query += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [stores] = await db.execute(query, params);

    res.json({ stores, page: parseInt(page), limit: parseInt(limit) });

  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve/reject store
router.put('/stores/:id/approve', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;
    const db = req.db;

    await db.execute(
      'UPDATE stores SET is_approved = ?, is_active = ?, updated_at = NOW() WHERE id = ?',
      [approved ? 1 : 0, approved ? 1 : 0, id]
    );

    res.json({ message: `Store ${approved ? 'approved' : 'rejected'} successfully` });

  } catch (error) {
    console.error('Approve store error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all products
router.get('/products', authenticateAdmin, async (req, res) => {
  try {
    const db = req.db;
    const { page = 1, limit = 20, approved } = req.query;

    const offset = (page - 1) * limit;
    let query = `
      SELECT p.*, s.name as store_name, c.name as category_name
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;

    const params = [];

    if (approved !== undefined) {
      query += ' AND p.is_approved = ?';
      params.push(approved === 'true' ? 1 : 0);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [products] = await db.execute(query, params);

    res.json({ products, page: parseInt(page), limit: parseInt(limit) });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve/reject product
router.put('/products/:id/approve', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;
    const db = req.db;

    await db.execute(
      'UPDATE products SET is_approved = ?, updated_at = NOW() WHERE id = ?',
      [approved ? 1 : 0, id]
    );

    res.json({ message: `Product ${approved ? 'approved' : 'rejected'} successfully` });

  } catch (error) {
    console.error('Approve product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all orders
router.get('/orders', authenticateAdmin, async (req, res) => {
  try {
    const db = req.db;
    const { page = 1, limit = 20, status } = req.query;

    const offset = (page - 1) * limit;
    let query = `
      SELECT o.*, s.name as store_name, p.full_name as customer_name
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      LEFT JOIN profiles p ON o.customer_id = p.id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }

    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [orders] = await db.execute(query, params);

    res.json({ orders, page: parseInt(page), limit: parseInt(limit) });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;