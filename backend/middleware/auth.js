const jwt = require('jsonwebtoken');

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('Auth middleware:', { hasAuthHeader: !!authHeader, hasToken: !!token, tokenStart: token?.substring(0, 20) });

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('JWT verify error:', err.message);
      return res.status(403).json({ error: 'Invalid token' });
    }
    console.log('JWT verified for user:', user);
    req.user = user;
    next();
  });
};

// Middleware to check subscription for sellers
const requireSubscription = async (req, res, next) => {
  try {
    if (req.user.role === 'seller') {
      const [subscriptions] = await req.db.execute(
        `SELECT status, current_period_end
         FROM subscriptions
         WHERE user_id = ? AND status = 'active'
         ORDER BY current_period_end DESC
         LIMIT 1`,
        [req.user.userId]
      );

      if (subscriptions.length === 0) {
        return res.status(403).json({
          error: 'subscription_required',
          message: 'Vous devez souscrire à un abonnement actif pour accéder à cette fonctionnalité.'
        });
      }

      const subscription = subscriptions[0];
      const now = new Date();
      const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end) : null;

      if (!currentPeriodEnd || currentPeriodEnd < now) {
        return res.status(403).json({
          error: 'subscription_expired',
          message: 'Votre abonnement a expiré. Veuillez renouveler votre abonnement.'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  authenticateToken,
  requireSubscription
};