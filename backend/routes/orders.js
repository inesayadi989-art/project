const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireSubscription, authenticateAdmin } = require('../middleware/auth');
const NotificationService = require('../services/NotificationService');
const { formatOrder, restoreOrderStock, settleOrderToStore } = require('../helpers/orders');

const router = express.Router();

// Get user orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;

    const [orders] = await db.execute(`
      SELECT o.*, s.name as store_name, s.slug as store_slug
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      WHERE o.customer_id = ?
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [req.user.userId, parseInt(limit), offset]);

    // Get order items for each order and format order data
    for (let order of orders) {
      // Format order data
      order = formatOrder(order);
      
      // Convert price fields to numbers
      order.total = parseFloat(order.total) || 0;
      order.subtotal = parseFloat(order.subtotal) || 0;
      order.shipping_cost = parseFloat(order.shipping_cost) || 0;

      const [items] = await db.execute(`
        SELECT oi.*, p.name as product_name, p.price, pi.image_url
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.sort_order = 0
        WHERE oi.order_id = ?
      `, [order.id]);

      // Add total_price to each item if not present
      order.items = items.map(item => ({
        ...item,
        price: parseFloat(item.price) || 0,
        quantity: parseInt(item.quantity) || 0,
        total_price: parseFloat((parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)) || 0
      }));
    }

    res.json({ orders, page: parseInt(page), limit: parseInt(limit) });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ STATIC ROUTES BEFORE DYNAMIC (/:id)
// Get seller orders (MUST be before /:id to avoid route conflict)
router.get('/seller/orders', authenticateToken, async (req, res) => {
  try {
    console.log('SELLER ORDERS route hit', { user: req.user });
    if (req.user.role !== 'seller') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const db = req.db;
    const { page = 1, limit = 10, status } = req.query;

    // Get seller's store
    const [stores] = await db.execute(
      'SELECT id FROM stores WHERE owner_id = ?',
      [req.user.userId]
    );

    if (stores.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const storeId = stores[0].id;
    const offset = (page - 1) * limit;

    let query = `
      SELECT o.*, p.full_name as customer_name, p.email as customer_email
      FROM orders o
      LEFT JOIN profiles p ON o.customer_id = p.id
      WHERE o.store_id = ?
    `;

    const params = [storeId];

    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }

    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [orders] = await db.execute(query, params);

    // Get order items and format orders
    for (let order of orders) {
      // Format order data
      order = formatOrder(order);

      const [items] = await db.execute(`
        SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.price as unit_price, p.name as product_name, pi.image_url
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.sort_order = 0
        WHERE oi.order_id = ?
      `, [order.id]);

      console.log('🔍 Seller order items for order', order.id, ':', JSON.stringify(items));
      order.items = items.map(item => ({
        ...item,
        unit_price: parseFloat(item.unit_price) || 0,
        quantity: parseInt(item.quantity) || 0,
        total_price: parseFloat((parseFloat(item.unit_price) * parseInt(item.quantity)).toFixed(2)) || 0
      }));
    }

    console.log('📤 Sending seller orders response:', JSON.stringify(orders.slice(0, 1)));
    res.json({ orders, page: parseInt(page), limit: parseInt(limit) });

  } catch (error) {
    console.error('Get seller orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: list all orders (MUST be before /:id to avoid route conflict)
router.get('/admin/orders', authenticateAdmin, async (req, res) => {
  try {
    const db = req.db;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const [orders] = await db.execute(`
      SELECT o.*, s.name as store_name, p.full_name as customer_name, p.email as customer_email
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      LEFT JOIN profiles p ON o.customer_id = p.id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), offset]);

    res.json({ orders: orders || [] });
  } catch (error) {
    console.error('Admin get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single order
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;

    const [orders] = await db.execute(`
      SELECT o.*, s.name as store_name, s.slug as store_slug,
             p.full_name as customer_name, p.email as customer_email,
             p.phone, p.address_line1, p.city, p.governorate, p.postal_code
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      LEFT JOIN profiles p ON o.customer_id = p.id
      WHERE o.id = ? AND (o.customer_id = ? OR EXISTS(
        SELECT 1 FROM stores WHERE owner_id = ? AND id = o.store_id
      ))
    `, [id, req.user.userId, req.user.userId]);

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    let order = orders[0];

    // Format order data
    order = formatOrder(order);
    
    // Convert price fields to numbers
    order.total = parseFloat(order.total) || 0;
    order.subtotal = parseFloat(order.subtotal) || 0;
    order.shipping_cost = parseFloat(order.shipping_cost) || 0;

    // Get order items
    const [items] = await db.execute(`
      SELECT oi.*, p.name as product_name, p.price, pi.image_url
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.sort_order = 0
      WHERE oi.order_id = ?
    `, [id]);

    // Add total_price to each item
    order.items = items.map(item => ({
      ...item,
      price: parseFloat(item.price) || 0,
      quantity: parseInt(item.quantity) || 0,
      total_price: parseFloat((parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)) || 0
    }));

    res.json({ order });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create order
router.post('/', authenticateToken, [
  body('storeId').isInt(),
  body('items').isArray({ min: 1 }),
  body('items.*.productId').isInt(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('shippingAddress').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check that only customers can place orders
    const [userProfiles] = await req.db.execute(
      'SELECT role FROM profiles WHERE id = ?',
      [req.user.userId]
    );

    if (!userProfiles.length || userProfiles[0].role !== 'customer') {
      return res.status(403).json({ error: 'Seuls les clients peuvent passer des commandes' });
    }

    const { storeId, items, shippingAddress } = req.body;
    const db = req.db;

    // Calculate total
    let total = 0;
    const orderItems = [];

    for (const item of items) {
      const [products] = await db.execute(
        'SELECT price, stock FROM products WHERE id = ? AND is_active = true',
        [item.productId]
      );

      if (products.length === 0) {
        return res.status(400).json({ error: `Product ${item.productId} not found` });
      }

      const product = products[0];

      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for product ${item.productId}` });
      }

      total += product.price * item.quantity;
      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price
      });
    }

    // Create order
    const [orderResult] = await db.execute(
      'INSERT INTO orders (customer_id, store_id, total, status, payment_status, payment_method, shipping_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [req.user.userId, storeId, total, 'pending_vendor_confirmation', 'unpaid', 'card', JSON.stringify(shippingAddress)]
    );

    const orderId = orderResult.insertId;
    const orderNumber = `ORD-${String(orderId).padStart(6, '0')}`;

    await db.execute(
      'UPDATE orders SET order_number = ? WHERE id = ?',
      [orderNumber, orderId]
    );

    // Insert order items
    for (const item of orderItems) {
      await db.execute(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.productId, item.quantity, item.price]
      );

      // Update stock
      await db.execute(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.productId]
      );
    }

    // Clear cart
    await db.execute(
      'DELETE ci FROM cart_items ci JOIN carts c ON ci.cart_id = c.id WHERE c.customer_id = ?',
      [req.user.userId]
    );

    // 🔔 Create notifications using service
    const [[store]] = await db.execute(
      `SELECT owner_id, name FROM stores WHERE id = ?`,
      [storeId]
    );

    if (!store || !store.owner_id) {
      console.error('❌ Store not found or missing owner_id:', { store, storeId });
      return res.status(400).json({ error: 'Store not found' });
    }

    const notificationService = new NotificationService(db);
    const newOrder = {
      id: orderId,
      customer_id: req.user.userId,
      store_id: storeId,
      total: total
    };
    
    try {
      await notificationService.notifyNewOrder(newOrder, store);
    } catch (notifError) {
      console.error('❌ Notification error:', notifError);
      // Don't fail the order creation if notifications fail
    }

    res.status(201).json({
      message: 'Order created successfully',
      orderId,
      orderNumber,
      total,
      paymentMethod: 'card',
      paymentStatus: 'unpaid',
      status: 'pending_vendor_confirmation'
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Seller decision endpoint: accept or reject a pending order
router.put('/:id/decision', authenticateToken, requireSubscription, [
  body('decision').isIn(['accept', 'reject']),
  body('rejectionReason').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { decision, rejectionReason } = req.body;
    const db = req.db;

    const [orders] = await db.execute(
      `SELECT o.id, o.status, o.store_id, o.customer_id, s.owner_id
       FROM orders o
       JOIN stores s ON o.store_id = s.id
       WHERE o.id = ?`,
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];
    if (order.owner_id !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (order.status !== 'pending_vendor_confirmation') {
      return res.status(400).json({ error: 'Only pending vendor orders can be accepted or rejected' });
    }

    if (decision === 'accept') {
      // Update order status
      await db.execute(
        'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
        ['confirmed', id]
      );

      // 🔔 Notify using service
      const notificationService = new NotificationService(db);
      const [[storeInfo]] = await db.execute(
        'SELECT owner_id, name FROM stores WHERE id = ?',
        [order.store_id]
      );

      try {
        await notificationService.notifyOrderConfirmed(order, storeInfo);
      } catch (notifError) {
        console.error('❌ Confirmation notification error:', notifError);
      }

      return res.json({ message: 'Order accepted by vendor', orderId: id, status: 'confirmed' });
    }

    // REJECT CASE
    await db.execute(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      ['cancelled', id]
    );

    // Restore stock
    await restoreOrderStock(db, id);

    // 🔔 Notify using service
    const notificationService = new NotificationService(db);
    const [[storeInfo]] = await db.execute(
      'SELECT owner_id, name FROM stores WHERE id = ?',
      [order.store_id]
    );

    try {
      await notificationService.notifyOrderRejected(order, storeInfo, rejectionReason);
    } catch (notifError) {
      console.error('❌ Rejection notification error:', notifError);
    }

    return res.json({ message: 'Order rejected and stock restored', orderId: id, status: 'cancelled', vendorDecision: 'rejected_by_vendor', rejectionReason });

  } catch (error) {
    console.error('Seller decision error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order status (seller/admin only)
router.put('/:id/status', authenticateToken, requireSubscription, [
  body('status').isIn(['pending_vendor_confirmation', 'confirmed', 'paid_confirmed', 'completed', 'rejected_by_vendor', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;
    const db = req.db;

    // Check permissions and fetch current order data
    const [orders] = await db.execute(`
      SELECT o.*, s.owner_id
      FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      WHERE o.id = ?
      LIMIT 1
    `, [id]);

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];
    const isAdmin = req.user.role === 'admin';
    const isOwner = order.owner_id === req.user.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!isAdmin && isOwner && !['confirmed', 'paid_confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid transition for vendor user' });
    }

    if (status === 'cancelled' && order.status === 'pending_vendor_confirmation') {
      await restoreOrderStock(db, id);
    }

    if (status === 'paid_confirmed' && order.status !== 'paid_confirmed') {
      const [items] = await db.execute(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
        [id]
      );

      for (const item of items) {
        await db.execute(
          'UPDATE products SET sold_count = sold_count + ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }
    }

    await db.execute(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    return res.json({
      message: 'Order status updated successfully',
      orderId: id,
      status
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;