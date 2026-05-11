const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const otpStore = new Map();

function generateOtpCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isValidTunisianPhone(phone) {
  const normalized = phone.replace(/\s/g, '');
  return /^(\+216|00216)?[2459]\d{7}$/.test(normalized);
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

// Get subscription by ID
router.get('/:subscriptionId', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { subscriptionId } = req.params;
    const userId = req.user.userId;

    const [subscriptions] = await db.execute(
      `SELECT s.*, sp.name as plan_name, sp.slug as plan_slug, sp.description as plan_description, sp.interval_type, sp.interval_count, sp.amount
       FROM subscriptions s
       LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
       WHERE s.id = ? AND s.user_id = ?
       LIMIT 1`,
      [subscriptionId, userId]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({ subscription: subscriptions[0] });
  } catch (error) {
    console.error('Get subscription by ID error:', error);
    res.status(500).json({ error: 'Failed to load subscription' });
  }
});

// Create subscription payment session
router.post('/create', authenticateToken, async (req, res) => {
  try {
    let planId = req.body.planId ? Number(req.body.planId) : null;
    const paymentMethod = req.body.paymentMethod || 'd17';
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

    const localCheckoutUrl = `${FRONTEND_URL}/payment/checkout?type=subscription&subscriptionId=${subscriptionId}&paymentMethod=${encodeURIComponent(paymentMethod || 'd17')}`;
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
        paymentMethod: paymentMethod || 'd17',
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

// Send OTP for subscription confirmation
router.post('/otp/send/:subscriptionId', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { subscriptionId } = req.params;
    const { phone } = req.body;
    const userId = req.user.userId;

    if (!phone || !isValidTunisianPhone(phone)) {
      return res.status(400).json({ error: 'Invalid Tunisian phone number' });
    }

    const [subscriptions] = await db.execute(
      `SELECT * FROM subscriptions WHERE id = ? AND user_id = ? LIMIT 1`,
      [subscriptionId, userId]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const otpCode = generateOtpCode();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(subscriptionId, {
      phone,
      code: otpCode,
      expiresAt,
      attempts: 0,
    });

    // Send OTP using Twilio Verify Service
    const twilio = require('twilio');
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    let otpSent = false;
    let otpError = null;

    if (accountSid && authToken && verifyServiceSid &&
        !accountSid.includes('your-twilio') &&
        !authToken.includes('your-twilio') &&
        !verifyServiceSid.includes('your-twilio')) {

      try {
        const client = twilio(accountSid, authToken);
        const verification = await client.verify.v2
          .services(verifyServiceSid)
          .verifications
          .create({
            to: phone,
            channel: 'sms'
          });

        console.log(`[OTP SENT] SID: ${verification.sid}, To: ${phone}, Status: ${verification.status}`);
        otpSent = true;
      } catch (otpErr) {
        console.error('[OTP ERROR]', otpErr.message);
        otpError = otpErr.message;
      }
    } else {
      console.log(`[OTP SIMULATION] subscriptionId=${subscriptionId} phone=${phone}`);
    }

    const response = {
      success: true,
      message: otpSent
        ? `Code envoyé au ${phone}. Surveillez vos SMS pour le code de confirmation.`
        : `Code envoyé au ${phone}. Surveillez vos SMS pour le code de confirmation.`,
    };

    if (process.env.NODE_ENV !== 'production' && !otpSent) {
      response.previewCode = otpCode; // Garder pour dev, mais ne sera pas utilisé avec Verify
    }

    if (!otpSent) {
      response.success = false;
      response.message = otpError
        ? 'Impossible d\'envoyer le code SMS. Vérifiez la configuration Twilio Verify.'
        : 'SMS non envoyé : Twilio Verify n\'est pas configuré ou le service est indisponible.';
      response.warning = otpError || 'Twilio Verify non configuré ou clé invalide.';
      if (process.env.NODE_ENV !== 'production') {
        response.previewCode = otpCode;
      }

      return res.status(502).json(response);
    }

    if (process.env.NODE_ENV !== 'production' && !otpSent) {
      response.previewCode = otpCode;
    }

    return res.json(response);
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP', details: error.message });
  }
});

// Verify OTP and activate subscription
router.post('/otp/verify/:subscriptionId', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const { subscriptionId } = req.params;
    const { code } = req.body;
    const userId = req.user.userId;

    if (!code) {
      return res.status(400).json({ error: 'OTP code is required' });
    }

    const [subscriptions] = await db.execute(
      `SELECT * FROM subscriptions WHERE id = ? AND user_id = ? LIMIT 1`,
      [subscriptionId, userId]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const otpEntry = otpStore.get(subscriptionId);
    if (!otpEntry) {
      return res.status(400).json({ error: 'No OTP request found for this subscription' });
    }

    // Verify OTP using Twilio Verify Service
    const twilio = require('twilio');
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    let otpVerified = false;
    let verifyError = null;

    if (accountSid && authToken && verifyServiceSid &&
        !accountSid.includes('your-twilio') &&
        !authToken.includes('your-twilio') &&
        !verifyServiceSid.includes('your-twilio')) {

      try {
        const client = twilio(accountSid, authToken);
        const verificationCheck = await client.verify.v2
          .services(verifyServiceSid)
          .verificationChecks
          .create({
            to: otpEntry.phone,
            code: code
          });

        if (verificationCheck.status === 'approved') {
          otpVerified = true;
          console.log(`[OTP VERIFIED] subscriptionId=${subscriptionId}, status=${verificationCheck.status}`);
        } else {
          console.log(`[OTP FAILED] subscriptionId=${subscriptionId}, status=${verificationCheck.status}`);
        }
      } catch (verifyErr) {
        console.error('[OTP VERIFY ERROR]', verifyErr.message);
        verifyError = verifyErr.message;
      }
    } else {
      // Fallback to local verification for development
      if (Date.now() > otpEntry.expiresAt) {
        otpStore.delete(subscriptionId);
        return res.status(400).json({ error: 'OTP code has expired. Please resend the code.' });
      }

      if (otpEntry.code === code) {
        otpVerified = true;
        console.log(`[OTP VERIFIED LOCAL] subscriptionId=${subscriptionId}`);
      } else {
        console.log(`[OTP FAILED LOCAL] subscriptionId=${subscriptionId}`);
      }
    }

    if (!otpVerified) {
      otpEntry.attempts += 1;
      otpStore.set(subscriptionId, otpEntry);
      return res.status(400).json({
        error: verifyError || 'Code OTP invalide. Veuillez réessayer.'
      });
    }

    otpStore.delete(subscriptionId);

    await db.execute(
      `UPDATE subscriptions SET status = 'active', updated_at = NOW() WHERE id = ?`,
      [subscriptionId]
    );

    return res.json({ success: true, subscriptionId, status: 'active', message: 'Subscription activated.' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP', details: error.message });
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

    if (!paymentMethod || !['card', 'd17'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    if (paymentMethod === 'card') {
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
    }

    if (paymentMethod === 'd17') {
      const phoneRegex = /^(\+216|00216)?[2459]\d{7}$/;
      if (!phone || !phoneRegex.test(phone.toString().replace(/\s/g, ''))) {
        return res.status(400).json({ error: 'Invalid Tunisian phone number' });
      }
      // Optionally, if code is provided, validate format
      if (code && !/^\d{4,6}$/.test(code.toString())) {
        return res.status(400).json({ error: 'Invalid D17 confirmation code' });
      }
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

module.exports = router;
