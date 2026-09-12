/**
 * Subscription helpers - Centralized subscription notification functions
 */

// Ensure notifications table exists
const ensureNotificationsTable = async (db) => {
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
};

// Create subscription notification
const createSubscriptionNotification = async (db, data) => {
  try {
    await ensureNotificationsTable(db);

    const seller_id = data.seller_id || null;
    const recipient_id = data.recipient_id || null;
    const recipient_role = data.recipient_role || (data.seller_id ? 'seller' : 'admin');
    const subscription_id = data.subscription_id || null;
    const type = data.type || null;
    const title = data.title || null;
    const message = data.message || null;

    await db.execute(
      `INSERT INTO notifications (seller_id, recipient_id, recipient_role, subscription_id, type, title, message, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, NOW())`,
      [seller_id, recipient_id, recipient_role, subscription_id, type, title, message]
    );

    console.log('Notification stored:', type, title);
  } catch (err) {
    console.error('Failed to persist notification:', err);
    console.log('Notification event (fallback):', data.type, data.title);
  }
};

// Notify store threshold if needed
const notifyStoreThresholdIfNeeded = async (db, storeId, ownerId, storeName, newBalance, thresholdNotified) => {
  if (newBalance >= 1000 && !thresholdNotified) {
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
};

module.exports = {
  ensureNotificationsTable,
  createSubscriptionNotification,
  notifyStoreThresholdIfNeeded
};
