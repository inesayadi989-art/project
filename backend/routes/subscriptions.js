const express = require('express');
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');
const { createSubscriptionNotification, ensureNotificationsTable, notifyStoreThresholdIfNeeded } = require('../helpers/subscriptions');

const router = express.Router();

// Helper: Get subscription for user
const getSubForUser = async (db, subId, user) => {
  if (user.role === 'seller') {
    const [rows] = await db.execute('SELECT * FROM seller_subscriptions WHERE id = ? AND seller_id = ?', [subId, user.userId]);
    return rows[0] || null;
  }
  const [rows] = await db.execute(`
    SELECT s.*, sp.name as plan_name, sp.slug as plan_slug, sp.amount FROM subscriptions s
    LEFT JOIN subscription_plans sp ON s.plan_id = sp.id WHERE s.id = ? AND s.user_id = ?
  `, [subId, user.userId]);
  return rows[0] || null;
};

// Helper: Validate card
const validateCard = (card, expiry, cvv, name) => {
  if (!card?.toString().replace(/\s+/g, '').match(/^\d{13,19}$/)) return 'Invalid card number';
  if (!expiry?.match(/^(0[1-9]|1[0-2])\/\d{2,4}$/)) return 'Invalid expiry (MM/YY)';
  if (!cvv?.toString().replace(/[^0-9]/g, '').match(/^\d{3,4}$/)) return 'Invalid CVV';
  if (!name?.toString().trim().length) return 'Invalid cardholder name';
  return null;
};

// Get subscription plans
router.get('/plans', async (req, res) => {
  try {
    const [plans] = await req.db.execute(`
      SELECT id, name, slug, description, amount, interval_type, interval_count
      FROM subscription_plans WHERE slug = 'single-plan' LIMIT 1
    `);
    if (!plans.length) {
      const [fallback] = await req.db.execute('SELECT * FROM subscription_plans ORDER BY id LIMIT 1');
      return res.json({ plans: fallback });
    }
    res.json({ plans });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load plans' });
  }
});

// Get current subscription
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    if (req.user.role === 'seller') {
      const [subs] = await db.execute(
        'SELECT ss.* FROM seller_subscriptions ss WHERE ss.seller_id = ? ORDER BY ss.created_at DESC LIMIT 1',
        [req.user.userId]
      );
      return res.json({ subscription: subs[0] || null });
    }
    const [subs] = await db.execute(
      `SELECT s.*, sp.name as plan_name, sp.amount FROM subscriptions s
       LEFT JOIN subscription_plans sp ON s.plan_id = sp.id WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT 1`,
      [req.user.userId]
    );
    res.json({ subscription: subs[0] || null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load subscription' });
  }
});

// Request seller subscription
router.post('/request', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'seller') return res.status(403).json({ error: 'Only sellers can request' });

    const db = req.db;
    const [conflicts] = await db.execute(
      `SELECT * FROM seller_subscriptions WHERE seller_id = ? AND status IN ('pending_admin', 'active') LIMIT 1`,
      [req.user.userId]
    );

    if (conflicts.length) {
      const status = conflicts[0].status;
      return res.status(400).json({ 
        error: status === 'pending_admin' ? 'request_pending' : 'already_active',
        message: status === 'pending_admin' ? 'Request pending admin approval' : 'You already have an active subscription'
      });
    }

    const comment = req.body.comment?.toString().trim()?.substring(0, 1000) || null;
    const [result] = await db.execute(
      `INSERT INTO seller_subscriptions (seller_id, plan_name, plan_price, amount, comment, status, payment_status, created_at, updated_at)
       VALUES (?, 'Souk Business', 30, 30, ?, 'pending_admin', 'unpaid', NOW(), NOW())`,
      [req.user.userId, comment]
    );

    await createSubscriptionNotification(db, {
      seller_id: req.user.userId,
      subscription_id: result.insertId,
      type: 'request_pending',
      title: 'New subscription request',
      message: 'Your subscription request is pending admin approval'
    });

    res.json({ success: true, subscriptionId: result.insertId, status: 'pending_admin' });
  } catch (error) {
    console.error('Request subscription error:', error);
    res.status(500).json({ error: 'Failed to request subscription' });
  }
});

// Get notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    let clause = '', params = [];

    if (user.role === 'admin') {
      clause = 'recipient_role = ?';
      params = ['admin'];
    } else if (user.role === 'customer') {
      clause = 'recipient_role = ? AND recipient_id = ?';
      params = ['customer', user.userId];
    } else {
      clause = 'recipient_role = ? AND seller_id = ?';
      params = ['seller', user.userId];
    }

    const [rows] = await req.db.execute(
      `SELECT * FROM notifications WHERE ${clause} ORDER BY created_at DESC LIMIT 100`,
      params
    );
    res.json({ notifications: rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

router.post('/notifications/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    await req.db.execute('UPDATE notifications SET is_read = TRUE WHERE id = ?', [req.params.notificationId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Admin operations
router.get('/admin/requests', authenticateAdmin, async (req, res) => {
  try {
    const [requests] = await req.db.execute(`
      SELECT ss.*, p.email as seller_email, p.full_name as seller_name
      FROM seller_subscriptions ss
      JOIN profiles p ON p.id = ss.seller_id
      WHERE ss.status = 'pending_admin' ORDER BY ss.created_at ASC
    `);
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load requests' });
  }
});

router.get('/admin/all-requests', authenticateAdmin, async (req, res) => {
  try {
    const [requests] = await req.db.execute(`
      SELECT ss.*, p.email as seller_email, p.full_name as seller_name FROM seller_subscriptions ss
      JOIN profiles p ON p.id = ss.seller_id ORDER BY ss.created_at DESC
    `);
    res.json({ requests });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load requests' });
  }
});

router.put('/admin/requests/:requestId', authenticateAdmin, async (req, res) => {
  try {
    const db = req.db;
    const { approved, reason } = req.body;
    const [requests] = await db.execute('SELECT * FROM seller_subscriptions WHERE id = ?', [req.params.requestId]);

    if (!requests.length) return res.status(404).json({ error: 'Request not found' });

    const newStatus = approved ? 'active' : 'rejected';
    await db.execute(
      `UPDATE seller_subscriptions SET status = ?, payment_status = ?, approved_by = ?, approved_at = NOW(), updated_at = NOW() WHERE id = ?`,
      [newStatus, approved ? 'unpaid' : null, req.user.userId, req.params.requestId]
    );

    await createSubscriptionNotification(db, {
      seller_id: requests[0].seller_id,
      subscription_id: req.params.requestId,
      type: approved ? 'approved' : 'rejected',
      title: approved ? 'Subscription approved' : 'Subscription rejected',
      message: approved ? 'Your subscription is approved. Proceed to payment.' : `Rejected: ${reason || 'No reason given'}`
    });

    res.json({ success: true, status: newStatus });
  } catch (error) {
    console.error('Admin update error:', error);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

router.put('/admin/renew/:requestId', authenticateAdmin, async (req, res) => {
  try {
    const db = req.db;
    const [rows] = await db.execute('SELECT * FROM seller_subscriptions WHERE id = ?', [req.params.requestId]);
    if (!rows.length) return res.status(404).json({ error: 'Subscription not found' });

    const sellerId = rows[0].seller_id;
    const amount = Number(rows[0].amount || rows[0].plan_price || 30);

    await db.execute(
      `UPDATE seller_subscriptions SET status = 'active', payment_status = 'paid', paid_at = NOW(), start_date = NOW(), end_date = DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE id = ?`,
      [req.params.requestId]
    );

    await db.execute('UPDATE products p JOIN stores s ON p.store_id = s.id SET p.is_active = TRUE WHERE s.owner_id = ?', [sellerId]);

    try {
      await db.execute(`CREATE TABLE IF NOT EXISTS platform_financials (id INT PRIMARY KEY, admin_revenue DECIMAL(10,2) DEFAULT 0)`);
      await db.execute(
        `INSERT INTO platform_financials (id, admin_revenue) VALUES (1, ?) ON DUPLICATE KEY UPDATE admin_revenue = admin_revenue + ?`,
        [amount, amount]
      );
    } catch (err) {
      console.error('Finance update error:', err);
    }

    res.json({ success: true, message: 'Subscription renewed' });
  } catch (error) {
    console.error('Renew error:', error);
    res.status(500).json({ error: 'Failed to renew' });
  }
});

// Create subscription payment session
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    let planId = Number(req.body.planId);

    if (!planId) {
      const [plans] = await db.execute('SELECT id FROM subscription_plans WHERE slug = "single-plan" LIMIT 1');
      planId = plans.length ? plans[0].id : (await db.execute('SELECT id FROM subscription_plans LIMIT 1'))[0][0]?.id;
    }

    if (!planId) return res.status(404).json({ error: 'Plan not found' });

    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    const [result] = await db.execute(
      `INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end, created_at, updated_at)
       VALUES (?, ?, 'pending', NOW(), ?, NOW(), NOW())`,
      [req.user.userId, planId, end.toISOString().split('T')[0]]
    );

    const FRONTEND_URL = process.env.FRONTEND_URL || req.get('origin') || 'http://localhost:5173';
    res.json({
      success: true,
      subscriptionId: result.insertId,
      paymentUrl: `${FRONTEND_URL}/payment/checkout?type=subscription&subscriptionId=${result.insertId}`,
      message: 'Checkout ready'
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Verify subscription
const verifyHandler = authenticateToken.bind(null, async (req, res) => {
  const sub = await getSubForUser(req.db, req.params.subscriptionId, req.user);
  res.json({ subscription: sub || null });
});

router.get('/verify/:subscriptionId', authenticateToken, async (req, res) => {
  const sub = await getSubForUser(req.db, req.params.subscriptionId, req.user);
  res.json({ subscription: sub || null });
});

router.post('/verify/:subscriptionId', authenticateToken, async (req, res) => {
  const sub = await getSubForUser(req.db, req.params.subscriptionId, req.user);
  res.json({ subscription: sub || null });
});

// Cancel subscription
router.post('/cancel/:subscriptionId', authenticateToken, async (req, res) => {
  try {
    await req.db.execute('UPDATE subscriptions SET status = "canceled" WHERE id = ? AND user_id = ?', [req.params.subscriptionId, req.user.userId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel' });
  }
});

// Payment methods
router.post('/mock-pay/:subscriptionId', authenticateToken, async (req, res) => {
  try {
    const { cardNumber, expiryDate, cvv, cardholderName } = req.body;
    const error = validateCard(cardNumber, expiryDate, cvv, cardholderName);
    if (error) return res.status(400).json({ error });

    await req.db.execute('UPDATE subscriptions SET status = "active" WHERE id = ?', [req.params.subscriptionId]);
    res.json({ success: true, status: 'active', message: 'Payment processed' });
  } catch (error) {
    res.status(500).json({ error: 'Payment failed' });
  }
});

router.post('/simulate-success/:subscriptionId', authenticateToken, async (req, res) => {
  try {
    await req.db.execute('UPDATE subscriptions SET status = "active" WHERE id = ?', [req.params.subscriptionId]);
    res.json({ success: true, status: 'active' });
  } catch (error) {
    res.status(500).json({ error: 'Simulation failed' });
  }
});

// Seller pays subscription
router.post('/seller/pay/:subscriptionId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'seller') return res.status(403).json({ error: 'Unauthorized' });

    const { cardNumber, expiryDate, cvv, cardholderName } = req.body;
    const error = validateCard(cardNumber, expiryDate, cvv, cardholderName);
    if (error) return res.status(400).json({ error });

    const db = req.db;
    const [subs] = await db.execute('SELECT * FROM seller_subscriptions WHERE id = ? AND seller_id = ?', [req.params.subscriptionId, req.user.userId]);
    if (!subs.length) return res.status(404).json({ error: 'Subscription not found' });

    const amount = Number(subs[0].amount || subs[0].plan_price || 30);
    await db.execute(
      `UPDATE seller_subscriptions SET status = 'active', payment_status = 'paid', paid_at = NOW(), start_date = NOW(), end_date = DATE_ADD(NOW(), INTERVAL 30 DAY) WHERE id = ?`,
      [req.params.subscriptionId]
    );

    try {
      const [stores] = await db.execute('SELECT id, wallet_balance FROM stores WHERE owner_id = ? LIMIT 1', [req.user.userId]);
      if (stores.length) {
        const newBalance = Number(stores[0].wallet_balance || 0) + amount;
        await db.execute('UPDATE stores SET wallet_balance = ? WHERE id = ?', [newBalance, stores[0].id]);
      }
    } catch (err) {
      console.error('Balance update error:', err);
    }

    try {
      await db.execute(`CREATE TABLE IF NOT EXISTS platform_financials (id INT PRIMARY KEY, admin_revenue DECIMAL(10,2) DEFAULT 0)`);
      await db.execute(
        `INSERT INTO platform_financials (id, admin_revenue) VALUES (1, ?) ON DUPLICATE KEY UPDATE admin_revenue = admin_revenue + ?`,
        [amount, amount]
      );
    } catch (err) {
      console.error('Finance error:', err);
    }

    res.json({ success: true, status: 'active', message: 'Payment received' });
  } catch (error) {
    console.error('Seller pay error:', error);
    res.status(500).json({ error: 'Payment failed' });
  }
});

module.exports = router;
