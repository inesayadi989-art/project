/**
 * FinancialService
 *
 */

class FinancialService {
  constructor(db) {
    this.db = db;
    this.COMMISSION_RATE = 10; // 10% platform commission by default
  }

  /**
   * Create financial transaction (source of truth)
   
   */
  async recordTransaction(transactionData, connection = null) {
    const dbClient = connection || this.db;
    const {
      order_id,
      store_id,
      type, // 'order_payment', 'vendor_payout', 'subscription', 'refund'
      amount,
      vendor_amount,
      platform_amount,
      description,
      reference,
      status = 'completed'
    } = transactionData;

    // Verify: amount = vendor_amount + platform_amount
    const sum = parseFloat(vendor_amount) + parseFloat(platform_amount);
    const totalAmount = parseFloat(amount);
    
    if (Math.abs(sum - totalAmount) > 0.01) {
      throw new Error(
        `❌ FINANCIAL INTEGRITY ERROR: ${totalAmount} TND ≠ ${vendor_amount} TND (vendor) + ${platform_amount} TND (platform)`
      );
    }

    const [result] = await dbClient.execute(`
      INSERT INTO financial_transactions (
        order_id,
        store_id,
        type,
        amount,
        vendor_amount,
        platform_amount,
        description,
        reference,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      order_id || null,
      store_id || null,
      type,
      totalAmount,
      vendor_amount,
      platform_amount,
      description,
      reference,
      status
    ]);

    // Log to audit
    await this.logAudit({
      transaction_id: result.insertId,
      action: 'transaction_recorded',
      details: transactionData
    }, dbClient);

    return result.insertId;
  }

  /**
   * Process order payment with transaction
  * ACID transactions
   */
  async processOrderPayment(order, commissionRate = this.COMMISSION_RATE, connection = null, paymentId = null) {
    const connectionOwner = !connection;
    const dbClient = connection || await this.db.getConnection();

    try {
      if (connectionOwner) {
        await dbClient.beginTransaction();
      }

      const totalAmount = parseFloat(order.total);
      const platformCommission = Math.round((totalAmount * commissionRate / 100) * 100) / 100;
      const vendorAmount = Math.round((totalAmount - platformCommission) * 100) / 100;

      // Step 1: Record financial transaction
      const transactionId = await this.recordTransaction({
        order_id: order.id,
        store_id: order.store_id,
        type: 'order_payment',
        amount: totalAmount,
        vendor_amount: vendorAmount,
        platform_amount: platformCommission,
        description: `Payment for Order #${order.id}`,
        reference: `ORD-${order.id}-${Date.now()}`
      }, dbClient);

      // Step 2: Update vendor wallet
      await dbClient.execute(
        `UPDATE stores 
         SET wallet_balance = wallet_balance + ?,
             total_revenue = total_revenue + ?,
             total_sales = total_sales + ?
         WHERE id = ?`,
        [vendorAmount, vendorAmount, totalAmount, order.store_id]
      );

      // Step 3: Update order
      await dbClient.execute(
        `UPDATE orders 
         SET payment_status = 'paid',
             status = 'paid_confirmed',
             payment_id = ?,
             admin_commission = ?,
             vendor_amount = ?,
             paid_at = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        [paymentId || null, platformCommission, vendorAmount, order.id]
      );

      // Step 4: Check threshold
      const [[storeData]] = await dbClient.execute(
        `SELECT wallet_balance, threshold_notified, owner_id, name FROM stores WHERE id = ?`,
        [order.store_id]
      );

      if (parseFloat(storeData.wallet_balance) >= 500 && !storeData.threshold_notified) {
        // Mark threshold as notified
        await dbClient.execute(
          `UPDATE stores SET threshold_notified = TRUE WHERE id = ?`,
          [order.store_id]
        );

        // Use NotificationService to send notification
        const NotificationService = require('./NotificationService');
        const notificationService = new NotificationService(this.db);
        
        try {
          await notificationService.notifyRevenueThresholdReached({
            owner_id: storeData.owner_id,
            name: storeData.name
          }, storeData.wallet_balance, dbClient);
        } catch (notifError) {
          console.error('❌ Threshold notification error:', notifError);
          // Log error but don't fail the transaction
        }
      }

      // Step 5: Verify correctness
      const verification = await this.verifyOrderPayment(dbClient, order.id);
      if (!verification.isValid) {
        await this.logAudit({
          transaction_id: transactionId,
          action: 'payment_verification_failed',
          details: {
            order_id: order.id,
            error: verification.error,
            verification,
            paymentId: paymentId || null
          }
        });
        throw new Error(`❌ Payment verification failed: ${verification.error}`);
      }

      if (connectionOwner) {
        await dbClient.commit();
      }

      return {
        success: true,
        transactionId,
        vendorAmount,
        platformCommission,
        verification
      };

    } catch (error) {
      if (connectionOwner) {
        await dbClient.rollback();
      }
      throw error;
    } finally {
      if (connectionOwner) {
        await dbClient.release();
      }
    }
  }

  /**
   * Verify order payment correctness
   * 
   */
  async verifyOrderPayment(connection, orderId) {
    const dbClient = connection || this.db;
    const [[order]] = await dbClient.execute(
      `SELECT total, admin_commission, vendor_amount FROM orders WHERE id = ?`,
      [orderId]
    );

    if (!order) {
      return { isValid: false, error: 'Order not found' };
    }

    const total = parseFloat(order.total);
    const commission = parseFloat(order.admin_commission) || 0;
    const vendor = parseFloat(order.vendor_amount) || 0;
    const sum = commission + vendor;

    // Verify: total = commission + vendor (with 0.01 tolerance for rounding)
    if (Math.abs(sum - total) > 0.01) {
      return {
        isValid: false,
        error: `Sum mismatch: ${total} ≠ ${commission} + ${vendor}`
      };
    }

    return {
      isValid: true,
      data: { total, commission, vendor, sum }
    };
  }

  /**
   * Process vendor payout (cash payment)
   *
   */
  async processVendorPayout(storeId, adminId, note = null, connection = null) {
    const connectionOwner = !connection;
    const dbClient = connection || await this.db.getConnection();

    try {
      if (connectionOwner) {
        await dbClient.beginTransaction();
      }

      // Get store data
      const [[store]] = await dbClient.execute(
        `SELECT id, wallet_balance, owner_id, name FROM stores WHERE id = ?`,
        [storeId]
      );

      if (!store || store.wallet_balance < 500) {
        throw new Error('❌ Store not eligible for payout');
      }

      const payoutAmount = store.wallet_balance;

      // Record payout transaction
      const transactionId = await this.recordTransaction({
        store_id: storeId,
        type: 'vendor_payout',
        amount: payoutAmount,
        vendor_amount: payoutAmount,
        platform_amount: 0,
        description: `Cash payout for ${store.name}`,
        reference: `PAYOUT-${storeId}-${Date.now()}`
      }, dbClient);

      // Create settlement record
      await dbClient.execute(
        `INSERT INTO vendor_settlements (store_id, seller_id, amount, admin_id, note, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [storeId, store.owner_id, payoutAmount, adminId, note || null]
      );

      // Reset wallet and threshold
      await dbClient.execute(
        `UPDATE stores 
         SET wallet_balance = 0,
             threshold_notified = FALSE
         WHERE id = ?`,
        [storeId]
      );

      if (connectionOwner) {
        await dbClient.commit();
      }

      return {
        success: true,
        transactionId,
        payoutAmount,
        store: store.name
      };

    } catch (error) {
      if (connectionOwner) {
        await dbClient.rollback();
      }
      throw error;
    } finally {
      if (connectionOwner) {
        await dbClient.release();
      }
    }
  }

  /**
   * Audit log
   */
  async logAudit(auditData, connection = null) {
    const dbClient = connection || this.db;
    const { transaction_id, action, details } = auditData;

    await dbClient.execute(`
      INSERT INTO bi_audit_log (transaction_id, action, details, created_at)
      VALUES (?, ?, ?, NOW())
    `, [
      transaction_id || null,
      action,
      JSON.stringify(details)
    ]);
  }

  /**
   * Get BI summary for dashboard
   * 
   */
  async getBISummary() {
    const [[summary]] = await this.db.execute(`
      SELECT
        SUM(CASE WHEN type = 'order_payment' THEN amount ELSE 0 END) as total_orders_revenue,
        SUM(CASE WHEN type = 'order_payment' THEN platform_amount ELSE 0 END) as total_platform_commission,
        SUM(CASE WHEN type = 'order_payment' THEN vendor_amount ELSE 0 END) as total_vendor_earnings,
        SUM(CASE WHEN type = 'vendor_payout' THEN amount ELSE 0 END) as total_payouts,
        COUNT(DISTINCT order_id) as total_transactions,
        (SELECT SUM(wallet_balance) FROM stores) as total_vendor_balance
      FROM financial_transactions
      WHERE status = 'completed'
    `);

    return summary;
  }
}

module.exports = FinancialService;
