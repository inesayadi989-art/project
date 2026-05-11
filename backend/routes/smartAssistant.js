/**
 * Universal Smart Shopping Assistant - Production Ready
 * Clean orchestration using centralized AI controller
 */

const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const AIShoppingOrchestrator = require("../utils/orchestrator");

// Raw body parser for UTF-8 content
const rawBodyParser = (req, res, next) => {
  if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
    let data = '';
    const chunks = [];
    req.setEncoding('utf8');
    req.on('data', chunk => {
      chunks.push(Buffer.from(chunk));
      data += chunk;
    });
    req.on('end', () => {
      try {
        console.log('Raw data chunks:', chunks.map(c => c.toString('hex')).join(' '));
        console.log('String data:', data);
        req.body = JSON.parse(data);
        console.log('Parsed body:', req.body);
        next();
      } catch (err) {
        console.error('JSON parse error:', err);
        res.status(400).json({ error: 'Invalid JSON' });
      }
    });
  } else {
    next();
  }
};

// Main smart assistant endpoint - PRODUCTION READY
router.post("/smart-search", rawBodyParser, authenticateToken, async (req, res) => {
  try {
    console.log('=== AI SHOPPING ASSISTANT REQUEST ===');
    const userId = req.user?.userId || req.user?.id || 1;
    console.log('User ID:', userId);
    console.log('User object:', JSON.stringify(req.user, null, 2));
    console.log('Message:', req.body.message);

    // Security: Only customers and admins can use this
    if (!req.user || (req.user.role !== "customer" && req.user.role !== "admin")) {
      return res.status(403).json({
        success: false,
        message: "Only customers can use the smart assistant",
      });
    }

    const { message } = req.body;
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty",
      });
    }

    // Initialize orchestrator with database connection
    const orchestrator = new AIShoppingOrchestrator(req.db);

    // Process request through centralized orchestrator
    const result = await orchestrator.processRequest(userId, message.trim());

    // Return standardized response
    res.json(result);

  } catch (error) {
    console.error("AI Shopping Assistant Error:", error);
    console.error("Stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Erreur lors du traitement de votre demande",
      error: error.message,
    });
  }
});

// Alternative endpoint: Just parse input (for debugging)
router.post("/parse-only", authenticateToken, (req, res) => {
  try {
    const { message } = req.body;

    const language = detectLanguage(message);
    const budget = parseBudget(message);

    res.json({
      success: true,
      data: {
        input: message,
        language,
        budget,
        search_term: message.trim(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error parsing input",
      error: error.message,
    });
  }
});

module.exports = router;