/**
 * 🧠 AI Shopping Assistant - Central Orchestrator
 *
 * Production-ready orchestration system for intelligent product recommendations
 * Handles memory, intent resolution, search/compare logic, and response generation
 */

const { parseMessage, buildQuery, rankProducts, isComparisonQuery, extractComparisonProducts, compareProducts, generateComparisonExplanation } = require("./assistant");

class AIShoppingOrchestrator {
  constructor(db) {
    this.db = db;
    this.logger = new Logger();
    this.memoryManager = new MemoryManager(db);
    this.responseBuilder = new ResponseBuilder();
  }

  /**
   * Safe message parsing with fallbacks
   */
  safeParseMessage(message) {
    try {
      const { parseInput } = require('./languageParser');
      const { parseMessage } = require('./assistant');

      // Use the new language parser first
      const langParsed = parseInput(message);

      // Then enhance with assistant parsing for categories and use cases
      const assistantParsed = parseMessage(message);

      // Merge results with safe defaults
      return {
        intent: langParsed.intent || 'unknown',
        budget: langParsed.price || assistantParsed?.budget || null,
        category: assistantParsed?.category || 'all',
        categoryId: assistantParsed?.categoryId ?? null,
        categoryName: assistantParsed?.categoryName || 'Tous les produits',
        use_case: assistantParsed?.use_case || null,
        keywords: [...(langParsed.keywords || []), ...(assistantParsed?.keywords || [])],
        original: message,
        language: langParsed.language || 'mixed',
        normalized: langParsed.normalized || message
      };
    } catch (error) {
      this.logger.error('NLP parsing error:', error);
      // Return safe defaults
      return {
        intent: 'unknown',
        budget: null,
        category: 'all',
        categoryId: null,
        categoryName: 'Tous les produits',
        use_case: null,
        keywords: [],
        original: message,
        language: 'unknown',
        normalized: message
      };
    }
  }

  /**
   * Main orchestration method - single entry point for all requests
   */
  async processRequest(userId, message) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      this.logger.info(`[${requestId}] Processing request for user ${userId}: "${message}"`);

      // Step 0: Safe NLP parsing with debug
      const parsed = this.safeParseMessage(message);
      this.logger.info(`[${requestId}] NLP PARSED:`, JSON.stringify(parsed, null, 2));

      // Step 1: Load user context and memory
      const context = await this.loadUserContext(userId);
      this.logger.debug(`[${requestId}] Loaded context:`, context);

      // Step 2: Use parsed intent directly (no more detectIntent)
      const intent = {
        type: parsed.intent === 'search' ? 'search' : 'greeting',
        message: parsed.original,
        parsed: parsed,
        valid: parsed.intent === 'search' && (parsed.keywords.length > 0 || parsed.category !== 'all')
      };
      this.logger.debug(`[${requestId}] Using parsed intent:`, intent);

      // Step 3: Resolve conflicts between memory and new input
      const resolvedContext = this.resolveConflicts(context, intent);
      this.logger.debug(`[${requestId}] Resolved context:`, resolvedContext);

      // Step 4: Execute appropriate action
      const result = await this.executeAction(requestId, intent, resolvedContext);
      this.logger.debug(`[${requestId}] Action result:`, result);

      // Step 5: Update memory with new context
      await this.updateMemory(userId, resolvedContext, result);
      this.logger.debug(`[${requestId}] Memory updated`);

      // Step 6: Build standardized response
      const response = this.buildResponse(result, resolvedContext);
      this.logger.debug(`[${requestId}] Response built`);

      const processingTime = Date.now() - startTime;
      this.logger.info(`[${requestId}] Request completed in ${processingTime}ms`);

      return {
        success: true,
        requestId,
        processingTime,
        data: response
      };

    } catch (error) {
      this.logger.error(`[${requestId}] Request failed:`, error);
      return this.handleError(error, requestId);
    }
  }

  /**
   * Load user context from memory
   */
  async loadUserContext(userId) {
    try {
      const memory = await this.memoryManager.getMemory(userId);
      return {
        userId,
        memory,
        language: this.detectLanguage(memory.lastQuery || ''),
        preferences: this.extractPreferences(memory)
      };
    } catch (error) {
      this.logger.warn(`Failed to load context for user ${userId}:`, error);
      return { userId, memory: {}, language: 'arabic', preferences: {} };
    }
  }

  /**
   * Detect intent from message
   */
  detectIntent(message, context) {
    const trimmed = message.trim();

    // Greeting detection
    if (this.isGreeting(trimmed)) {
      return { type: 'greeting', message: trimmed };
    }

    // Comparison detection
    if (isComparisonQuery(trimmed)) {
      const products = extractComparisonProducts(trimmed);
      return {
        type: 'comparison',
        message: trimmed,
        products,
        valid: products.length >= 2
      };
    }

    // Search intent
    const parsed = parseMessage(trimmed);
    return {
      type: 'search',
      message: trimmed,
      parsed,
      valid: parsed.keywords.length > 0 || parsed.category || parsed.use_case || parsed.budget
    };
  }

  /**
   * Resolve conflicts between memory and new intent
   */
  resolveConflicts(context, intent) {
    const resolved = { ...context };

    // Language resolution
    resolved.language = this.detectLanguage(intent.message) || context.language || 'arabic';

    // Budget resolution - new budget overrides old unless explicitly keeping
    if (intent.parsed?.budget && !intent.message.includes('as before')) {
      resolved.memory.budget = intent.parsed.budget;
    }

    // Use case resolution - new use case overrides unless explicitly keeping
    if (intent.parsed?.use_case && !intent.message.includes('as before') && !intent.message.includes('like before')) {
      resolved.memory.use_case = intent.parsed.use_case;
    }

    // Category resolution
    if (intent.parsed?.category && !intent.message.includes('as before')) {
      resolved.memory.category = intent.parsed.category;
      resolved.memory.categoryId = intent.parsed.categoryId;
      resolved.memory.categoryName = intent.parsed.categoryName;
    }

    return resolved;
  }

  /**
   * Execute the appropriate action based on intent
   */
  async executeAction(requestId, intent, context) {
    switch (intent.type) {
      case 'greeting':
        return this.handleGreeting(intent, context);

      case 'comparison':
        return await this.handleComparison(requestId, intent, context);

      case 'search':
        return await this.handleSearch(requestId, intent, context);

      default:
        return this.handleFallback(intent, context);
    }
  }

  /**
   * Handle greeting requests
   */
  handleGreeting(intent, context) {
    const greeting = context.language === 'arabic'
      ? "مرحبا! أنا مساعدك الذكي للتسوق. قلي شنوّة تبي تشتري اليوم؟ 🤖"
      : "Salut ! Je suis votre assistant intelligent d'achat. Dites-moi ce que vous cherchez aujourd'hui ? 🤖";

    return {
      type: 'greeting',
      message: greeting,
      language: context.language,
      intent: 'greeting'
    };
  }

  /**
   * Handle comparison requests
   */
  async handleComparison(requestId, intent, context) {
    if (!intent.valid) {
      const message = context.language === 'arabic'
        ? "شنوّة المنتجات اللي تبي تقارن بينهم؟ قلي مثلا 'Redmi vs Samsung' 🤔"
        : "Quels produits voulez-vous comparer ? Dites-moi par exemple 'Redmi vs Samsung' 🤔";

      return {
        type: 'comparison_incomplete',
        message,
        language: context.language,
        intent: 'comparison_incomplete'
      };
    }

    this.logger.info(`[${requestId}] Searching for products: ${intent.products.join(', ')}`);
    const products = await this.searchProductsByName(intent.products);

    if (products.length < 2) {
      const message = context.language === 'arabic'
        ? `❌ ما لقيتش المنتجات دي: ${intent.products.join(', ')}. جرب أسماء أخرى.`
        : `❌ Produits non trouvés: ${intent.products.join(', ')}. Essayez d'autres noms.`;

      return {
        type: 'comparison_not_found',
        message,
        language: context.language,
        intent: 'comparison_not_found',
        products
      };
    }

    const comparison = compareProducts(products[0], products[1], context.memory);
    const explanation = generateComparisonExplanation(products[0], products[1], comparison, context.language);

    return {
      type: 'comparison',
      message: explanation,
      language: context.language,
      intent: 'comparison',
      products,
      comparison,
      parsed_input: {
        original: intent.message,
        products: intent.products
      }
    };
  }

  /**
   * Handle search requests
   */
  async handleSearch(requestId, intent, context) {
    if (!intent.valid) {
      const message = context.language === 'arabic'
        ? "شنوّة تبي تشتري اليوم؟ قلي مثلا 'تيليفون' أو 'تابلو' أو 'كتاب' 📱"
        : "Que cherchez-vous aujourd'hui ? Dites-moi par exemple 'téléphone', 'tapis' ou 'livre' 📱";

      return {
        type: 'clarification',
        message,
        language: context.language,
        intent: 'general'
      };
    }

    // Merge with context
    const mergedParsed = this.mergeWithContext(intent.parsed, context.memory);

    this.logger.info(`[${requestId}] Executing search with params:`, mergedParsed);
    const searchResult = await this.performSearch(mergedParsed);

    return {
      type: 'search',
      message: searchResult.response,
      language: context.language,
      intent: 'search',
      products: searchResult.results,
      totalFound: searchResult.totalFound,
      parsed_input: {
        original: intent.message,
        normalized: searchResult.normalizedSearchTerm,
        category: mergedParsed.category,
        use_case: mergedParsed.use_case,
        budget: mergedParsed.budget
      },
      ranking_factors: searchResult.rankingFactors
    };
  }

  /**
   * Handle fallback cases
   */
  handleFallback(intent, context) {
    const message = context.language === 'arabic'
      ? "آسف، ما فهمتش طلبك. جرب تكتب شنوّة تبي تشتري 🤔"
      : "Désolé, je n'ai pas compris votre demande. Essayez de me dire ce que vous cherchez 🤔";

    return {
      type: 'fallback',
      message,
      language: context.language,
      intent: 'unclear'
    };
  }

  /**
   * Update user memory with new context
   */
  async updateMemory(userId, context, result) {
    const memoryUpdate = {
      ...context.memory,
      lastQuery: result.intent?.message || '',
      lastIntent: result.type,
      lastSearchTime: new Date().toISOString()
    };

    // Add specific updates based on result type
    if (result.type === 'search') {
      memoryUpdate.budget = result.parsed_input?.budget;
      memoryUpdate.use_case = result.parsed_input?.use_case;
      memoryUpdate.category = result.parsed_input?.category;
    } else if (result.type === 'comparison') {
      memoryUpdate.lastComparison = {
        products: result.parsed_input?.products,
        winner: result.comparison?.winner,
        timestamp: new Date().toISOString()
      };
    }

    await this.memoryManager.updateMemory(userId, memoryUpdate);
  }

  /**
   * Build standardized response
   */
  buildResponse(result, context) {
    return this.responseBuilder.build(result, context);
  }

  /**
   * Handle errors gracefully
   */
  handleError(error, requestId) {
    this.logger.error(`[${requestId}] Error:`, error);

    return {
      success: false,
      requestId,
      error: {
        message: "حدث خطأ في معالجة طلبك. جرب مرة أخرى.",
        code: error.code || 'UNKNOWN_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    };
  }

  // Utility methods
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  detectLanguage(message) {
    const arabicChars = /[\u0600-\u06FF]/;
    return arabicChars.test(message) ? 'arabic' : 'french';
  }

  isGreeting(message) {
    const lower = message.toLowerCase().trim();
    const greetings = [
      'salam', 'slm', 'marhaba', 'marhaban', 'ahlan', 'ahlan wa sahlan',
      'bonjour', 'salut', 'hello', 'hi', 'hey', 'coucou',
      'صباح الخير', 'مساء الخير', 'مرحبا', 'أهلا', 'سلام', 'هاي'
    ];
    return greetings.some(g => lower.includes(g) || lower === g);
  }

  extractPreferences(memory) {
    return {
      budget: memory.budget,
      use_case: memory.use_case,
      category: memory.category,
      language: this.detectLanguage(memory.lastQuery || '')
    };
  }

  mergeWithContext(parsed, memory) {
    return {
      ...parsed,
      budget: parsed.budget || memory.budget,
      use_case: parsed.use_case || memory.use_case,
      category: parsed.category || memory.category,
      categoryId: parsed.categoryId || memory.categoryId,
      categoryName: parsed.categoryName || memory.categoryName
    };
  }

  async searchProductsByName(productNames) {
    // Implementation moved from smartAssistant.js
    const products = [];

    for (const productName of productNames) {
      const sql = `
        SELECT
          p.id, p.name, p.description, p.price, p.stock,
          p.rating_avg, p.review_count, c.name as category_name, c.slug as category_slug
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_active = 1 AND p.stock > 0
          AND (p.name LIKE ? OR p.name LIKE ?)
        ORDER BY p.rating_avg DESC, p.view_count DESC LIMIT 1
      `;

      const searchTerm1 = `%${productName}%`;
      const searchTerm2 = `%${productName.split(' ')[0]}%`;

      try {
        const [results] = await this.db.execute(sql, [searchTerm1, searchTerm2]);
        if (results.length > 0) {
          products.push({
            id: results[0].id,
            name: results[0].name || '',
            description: results[0].description || '',
            price: parseFloat(results[0].price) || 0,
            category: results[0].category_slug || 'general',
            category_name: results[0].category_name || 'Général',
            rating: parseFloat(results[0].rating_avg) || 0,
            review_count: parseInt(results[0].review_count, 10) || 0,
            stock: results[0].stock || 0,
          });
        }
      } catch (error) {
        this.logger.error(`Error searching for product ${productName}:`, error);
      }
    }

    return products;
  }

  async performSearch(parsed) {
    // Implementation moved from smartAssistant.js
    const { sql, params } = buildQuery(parsed);
    const [products] = await this.db.execute(sql, params);

    const rankedProducts = rankProducts(products, parsed);
    const topResults = rankedProducts.slice(0, 10);

    const resultsWithWhy = topResults.map(product => ({
      ...product,
      why: this.generateSmartExplanation(product, parsed)
    }));

    const language = this.detectLanguage(parsed.original || '');
    const response = this.generateSearchResponse(language, parsed.original || '', resultsWithWhy, parsed.budget);

    return {
      response,
      results: resultsWithWhy,
      totalFound: rankedProducts.length,
      normalizedSearchTerm: parsed.keywords.join(' ') || parsed.original || '',
      rankingFactors: {
        fuzzy_match: false,
        budget_filter: !!parsed.budget,
        rating_sort: true,
        use_case_match: !!parsed.use_case
      }
    };
  }

  generateSmartExplanation(product, parsed) {
    // Simplified version - full implementation in assistant.js
    const reasons = [];
    if (parsed.budget && product.price <= parsed.budget) {
      reasons.push('💰 مناسب لميزانيتك');
    }
    if (product.rating >= 4.5) {
      reasons.push('⭐ تقييم ممتاز');
    }
    return reasons;
  }

  generateSearchResponse(language, searchTerm, results, budget) {
    // Simplified version - full implementation in smartAssistant.js
    if (results.length === 0) {
      return language === 'arabic'
        ? `❌ ما لقيتش منتجات تطابق بحثك "${searchTerm}"`
        : `❌ Aucun produit trouvé pour "${searchTerm}"`;
    }

    const topProduct = results[0];
    return language === 'arabic'
      ? `🔥 وجدت ${results.length} منتج! أفضل خيار: ${topProduct.name} (${topProduct.price} DT)`
      : `🔥 ${results.length} produit(s) trouvé(s)! Meilleur choix: ${topProduct.name} (${topProduct.price} DT)`;
  }
}

/**
 * Memory Manager - Handles user context persistence
 */
class MemoryManager {
  constructor(db) {
    this.db = db;
  }

  async getMemory(userId) {
    try {
      // userId is already the profiles.id
      const [rows] = await this.db.execute(
        'SELECT memory_data FROM user_memory WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)',
        [userId]
      );
      return rows.length > 0 ? JSON.parse(rows[0].memory_data) : {};
    } catch (error) {
      console.error('Memory load error:', error);
      return {};
    }
  }

  async updateMemory(userId, memory) {
    try {
      // userId is already the profiles.id
      await this.db.execute(
        'INSERT INTO user_memory (user_id, memory_data) VALUES (?, ?) ON DUPLICATE KEY UPDATE memory_data = ?, updated_at = NOW()',
        [userId, JSON.stringify(memory), JSON.stringify(memory)]
      );
    } catch (error) {
      console.error('Memory update error:', error);
    }
  }
}

/**
 * Response Builder - Standardizes all responses
 */
class ResponseBuilder {
  build(result, context) {
    const baseResponse = {
      message: result.message,
      language: result.language,
      parsed_input: result.parsed_input || {},
      products: result.products || [],
      total_found: result.totalFound || 0,
      has_budget_filter: !!(result.parsed_input?.budget),
      ranking_factors: result.ranking_factors || {}
    };

    // Add type-specific fields
    if (result.type === 'comparison') {
      baseResponse.comparison_result = result.comparison;
    }

    // Add recommendations titles
    baseResponse.recommendations_title = result.language === 'arabic' ? "اقتراحاتي:" : "Mes recommandations:";
    baseResponse.alternatives_title = result.language === 'arabic' ? "خيارات أخرى:" : "Autres options:";

    return baseResponse;
  }
}

/**
 * Logger - Structured logging system
 */
class Logger {
  info(message, ...args) {
    console.log(`[INFO] ${new Date().toISOString()} ${message}`, ...args);
  }

  debug(message, ...args) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()} ${message}`, ...args);
    }
  }

  warn(message, ...args) {
    console.warn(`[WARN] ${new Date().toISOString()} ${message}`, ...args);
  }

  error(message, ...args) {
    console.error(`[ERROR] ${new Date().toISOString()} ${message}`, ...args);
  }
}

module.exports = AIShoppingOrchestrator;