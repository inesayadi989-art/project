const express = require('express');
const { authenticateToken, authenticateAdmin } = require('../middleware/auth');
const router = express.Router();

async function findLatestSellerSubscription(db, sellerId) {
  const [rows] = await db.execute(
    `SELECT * FROM seller_subscriptions WHERE seller_id = ? ORDER BY created_at DESC LIMIT 1`,
    [sellerId]
  );
  return rows[0] || null;
}

function getNotificationRecipientQuery(user) {
  if (user.role === 'admin') {
    return {
      clause: 'recipient_role = ? AND (recipient_id IS NULL OR recipient_id = ?)',
      params: ['admin', user.userId]
    };
  }

  if (user.role === 'customer') {
    return {
      clause: 'recipient_role = ? AND recipient_id = ?',
      params: ['customer', user.userId]
    };
  }

  // default: seller
  return {
    clause: 'recipient_role = ? AND seller_id = ?',
    params: ['seller', user.userId]
  };
}

async function createSubscriptionNotification(db, data) {
  try {
    // Ensure notifications table exists (in case migration wasn't run)
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
      )
    `);

    // Ensure we have minimal fields
    const seller_id = data.seller_id || null;
    const recipient_id = data.recipient_id || null;
    const recipient_role = data.recipient_role || (data.seller_id ? 'seller' : 'admin');
    const subscription_id = data.subscription_id || null;
    const type = data.type || null;
    const title = data.title || null;
    const message = data.message || null;

    // Insert into notifications table
    await db.execute(
      `INSERT INTO notifications (seller_id, recipient_id, recipient_role, subscription_id, type, title, message, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, NOW())`,
      [seller_id, recipient_id, recipient_role, subscription_id, type, title, message]
    );

    console.log('Notification stored:', type, title);
  } catch (err) {
    // Fallback to logging if DB insert fails
    console.error('Failed to persist notification, fallback to log:', err);
    console.log('Notification event (fallback):', data.type, data.title);
  }
}

async function ensureNotificationsTable(db) {
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
}

async function notifyStoreThresholdIfNeeded(db, storeId, ownerId, storeName, newBalance, thresholdNotified) {
  if (newBalance >= 500 && !thresholdNotified) {
    await db.execute('UPDATE stores SET threshold_notified = TRUE WHERE id = ?', [storeId]);
    await ensureNotificationsTable(db);

    const adminTitle = `Solde vendeur élevé : ${storeName}`;
    const adminMessage = `La boutique "${storeName}" a atteint ${newBalance.toFixed(2)} TND dans son portefeuille. Vérifiez le paiement en espèces.`;
    await db.execute(
      'INSERT INTO notifications (seller_id, recipient_id, recipient_role, type, title, message, is_read, created_at) VALUES (?, NULL, ?, ?, ?, ?, FALSE, NOW())',
      [ownerId, 'admin', 'seller_threshold_reached', adminTitle, adminMessage]
    );

    const sellerTitle = `Solde disponible : ${newBalance.toFixed(2)} TND`;
    const sellerMessage = `Votre boutique "${storeName}" a atteint ${newBalance.toFixed(2)} TND dans le portefeuille. L'administrateur a été notifié pour le paiement en espèces.`;
    await db.execute(
      'INSERT INTO notifications (seller_id, recipient_id, recipient_role, type, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, FALSE, NOW())',
      [ownerId, ownerId, 'seller', 'wallet_threshold_reached', sellerTitle, sellerMessage]
    );
  }
}

async function getSubscriptionByIdForUser(db, subscriptionId, user) {
  if (user.role === 'seller') {
    const [rows] = await db.execute(
      `SELECT * FROM seller_subscriptions WHERE id = ? AND seller_id = ? LIMIT 1`,
      [subscriptionId, user.userId]
    );
    return rows[0] || null;
  }

  const [rows] = await db.execute(
    `SELECT s.*, sp.name as plan_name, sp.slug as plan_slug, sp.description as plan_description, sp.interval_type, sp.interval_count, sp.amount
     FROM subscriptions s
     LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
     WHERE s.id = ? AND s.user_id = ?
     LIMIT 1`,
    [subscriptionId, user.userId]
  );
  return rows[0] || null;
}

// Get all subscription plans
router.get('/plans', async (req, res) => {
  try {
    const db = req.db;
    const [plans] = await db.execute(
      `SELECT id, name, slug, description, amount, interval_type, interval_count FROM subscription_plans WHERE slug = 'single-plan' LIMIT 1`
    );

    if (plans.length === 0) {
      const [fallbackPlans] = await db.execute(
        `SELECT id, name, slug, description, amount, interval_type, interval_count FROM subscription_plans ORDER BY id LIMIT 1`
      );
      return res.json({ plans: fallbackPlans });
    }

    res.json({ plans });
  } catch (error) {
    console.error('Get subscription plans error:', error);
    res.status(500).json({ error: 'Failed to load subscription plans' });
  }
});

// Get current subscription for authenticated user
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.userId;

    if (req.user.role === 'seller') {
      const [subscriptions] = await db.execute(
        `SELECT ss.*,
                ss.plan_name,
                ss.plan_price AS amount,
                'TND' AS currency,
                ss.comment,
                ss.status,
                ss.payment_status,
                ss.start_date AS current_period_start,
                ss.end_date
         FROM seller_subscriptions ss
         WHERE ss.seller_id = ?
         ORDER BY ss.created_at DESC
         LIMIT 1`,
        [userId]
      );

      const subscription = subscriptions[0] || null;
      return res.json({ subscription });
    }

    const [subscriptions] = await db.execute(
      `SELECT s.*, sp.name as plan_name, sp.slug as plan_slug, sp.description as plan_description, sp.interval_type, sp.interval_count, sp.amount
       FROM subscriptions s
       LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [userId]
    );

    const subscription = subscriptions[0] || null;
    res.json({ subscription });
  } catch (error) {
    console.error('Get current subscription error:', error);
    res.status(500).json({ error: 'Failed to load subscription' });
  }
});

// Request a seller subscription
router.post('/request', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.userId;

    if (req.user.role !== 'seller') {
      return res.status(403).json({ error: 'Access denied', message: 'Only seller accounts can request a subscription.' });
    }

    // Check for any conflicting subscriptions for this seller
    const [conflicts] = await db.execute(
      `SELECT * FROM seller_subscriptions WHERE seller_id = ? AND (
         status = 'pending_admin' OR
         (status = 'active' AND payment_status = 'unpaid') OR
         (status = 'active' AND end_date IS NOT NULL AND end_date > NOW())
       ) LIMIT 1`,
      [userId]
    );

    if (conflicts.length > 0) {
      const current = conflicts[0];
      if (current.status === 'pending_admin') {
        return res.status(400).json({ error: 'request_pending', message: 'Vous avez déjà une demande en attente de validation.' });
      }

      if (current.status === 'active' && current.payment_status === 'unpaid') {
        return res.status(400).json({ error: 'request_approved', message: 'Votre demande a déjà été approuvée. Vous pouvez maintenant payer votre abonnement.' });
      }

      if (current.status === 'active') {
        return res.status(400).json({ error: 'already_active', message: 'Vous avez déjà un abonnement vendeur actif.' });
      }
    }

    const comment = req.body.comment ? req.body.comment.toString().trim() : null;
    if (comment && comment.length > 1000) {
      return res.status(400).json({ error: 'invalid_comment', message: 'Le commentaire ne peut pas dépasser 1000 caractères.' });
    }

    const planPrice = 30.0;
    const [result] = await db.execute(
      `INSERT INTO seller_subscriptions
       (seller_id, plan_name, plan_price, amount, comment, status, payment_status, created_at, updated_at)
       VALUES (?, 'Souk Business', ?, ?, ?, 'pending_admin', 'unpaid', NOW(), NOW())`,
      [userId, planPrice, planPrice, comment]
    );

    const subscriptionId = result.insertId;

    await createSubscriptionNotification(db, {
      seller_id: userId,
      subscription_id: subscriptionId,
      type: 'request_pending',
      title: 'Nouvelle demande d abonnement reçu',
      message: 'Votre demande d abonnement seller a été envoyée et attend la validation de l administrateur.'
    });

    await createSubscriptionNotification(db, {
      recipient_role: 'admin',
      subscription_id: subscriptionId,
      type: 'request_pending',
      title: 'Demande d abonnement vendeur en attente',
      message: `Le vendeur #${userId} a soumis une demande d abonnement. Merci de la valider.`
    });

    res.json({ success: true, subscriptionId, status: 'pending_admin', message: 'Demande envoyée. L administrateur va la confirmer.' });
  } catch (error) {
    console.error('Request seller subscription error:', error);
    res.status(500).json({ error: 'Failed to create seller subscription request' });
  }
});

// Seller notifications (deprecated - table has been removed)
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const user = req.user;

    const nr = getNotificationRecipientQuery(user);

    const query = `SELECT id, seller_id, recipient_id, recipient_role, subscription_id, type, title, message, is_read, created_at FROM notifications WHERE ${nr.clause} ORDER BY created_at DESC LIMIT 100`;
    const params = nr.params;

    const [rows] = await db.execute(query, params);
    res.json({ notifications: rows });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

router.post('/notifications/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { notificationId } = req.params;
    const user = req.user;

    // Ensure the user is allowed to mark this notification
    const nr = getNotificationRecipientQuery(user);
    const allowedQuery = `SELECT id FROM notifications WHERE id = ? AND ${nr.clause} LIMIT 1`;
    const allowedParams = [notificationId, ...nr.params];
    const [allowedRows] = await db.execute(allowedQuery, allowedParams);
    if (allowedRows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.execute(`UPDATE notifications SET is_read = TRUE WHERE id = ?`, [notificationId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Admin subscription approval / rejection
router.get('/admin/requests', authenticateAdmin, async (req, res) => {
  try {
    const db = req.db;
    const [requests] = await db.execute(
      `SELECT ss.*, p.email as seller_email, p.full_name as seller_name
       FROM seller_subscriptions ss
       JOIN profiles p ON p.id = ss.seller_id
       WHERE ss.status = 'pending_admin'
       ORDER BY ss.created_at ASC`
    );

    res.json({ requests });
  } catch (error) {
    console.error('Admin get subscription requests error:', error);
    res.status(500).json({ error: 'Failed to load subscription requests' });
  }
});

// Get ALL subscription requests with all statuses (for admin dashboard tabs)
router.get('/admin/all-requests', authenticateAdmin, async (req, res) => {
  try {
    const db = req.db;
    const [requests] = await db.execute(
      `SELECT ss.*, p.email as seller_email, p.full_name as seller_name
       FROM seller_subscriptions ss
       JOIN profiles p ON p.id = ss.seller_id
       ORDER BY CASE ss.status
         WHEN 'pending_admin' THEN 1
         WHEN 'active' THEN 2
         WHEN 'rejected' THEN 3
         ELSE 4
       END,
       ss.created_at DESC`
    );

    res.json({ requests });
  } catch (error) {
    console.error('Admin get all subscription requests error:', error);
    res.status(500).json({ error: 'Failed to load subscription requests' });
  }
});

router.put('/admin/requests/:requestId', authenticateAdmin, async (req, res) => {
  try {
    const db = req.db;
    const { requestId } = req.params;
    const { approved, reason } = req.body;

    const [requests] = await db.execute(
      `SELECT * FROM seller_subscriptions WHERE id = ? LIMIT 1`,
      [requestId]
    );

    if (requests.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requests[0];
    // Simplified flow: admin approval sets status='active' and payment_status='unpaid'
    const newStatus = approved ? 'active' : 'rejected';
    const updateFields = approved
      ? `status = 'active', payment_status = 'unpaid', approved_by = ?, approved_at = NOW(), updated_at = NOW()`
      : `status = 'rejected', rejected_reason = ?, approved_by = ?, approved_at = NOW(), updated_at = NOW()`;

    await db.execute(
      `UPDATE seller_subscriptions SET ${updateFields} WHERE id = ?`,
      approved ? [req.user.userId, requestId] : [reason || null, req.user.userId, requestId]
    );

    await createSubscriptionNotification(db, {
      seller_id: request.seller_id,
      recipient_id: request.seller_id,
      recipient_role: 'seller',
      subscription_id: request.id,
      type: approved ? 'approved' : 'rejected',
      title: approved ? 'Abonnement vendeur accepté' : 'Demande d abonnement rejetée',
      message: approved
        ? 'Votre abonnement est maintenant actif.'
        : `Votre demande a été rejetée. Raison : ${reason || 'Non spécifiée'}`
    });

    res.json({ success: true, status: newStatus, message: approved ? 'Subscription request approved' : 'Subscription request rejected' });
  } catch (error) {
    console.error('Admin update subscription request error:', error);
    res.status(500).json({ error: 'Failed to update subscription request' });
  }
});

// Admin renew seller subscription (extend and reactivate)
router.put('/admin/renew/:requestId', authenticateAdmin, async (req, res) => {
  try {
    const db = req.db;
    const { requestId } = req.params;

    const [rows] = await db.execute(
      `SELECT * FROM seller_subscriptions WHERE id = ? LIMIT 1`,
      [requestId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const subscription = rows[0];
    const sellerId = subscription.seller_id;

    // Renew: set status active, start_date now, end_date +30 days
    await db.execute(
      `UPDATE seller_subscriptions SET status = 'active', payment_status = 'paid', paid_at = NOW(), start_date = NOW(), end_date = DATE_ADD(NOW(), INTERVAL 30 DAY), updated_at = NOW() WHERE id = ?`,
      [requestId]
    );

    // Un-hide seller products by joining stores -> products
    await db.execute(
      `UPDATE products p JOIN stores s ON p.store_id = s.id SET p.is_active = TRUE WHERE s.owner_id = ?`,
      [sellerId]
    );

    // Increment admin revenue by 30 TND (subscription price)
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS platform_financials (
          id INT PRIMARY KEY,
          admin_revenue DECIMAL(10,2) DEFAULT 0.00
        )
      `);

      const paymentAmount = Number(subscription.amount || subscription.plan_price || 30);
      await db.execute(
        `INSERT INTO platform_financials (id, admin_revenue) VALUES (1, ?) ON DUPLICATE KEY UPDATE admin_revenue = admin_revenue + ?`,
        [paymentAmount, paymentAmount]
      );
    } catch (finErr) {
      console.error('Failed to update platform financials:', finErr);
    }

    res.json({ success: true, message: 'Paiement renouvellement réussi. Abonnement prolongé de 30 jours et produits réactivés.' });
  } catch (error) {
    console.error('Admin renew subscription error:', error);
    res.status(500).json({ error: 'Failed to renew subscription' });
  }
});

// Get subscription by ID
router.get('/:subscriptionId', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { subscriptionId } = req.params;

    const subscription = await getSubscriptionByIdForUser(db, subscriptionId, req.user);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({ subscription });
  } catch (error) {
    console.error('Get subscription by ID error:', error);
    res.status(500).json({ error: 'Failed to load subscription' });
  }
});

// Create subscription payment session
router.post('/create', authenticateToken, async (req, res) => {
  try {
    let planId = req.body.planId ? Number(req.body.planId) : null;
    const paymentMethod = req.body.paymentMethod || 'card';
    const db = req.db;
    const userId = req.user.userId;
    const axios = require('axios');

    if (!planId || Number.isNaN(planId)) {
      const [defaultPlans] = await db.execute(
        `SELECT * FROM subscription_plans WHERE slug = 'single-plan' LIMIT 1`
      );
      if (defaultPlans.length === 0) {
        const [fallbackPlans] = await db.execute(
          `SELECT * FROM subscription_plans ORDER BY id LIMIT 1`
        );
        if (fallbackPlans.length === 0) {
          return res.status(404).json({ error: 'Subscription plan not found' });
        }
        planId = fallbackPlans[0].id;
      } else {
        planId = defaultPlans[0].id;
      }
    }

    const [plans] = await db.execute(
      `SELECT * FROM subscription_plans WHERE id = ? LIMIT 1`,
      [planId]
    );

    if (plans.length === 0) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }

    const plan = plans[0];
    const [profiles] = await db.execute(
      `SELECT * FROM profiles WHERE id = ? LIMIT 1`,
      [userId]
    );

    if (profiles.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const profile = profiles[0];
    const [existingActive] = await db.execute(
      `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY current_period_end DESC LIMIT 1`,
      [userId]
    );

    const now = new Date();
    let periodStart = now;
    if (existingActive.length > 0 && existingActive[0].current_period_end) {
      const existingEnd = new Date(existingActive[0].current_period_end);
      if (existingEnd > now) {
        periodStart = existingEnd;
      }
    }

    const periodEnd = new Date(periodStart);
    if (plan.interval_type === 'year') {
      periodEnd.setFullYear(periodEnd.getFullYear() + plan.interval_count);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + plan.interval_count);
    }

    const formatTimestamp = (date) => date.toISOString().slice(0, 19).replace('T', ' ');

    const [result] = await db.execute(
      `INSERT INTO subscriptions (user_id, plan_id, status, current_period_start, current_period_end, created_at, updated_at)
       VALUES (?, ?, 'pending', ?, ?, NOW(), NOW())`,
      [userId, planId, formatTimestamp(periodStart), formatTimestamp(periodEnd)]
    );

    const subscriptionId = result.insertId;
    const merchantReference = `SUB-${subscriptionId}-${Date.now()}`;
    const amountInMillimes = Math.round(plan.amount * 1000);

    const KONNECT_API_URL = process.env.KONNECT_API_URL || 'https://api.sandbox.konnect.io';
    const KONNECT_API_KEY = process.env.KONNECT_API_KEY || '';
    const KONNECT_MERCHANT_ID = process.env.KONNECT_MERCHANT_ID || '';
    const defaultFrontendUrl = 'http://localhost:5173';
    const FRONTEND_URL = process.env.FRONTEND_URL && process.env.FRONTEND_URL !== defaultFrontendUrl
      ? process.env.FRONTEND_URL
      : req.get('origin') || defaultFrontendUrl;
    const BACKEND_URL = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;

    const localCheckoutUrl = `${FRONTEND_URL}/payment/checkout?type=subscription&subscriptionId=${subscriptionId}`;
    const isKonnectConfigured = KONNECT_API_KEY && !KONNECT_API_KEY.includes('your-konnect-api-key') && KONNECT_MERCHANT_ID && !KONNECT_MERCHANT_ID.includes('your-konnect-merchant-id');

    if (!isKonnectConfigured) {
      console.warn('Konnect not configured. Using local payment checkout fallback.');
      return res.json({
        success: true,
        subscriptionId,
        paymentUrl: localCheckoutUrl,
        message: 'Local checkout fallback enabled',
      });
    }

    const konnectPayload = {
      receiverWalletId: KONNECT_MERCHANT_ID,
      amount: amountInMillimes,
      currency: 'TND',
      type: 'immediate',
      description: `Abonnement ${plan.name} - ${plan.amount} TND/mois - Souk.tn`,
      ref: merchantReference,
      firstName: profile.full_name?.split(' ')[0] || 'Vendeur',
      lastName: profile.full_name?.split(' ').slice(1).join(' ') || '',
      phone: profile.phone || '',
      email: profile.email || '',
      successUrl: `${FRONTEND_URL}/payment/success?type=subscription&subscriptionId=${subscriptionId}`,
      failureUrl: `${FRONTEND_URL}/payment/failure?type=subscription&subscriptionId=${subscriptionId}`,
      webhookUrl: `${BACKEND_URL}/api/subscriptions/webhook`,
      metadata: {
        subscriptionId,
        planId,
        userId,
        paymentMethod: 'card',
        type: 'subscription',
      },
    };

    try {
      const konnectResponse = await axios.post(
        `${KONNECT_API_URL}/gateway/payment/create-payment-session`,
        konnectPayload,
        {
          headers: {
            'Authorization': `Bearer ${KONNECT_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!konnectResponse.data?.sessionId || !konnectResponse.data?.paymentUrl) {
        throw new Error('Invalid Konnect payment response');
      }

      await db.execute(
        `UPDATE subscriptions SET konnect_session_id = ?, merchant_reference = ? WHERE id = ?`,
        [konnectResponse.data.sessionId, merchantReference, subscriptionId]
      );

      return res.json({
        success: true,
        subscriptionId,
        paymentUrl: konnectResponse.data.paymentUrl,
        message: 'Redirection vers le paiement...',
      });
    } catch (konnectError) {
      console.error('Konnect create payment session failed:', konnectError.message);
      return res.json({
        success: true,
        subscriptionId,
        paymentUrl: localCheckoutUrl,
        message: 'Local checkout fallback enabled',
      });
    }
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription payment', details: error.message });
  }
});



// Verify subscription
const verifySubscriptionHandler = async (req, res) => {
  try {
    const db = req.db;
    const { subscriptionId } = req.params;
    const userId = req.user.userId;

    const [subscriptions] = await db.execute(
      `SELECT * FROM subscriptions WHERE id = ? AND user_id = ? LIMIT 1`,
      [subscriptionId, userId]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({ subscription: subscriptions[0] });
  } catch (error) {
    console.error('Verify subscription error:', error);
    res.status(500).json({ error: 'Failed to verify subscription' });
  }
};

router.get('/verify/:subscriptionId', authenticateToken, verifySubscriptionHandler);
router.post('/verify/:subscriptionId', authenticateToken, verifySubscriptionHandler);

// Cancel subscription
router.post('/cancel/:subscriptionId', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { subscriptionId } = req.params;
    const userId = req.user.userId;

    await db.execute(
      `UPDATE subscriptions SET status = 'canceled', updated_at = NOW() WHERE id = ? AND user_id = ?`,
      [subscriptionId, userId]
    );

    res.json({ success: true, message: 'Subscription canceled' });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Confirm subscription from local checkout fallback
router.post('/confirm/:subscriptionId', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { subscriptionId } = req.params;
    const userId = req.user.userId;

    const [subscriptions] = await db.execute(
      `SELECT * FROM subscriptions WHERE id = ? AND user_id = ? LIMIT 1`,
      [subscriptionId, userId]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    await db.execute(
      `UPDATE subscriptions SET status = 'active', updated_at = NOW() WHERE id = ?`,
      [subscriptionId]
    );

    res.json({ success: true, subscriptionId, status: 'active' });
  } catch (error) {
    console.error('Confirm subscription error:', error);
    res.status(500).json({ error: 'Failed to confirm subscription' });
  }
});

// Mock payment for subscription simulation
router.post('/mock-pay/:subscriptionId', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { subscriptionId } = req.params;
    const { paymentMethod, cardNumber, expiryDate, cvv, cardholderName, phone, code } = req.body;
    const userId = req.user.userId;

    const [subscriptions] = await db.execute(
      `SELECT * FROM subscriptions WHERE id = ? AND user_id = ? LIMIT 1`,
      [subscriptionId, userId]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    if (paymentMethod !== 'card') {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    const cardNumberClean = (cardNumber || '').toString().replace(/\s+/g, '');
    const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    const cvvClean = (cvv || '').toString().replace(/[^0-9]/g, '');

    if (!cardNumberClean || cardNumberClean.length < 13 || cardNumberClean.length > 19) {
      return res.status(400).json({ error: 'Invalid card number' });
    }
    if (!expiryDate || !expiryRegex.test(expiryDate)) {
      return res.status(400).json({ error: 'Invalid expiry date' });
    }
    if (!cvvClean || (cvvClean.length !== 3 && cvvClean.length !== 4)) {
      return res.status(400).json({ error: 'Invalid CVV' });
    }
    if (!cardholderName || cardholderName.toString().trim().length < 2) {
      return res.status(400).json({ error: 'Invalid cardholder name' });
    }

    await db.execute(
      `UPDATE subscriptions SET status = 'active', updated_at = NOW() WHERE id = ?`,
      [subscriptionId]
    );

    return res.json({ success: true, subscriptionId, status: 'active', message: 'Paiement simulé accepté' });
  } catch (error) {
    console.error('Mock payment error:', error);
    res.status(500).json({ error: 'Failed to process mock payment', details: error.message });
  }
});

// Simulate payment success for local testing
router.post('/simulate-success/:subscriptionId', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { subscriptionId } = req.params;
    const userId = req.user.userId;

    const [subscriptions] = await db.execute(
      `SELECT * FROM subscriptions WHERE id = ? AND user_id = ? LIMIT 1`,
      [subscriptionId, userId]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    await db.execute(
      `UPDATE subscriptions SET status = 'active', updated_at = NOW() WHERE id = ?`,
      [subscriptionId]
    );

    res.json({ success: true, subscriptionId, status: 'active', message: 'Payment simulated successfully' });
  } catch (error) {
    console.error('Simulate payment error:', error);
    res.status(500).json({ error: 'Failed to simulate payment' });
  }
});

// Seller pays approved subscription (activate after admin approval)
router.post('/seller/pay/:subscriptionId', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { subscriptionId } = req.params;
    const userId = req.user.userId;

    // Validate card payload from seller
    const { cardNumber, expiryDate, cvv, cardholderName } = req.body || {};

    // Basic validations
    const cardNumberClean = (cardNumber || '').toString().replace(/\s+/g, '');
    const expiryRegex = /^(0[1-9]|1[0-2])\/(\d{2}|\d{4})$/; // MM/YY or MM/YYYY
    const cvvClean = (cvv || '').toString().replace(/[^0-9]/g, '');

    if (!cardNumberClean || cardNumberClean.length < 13 || cardNumberClean.length > 19) {
      return res.status(400).json({ error: 'invalid_card_number', message: 'Numéro de carte invalide' });
    }

    if (!expiryDate || !expiryRegex.test(expiryDate)) {
      return res.status(400).json({ error: 'invalid_expiry', message: 'Date d\'expiration invalide (MM/YY)' });
    }

    if (!cvvClean || (cvvClean.length !== 3 && cvvClean.length !== 4)) {
      return res.status(400).json({ error: 'invalid_cvv', message: 'CVV invalide' });
    }

    if (!cardholderName || cardholderName.toString().trim().length < 2) {
      return res.status(400).json({ error: 'invalid_cardholder', message: 'Nom du titulaire invalide' });
    }

    if (req.user.role !== 'seller') {
      return res.status(403).json({ error: 'Access denied', message: 'Only sellers can perform this action.' });
    }

    const [subscriptions] = await db.execute(
      `SELECT * FROM seller_subscriptions WHERE id = ? AND seller_id = ? LIMIT 1`,
      [subscriptionId, userId]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const sub = subscriptions[0];

    if (!(sub.status === 'active' && sub.payment_status === 'unpaid')) {
      return res.status(400).json({ error: 'not_ready_for_payment', message: 'Subscription must be approved by admin and unpaid before payment.' });
    }

    // Activate and mark as paid — set start and end dates (30 days by default)
    await db.execute(
      `UPDATE seller_subscriptions SET status = 'active', payment_status = 'paid', paid_at = NOW(), start_date = NOW(), end_date = DATE_ADD(NOW(), INTERVAL 30 DAY), updated_at = NOW() WHERE id = ?`,
      [subscriptionId]
    );

    // Update seller store balance so the subscription payment appears in the seller dashboard
    try {
      const [stores] = await db.execute(
        `SELECT id, name, owner_id, COALESCE(wallet_balance, 0) AS wallet_balance, threshold_notified FROM stores WHERE owner_id = ? LIMIT 1`,
        [userId]
      );
      if (stores.length > 0) {
        const store = stores[0];
        const paymentAmount = Number(sub.amount || sub.plan_price || 0);
        const newBalance = Number(store.wallet_balance || 0) + paymentAmount;
        await db.execute(
          `UPDATE stores SET wallet_balance = ?, updated_at = NOW() WHERE id = ?`,
          [newBalance, store.id]
        );

        await notifyStoreThresholdIfNeeded(db, store.id, store.owner_id, store.name, newBalance, store.threshold_notified);
      }
    } catch (storeErr) {
      console.error('Failed to update seller store balance:', storeErr);
    }

    // Ensure platform_financials exists and increment admin_revenue by 30 TND
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS platform_financials (
          id INT PRIMARY KEY,
          admin_revenue DECIMAL(10,2) DEFAULT 0.00
        )
      `);

      const paymentAmount = Number(sub.amount || sub.plan_price || 0);
      await db.execute(
        `INSERT INTO platform_financials (id, admin_revenue) VALUES (1, ?) ON DUPLICATE KEY UPDATE admin_revenue = admin_revenue + ?`,
        [paymentAmount, paymentAmount]
      );
    } catch (finErr) {
      console.error('Failed to update platform financials:', finErr);
    }

    try {
      await ensureNotificationsTable(db);
      await createSubscriptionNotification(db, {
        seller_id: userId,
        recipient_role: 'admin',
        subscription_id: subscriptionId,
        type: 'payment',
        title: 'Paiement abonnement vendeur reçu',
        message: `Le vendeur #${userId} a réglé son abonnement vendeur (ID de souscription ${subscriptionId}).`
      });

      await createSubscriptionNotification(db, {
        seller_id: userId,
        recipient_id: userId,
        recipient_role: 'seller',
        subscription_id: subscriptionId,
        type: 'payment',
        title: 'Paiement abonnement vendeur reçu',
        message: 'Votre abonnement est maintenant actif. Le renouvellement a bien été pris en compte.'
      });
    } catch (notificationErr) {
      console.error('Failed to create seller payment notifications:', notificationErr);
    }

    res.json({ success: true, subscriptionId, status: 'active', message: 'Paiement renouvellement réussi. Abonnement prolongé de 30 jours.' });
  } catch (error) {
    console.error('Seller pay subscription error:', error);
    res.status(500).json({ error: 'Failed to process seller payment', details: error.message });
  }
});

// Webhook to handle Konnect payment confirmation
router.post('/webhook', async (req, res) => {
  try {
    const db = req.db;
    const crypto = require('crypto');
    
    // Verify Konnect signature (simplified - add proper signature verification)
    const payload = req.body;
    
    if (!payload.metadata || !payload.metadata.subscriptionId) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    const subscriptionId = payload.metadata.subscriptionId;
    const transactionRef = payload.transactionRef;

    // Check payment status from Konnect
    if (payload.status === 'confirmed' || payload.status === 'success') {
      // Update subscription to active
      await db.execute(
        `UPDATE subscriptions 
         SET status = 'active', transaction_ref = ?, updated_at = NOW() 
         WHERE id = ?`,
        [transactionRef, subscriptionId]
      );

      // Fetch subscription details for response
      const [subscriptions] = await db.execute(
        `SELECT s.*, sp.name as plan_name 
         FROM subscriptions s 
         LEFT JOIN subscription_plans sp ON s.plan_id = sp.id 
         WHERE s.id = ?`,
        [subscriptionId]
      );

      console.log(`✅ Subscription ${subscriptionId} activated - Payment confirmed`);
      res.json({ success: true, message: 'Subscription activated' });

    } else if (payload.status === 'failed' || payload.status === 'declined') {
      // Mark subscription as failed
      await db.execute(
        `UPDATE subscriptions 
         SET status = 'failed', updated_at = NOW() 
         WHERE id = ?`,
        [subscriptionId]
      );

      console.log(`❌ Subscription ${subscriptionId} failed - Payment declined`);
      res.json({ success: true, message: 'Payment failed recorded' });

    } else {
      // Pending or processing
      await db.execute(
        `UPDATE subscriptions 
         SET status = 'processing', transaction_ref = ?, updated_at = NOW() 
         WHERE id = ?`,
        [transactionRef, subscriptionId]
      );

      console.log(`⏳ Subscription ${subscriptionId} processing`);
      res.json({ success: true, message: 'Payment processing' });
    }

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed', details: error.message });
  }
});

// Seller renew their subscription directly (extend for 1 more month)
router.post('/seller/request-renewal', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const userId = req.user.userId;
    const { cardNumber, expiryDate, cvv, cardholderName } = req.body || {};

    if (req.user.role !== 'seller') {
      return res.status(403).json({ error: 'Access denied', message: 'Only sellers can perform this action.' });
    }

    const cardNumberClean = (cardNumber || '').toString().replace(/\s+/g, '');
    const expiryRegex = /^(0[1-9]|1[0-2])\/(\d{2}|\d{4})$/;
    const cvvClean = (cvv || '').toString().replace(/[^0-9]/g, '');

    if (!cardNumberClean || cardNumberClean.length < 13 || cardNumberClean.length > 19) {
      return res.status(400).json({ error: 'invalid_card_number', message: 'Numéro de carte invalide' });
    }

    if (!expiryDate || !expiryRegex.test(expiryDate)) {
      return res.status(400).json({ error: 'invalid_expiry', message: 'Date d\'expiration invalide (MM/YY)' });
    }

    if (!cvvClean || (cvvClean.length !== 3 && cvvClean.length !== 4)) {
      return res.status(400).json({ error: 'invalid_cvv', message: 'CVV invalide' });
    }

    if (!cardholderName || cardholderName.toString().trim().length < 2) {
      return res.status(400).json({ error: 'invalid_cardholder', message: 'Nom du titulaire invalide' });
    }

    // Get current active subscription
    const [subscriptions] = await db.execute(
      `SELECT * FROM seller_subscriptions WHERE seller_id = ? ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (subscriptions.length === 0) {
      return res.status(400).json({ error: 'no_subscription', message: 'No active subscription found. Please request a new subscription first.' });
    }

    const currentSub = subscriptions[0];

    // Check if subscription is active and paid
    if (currentSub.status !== 'active' || currentSub.payment_status !== 'paid') {
      return res.status(400).json({ error: 'invalid_subscription_status', message: 'Only active, paid subscriptions can be renewed.' });
    }

    // Renew subscription: extend end_date by 1 month from current end_date (or from now if end_date is in past)
    const currentEndDate = new Date(currentSub.end_date);
    const now = new Date();
    const newEndDate = currentEndDate > now ? new Date(currentEndDate.getTime() + 30*24*60*60*1000) : new Date(now.getTime() + 30*24*60*60*1000);
    const newEndDateStr = newEndDate.toISOString().split('T')[0];

    await db.execute(
      `UPDATE seller_subscriptions SET end_date = ?, paid_at = NOW(), updated_at = NOW() WHERE id = ?`,
      [newEndDateStr, currentSub.id]
    );

    const paymentAmount = Number(currentSub.amount || currentSub.plan_price || 30);
    try {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS platform_financials (
          id INT PRIMARY KEY,
          admin_revenue DECIMAL(10,2) DEFAULT 0.00
        )
      `);

      await db.execute(
        `INSERT INTO platform_financials (id, admin_revenue) VALUES (1, ?) ON DUPLICATE KEY UPDATE admin_revenue = admin_revenue + ?`,
        [paymentAmount, paymentAmount]
      );
    } catch (finErr) {
      console.error('Failed to update platform financials:', finErr);
    }

    try {
      const [stores] = await db.execute(
        `SELECT id, name, owner_id, COALESCE(wallet_balance, 0) AS wallet_balance, threshold_notified FROM stores WHERE owner_id = ? LIMIT 1`,
        [userId]
      );
      if (stores.length > 0) {
        const store = stores[0];
        const newBalance = Number(store.wallet_balance || 0) + paymentAmount;
        await db.execute(
          `UPDATE stores SET wallet_balance = ?, updated_at = NOW() WHERE id = ?`,
          [newBalance, store.id]
        );
        await notifyStoreThresholdIfNeeded(db, store.id, store.owner_id, store.name, newBalance, store.threshold_notified);
      }
    } catch (storeErr) {
      console.error('Failed to update seller store balance on renewal:', storeErr);
    }

    try {
      await ensureNotificationsTable(db);
      await createSubscriptionNotification(db, {
        seller_id: userId,
        recipient_role: 'admin',
        subscription_id: currentSub.id,
        type: 'payment',
        title: 'Paiement abonnement vendeur reçu',
        message: `Le vendeur #${userId} a renouvelé son abonnement vendeur (ID de souscription ${currentSub.id}).`
      });

      await createSubscriptionNotification(db, {
        seller_id: userId,
        recipient_id: userId,
        recipient_role: 'seller',
        subscription_id: currentSub.id,
        type: 'renewal',
        title: 'Renouvellement avec succès',
        message: `Votre renouvellement a été effectué avec succès. Nouvelle date d'expiration : ${newEndDateStr}`
      });
    } catch (notificationErr) {
      console.error('Failed to create renewal notifications:', notificationErr);
    }

    res.json({ 
      success: true, 
      subscriptionId: currentSub.id,
      newEndDate: newEndDateStr,
      message: 'Paiement renouvellement réussi. Abonnement prolongé de 30 jours.' 
    });
  } catch (error) {
    console.error('Seller renewal error:', error);
    res.status(500).json({ error: 'Failed to renew subscription', details: error.message });
  }
});

module.exports = router;
