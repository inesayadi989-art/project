/**
 * Smart Assistant Engine
 * Handles natural language understanding + intelligent product recommendations
 */

const { parseInput, extractPrice } = require('./languageParser');

const arabicDigitsToLatin = (text) => {
  return text.replace(/[٠-٩]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit).toString());
};

function parseMessage(message) {
  // Use the improved language parser
  const parsed = parseInput(message);

  // Extract budget from the improved parser
  const budget = parsed.price;

  // Legacy use case detection (keep for now, can be improved later)
  const msg = arabicDigitsToLatin(message.toLowerCase().trim()).normalize('NFD');

  const useCaseRules = [
    {
      use_case: 'gaming',
      terms: ['gaming', 'game', 'jouer', 'gamer', 'jeux', 'مثال', 'ألعاب', 'gameplay', 'fps', 'gaming laptop', 'gaming phone', 'gaming pc'],
      context: ['high performance', 'gpu', 'graphics', 'gaming', 'jeux vidéo']
    },
    {
      use_case: 'work',
      terms: ['travail', 'work', 'office', 'bureau', 'study', 'étude', 'office', 'شغل', 'وظيفة', 'productivité', 'productivity'],
      context: ['office', 'business', 'productivity', 'workstation', 'professional']
    },
    {
      use_case: 'travel',
      terms: ['voyage', 'travel', 'trip', 'road', 'sac de voyage', 'travel bag', 'سفر', 'رحلة', 'portable', 'lightweight'],
      context: ['portable', 'light', 'compact', 'travel', 'mobile']
    },
    {
      use_case: 'gift',
      terms: ['cadeau', 'gift', 'present', 'هدية', 'هديه', 'pour offrir', 'surprise', 'anniversaire'],
      context: ['gift', 'present', 'surprise', 'special occasion']
    },
    {
      use_case: 'home',
      terms: ['home', 'maison', 'dar', 'décoration', 'deco', 'décor', 'شقة', 'بيت', 'منزل', 'interior'],
      context: ['home', 'interior', 'decoration', 'house', 'living room']
    },
    {
      use_case: 'cooking',
      terms: ['cuisine', 'cooking', 'cuisiner', 'طبخ', 'مطبخ', 'kitchen', 'recette', 'recipe'],
      context: ['kitchen', 'cooking', 'recipe', 'food preparation']
    },
    {
      use_case: 'budget',
      terms: ['pas cher', 'cheap', 'رخيص', 'bon marché', 'rachat', 'économique', 'affordable'],
      context: ['cheap', 'budget', 'affordable', 'economic']
    },
    {
      use_case: 'premium',
      terms: ['premium', 'luxury', 'luxe', 'غالي', 'haut de gamme', 'high end', 'luxurious'],
      context: ['premium', 'luxury', 'high quality', 'expensive']
    },
    {
      use_case: 'photography',
      terms: ['photo', 'photographie', 'camera', 'appareil photo', 'تصوير', 'صور', 'photoshoot', 'dslr', 'mirrorless'],
      context: ['camera', 'photo', 'photography', 'lens', 'low light', 'night photography']
    },
    {
      use_case: 'video',
      terms: ['video', 'vidéo', 'filmer', 'recording', 'vlog', 'content creation', 'youtube'],
      context: ['video', 'recording', 'content', 'streaming']
    }
  ];

  const categories = [
    { id: 1, category: 'phone', intent: 'electronics', name: 'Électronique', terms: ['phone', 'téléphone', 'mobile', 'smartphone', 'portable', 'iphon', 'samsung', 'huawei', 'xiaomi', 'infinix', 'tel', 'tél', 'هاتف', 'تلفون', 'موبايل', 'جوال', 'تليفون', 'نقال'] },
    { id: 1, category: 'laptop', intent: 'electronics', name: 'Électronique', terms: ['laptop', 'pc', 'ordinateur', 'portable', 'notebook', 'computer', 'حاسوب', 'كمبيوتر', 'لابتوب'] },
    { id: 2, category: 'fashion', intent: 'fashion', name: 'Mode & Vêtements', terms: ['robe', 't-shirt', 'jean', 'pantalon', 'chaussure', 'shoes', 'chaussures', 'vetement', 'vêtement', 'fashion', 'mode', 'sac', 'sac à main', 'accessoire', 'bijou', 'jewelry', 'لباس', 'هدوم', 'حذاء'] },
    { id: 3, category: 'home_deco', intent: 'home', name: 'Maison & Déco', terms: ['deco', 'décor', 'décoration', 'decor', 'maison', 'dar', 'home', 'meuble', 'lampe', 'tapis', 'décoratif', 'زينة', 'ديكور'] },
    { id: 4, category: 'food', intent: 'food', name: 'Alimentation', terms: ['food', 'alimentation', 'épices', 'café', 'thé', 'boisson', 'snack', 'olive', 'huile', 'pain', 'plat', 'gâteau', 'gateau', 'nourriture', 'مأكولات', 'توابل'] },
    { id: 8, category: 'beauty', intent: 'beauty', name: 'Santé & Beauté', terms: ['beauté', 'parfum', 'cosmétique', 'soin', 'makeup', 'masque', 'crème', 'santé', 'beaute', 'beauty', 'soins', 'maquillage'] },
    { id: 6, category: 'sport', intent: 'sport', name: 'Sport & Loisirs', terms: ['sport', 'sports', 'fitness', 'gym', 'vélo', 'ballon', 'raquette', 'رياضة', 'تدريب', 'تمريني'] },
    { id: 10, category: 'pets', intent: 'pets', name: 'Animaux', terms: ['animal', 'pet', 'chien', 'chat', 'oiseau', 'poisson', 'petit animal', 'animaux', 'حيوان', 'كلب', 'قطة'] },
    { id: 7, category: 'office', intent: 'office', name: 'Livres & Papeterie', terms: ['bureau', 'fourniture', 'papier', 'stylo', 'cahier', 'imprimante', 'office'] },
    { id: 7, category: 'gifts', intent: 'gifts', name: 'Cadeaux & Culture', terms: ['cadeau', 'cadeaux', 'gift', 'present', 'livre', 'jeu', 'jouet', 'musique', 'culture'] },
    { id: 5, category: 'art', intent: 'art', name: 'Artisanat & Art', terms: ['artisanat', 'art', 'handmade', 'fait main', 'artisan', 'peinture', 'sculpture', 'bijou', 'pottery', 'artisanal'] },
    { id: 9, category: 'garden', intent: 'garden', name: 'Jardinage', terms: ['jardin', 'plante', 'seed', 'semence', 'garden', 'pot', 'plantes', 'plant', 'jardinage', 'زهرة', 'بستنة'] }
  ];

  let intent = 'general';
  let categoryId = null;
  let categoryName = 'General';
  let category = null;
  let use_case = null;

  // Priority 1: Use case (primary intent) - enhanced semantic matching
  for (const rule of useCaseRules) {
    const hasDirectTerm = rule.terms.some(term => msg.includes(term));
    const hasContextTerm = rule.context.some(context => msg.includes(context));
    if (hasDirectTerm || hasContextTerm) {
      use_case = rule.use_case;
      break;
    }
  }

  // Priority 2: Category (secondary intent)
  for (const categoryItem of categories) {
    if (categoryItem.terms.some(term => msg.includes(term))) {
      intent = categoryItem.intent;
      categoryId = categoryItem.id;
      categoryName = categoryItem.name;
      category = categoryItem.category;
      break;
    }
  }

  // Special case for gifts
  if (intent === 'general' && /(هدية|هديه|cadeau|gift|present)/i.test(msg)) {
    intent = 'gifts';
    category = 'gifts';
    categoryName = 'Cadeaux & Culture';
  }

  const stopWords = ['هل', 'ما', 'من', 'أين', 'متى', 'كيف', 'stp', 'svp', 'please', 'merci'];
  const keywords = msg
    .replace(/(dt|dinar|dinars|دينار|دينارات|د|prix|budget|cost|price|ثمن|سعر)/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.includes(w) && w !== use_case && w !== category)
    .slice(0, 6);

  // Merge with improved parser results
  const enhancedKeywords = [...new Set([...keywords, ...parsed.keywords])];

  return {
    budget,
    intent: parsed.intent || intent,
    category,
    categoryId,
    categoryName,
    use_case,
    keywords: enhancedKeywords,
    original: message,
    language: parsed.language,
    normalized: parsed.normalized
  };
}

function rankProducts(products, parsed) {
  return products
    .map(p => {
      let score = 0;

      // Weighted scoring system (total 100%)
      // 1. Price match (30%)
      if (parsed.budget) {
        const priceDiff = Math.abs(p.price - parsed.budget);
        const priceScore = Math.max(0, 30 - (priceDiff / (parsed.budget || 1) * 30));
        score += priceScore;
      }

      // 2. Use case relevance (30%)
      if (parsed.use_case) {
        const text = `${p.name} ${p.description}`.toLowerCase();
        if (text.includes(parsed.use_case)) {
          score += 30;
        } else if (parsed.keywords.some(keyword => text.includes(keyword))) {
          score += 15; // Partial match
        }
      }

      // 3. Rating (20%)
      const rating = Number(p.rating_avg || p.rating) || 3;
      score += Math.min(rating, 5) * 4; // 20% max

      // 4. Popularity (10%)
      const viewScore = Math.min((p.view_count || 0) / 2000, 1) * 5;
      const reviewScore = Math.min((p.review_count || 0) / 40, 1) * 5;
      score += viewScore + reviewScore;

      // 5. Stock availability (10%)
      if (p.stock > 50) score += 10;
      else if (p.stock > 20) score += 6;
      else if (p.stock > 0) score += 3;

      return {
        ...p,
        score: Math.round(Math.min(score, 100) * 100) / 100
      };
    })
    .sort((a, b) => b.score - a.score);
}

function buildQuery(parsed) {
  let sql = `
    SELECT 
      p.id, p.name, p.slug, p.description, p.price, p.stock,
      p.rating_avg, p.review_count, p.view_count,
      p.is_approved, p.is_active, p.category_id,
      s.name as store_name, s.slug as store_slug
    FROM products p
    LEFT JOIN stores s ON p.store_id = s.id
    WHERE p.is_active = 1 AND p.is_approved = 1 AND p.stock > 0
  `;

  const params = [];

  if (parsed.categoryId) {
    sql += ` AND p.category_id = ?`;
    params.push(parsed.categoryId);
  }

  if (parsed.budget) {
    sql += ` AND p.price <= ?`;
    params.push(parsed.budget);
  }

  if (parsed.keywords && parsed.keywords.length > 0) {
    const keywordClauses = parsed.keywords
      .slice(0, 4)
      .map(() => `(p.name LIKE ? OR p.description LIKE ? OR p.slug LIKE ?)`)
      .join(' OR ');
    sql += ` AND (${keywordClauses})`;
    parsed.keywords.slice(0, 4).forEach((keyword) => {
      const likeKeyword = `%${keyword}%`;
      params.push(likeKeyword, likeKeyword, likeKeyword);
    });
  }

  sql += ` GROUP BY p.id ORDER BY p.is_approved DESC, p.rating_avg DESC, p.view_count DESC LIMIT 40`;

  return { sql, params };
}

function generateMessage(parsed, topProducts, alternatives) {
  const messages = [
    `J'ai trouvé des produits parfaits pour vous! 🔥`,
    `Voici les meilleures options selon votre demande 👍`,
    `J'ai sélectionné ce que vous cherchez ✨`,
    `Parfait! Voici mes recommandations 💡`
  ];

  let msg = messages[Math.floor(Math.random() * messages.length)];

  if (parsed.budget) {
    msg += ` (dans votre budget de ${parsed.budget} DT)`;
  }

  if (parsed.intent !== 'general') {
    msg += `. Nous avons ${topProducts.length} super options pour "${parsed.intent}"`;
  }

  if (alternatives.length > 0) {
    msg += ` + ${alternatives.length} alternatives`;
  }

  return msg;
}

// Detect comparison queries
function isComparisonQuery(message) {
  const lower = message.toLowerCase();
  const comparisonKeywords = [
    'علاش', 'ليه', 'علاش أحسن', 'علاش أفضل', 'علاش خير',
    'why', 'pourquoi', 'meilleur', 'better', 'vs', 'versus',
    'مقارنة', 'comparison', 'comparer', 'compare',
    'أي أحسن', 'أي أفضل', 'أي خير', 'which is better'
  ];

  return comparisonKeywords.some(keyword => lower.includes(keyword));
}

// Extract product names from comparison query
function extractComparisonProducts(message) {
  const lower = message.toLowerCase();

  // Common product patterns
  const productPatterns = [
    /(redmi|xiaomi|samsung|huawei|iphone|infinix|oppo|vivo|realme|nokia|sony|google|oneplus|pixel)\s+(\w+)/gi,
    /(\w+)\s+(redmi|xiaomi|samsung|huawei|iphone|infinix|oppo|vivo|realme|nokia|sony|google|oneplus|pixel)/gi,
    /"([^"]+)"/g,
    /'([^']+)'/g
  ];

  const products = [];
  for (const pattern of productPatterns) {
    const matches = message.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Clean the product name
        const cleanProduct = match.replace(/["']/g, '').trim();
        if (cleanProduct.length > 2 && !products.includes(cleanProduct)) {
          products.push(cleanProduct);
        }
      });
    }
  }

  // If no specific products found, try to extract from general terms
  if (products.length === 0) {
    const words = message.split(/\s+/);
    const potentialProducts = words.filter(word =>
      word.length > 3 &&
      !['علاش', 'ليه', 'why', 'pourquoi', 'better', 'vs', 'versus', 'مقارنة', 'comparison'].includes(word.toLowerCase())
    );
    products.push(...potentialProducts.slice(0, 2));
  }

  return products.slice(0, 2); // Max 2 products for comparison
}

// Compare two products
function compareProducts(productA, productB, userContext = {}) {
  const comparison = {
    winner: null,
    reasons: [],
    prosA: [],
    prosB: [],
    contextMatch: null
  };

  // Price comparison
  if (productA.price && productB.price) {
    const priceDiff = productA.price - productB.price;
    if (Math.abs(priceDiff) > 50) { // Significant price difference
      if (priceDiff > 0) {
        comparison.prosB.push(`💰 أرخص بـ ${priceDiff} DT`);
        if (!userContext.budget || productB.price <= userContext.budget) {
          comparison.reasons.push('السعر الأفضل');
        }
      } else {
        comparison.prosA.push(`💰 أرخص بـ ${Math.abs(priceDiff)} DT`);
        if (!userContext.budget || productA.price <= userContext.budget) {
          comparison.reasons.push('السعر الأفضل');
        }
      }
    }
  }

  // Rating comparison
  if (productA.rating && productB.rating) {
    const ratingDiff = productA.rating - productB.rating;
    if (Math.abs(ratingDiff) >= 0.5) {
      if (ratingDiff > 0) {
        comparison.prosA.push(`⭐ تقييم أعلى (${productA.rating} vs ${productB.rating})`);
        comparison.reasons.push('التقييم الأعلى');
      } else {
        comparison.prosB.push(`⭐ تقييم أعلى (${productB.rating} vs ${productA.rating})`);
        comparison.reasons.push('التقييم الأعلى');
      }
    }
  }

  // Stock availability
  if (productA.stock > 0 && productB.stock === 0) {
    comparison.prosA.push('📦 متوفر الآن');
    comparison.reasons.push('التوفر');
  } else if (productB.stock > 0 && productA.stock === 0) {
    comparison.prosB.push('📦 متوفر الآن');
    comparison.reasons.push('التوفر');
  }

  // Use case matching
  if (userContext.use_case) {
    const useCaseMatchA = checkUseCaseMatch(productA, userContext.use_case);
    const useCaseMatchB = checkUseCaseMatch(productB, userContext.use_case);

    if (useCaseMatchA && !useCaseMatchB) {
      comparison.prosA.push(`🎯 مناسب أكثر لـ ${userContext.use_case}`);
      comparison.reasons.push('الملاءمة للاستخدام');
      comparison.contextMatch = 'A';
    } else if (useCaseMatchB && !useCaseMatchA) {
      comparison.prosB.push(`🎯 مناسب أكثر لـ ${userContext.use_case}`);
      comparison.reasons.push('الملاءمة للاستخدام');
      comparison.contextMatch = 'B';
    }
  }

  // Determine winner based on weighted factors
  const scoreA = calculateComparisonScore(productA, userContext);
  const scoreB = calculateComparisonScore(productB, userContext);

  if (scoreA > scoreB) {
    comparison.winner = 'A';
  } else if (scoreB > scoreA) {
    comparison.winner = 'B';
  } else {
    comparison.winner = 'tie';
  }

  return comparison;
}

// Check if product matches use case
function checkUseCaseMatch(product, use_case) {
  const name = (product.name || '').toLowerCase();
  const desc = (product.description || '').toLowerCase();

  const useCaseKeywords = {
    gaming: ['gaming', 'game', 'jouer', 'gpu', 'processeur', 'ram'],
    work: ['travail', 'office', 'productivité', 'processeur', 'mémoire'],
    photography: ['camera', 'photo', 'photographie', 'lens', 'dslr', 'mirrorless'],
    video: ['video', 'vidéo', 'recording', 'content', 'youtube', 'streaming']
  };

  const keywords = useCaseKeywords[use_case] || [];
  return keywords.some(keyword => name.includes(keyword) || desc.includes(keyword));
}

// Calculate comparison score
function calculateComparisonScore(product, context) {
  let score = 0;

  // Price score (lower price = higher score, but within budget)
  if (context.budget && product.price <= context.budget) {
    score += (context.budget - product.price) / context.budget * 30;
  } else if (product.price) {
    score += Math.max(0, 30 - (product.price / 1000) * 5);
  }

  // Rating score
  if (product.rating) {
    score += product.rating * 20;
  }

  // Stock score
  if (product.stock > 0) {
    score += 10;
  }

  // Use case match score
  if (context.use_case && checkUseCaseMatch(product, context.use_case)) {
    score += 30;
  }

  return score;
}

// Generate comparison explanation
function generateComparisonExplanation(productA, productB, comparison, language = 'arabic') {
  const isArabic = language === 'arabic';

  if (comparison.winner === 'tie') {
    return isArabic
      ? `🤔 المنتجان متشابهان جداً! كل واحد له مميزاته الخاصة.`
      : `🤔 Les deux produits sont très similaires ! Chacun a ses propres avantages.`;
  }

  const winner = comparison.winner === 'A' ? productA : productB;
  const loser = comparison.winner === 'A' ? productB : productA;

  let explanation = '';

  if (isArabic) {
    explanation = `⚔️ مقارنة: ${productA.name} vs ${productB.name}\n\n`;
    explanation += `🏆 الفائز: ${winner.name}\n\n`;

    if (comparison.reasons.length > 0) {
      explanation += `📊 الأسباب الرئيسية:\n`;
      comparison.reasons.forEach(reason => {
        explanation += `• ${reason}\n`;
      });
      explanation += '\n';
    }

    if (comparison.contextMatch) {
      const contextProduct = comparison.contextMatch === 'A' ? productA : productB;
      explanation += `🎯 بالنسبة لاستخدامك: ${contextProduct.name} أنسب\n\n`;
    }

    explanation += `💡 التفاصيل:\n`;
    if (comparison.prosA.length > 0) {
      explanation += `${productA.name}:\n`;
      comparison.prosA.forEach(pro => explanation += `  ${pro}\n`);
    }
    if (comparison.prosB.length > 0) {
      explanation += `${productB.name}:\n`;
      comparison.prosB.forEach(pro => explanation += `  ${pro}\n`);
    }

  } else {
    explanation = `⚔️ Comparaison: ${productA.name} vs ${productB.name}\n\n`;
    explanation += `🏆 Gagnant: ${winner.name}\n\n`;

    if (comparison.reasons.length > 0) {
      explanation += `📊 Raisons principales:\n`;
      comparison.reasons.forEach(reason => {
        explanation += `• ${reason}\n`;
      });
      explanation += '\n';
    }

    if (comparison.contextMatch) {
      const contextProduct = comparison.contextMatch === 'A' ? productA : productB;
      explanation += `🎯 Pour votre usage: ${contextProduct.name} est plus adapté\n\n`;
    }

    explanation += `💡 Détails:\n`;
    if (comparison.prosA.length > 0) {
      explanation += `${productA.name}:\n`;
      comparison.prosA.forEach(pro => explanation += `  ${pro}\n`);
    }
    if (comparison.prosB.length > 0) {
      explanation += `${productB.name}:\n`;
      comparison.prosB.forEach(pro => explanation += `  ${pro}\n`);
    }
  }

  return explanation;
}

module.exports = {
  parseMessage,
  rankProducts,
  buildQuery,
  generateMessage,
  isComparisonQuery,
  extractComparisonProducts,
  compareProducts,
  generateComparisonExplanation
};
