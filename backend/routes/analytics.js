/**
 * Analytics/BI Endpoint
 * 
 * لعرض تقارير الـ BI والتحقق من صحة البيانات المالية
 */

const express = require('express');
const FinancialService = require('../services/FinancialService');
const VerificationService = require('../services/VerificationService');

const router = express.Router();

const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
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

/**
 * GET /analytics/bi-health
 * Check BI integrity
 */
router.get('/bi-health', authenticateAdmin, async (req, res) => {
  try {
    const db = req.db;
    const verificationService = new VerificationService(db);
    
    const report = await verificationService.generateHealthReport();
    
    // Log verification
    await verificationService.logVerification(report);

    res.json({
      status: report.integrity.isValid ? '✅ VALID' : '❌ ISSUES FOUND',
      integrity: report.integrity,
      statistics: report.statistics,
      timestamp: report.timestamp
    });

  } catch (error) {
    console.error('BI health check error:', error);
    res.status(500).json({ error: 'Failed to check BI health', details: error.message });
  }
});

/**
 * GET /analytics/financial-summary
 * Get financial summary
 */
router.get('/financial-summary', authenticateAdmin, async (req, res) => {
  try {
    const db = req.db;
    const financialService = new FinancialService(db);
    
    const summary = await financialService.getBISummary();

    res.json({
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Financial summary error:', error);
    res.status(500).json({ error: 'Failed to get financial summary' });
  }
});

/**
 * GET /analytics/transactions
 * Get all financial transactions
 */
router.get('/transactions', authenticateAdmin, async (req, res) => {
  try {
    const db = req.db;
    const { type, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT ft.*, o.id as order_reference, s.name as store_name
      FROM financial_transactions ft
      LEFT JOIN orders o ON ft.order_id = o.id
      LEFT JOIN stores s ON ft.store_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      query += ` AND ft.type = ?`;
      params.push(type);
    }

    if (status) {
      query += ` AND ft.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY ft.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [transactions] = await db.execute(query, params);

    res.json({
      transactions,
      page: parseInt(page),
      limit: parseInt(limit),
      count: transactions.length
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

/**
 * GET /analytics/audit-log
 * Get audit log
 */
router.get('/audit-log', authenticateAdmin, async (req, res) => {
  try {
    const db = req.db;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const [logs] = await db.execute(`
      SELECT * FROM bi_audit_log
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), offset]);

    res.json({
      logs,
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ error: 'Failed to get audit log' });
  }
});

/**
 * POST /analytics/verify-order
 * Manually verify a specific order
 */
router.post('/verify-order/:orderId', authenticateAdmin, async (req, res) => {
  let connection;
  try {
    const db = req.db;
    const { orderId } = req.params;
    const financialService = new FinancialService(db);
    connection = await db.getConnection();

    const verification = await financialService.verifyOrderPayment(connection, orderId);

    res.json({
      orderId,
      verification,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Verify order error:', error);
    res.status(500).json({ error: 'Failed to verify order', details: error.message });
  } finally {
    if (connection) {
      await connection.release();
    }
  }
});

module.exports = router;
