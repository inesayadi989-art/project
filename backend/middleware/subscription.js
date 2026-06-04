/**
 * Subscription Middleware
 * Protects premium routes by verifying active subscription
 */

const requireActiveSubscription = async (req, res, next) => {
  try {
    const db = req.db;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check for active subscription
    const [subscriptions] = await db.execute(`
      SELECT s.*, p.name as plan_name
      FROM subscriptions s
      JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.user_id = ? AND s.status = 'active'
      AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
      LIMIT 1
    `, [userId]);

    if (!subscriptions.length) {
      return res.status(403).json({ 
        error: 'Active subscription required',
        message: 'Please subscribe to access this feature'
      });
    }

    req.subscription = subscriptions[0];
    next();
  } catch (error) {
    console.error('❌ Subscription middleware error:', error);
    res.status(500).json({ error: 'Subscription verification failed' });
  }
};

/**
 * Get subscription status for current user
 */
const getSubscriptionStatus = async (req, res) => {
  try {
    const db = req.db;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const [subscriptions] = await db.execute(`
      SELECT s.*, p.name as plan_name, p.amount, p.currency
      FROM subscriptions s
      JOIN subscription_plans p ON s.plan_id = p.id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [userId]);

    if (!subscriptions.length) {
      return res.json({
        hasSubscription: false,
        subscription: null,
      });
    }

    const sub = subscriptions[0];
    const isActive = sub.status === 'active' && 
                     (!sub.current_period_end || new Date(sub.current_period_end) > new Date());

    res.json({
      hasSubscription: true,
      isActive,
      subscription: {
        id: sub.id,
        planName: sub.plan_name,
        status: sub.status,
        currentPeriodStart: sub.current_period_start,
        currentPeriodEnd: sub.current_period_end,
        nextPaymentDate: sub.next_payment_date,
        amount: sub.amount,
        currency: sub.currency,
      },
    });
  } catch (error) {
    console.error('❌ Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
};

module.exports = {
  requireActiveSubscription,
  getSubscriptionStatus,
};
