const express = require('express');
const { body, validationResult } = require('express-validator');
const FinancialService = require('../services/FinancialService');
const NotificationService = require('../services/NotificationService');

const router = express.Router();

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

router.post('/create-payment', authenticateToken, [
  body('orderId').isInt(),
  body('cardNumber').isString().isLength({ min: 13, max: 19 }),
  body('expiryDate').matches(/^(0[1-9]|1[0-2])\/\d{2}$/),
  body('cvv').isString().isLength({ min: 3, max: 4 }),
  body('cardholderName').isString().isLength({ min: 2 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId, cardNumber, expiryDate, cvv, cardholderName } = req.body;
    const db = req.db;

    const [orders] = await db.execute(`
      SELECT o.*, p.full_name as customer_name, p.email as customer_email, p.phone as customer_phone
      FROM orders o
      LEFT JOIN profiles p ON o.customer_id = p.id
      WHERE o.id = ? AND o.customer_id = ?
      LIMIT 1
    `, [orderId, req.user.userId]);

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];

    // Only allow payment after vendor has confirmed the order
    if (order.status !== 'confirmed') {
      return res.status(400).json({ 
        error: 'Paiement impossible. Attendez la confirmation du vendeur.' 
      });
    }

    if (order.payment_status === 'paid') {
      return res.status(400).json({ error: 'Order is already paid' });
    }

    if (order.payment_method !== 'card') {
      return res.status(400).json({ error: 'Only card payments are supported' });
    }

    const paymentReference = `ORD-${order.id}-${Date.now()}`;
    const amount = parseFloat(order.total);

    const connection = await db.getConnection();
    let paymentId;
    let vendorAmount = 0;
    let adminCommission = 0;
    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(`
        INSERT INTO payments (
          order_id, customer_id, amount, currency, status,
          payment_method, merchant_reference, customer_name, customer_email, customer_phone,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        orderId,
        req.user.userId,
        amount,
        'TND',
        'completed',
        'card',
        paymentReference,
        cardholderName,
        order.customer_email || '',
        order.customer_phone || ''
      ]);

      paymentId = result.insertId;
      const [orderItems] = await connection.execute(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
        [orderId]
      );

      for (const item of orderItems) {
        await connection.execute(
          'UPDATE products SET sold_count = sold_count + ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }

      const financialService = new FinancialService(db);
      const paymentResult = await financialService.processOrderPayment(order, undefined, connection, paymentId);
      adminCommission = paymentResult.platformCommission;
      vendorAmount = paymentResult.vendorAmount;

      // 🔔 Notify client and vendor: Payment received
      const notificationService = new NotificationService(db);
      const [storeRows] = await connection.execute(
        'SELECT owner_id, name FROM stores WHERE id = ? LIMIT 1',
        [order.store_id]
      );

      if (storeRows.length > 0) {
        const storeInfo = {
          owner_id: storeRows[0].owner_id,
          name: storeRows[0].name
        };
        
        const orderData = {
          id: orderId,
          customer_id: req.user.userId,
          store_id: order.store_id,
          total: amount
        };

        try {
          await notificationService.notifyPaymentReceived(orderData, storeInfo, vendorAmount, adminCommission, connection);
        } catch (notifError) {
          console.error('❌ Payment notification error:', notifError);
          // Don't fail payment if notifications fail
        }
      }

      await connection.commit();
    } catch (innerError) {
      await connection.rollback();
      throw innerError;
    } finally {
      await connection.release();
    }

    res.json({
      success: true,
      message: 'Payment simulé effectué avec succès',
      paymentId,
      orderId,
      amount,
      status: 'paid_confirmed',
      vendorAmount,
      adminCommission
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to process payment', details: error.message });
  }
});

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
