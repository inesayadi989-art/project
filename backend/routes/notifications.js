const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const NotificationService = require('../services/NotificationService');

const router = express.Router();

/**
 * 🔔 NOTIFICATIONS ROUTES
 * 
 * Permet aux clients et vendeurs de récupérer et gérer leurs notifications
 */

// Get notifications for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, unread_only = false } = req.query;
    const db = req.db;
    const notificationService = new NotificationService(db);

    const userRole = req.user.role === 'seller' ? 'seller' : 'customer';
    
    if (unread_only === 'true' || unread_only === '1') {
      // Get only unread notifications
      const notifications = await notificationService.getUnreadNotifications(
        req.user.userId,
        userRole,
        parseInt(limit)
      );

      return res.json({
        notifications,
        page: 1,
        limit: notifications.length,
        total: notifications.length
      });
    }

    // Get paginated notifications
    const result = await notificationService.getNotifications(
      req.user.userId,
      userRole,
      parseInt(page),
      parseInt(limit)
    );

    res.json(result);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread count
router.get('/unread/count', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const notificationService = new NotificationService(db);
    
    const userRole = req.user.role === 'seller' ? 'seller' : 'customer';
    
    await notificationService.ensureNotificationsTable();
    
    const [[{ count }]] = await db.execute(
      `SELECT COUNT(*) as count FROM notifications 
       WHERE recipient_id = ? AND recipient_role = ? AND is_read = FALSE`,
      [req.user.userId, userRole]
    );

    res.json({ unread_count: count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db;
    const notificationService = new NotificationService(db);

    // Verify ownership
    const [[notification]] = await db.execute(
      `SELECT * FROM notifications WHERE id = ? AND recipient_id = ?`,
      [id, req.user.userId]
    );

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await notificationService.markAsRead(id);

    res.json({ message: 'Notification marked as read', id });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/mark-all/read', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const userRole = req.user.role === 'seller' ? 'seller' : 'customer';

    await db.execute(
      `UPDATE notifications SET is_read = TRUE 
       WHERE recipient_id = ? AND recipient_role = ? AND is_read = FALSE`,
      [req.user.userId, userRole]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Get notifications for a specific order
router.get('/order/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const db = req.db;

    const [notifications] = await db.execute(
      `SELECT * FROM notifications 
       WHERE order_id = ? AND recipient_id = ?
       ORDER BY created_at DESC`,
      [orderId, req.user.userId]
    );

    res.json({ notifications });
  } catch (error) {
    console.error('Get order notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch order notifications' });
  }
});

module.exports = router;
