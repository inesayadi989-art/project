const express = require('express');
const FinancialService = require('../services/FinancialService');
const { authenticateAdmin } = require('../middleware/auth');
const { buildImageUrl } = require('../helpers/formatting');

const router = express.Router();

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

    // Get active sellers count
    const [[{ activeSellersCount }]] = await db.execute(`
      SELECT COUNT(DISTINCT seller_id) as activeSellersCount 
      FROM seller_subscriptions 
      WHERE status = 'active' AND end_date >= NOW()
    `);

    // Get total revenue from paid orders
    const [[{ totalOrderRevenue = 0 }]] = await db.execute(`
      SELECT COALESCE(SUM(total), 0) as totalOrderRevenue FROM orders WHERE (payment_status = 'paid' OR payment_status = 'paid_confirmed' OR status = 'paid_confirmed')
    `);

    // Get total commission revenue from paid orders
    const [[{ totalCommission = 0 }]] = await db.execute(`
      SELECT COALESCE(SUM(admin_commission), 0) as totalCommission FROM orders WHERE (payment_status = 'paid' OR payment_status = 'paid_confirmed' OR status = 'paid_confirmed')
    `);

    // Get subscription revenue
    const [[{ totalSubscriptionRevenue = 0 }]] = await db.execute(`
      SELECT COALESCE(SUM(amount), 0) as totalSubscriptionRevenue FROM seller_subscriptions WHERE payment_status = 'paid'
    `);

    // Get revenue data (last 6 months) with orders
    const [orderRevenueData] = await db.execute(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') as month,
             SUM(total) as orderRevenue,
             COUNT(*) as order_count
      FROM orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) AND (payment_status = 'paid' OR payment_status = 'paid_confirmed' OR status = 'paid_confirmed')
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
    `);

    // Get subscription revenue data (last 6 months)
    const [subscriptionRevenueData] = await db.execute(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') as month,
             SUM(amount) as subscriptionRevenue,
             COUNT(*) as subscription_count
      FROM seller_subscriptions
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) AND payment_status = 'paid'
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
    `);

    // Merge revenue data by month
    const revenueMap = new Map();
    orderRevenueData.forEach(row => {
      const key = row.month;
      revenueMap.set(key, { month: key, orderRevenue: row.orderRevenue || 0, subscriptionRevenue: 0 });
    });

    subscriptionRevenueData.forEach(row => {
      const key = row.month;
      if (revenueMap.has(key)) {
        revenueMap.get(key).subscriptionRevenue = row.subscriptionRevenue || 0;
      } else {
        revenueMap.set(key, { month: key, orderRevenue: 0, subscriptionRevenue: row.subscriptionRevenue || 0 });
      }
    });

    const totalPlatformRevenue = (parseFloat(totalCommission) || 0) + (parseFloat(totalSubscriptionRevenue) || 0);
    const chartData = Array.from(revenueMap.values()).sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      stats: {
        usersCount: totalUsers,
        storesCount: totalStores,
        pendingStores,
        productsCount: totalProducts,
        pendingProducts,
        ordersCount: totalOrders,
        activeSellersCount: activeSellersCount || 0,
        totalOrderRevenue: parseFloat(totalOrderRevenue) || 0,
        totalCommission: parseFloat(totalCommission) || 0,
        totalSubscriptionRevenue: parseFloat(totalSubscriptionRevenue) || 0,
        totalRevenue: totalPlatformRevenue || 0
      },
      chartData: chartData
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

// Delete user and cascade related vendor data
router.delete('/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;

    if (req.user.userId.toString() === id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own admin account' });
    }

    const [result] = await db.execute('DELETE FROM profiles WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
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
      SELECT s.*, 
             p.full_name as owner_name, 
             p.email as owner_email,
             p.is_banned as owner_is_banned,
             (SELECT COUNT(*) FROM products p2 WHERE p2.store_id = s.id) as product_count,
             -- Seller subscription status and details
             (SELECT ss.status FROM seller_subscriptions ss WHERE ss.seller_id = s.owner_id ORDER BY ss.created_at DESC LIMIT 1) as subscription_status,
             (SELECT ss.payment_status FROM seller_subscriptions ss WHERE ss.seller_id = s.owner_id ORDER BY ss.created_at DESC LIMIT 1) as subscription_payment_status,
             (SELECT ss.plan_name FROM seller_subscriptions ss WHERE ss.seller_id = s.owner_id ORDER BY ss.created_at DESC LIMIT 1) as subscription_plan_name,
             (SELECT COALESCE(ss.end_date, DATE_ADD(CURDATE(), INTERVAL 1 MONTH)) FROM seller_subscriptions ss WHERE ss.seller_id = s.owner_id ORDER BY ss.created_at DESC LIMIT 1) as subscription_current_period_end,
             (SELECT COALESCE(ss.end_date, DATE_ADD(CURDATE(), INTERVAL 1 MONTH)) FROM seller_subscriptions ss WHERE ss.seller_id = s.owner_id ORDER BY ss.created_at DESC LIMIT 1) as subscription_next_payment_date,
             (SELECT ss.id FROM seller_subscriptions ss WHERE ss.seller_id = s.owner_id ORDER BY ss.created_at DESC LIMIT 1) as seller_subscription_id
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
      query += ` AND (SELECT ss.status FROM seller_subscriptions ss WHERE ss.seller_id = s.owner_id ORDER BY ss.created_at DESC LIMIT 1) = ?`;
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

// Get stores with pending vendor payouts
router.get('/vendor-payouts', authenticateAdmin, async (req, res) => {
  try {
    const db = req.db;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const [stores] = await db.execute(
      `SELECT s.id, s.name, s.slug, s.wallet_balance, s.threshold_notified, p.full_name, p.email, p.phone
       FROM stores s
       LEFT JOIN profiles p ON s.owner_id = p.id
       WHERE s.wallet_balance >= 1000
       ORDER BY s.wallet_balance DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit), offset]
    );

    res.json({ stores, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get vendor payouts error:', error.message);
    console.error('SQL:', error.sql);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Get vendor settlement history
router.get('/vendor-settlements', authenticateAdmin, async (req, res) => {
  try {
    const db = req.db;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    try {
      const [settlements] = await db.execute(
        `SELECT vs.*, s.name as store_name, p.full_name as seller_name, a.full_name as admin_name
         FROM vendor_settlements vs
         LEFT JOIN stores s ON vs.store_id = s.id
         LEFT JOIN profiles p ON vs.seller_id = p.id
         LEFT JOIN profiles a ON vs.admin_id = a.id
         ORDER BY vs.created_at DESC
         LIMIT ? OFFSET ?`,
        [parseInt(limit), offset]
      );

      res.json({ settlements, page: parseInt(page), limit: parseInt(limit) });
    } catch (error) {
      // Table might not exist yet, return empty list
      if (error.code === 'ER_NO_SUCH_TABLE') {
        res.json({ settlements: [], page: parseInt(page), limit: parseInt(limit) });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Get vendor settlements error:', error);
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

// Get all products (read-only list)
router.get('/products', authenticateAdmin, async (req, res) => {
  try {
    const db = req.db;
    const { page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;
    const query = `
      SELECT p.id, p.name, p.price, p.stock, p.is_active, p.created_at,
             s.name as store_name, c.name as category_name,
             (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY sort_order ASC LIMIT 1) as primary_image
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC LIMIT ? OFFSET ?
    `;

    const [products] = await db.execute(query, [parseInt(limit), offset]);
    const normalizedProducts = products.map(p => ({
      ...p,
      primary_image: buildImageUrl(req, p.primary_image),
    }));

    res.json({ products: normalizedProducts, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark vendor/store wallet as paid (admin action)
router.post('/stores/:id/mark-paid', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    const adminId = req.user.userId;

    // Get store and owner
    const [storeRows] = await db.execute('SELECT id, owner_id, wallet_balance FROM stores WHERE id = ? LIMIT 1', [id]);
    const store = storeRows[0];
    if (!store) return res.status(404).json({ error: 'Store not found' });

    const amount = parseFloat(store.wallet_balance || 0);
    if (!amount || amount <= 0) return res.status(400).json({ error: 'No vendor balance to settle' });

    // Ensure vendor_settlements table exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS vendor_settlements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        store_id INT NOT NULL,
        seller_id INT NOT NULL,
        amount DECIMAL(10,3) NOT NULL,
        admin_id INT NOT NULL,
        note TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
        FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE CASCADE,
        FOREIGN KEY (admin_id) REFERENCES profiles(id) ON DELETE SET NULL
      ) ENGINE=InnoDB;
    `);

    const financialService = new FinancialService(db);
    const payoutResult = await financialService.processVendorPayout(store.id, adminId, req.body.note || null);

    // Ensure notifications table exists and insert notification for seller
    await db.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        seller_id INT NULL,
        recipient_id INT NULL,
        recipient_role ENUM('seller','admin','customer') DEFAULT 'seller',
        subscription_id INT NULL,
        type VARCHAR(100) NULL,
        title VARCHAR(255) NULL,
        message TEXT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    const title = 'Paiement reçu';
    const message = `✅ Vous avez reçu votre paiement de ${amount} TND.`;
    await db.execute(
      'INSERT INTO notifications (seller_id, recipient_id, recipient_role, type, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, FALSE, NOW())',
      [store.owner_id, store.owner_id, 'seller', 'vendor_settlement', title, message]
    );

    res.json({ success: true, settlementId: payoutResult.transactionId, payoutAmount: payoutResult.payoutAmount });
  } catch (error) {
    console.error('Mark store paid error:', error);
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
      SELECT o.*, s.name as store_name,
             p.id as customer_id, p.full_name as customer_name, p.email as customer_email, p.phone as customer_phone
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
    const ordersWithCustomer = orders.map((order) => ({
      ...order,
      customer: {
        id: order.customer_id,
        full_name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
      },
    }));

    res.json({ orders: ordersWithCustomer, page: parseInt(page), limit: parseInt(limit) });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;