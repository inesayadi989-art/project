/**
 * NotificationService
 * 
 * Service centralisé pour les notifications
 * Gère les notifications entre vendeur et client
 * 
 * Workflow:
 * 1. Client passe une commande → Notification vendeur + Client
 * 2. Vendeur accepte → Notification client
 * 3. Client paie → Notification vendeur + Client
 * 4. Commande expédiée → Notification client
 * 5. Commande livrée → Notification client
 */

class NotificationService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Ensure notifications table exists with all required columns
   */
  async ensureNotificationsTable(dbClient = null) {
    const client = dbClient || this.db;
    
    // Create table if it doesn't exist
    await client.execute(`
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
        action_required BOOLEAN DEFAULT FALSE,
        action_type VARCHAR(50) NULL,
        order_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY (recipient_id, recipient_role),
        KEY (order_id)
      ) ENGINE=InnoDB;
    `);

    // Add missing columns if they don't exist
    try {
      await client.execute(`ALTER TABLE notifications ADD COLUMN order_id INT NULL`);
    } catch (e) {
      // Column already exists, ignore error
    }

    try {
      await client.execute(`ALTER TABLE notifications ADD COLUMN action_required BOOLEAN DEFAULT FALSE`);
    } catch (e) {
      // Column already exists, ignore error
    }

    try {
      await client.execute(`ALTER TABLE notifications ADD COLUMN action_type VARCHAR(50) NULL`);
    } catch (e) {
      // Column already exists, ignore error
    }

    try {
      await client.execute(`ALTER TABLE notifications ADD INDEX idx_order_id (order_id)`);
    } catch (e) {
      // Index already exists, ignore error
    }
  }

  /**
   * Create a notification record
   */
  async createNotification(data, dbClient = null) {
    const client = dbClient || this.db;
    
    const {
      seller_id = null,
      recipient_id,
      recipient_role, // 'customer', 'seller', 'admin'
      type, // 'new_order', 'order_confirmed', 'payment_received', 'order_shipped', 'order_delivered', etc.
      title,
      message,
      order_id = null,
      action_required = false,
      action_type = null // 'confirm_order', 'view_order', etc.
    } = data;

    await this.ensureNotificationsTable(client);

    const [result] = await client.execute(
      `INSERT INTO notifications (
        seller_id, recipient_id, recipient_role, type, title, message,
        order_id, is_read, action_required, action_type, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?, ?, NOW())`,
      [
        seller_id,
        recipient_id,
        recipient_role,
        type,
        title,
        message,
        order_id,
        action_required ? 1 : 0,
        action_type
      ]
    );

    return result.insertId;
  }

  /**
   * 📦 ORDER LIFECYCLE NOTIFICATIONS
   */

  /**
   * 1️⃣ Client place une commande
   * → Notify: Vendor (action required) + Customer (pending)
   */
  async notifyNewOrder(order, storeInfo, dbClient = null) {
    const client = dbClient || this.db;

    // 🔴 Alert VENDEUR: Nouvelle commande en attente
    await this.createNotification({
      seller_id: storeInfo.owner_id,
      recipient_id: storeInfo.owner_id,
      recipient_role: 'seller',
      type: 'new_order',
      title: '🔔 Nouvelle commande reçue',
      message: `Nouvelle commande (#${order.id}) en attente de votre confirmation.\nMontant total: ${order.total.toFixed(3)} TND`,
      order_id: order.id,
      action_required: true,
      action_type: 'confirm_order'
    }, client);

    // 🟡 Notification CLIENT: Commande prise en compte
    await this.createNotification({
      recipient_id: order.customer_id,
      recipient_role: 'customer',
      type: 'order_pending',
      title: '⏳ Commande en attente',
      message: `Votre commande (#${order.id}) a bien été reçue.\nElle attend la confirmation du vendeur.`,
      order_id: order.id,
      action_required: false
    }, client);
  }

  /**
   * 2️⃣ Vendeur confirme la commande
   * → Notify: Customer (can now pay) + Vendor (confirmation sent)
   */
  async notifyOrderConfirmed(order, storeInfo, dbClient = null) {
    const client = dbClient || this.db;

    // 🟢 Notification CLIENT: Commande confirmée
    await this.createNotification({
      recipient_id: order.customer_id,
      recipient_role: 'customer',
      type: 'order_confirmed',
      title: '✅ Commande confirmée',
      message: `Le vendeur a confirmé votre commande (#${order.id}).\nVous pouvez maintenant procéder au paiement.`,
      order_id: order.id,
      action_required: true,
      action_type: 'pay_order'
    }, client);

    // 📨 Notification VENDEUR: Confirmation envoyée
    await this.createNotification({
      seller_id: storeInfo.owner_id,
      recipient_id: storeInfo.owner_id,
      recipient_role: 'seller',
      type: 'order_confirmed_sent',
      title: '📤 Confirmation envoyée au client',
      message: `Commande (#${order.id}) confirmée au client.\nEn attente du paiement.`,
      order_id: order.id,
      action_required: false
    }, client);
  }

  /**
   * 3️⃣ Client paie la commande
   * → Notify: Vendor (payment received, prepare to ship) + Customer (payment confirmed)
   */
  async notifyPaymentReceived(order, storeInfo, vendorAmount, adminCommission, dbClient = null) {
    const client = dbClient || this.db;

    // 💚 Notification VENDEUR: Paiement reçu, préparation
    await this.createNotification({
      seller_id: storeInfo.owner_id,
      recipient_id: storeInfo.owner_id,
      recipient_role: 'seller',
      type: 'payment_received',
      title: '💰 Paiement reçu',
      message: `Paiement de ${order.total.toFixed(3)} TND reçu pour la commande (#${order.id}).\nVous recevrez: ${vendorAmount.toFixed(3)} TND (90%)\nCommission plateforme: ${adminCommission.toFixed(3)} TND (10%)`,
      order_id: order.id,
      action_required: true,
      action_type: 'prepare_shipment'
    }, client);

    // 💙 Notification CLIENT: Paiement confirmé
    await this.createNotification({
      recipient_id: order.customer_id,
      recipient_role: 'customer',
      type: 'payment_confirmed',
      title: '💳 Paiement effectué',
      message: `Votre paiement de ${order.total.toFixed(3)} TND a été confirmé.\nCommande (#${order.id}) en cours de préparation.`,
      order_id: order.id,
      action_required: false
    }, client);
  }

  /**
   * 4️⃣ Vendeur marque commande comme expédiée
   * → Notify: Customer (shipped, tracking info)
   */
  async notifyOrderShipped(order, storeInfo, trackingInfo = null, dbClient = null) {
    const client = dbClient || this.db;

    let trackingMessage = '';
    if (trackingInfo) {
      trackingMessage = `\nNuméro de suivi: ${trackingInfo}`;
    }

    // 📦 Notification CLIENT: Commande expédiée
    await this.createNotification({
      recipient_id: order.customer_id,
      recipient_role: 'customer',
      type: 'order_shipped',
      title: '🚚 Commande expédiée',
      message: `Votre commande (#${order.id}) a été expédiée.\nLivraison prévue dans 2-3 jours.${trackingMessage}`,
      order_id: order.id,
      action_required: false
    }, client);
  }

  /**
   * 5️⃣ Commande livrée
   * → Notify: Customer (delivered, can review) + Vendor (completed)
   */
  async notifyOrderDelivered(order, storeInfo, dbClient = null) {
    const client = dbClient || this.db;

    // 📬 Notification CLIENT: Commande livrée
    await this.createNotification({
      recipient_id: order.customer_id,
      recipient_role: 'customer',
      type: 'order_delivered',
      title: '✔️ Commande livrée',
      message: `Votre commande (#${order.id}) a été livrée avec succès.\nN'hésitez pas à laisser un avis sur votre achat.`,
      order_id: order.id,
      action_required: false
    }, client);

    // ✅ Notification VENDEUR: Commande complétée
    await this.createNotification({
      seller_id: storeInfo.owner_id,
      recipient_id: storeInfo.owner_id,
      recipient_role: 'seller',
      type: 'order_completed',
      title: '🎉 Commande complétée',
      message: `Commande (#${order.id}) livrée avec succès.`,
      order_id: order.id,
      action_required: false
    }, client);
  }

  /**
   * 6️⃣ Commande refusée par vendeur
   * → Notify: Customer (can order again), Vendor (stock restored)
   */
  async notifyOrderRejected(order, storeInfo, rejectionReason = null, dbClient = null) {
    const client = dbClient || this.db;

    let reasonMessage = '';
    if (rejectionReason) {
      reasonMessage = `\nRaison: ${rejectionReason}`;
    }

    // ❌ Notification CLIENT: Commande refusée
    await this.createNotification({
      recipient_id: order.customer_id,
      recipient_role: 'customer',
      type: 'order_rejected',
      title: '❌ Commande refusée',
      message: `Nous sommes désolés. Votre commande (#${order.id}) a été refusée.${reasonMessage}\nVous pouvez modifier votre panier et réessayer.`,
      order_id: order.id,
      action_required: false
    }, client);

    // ⚠️ Notification VENDEUR: Confirmation d'annulation
    await this.createNotification({
      seller_id: storeInfo.owner_id,
      recipient_id: storeInfo.owner_id,
      recipient_role: 'seller',
      type: 'order_rejection_confirmed',
      title: '📋 Votre commande a été rejetée',
      message: `Votre commande (#${order.id}) a été rejetée.`,
      order_id: order.id,
      action_required: false
    }, client);
  }

  /**
   * 💰 THRESHOLD REACHED
   * → Notify: Vendor when wallet reaches 500 TND
   */
  async notifyRevenueThresholdReached(storeInfo, walletBalance, dbClient = null) {
    const client = dbClient || this.db;

    // 🚨 Notification VENDEUR: Seuil atteint
    await this.createNotification({
      seller_id: storeInfo.owner_id,
      recipient_id: storeInfo.owner_id,
      recipient_role: 'seller',
      type: 'revenue_threshold_reached',
      title: '🎉 Seuil de revenu atteint!',
      message: `Félicitations! Votre boutique "${storeInfo.name}" a atteint ${parseFloat(walletBalance).toFixed(3)} TND de revenus.\nVous pouvez maintenant demander un paiement.`,
      action_required: true,
      action_type: 'request_payout'
    }, client);
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId, role = 'customer', limit = 20, dbClient = null) {
    const client = dbClient || this.db;

    await this.ensureNotificationsTable(client);

    let query = `
      SELECT * FROM notifications
      WHERE recipient_id = ? AND recipient_role = ? AND is_read = FALSE
      ORDER BY created_at DESC
      LIMIT ?
    `;

    const [notifications] = await client.execute(query, [userId, role, limit]);
    return notifications;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, dbClient = null) {
    const client = dbClient || this.db;

    await client.execute(
      'UPDATE notifications SET is_read = TRUE WHERE id = ?',
      [notificationId]
    );
  }

  /**
   * Get all notifications for a user (paginated)
   */
  async getNotifications(userId, role = 'customer', page = 1, limit = 20, dbClient = null) {
    const client = dbClient || this.db;

    await this.ensureNotificationsTable(client);

    const offset = (page - 1) * limit;

    const [notifications] = await client.execute(
      `SELECT * FROM notifications
       WHERE recipient_id = ? AND recipient_role = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, role, limit, offset]
    );

    const [[{ count }]] = await client.execute(
      `SELECT COUNT(*) as count FROM notifications
       WHERE recipient_id = ? AND recipient_role = ?`,
      [userId, role]
    );

    return {
      notifications,
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit)
    };
  }
}

module.exports = NotificationService;
