const jwt = require('jsonwebtoken');

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to verify JWT and admin role
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = user;
    next();
  });
};

// Middleware to check subscription for sellers
const requireSubscription = async (req, res, next) => {
  try {
    console.log('REQUIRE SUBSCRIPTION middleware hit', { user: req.user });
    if (req.user.role === 'seller') {
      console.log('REQUIRE SUBSCRIPTION checking seller_id', req.user.userId);
      console.log('REQUIRE SUBSCRIPTION query start');
      const [subscriptions] = await req.db.execute(
        `SELECT status, payment_status, end_date
         FROM seller_subscriptions
         WHERE seller_id = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [req.user.userId]
      );
      console.log('REQUIRE SUBSCRIPTION query complete', { subscriptionsCount: subscriptions.length });

      if (subscriptions.length === 0) {
        return res.status(403).json({
          error: 'subscription_required',
          message: 'Vous devez soumettre une demande d abonnement vendeur et attendre l approbation de l administrateur.'
        });
      }

      const subscription = subscriptions[0];
      const now = new Date();
      const activeUntil = subscription.end_date ? new Date(subscription.end_date) : null;

      if (subscription.status === 'pending_admin') {
        return res.status(403).json({
          error: 'subscription_pending',
          message: 'Votre demande d abonnement est en cours de confirmation par l administrateur.'
        });
      }

      if (subscription.status === 'rejected') {
        return res.status(403).json({
          error: 'subscription_rejected',
          message: 'Votre demande d abonnement a été rejetée. Veuillez soumettre une nouvelle demande.'
        });
      }

      // Require active and paid subscription for sellers to access protected routes
      if (!(subscription.status === 'active' && subscription.payment_status === 'paid')) {
        return res.status(403).json({
          error: 'subscription_required',
          message: 'Vous devez avoir un abonnement vendeur actif et payé pour accéder à cette fonctionnalité.'
        });
      }

      if (subscription.status === 'active' && (!activeUntil || activeUntil < now)) {
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
  requireSubscription,
  authenticateAdmin
};