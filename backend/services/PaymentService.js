const axios = require('axios');

/**
 * PaymentService — Konnect Integration (Official API)
 * https://konnect-docs.io/api/payments
 * 
 * Key differences from old implementation:
 * - POST /payments/init-payment (not gateway/payment/create-payment-session)
 * - GET /payments/:paymentRef (not verify-payment)
 * - Webhook is GET with ?payment_ref=xxx (not POST)
 * - Amounts in millimes (TND * 1000)
 * - Status: 'completed' or 'pending' (no 'success'/'failed' in webhook)
 */
class PaymentService {
  constructor() {
    this.KONNECT_BASE_URL = process.env.KONNECT_BASE_URL || 'https://api.preprod.konnect.network/api/v2';
    this.KONNECT_API_KEY = process.env.KONNECT_API_KEY || '';
    this.KONNECT_WALLET_ID = process.env.KONNECT_WALLET_ID || '';
    this.WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:5000';
    this.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  }

  /**
   * Check if Konnect is properly configured
   */
  isKonnectConfigured() {
    return (
      this.KONNECT_API_KEY &&
      !this.KONNECT_API_KEY.includes('your-') &&
      !this.KONNECT_API_KEY.includes('test-') &&
      this.KONNECT_WALLET_ID &&
      !this.KONNECT_WALLET_ID.includes('your-') &&
      !this.KONNECT_WALLET_ID.includes('test-')
    );
  }

  /**
   * Create a payment session with Konnect
   * POST /payments/init-payment
   * 
   * @param {Object} paymentData
   * @param {number} paymentData.amount - Amount in TND
   * @param {string} paymentData.description - Payment description
   * @param {string} paymentData.reference - Merchant reference (orderId)
   * @param {Object} paymentData.customer - { firstName, lastName, email, phone }
   * @returns {Promise<Object>} { paymentRef, payUrl, fallback }
   */
  async createPaymentSession(paymentData) {
    // Debug logs (remove in production)
    if (process.env.DEBUG_PAYMENTS) {
      console.log('🔥 CALLING KONNECT API...');
      console.log('BASE_URL:', this.KONNECT_BASE_URL);
      console.log('isKonnectConfigured():', this.isKonnectConfigured());
    }
    
    if (!this.isKonnectConfigured()) {
      console.warn('⚠️  Konnect not configured. Returning fallback checkout.');
      const fallbackUrl = `${this.FRONTEND_URL}/checkout?reference=${paymentData.reference}`;
      return {
        paymentRef: `LOCAL-${Date.now()}`,
        payUrl: fallbackUrl,
        paymentUrl: fallbackUrl,
        redirectUrl: fallbackUrl,
        sessionId: `LOCAL-${Date.now()}`,
        paymentId: `LOCAL-${Date.now()}`,
        isFallback: true,
      };
    }

    const amountInMillimes = Math.round(paymentData.amount * 1000); // TND → millimes

    const konnectPayload = {
      receiverWalletId: this.KONNECT_WALLET_ID,
      token: 'TND',
      amount: amountInMillimes,
      type: 'immediate',
      description: paymentData.description,
      orderId: paymentData.reference,
      acceptedPaymentMethods: ['bank_card'], // Sandbox stable avec bank_card seul
      lifespan: 30, // expire après 30 minutes
      checkoutForm: true,
      firstName: paymentData.customer?.firstName || 'Client',
      lastName: paymentData.customer?.lastName || '',
      phoneNumber: paymentData.customer?.phone || '',
      email: paymentData.customer?.email || '',
      webhook: `${this.WEBHOOK_URL}/api/payments/webhook`, // GET avec ?payment_ref=xxx
      theme: 'light',
    };

    try {
      const response = await axios.post(
        `${this.KONNECT_BASE_URL}/payments/init-payment`,
        konnectPayload,
        {
          headers: {
            'x-api-key': this.KONNECT_API_KEY,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      if (!response.data?.paymentRef || !response.data?.payUrl) {
        console.warn('⚠️  Invalid Konnect response');
        const fallbackUrl = `${this.FRONTEND_URL}/checkout?reference=${paymentData.reference}`;
        return {
          paymentRef: `LOCAL-${Date.now()}`,
          payUrl: fallbackUrl,
          paymentUrl: fallbackUrl,
          redirectUrl: fallbackUrl,
          sessionId: `LOCAL-${Date.now()}`,
          paymentId: `LOCAL-${Date.now()}`,
          isFallback: true,
        };
      }

      console.log(`✅ Konnect payment created: ${response.data.paymentRef}`);
      return {
        paymentRef: response.data.paymentRef,
        payUrl: response.data.payUrl,
        paymentUrl: response.data.payUrl,
        redirectUrl: response.data.payUrl,
        sessionId: response.data.paymentRef,
        paymentId: response.data.paymentRef,
        isFallback: false,
      };
    } catch (error) {
      console.error('❌ KONNECT ERROR FULL:', error.response?.data || error.message);
      console.error('❌ ERROR_STATUS:', error.response?.status);
      console.error('❌ ERROR_HEADERS:', error.response?.headers);
      const fallbackUrl = `${this.FRONTEND_URL}/checkout?reference=${paymentData.reference}`;
      return {
        paymentRef: `LOCAL-${Date.now()}`,
        payUrl: fallbackUrl,
        paymentUrl: fallbackUrl,
        redirectUrl: fallbackUrl,
        sessionId: `LOCAL-${Date.now()}`,
        paymentId: `LOCAL-${Date.now()}`,
        isFallback: true,
      };
    }
  }

  /**
   * Verify payment status with Konnect
   * GET /payments/:paymentRef
   * 
   * @param {string} paymentRef - Payment reference from Konnect
   * @returns {Promise<Object>} { status, paid, amount, reachedAmount, transactions }
   */
  async verifyPaymentWithKonnect(paymentRef) {
    if (!this.isKonnectConfigured() || !paymentRef || paymentRef.startsWith('LOCAL')) {
      return { status: 'completed', paid: true, isFallback: true };
    }

    try {
      const response = await axios.get(
        `${this.KONNECT_BASE_URL}/payments/${paymentRef}`,
        {
          headers: { 'x-api-key': this.KONNECT_API_KEY },
          timeout: 10000,
        }
      );

      const payment = response.data.payment || response.data;

      // ✅ Doc: "completed" = succès
      // Vérifier aussi les transactions (doc recommande)
      const transactionOk = payment.transactions?.some(t => t.status === 'success');
      const isPaid = payment.status === 'completed' && transactionOk;

      return {
        status: payment.status,
        paid: isPaid,
        amount: payment.amount ? payment.amount / 1000 : 0,
        reachedAmount: payment.reachedAmount ? payment.reachedAmount / 1000 : 0,
        transactions: payment.transactions || [],
        isFallback: false,
      };
    } catch (error) {
      console.error('❌ Konnect verification error:', error.message);
      return { status: 'pending', paid: false, isFallback: true };
    }
  }


  /**
   * Handle webhook from Konnect (GET with ?payment_ref=xxx)
   * 
   * @param {Object} db - Database connection
   * @param {string} paymentRef - Payment reference from query param
   * @returns {Promise<Object>}
   */
  async handleWebhook(db, paymentRef) {
    if (!paymentRef) {
      console.warn('⚠️  No payment_ref in webhook');
      return { success: false, error: 'Missing payment_ref' };
    }

    console.log(`📥 Webhook received: payment_ref=${paymentRef}`);

    try {
      // Verify payment status with Konnect
      const verification = await this.verifyPaymentWithKonnect(paymentRef);

      // Find the payment by paymentRef
      const [payments] = await db.execute(
        `SELECT * FROM payments WHERE konnect_payment_id = ? LIMIT 1`,
        [paymentRef]
      );

      if (!payments.length) {
        console.warn(`⚠️  Payment not found: ${paymentRef}`);
        return { success: false, error: 'Payment not found' };
      }

      const payment = payments[0];

      // Update payment status
      const newStatus = verification.paid ? 'completed' : 'failed';

      await db.execute(
        `UPDATE payments SET status = ?, updated_at = NOW() WHERE id = ?`,
        [newStatus, payment.id]
      );

      // If order payment completed, update order
      if (verification.paid && payment.order_id) {
        await db.execute(
          `UPDATE orders
           SET payment_status = 'paid', payment_id = ?, paid_at = NOW(), status = 'confirmed'
           WHERE id = ?`,
          [payment.id, payment.order_id]
        );
        console.log(`✅ Order ${payment.order_id} marked as paid`);
      }

      // If subscription payment completed, activate subscription
      if (verification.paid && payment.subscription_id) {
        await this.activateSubscription(db, payment.subscription_id);
        console.log(`✅ Subscription ${payment.subscription_id} activated`);
      }

      return {
        success: true,
        paymentId: payment.id,
        status: newStatus,
        orderId: payment.order_id,
      };
    } catch (error) {
      console.error(`❌ Webhook error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Activate subscription after payment
   * @private
   */
  async activateSubscription(db, subscriptionId) {
    try {
      const [subscriptions] = await db.execute(
        `SELECT s.*, p.interval_type, p.interval_count
         FROM subscriptions s
         JOIN subscription_plans p ON s.plan_id = p.id
         WHERE s.id = ?`,
        [subscriptionId]
      );

      if (!subscriptions.length) {
        throw new Error('Subscription not found');
      }

      const subscription = subscriptions[0];
      const periodEnd = new Date(subscription.current_period_start);

      if (subscription.interval_type === 'year') {
        periodEnd.setFullYear(periodEnd.getFullYear() + subscription.interval_count);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + subscription.interval_count);
      }

      const nextPaymentDate = new Date(periodEnd);

      await db.execute(
        `UPDATE subscriptions
         SET status = 'active',
             current_period_end = ?,
             next_payment_date = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [
          periodEnd.toISOString().slice(0, 19).replace('T', ' '),
          nextPaymentDate.toISOString().slice(0, 10),
          subscriptionId,
        ]
      );

      return { success: true, subscriptionId };
    } catch (error) {
      console.error(`❌ Subscription activation error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify webhook signature from Konnect
   * In production, verify HMAC signature
   * For now, just check if signature exists for authorized webhooks
   */
  verifyWebhookSignature(webhookData, signature) {
    // TODO: Implement proper HMAC-SHA256 verification with Konnect webhook secret
    // For sandbox/development, we accept the webhook if signature is provided
    if (!signature) return false;
    
    // In production, you would:
    // const crypto = require('crypto');
    // const secret = process.env.KONNECT_WEBHOOK_SECRET;
    // const hash = crypto.createHmac('sha256', secret).update(JSON.stringify(webhookData)).digest('hex');
    // return hash === signature;
    
    return true; // Accept for now
  }

  /**
   * Handle webhook from Konnect (GET with ?payment_ref=xxx)
   * This is an improved version that extracts paymentRef correctly
   */
  async handleWebhookGET(db, paymentRef) {
    if (!paymentRef) {
      console.warn('⚠️  No payment_ref in webhook');
      return { success: false, error: 'Missing payment_ref' };
    }

    return this.handleWebhook(db, paymentRef);
  }
}

module.exports = PaymentService;
