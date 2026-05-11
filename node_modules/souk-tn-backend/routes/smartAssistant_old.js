/**
 * Universal Smart Shopping Assistant
 * Intelligent product search using Fuse.js fuzzy search
 */

const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const Fuse = require('fuse.js');

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

// Mock product database (replace with actual DB query)
// In real app: import from DB models
const mockProducts = [
  {
    id: 1,
    name: "iPhone 13",
    price: 450,
    category: "phone",
    rating: 4.5,
    stock: 10,
    description: "Latest iPhone model",
  },
  {
    id: 2,
    name: "Samsung Galaxy",
    price: 350,
    category: "phone",
    rating: 4.2,
    stock: 15,
    description: "Popular Android phone",
  },
  {
    id: 3,
    name: "Dell Laptop",
    price: 800,
    category: "laptop",
    rating: 4.3,
    stock: 5,
    description: "Business laptop",
  },
  {
    id: 4,
    name: "Home Decoration Set",
    price: 120,
    category: "decoration",
    rating: 4.1,
    stock: 20,
    description: "Modern decoration",
  },
  {
    id: 5,
    name: "Budget Phone",
    price: 150,
    category: "phone",
    rating: 3.8,
    stock: 25,
    description: "Affordable smartphone",
  },
];

// Product ranking algorithm
function rankProducts(products, userIntent, budget, quality) {
  return products.sort((a, b) => {
    let scoreA = 0,
      scoreB = 0;

    // Price match bonus
    if (budget) {
      const priceDistanceA = Math.abs(a.price - budget);
      const priceDistanceB = Math.abs(b.price - budget);
      scoreA += 100 - priceDistanceA / 10;
      scoreB += 100 - priceDistanceB / 10;
    }

    // Rating bonus
    scoreA += a.rating * 10;
    scoreB += b.rating * 10;

    // Stock bonus (more stock = more reliable)
    scoreA += Math.min(a.stock, 20);
    scoreB += Math.min(b.stock, 20);

    // Quality preference
    if (quality === "cheap") {
      scoreA += (1000 - a.price) / 10;
      scoreB += (1000 - b.price) / 10;
    } else if (quality === "expensive") {
      scoreA += a.price / 10;
      scoreB += b.price / 10;
    } else if (quality === "good" || quality === "best") {
      scoreA += a.rating * 20;
      scoreB += b.rating * 20;
    }

    return scoreB - scoreA; // Descending order
  });
}

// Filter products based on criteria
function filterProducts(products, intent, budget, budgetType = "max") {
  return products.filter((product) => {
    // Category filter
    if (intent !== "general" && product.category !== intent) {
      return false;
    }

    // Price filter
    if (budget) {
      if (budgetType === "max" && product.price > budget) {
        return false;
      }
      // For exact match, allow ±20% range
      if (
        budgetType === "exact" &&
        (product.price < budget * 0.8 || product.price > budget * 1.2)
      ) {
        return false;
      }
    }

    return true;
  });
}

// Main smart assistant endpoint
router.post("/smart-search", rawBodyParser, authenticateToken, async (req, res) => {
  try {
    console.log('=== SMART ASSISTANT REQUEST ===');
    console.log('User:', req.user);
    console.log('Body:', req.body);

    // Security: Only customers and admins can use this (temporary for testing)
    if (req.user.role !== "customer" && req.user.role !== "admin") {
      console.log('Access denied for role:', req.user.role);
      return res.status(403).json({
        success: false,
        message: "Only customers can use the smart assistant",
      });
    }

    const { message } = req.body;
    console.log('Message:', message);

    if (!message || message.trim().length === 0) {
      console.log('Empty message');
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty",
      });
    }

    // 🆕 Input validation - prevent meaningless requests
    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 3) {
      console.log('Message too short');
      return res.json({
        success: true,
        data: {
          message: "Votre demande est trop courte. Essayez quelque chose comme 'téléphone sous 500 DT' 🤔",
          recommendations_title: "Mes recommandations:",
          alternatives_title: "Autres options:",
          language: "french",
          parsed_input: {
            original: message,
            normalized: trimmedMessage,
            language: "unknown",
            intent: "unclear",
            budget: null,
            quality: null,
          },
          products: [],
          total_found: 0,
          has_budget_filter: false,
          ranking_factors: {
            price_match: false,
            rating: false,
            stock: false,
            quality_preference: false,
          },
        },
      });
    }

    // 🆕 Check if message contains meaningful characters
    if (!/[a-zA-Z\u0600-\u06FF]/.test(trimmedMessage)) {
      console.log('Message contains no letters');
      return res.json({
        success: true,
        data: {
          message: "Veuillez taper une demande valide avec des lettres 😊",
          recommendations_title: "Mes recommandations:",
          alternatives_title: "Autres options:",
          language: "french",
          parsed_input: {
            original: message,
            normalized: trimmedMessage,
            language: "unknown",
            intent: "invalid",
            budget: null,
            quality: null,
          },
          products: [],
          total_found: 0,
          has_budget_filter: false,
          ranking_factors: {
            price_match: false,
            rating: false,
            stock: false,
            quality_preference: false,
          },
        },
      });
    }

    // Phase 1: Parse input (language detection)
    console.log('Phase 1: Parsing input');
    const parsed = parseInput(message);
    console.log('Parsed:', parsed);

    // Phase 2: Detect intent (what user wants)
    console.log('Phase 2: Detecting intent');
    const intent = parseUserIntent(message);
    console.log('Intent:', intent);

    // 🆕 Intent confidence check - prevent unclear requests
    if (intent.intent === "general" || !intent.intent) {
      console.log('Intent unclear - asking for clarification');
      return res.json({
        success: true,
        data: {
          message: "Je n'ai pas bien compris votre demande. Essayez quelque chose comme:\n• 'téléphone sous 500 DT'\n• 'ordinateur portable'\n• 'meilleur téléphone' 🤔",
          recommendations_title: "Mes recommandations:",
          alternatives_title: "Autres options:",
          language: parsed.language || "french",
          parsed_input: {
            original: message,
            normalized: parsed.normalized,
            language: parsed.language,
            intent: intent.intent || "unclear",
            budget: intent.budget,
            quality: intent.quality,
          },
          products: [],
          total_found: 0,
          has_budget_filter: false,
          ranking_factors: {
            price_match: false,
            rating: false,
            stock: false,
            quality_preference: false,
          },
        },
      });
    }

    // Phase 3: Filter products
    console.log('Phase 3: Filtering products');
    let results = filterProducts(
      mockProducts,
      intent.intent,
      intent.budget,
      intent.budgetType
    );
    console.log('Filtered results:', results.length);

    console.log(`=== SEARCH RESULTS ===`);
    console.log(`Intent: ${intent.intent}, Budget: ${intent.budget}, Results: ${results.length}`);
    results.forEach(p => console.log(`- ${p.name}: ${p.price} DT (${p.category})`));

    // Phase 4: Rank products
    console.log('Phase 4: Ranking products');
    const ranked = rankProducts(results, intent.intent, intent.budget, intent.quality);
    console.log('Ranked products:', ranked.length);

    // Phase 5: Generate response
    console.log('Phase 5: Generating response');
    const response = generateResponse({
      language: parsed.language,
      intent: intent.intent,
      budget: intent.budget,
      quality: intent.quality,
      total_matches: ranked.length,
      products_count: ranked.length,
    });
    console.log('Response generated');

    // Return formatted response
    console.log('Returning response');
    res.json({
      success: true,
      data: {
        ...response,
        parsed_input: {
          original: message,
          normalized: parsed.normalized,
          language: parsed.language,
          intent: intent.intent,
          budget: intent.budget,
          quality: intent.quality,
        },
        products: ranked.slice(0, 10), // Top 10 results
        total_found: ranked.length,
        has_budget_filter: intent.budget !== null,
        ranking_factors: {
          price_match: intent.budget !== null,
          rating: true,
          stock: true,
          quality_preference: intent.quality !== null,
        },
      },
    });
  } catch (error) {
    console.error("Smart assistant error:", error);
    console.error("Stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Error processing your request",
      error: error.message,
    });
  }
});

// Alternative endpoint: Just parse input (for debugging)
router.post("/parse-only", authenticateToken, (req, res) => {
  try {
    const { message } = req.body;

    const parsed = parseInput(message);
    const intent = parseUserIntent(message);

    res.json({
      success: true,
      data: {
        input: message,
        parsed,
        intent,
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
