const express = require('express');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const crypto = require('crypto');

const router = express.Router();

// Konnect Configuration
const KONNECT_API_URL = process.env.KONNECT_API_URL || 'https://api.sandbox.konnect.io';
const KONNECT_API_KEY = process.env.KONNECT_API_KEY || '';
const KONNECT_MERCHANT_ID = process.env.KONNECT_MERCHANT_ID || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
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
    req.user = user;
    next();
  });
};

// Create Payment Session
router.post('/create-payment', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.body;
    const db = req.db;

    // Fetch order details
    const [orders] = await db.execute(`
      SELECT o.*, c.full_name, c.email, c.phone
      FROM orders o
      LEFT JOIN profiles c ON o.customer_id = c.id
      WHERE o.id = ? AND o.customer_id = ?
    `, [orderId, req.user.userId]);

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    // Calculate total with shipping
    const total = order.total || 0;
    const amountInCents = Math.round(total * 1000); // Konnect uses millimes (1/1000 TND)

    // Generate merchant reference
    const merchantReference = `ORD-${order.id}-${Date.now()}`;

    // Create payment record in database
    const [result] = await db.execute(`
      INSERT INTO payments (
        order_id, customer_id, amount, currency, status,
        payment_method, merchant_reference, customer_name, customer_email, customer_phone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      orderId,
      req.user.userId,
      total,
      'TND',
      'pending',
      'card',
      merchantReference,
      order.full_name,
      order.email,
      order.phone
    ]);

    const paymentId = result.insertId;

    const localCheckoutUrl = `${FRONTEND_URL}/payment/success?paymentId=${paymentId}`;
    const isKonnectConfigured = KONNECT_API_KEY && !KONNECT_API_KEY.includes('your-konnect-api-key') && KONNECT_MERCHANT_ID && !KONNECT_MERCHANT_ID.includes('your-konnect-merchant-id');

    if (!isKonnectConfigured) {
      console.warn('Konnect is not configured. Using local payment fallback.');

      await db.execute(`
        UPDATE payments SET status = 'completed', updated_at = NOW() WHERE id = ?
      `, [paymentId]);

      await db.execute(`
        UPDATE orders
        SET payment_status = 'paid', payment_id = ?, paid_at = NOW(), status = 'confirmed'
        WHERE id = ?
      `, [paymentId, orderId]);

      return res.json({
        success: true,
        paymentId,
        paymentUrl: localCheckoutUrl,
        redirectUrl: localCheckoutUrl,
        message: 'Local payment fallback enabled',
      });
    }

    // Prepare Konnect payment payload
    const konnectPayload = {
      receiverWalletId: KONNECT_MERCHANT_ID,
      amount: amountInCents,
      currency: 'TND',
      type: 'immediate',
      description: `Order #${order.id} - Souk.tn Marketplace`,
      ref: merchantReference,
      orderId: order.id,
      firstName: order.full_name?.split(' ')[0] || 'Customer',
      lastName: order.full_name?.split(' ').slice(1).join(' ') || '',
      phone: order.phone || '',
      email: order.email || '',
      successUrl: `${FRONTEND_URL}/payment/success?paymentId=${paymentId}`,
      failureUrl: `${FRONTEND_URL}/payment/failure?paymentId=${paymentId}`,
      webhookUrl: `${BACKEND_URL}/api/payments/webhook`,
      metadata: {
        paymentId,
        orderId,
        customerId: req.user.userId,
      }
    };

    // Call Konnect API to create payment session
    const konnectResponse = await axios.post(
      `${KONNECT_API_URL}/gateway/payment/create-payment-session`,
      konnectPayload,
      {
        headers: {
          'Authorization': `Bearer ${KONNECT_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!konnectResponse.data.sessionId) {
      throw new Error('Failed to create Konnect payment session');
    }

    // Store Konnect session ID in database
    await db.execute(`
      UPDATE payments
      SET konnect_session_id = ?, konnect_payment_id = ?
      WHERE id = ?
    `, [konnectResponse.data.sessionId, konnectResponse.data.paymentId, paymentId]);

    // Return payment URL to client
    res.json({
      success: true,
      paymentId,
      sessionId: konnectResponse.data.sessionId,
      paymentUrl: konnectResponse.data.paymentUrl,
      redirectUrl: konnectResponse.data.paymentUrl
    });

  } catch (error) {
    console.error('Create payment error:', error.message);
    res.status(500).json({ error: 'Failed to create payment session', details: error.message });
  }
});

// Payment Success Callback (from Konnect redirect)
router.get('/success', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.query;
    const db = req.db;

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID required' });
    }

    // Fetch payment details
    const [payments] = await db.execute(`
      SELECT * FROM payments WHERE id = ? AND customer_id = ?
    `, [paymentId, req.user.userId]);

    if (payments.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = payments[0];

    // Verify payment status with Konnect
    let paymentStatus = 'pending';
    if (payment.konnect_session_id) {
      try {
        const verifyResponse = await axios.get(
          `${KONNECT_API_URL}/gateway/payment/verify-payment`,
          {
            params: { paymentId: payment.konnect_payment_id },
            headers: { 'Authorization': `Bearer ${KONNECT_API_KEY}` }
          }
        );
        paymentStatus = verifyResponse.data.status;
      } catch (verifyError) {
        console.error('Verify payment error:', verifyError.message);
      }
    }

    // Update payment status
    if (paymentStatus === 'completed' || paymentStatus === 'success') {
      await db.execute(`
        UPDATE payments SET status = 'completed', updated_at = NOW() WHERE id = ?
      `, [paymentId]);

      // Update order status to paid
      await db.execute(`
        UPDATE orders
        SET payment_status = 'paid', payment_id = ?, paid_at = NOW(), status = 'confirmed'
        WHERE id = ?
      `, [paymentId, payment.order_id]);

      res.json({
        success: true,
        message: 'Payment successful',
        paymentId,
        orderId: payment.order_id,
        status: 'completed'
      });
    } else {
      res.json({
        success: false,
        message: 'Payment status pending verification',
        status: paymentStatus
      });
    }

  } catch (error) {
    console.error('Payment success callback error:', error);
    res.status(500).json({ error: 'Failed to process payment success' });
  }
});

// Payment Failure Callback
router.get('/failure', authenticateToken, async (req, res) => {
  try {
    const { paymentId, errorCode, errorMessage } = req.query;
    const db = req.db;

    if (!paymentId) {
      return res.status(400).json({ error: 'Payment ID required' });
    }

    // Update payment status to failed
    await db.execute(`
      UPDATE payments
      SET status = 'failed', error_message = ?, updated_at = NOW()
      WHERE id = ?
    `, [errorMessage || 'Payment declined', paymentId]);

    res.json({
      success: false,
      message: 'Payment failed',
      paymentId,
      errorCode,
      errorMessage
    });

  } catch (error) {
    console.error('Payment failure callback error:', error);
    res.status(500).json({ error: 'Failed to process payment failure' });
  }
});

// Webhook from Konnect (payment status update)
router.post('/webhook', async (req, res) => {
  try {
    const { paymentId, status, amount, ref } = req.body;
    const db = req.db;

    console.log('Konnect webhook received:', { paymentId, status, ref });

    // Verify webhook signature if provided
    const signature = req.headers['x-konnect-signature'];
    if (signature) {
      // Verify signature to ensure it's from Konnect
      const payload = JSON.stringify(req.body);
      const hash = crypto
        .createHmac('sha256', KONNECT_API_KEY)
        .update(payload)
        .digest('hex');

      if (hash !== signature) {
        console.warn('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Find payment by Konnect payment ID
    const [payments] = await db.execute(`
      SELECT * FROM payments WHERE konnect_payment_id = ?
    `, [paymentId]);

    const metadata = req.body.metadata || {};
    let subscription = null;
    if (metadata.subscriptionId) {
      const [subs] = await db.execute(`
        SELECT * FROM seller_subscriptions WHERE id = ?
      `, [metadata.subscriptionId]);
      subscription = subs[0];
    }

    if (!subscription) {
      const [subs] = await db.execute(`
        SELECT * FROM seller_subscriptions WHERE konnect_payment_id = ?
      `, [paymentId]);
      subscription = subs[0];
    }

    if (subscription) {
      const mappedStatus = status === 'completed' || status === 'success' ? 'active' : status === 'failed' || status === 'declined' ? 'past_due' : 'pending';
      const updates = ['status = ?'];
      const params = [mappedStatus];

      if (mappedStatus === 'active') {
        const nextDate = new Date();
        if (subscription.interval === 'yearly') {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        } else {
          nextDate.setMonth(nextDate.getMonth() + 1);
        }
        updates.push('current_period_end = ?', 'next_payment_date = ?');
        params.push(nextDate.toISOString().slice(0, 10), nextDate.toISOString().slice(0, 10));
      }

      params.push(subscription.id);
      await db.execute(`
        UPDATE seller_subscriptions SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?
      `, params);

      console.log(`Subscription ${subscription.id} updated to status ${mappedStatus}`);
      return res.json({ success: true, message: 'Subscription webhook processed' });
    }

    if (payments.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = payments[0];

    // Update payment status based on Konnect status
    const mappedStatus = status === 'completed' || status === 'success' ? 'completed' : status || 'pending';

    await db.execute(`
      UPDATE payments SET status = ?, updated_at = NOW() WHERE id = ?
    `, [mappedStatus, payment.id]);

    // Record payment attempt
    await db.execute(`
      INSERT INTO payment_attempts (payment_id, attempt_number, status, response_data)
      VALUES (?, 1, ?, ?)
    `, [payment.id, mappedStatus, JSON.stringify(req.body)]);

    // If payment completed, update order
    if (mappedStatus === 'completed') {
      await db.execute(`
        UPDATE orders
        SET payment_status = 'paid', payment_id = ?, paid_at = NOW(), status = 'confirmed'
        WHERE id = ?
      `, [payment.id, payment.order_id]);

      console.log(`Order ${payment.order_id} marked as paid`);
    }

    res.json({ success: true, message: 'Webhook processed' });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Verify Payment Status (client can check status)
router.get('/verify/:paymentId', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const db = req.db;

    const [payments] = await db.execute(`
      SELECT * FROM payments WHERE id = ? AND customer_id = ?
    `, [paymentId, req.user.userId]);

    if (payments.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = payments[0];

    res.json({
      success: true,
      payment: {
        id: payment.id,
        orderId: payment.order_id,
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.created_at,
        updatedAt: payment.updated_at
      }
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

module.exports = router;
