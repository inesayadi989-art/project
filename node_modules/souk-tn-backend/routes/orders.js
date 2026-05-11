const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireSubscription } = require('../middleware/auth');

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

    // Get order items for each order
    for (let order of orders) {
      const [items] = await db.execute(`
        SELECT oi.*, p.name as product_name, p.price, pi.image_url
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.sort_order = 0
        WHERE oi.order_id = ?
      `, [order.id]);

      order.items = items;
    }

    res.json({ orders, page: parseInt(page), limit: parseInt(limit) });

  } catch (error) {
    console.error('Get orders error:', error);
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

    const order = orders[0];

    // Get order items
    const [items] = await db.execute(`
      SELECT oi.*, p.name as product_name, p.price, pi.image_url
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.sort_order = 0
      WHERE oi.order_id = ?
    `, [id]);

    order.items = items;

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
    const paymentStatus = req.body.paymentMethod === 'card' ? 'pending' : 'unpaid';
    const [orderResult] = await db.execute(
      'INSERT INTO orders (customer_id, store_id, total, status, payment_status, payment_method, shipping_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [req.user.userId, storeId, total, 'pending', paymentStatus, req.body.paymentMethod, JSON.stringify(shippingAddress)]
    );

    const orderId = orderResult.insertId;

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

    res.status(201).json({
      message: 'Order created successfully',
      orderId,
      total
    });

  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order status (seller/admin only)
router.put('/:id/status', authenticateToken, requireSubscription, [
  body('status').isIn(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;
    const db = req.db;

    // Check permissions
    const [orders] = await db.execute(`
      SELECT o.id FROM orders o
      LEFT JOIN stores s ON o.store_id = s.id
      WHERE o.id = ? AND (
        s.owner_id = ? OR
        (SELECT role FROM profiles WHERE id = ?) = 'admin'
      )
    `, [id, req.user.userId, req.user.userId]);

    if (orders.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.execute(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    res.json({ message: 'Order status updated successfully' });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get seller orders
router.get('/seller/orders', authenticateToken, requireSubscription, async (req, res) => {
  try {
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

    // Get order items
    for (let order of orders) {
      const [items] = await db.execute(`
        SELECT oi.*, p.name as product_name
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [order.id]);

      order.items = items;
    }

    res.json({ orders, page: parseInt(page), limit: parseInt(limit) });

  } catch (error) {
    console.error('Get seller orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;