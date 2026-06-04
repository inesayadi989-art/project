const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const { authenticateToken, requireSubscription } = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '../uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const buildImageUrl = (req, imagePath) => {
  if (!imagePath) return imagePath;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}${imagePath}`;
};

const arabicDigitsToLatin = (text) => {
  return text.replace(/[٠-٩]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit).toString());
};

const parseBudget = (text) => {
  if (!text) return null;
  const normalized = arabicDigitsToLatin(text);
  const match = normalized.match(/(\d+(?:\.\d+)?)(?:\s*)(?:dt|dinar|dinars|دينار|دينارات|د)/i);
  if (!match) return null;
  return Number(match[1]);
};

const normalizeAssistantQuery = (text) => {
  if (!text) return '';

  return arabicDigitsToLatin(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/\b(dj|dt|dinar|dinars|دينار|دينارات|د|دينار)\b/g, '')
    .replace(/\b(prix|budget|cost|price|ثمن|سعر|سعرها|قيمة)\b/g, '')
    .replace(/\b(هدية|هديه|gift|present|cadeau|اهداء|للاهداء|pour cadeau)\b/g, 'cadeau')
    .replace(/\b(ديكور|deco|decoration|decor|décoration|ديكور|زينة)\b/g, 'déco')
    .replace(/\b(مايون|maison|dar|بيت|دار|منزل|salon|صالون|صالة)\b/g, 'maison')
    .replace(/\b(كوزينة|cuisine|kitchen|كitchen|kitchen|مطبخ)\b/g, 'cuisine')
    .replace(/\b(كمبيوتر|laptop|ordinateur|portable|notebook|pc|لابتوب|حاسوب)\b/g, 'portable')
    .replace(/\b(rkhis|رخيس|رخيس برشا|pas cher|cheap|bon marché|bonmarche|رخيص|منخفض)\b/g, 'pas cher')
    .replace(/\b(tounsi|tunisi|tn|تونسي|تونسية|تونس|تونيزي)\b/g, 'tunisien')
    .replace(/\b(قهوة|قهوة|café|coffee|قهوة تونسية|tunisian coffee)\b/g, 'café tunisien')
    .replace(/\b(شاي|thé|tea|شاي أخضر|شاي أسود)\b/g, 'thé')
    .replace(/\b(توابل|épices|spices|بهارات)\b/g, 'épices')
    .replace(/\b(سوبر|supreme|suprême|ممتاز|عالي الجودة|premium|haute qualité)\b/g, 'premium')
    .replace(/\b(عادي|normal|ordinaire|عادة)\b/g, 'normal')
    .replace(/\b(للعمل|travail|work|للشغل|pour travailler|à domicile|منزلي)\b/g, 'travail')
    .replace(/\b(للمنزل|domicile|home|بيتي|داري)\b/g, 'domicile')
    .replace(/\b(هاتف|تلفون|mobile|phone|smartphone|تيليفون)\b/g, 'phone')
    .replace(/\b(شاحن|chargeur|charger|بطارية)\b/g, 'chargeur')
    .replace(/\b(ساعة|montre|watch|ساعة يد)\b/g, 'montre')
    .replace(/\b(حقيبة|bag|sac|حقيبة يد)\b/g, 'sac')
    .replace(/\b(نظارات|lunettes|glasses|نظارات شمسية)\b/g, 'lunettes')
    .replace(/\b(أحذية|chaussures|shoes|حذاء)\b/g, 'chaussures')
    .replace(/\b(ملابس|vêtements|clothes|هدوم|لباس)\b/g, 'vêtements')
    .replace(/\b(أطفال|enfants|kids|طفل|ولد)\b/g, 'enfants')
    .replace(/\b(نساء|femmes|women|مرأة|ست)\b/g, 'femmes')
    .replace(/\b(رجال|hommes|men|راجل|رجل)\b/g, 'hommes')
    .replace(/\b(رياضة|sport|sports|رياضي)\b/g, 'sport')
    .replace(/\b(طبخ|cooking|cuisine|طبخ|طبخي)\b/g, 'cuisine')
    .replace(/\b(جميل|beau|beautiful|جذاب|أنيق)\b/g, 'beau')
    .replace(/\b(كبير|grand|large|كبير الحجم)\b/g, 'grand')
    .replace(/\b(صغير|petit|small|صغير الحجم)\b/g, 'petit')
    .replace(/\b(أحمر|rouge|red|أحمر)\b/g, 'rouge')
    .replace(/\b(أزرق|bleu|blue|أزرق)\b/g, 'bleu')
    .replace(/\b(أخضر|vert|green|أخضر)\b/g, 'vert')
    .replace(/\b(أسود|noir|black|أسود)\b/g, 'noir')
    .replace(/\b(أبيض|blanc|white|أبيض)\b/g, 'blanc')
    .replace(/\b(ذهبي|doré|gold|ذهبي)\b/g, 'doré')
    .replace(/\b(فضي|argenté|silver|فضي)\b/g, 'argenté')
    .replace(/\s+/g, ' ')
    .trim();
};

// Middleware to verify JWT - REMOVED: using from middleware/auth.js

// 🧠 PRO INTENT DETECTION (Amazon-style) 🔥
function parseMessage(msg) {
  const raw = msg || '';
  const normalized = arabicDigitsToLatin(raw.toLowerCase().trim());
  
  console.log('=== PARSE MESSAGE DEBUG ===');
  console.log('Raw input:', raw);
  console.log('Normalized:', normalized);

  // Budget extraction
  const budgetMatch = normalized.match(/(\d+(?:\.\d{1,2})?)\s*(?:dt|dinar|dinars|دينار|دينارات|د)/i);
  const budget = budgetMatch ? parseFloat(budgetMatch[1]) : null;
  console.log('Budget detected:', budget);

  // 🎯 SPECIFIC INTENT DICTIONARY (PRO VERSION)
  const intentRules = [
    // 🎁 GIFT INTENT - Special handling for gifts
    {
      type: 'gift',
      category_id: null, // Can be any category
      keywords: ['cadeau', 'gift', 'present', 'هدية', 'اهداء', 'pour offrir', 'pour cadeau'],
      strict_filter: 'p.price <= 200', // Gifts are typically affordable
      reject_keywords: []
    },
    // ☕ COFFEE INTENT - Tunisian specialty
    {
      type: 'coffee',
      category_id: 35,
      keywords: ['café tunisien', 'قهوة تونسية', 'tunisian coffee', 'café', 'coffee'],
      strict_filter: 'p.name LIKE "%café%" OR p.name LIKE "%قهوة%" OR p.name LIKE "%coffee%"',
      reject_keywords: []
    },
    // 🏠 HOME DECOR INTENT - Enhanced for salon/deco
    {
      type: 'home_decor',
      category_id: 34,
      keywords: ['déco salon', 'salon deco', 'decoration salon', 'ديكور صالون', 'زينة صالة'],
      strict_filter: 'category_id = 34 AND (p.name LIKE "%salon%" OR p.name LIKE "%décor%" OR p.name LIKE "%déco%")',
      reject_keywords: []
    },
    // 💻 WORK LAPTOP INTENT
    {
      type: 'work_laptop',
      category_id: 32,
      keywords: ['portable travail', 'laptop work', 'ordinateur travail', 'pour travailler', 'travail domicile'],
      strict_filter: 'p.name LIKE "%laptop%" OR p.name LIKE "%ordinateur%" OR p.name LIKE "%portable%"',
      reject_keywords: ['phone', 'chargeur', 'gaming', 'jeux']
    },
    {
      type: 'phone',
      category_id: 32,
      keywords: ['phone', 'téléphone', 'mobile', 'smartphone', 'iphone', 'samsung', 'huawei', 'xiaomi', 'oppo', 'realme', 'infinix'],
      strict_filter: 'p.name LIKE "%phone%" OR p.name LIKE "%smartphone%" OR p.name LIKE "%mobile%" OR p.name LIKE "%téléphone%"',
      reject_keywords: ['chargeur', 'charger', 'coque', 'case', 'écouteur', 'earphone', 'cable', 'accessoire']
    },
    {
      type: 'charger',
      category_id: 32,
      keywords: ['chargeur', 'charger', 'power bank', 'batterie'],
      strict_filter: 'p.name LIKE "%chargeur%" OR p.name LIKE "%charger%" OR p.name LIKE "%power bank%"',
      reject_keywords: ['phone', 'téléphone', 'mobile']
    },
    {
      type: 'laptop',
      category_id: 32,
      keywords: ['laptop', 'ordinateur', 'pc', 'portable', 'notebook'],
      strict_filter: 'p.name LIKE "%laptop%" OR p.name LIKE "%ordinateur%" OR p.name LIKE "%pc%" OR p.name LIKE "%portable%"',
      reject_keywords: ['phone', 'chargeur', 'accessoire']
    },
    {
      type: 'fashion',
      category_id: 33,
      keywords: ['robe', 't-shirt', 'jean', 'pantalon', 'chaussure', 'shoes', 'vetement', 'vêtement', 'mode'],
      strict_filter: 'category_id = 33',
      reject_keywords: []
    },
    {
      type: 'home',
      category_id: 34,
      keywords: ['deco', 'décor', 'déco', 'maison', 'dar', 'meuble', 'lampe', 'tapis', 'cuisine', 'kitchen'],
      strict_filter: 'category_id = 34',
      reject_keywords: []
    },
    {
      type: 'food',
      category_id: 35,
      keywords: ['food', 'alimentation', 'épices', 'café', 'thé', 'boisson', 'snack'],
      strict_filter: 'category_id = 35',
      reject_keywords: []
    }
  ];

  // Detect specific intent
  let detectedIntent = null;
  for (const rule of intentRules) {
    const matches = rule.keywords.some(keyword => {
      const found = normalized.includes(keyword);
      if (found) {
        console.log('✅ KEYWORD MATCH:', keyword, 'in', normalized);
      }
      return found;
    });
    if (matches) {
      detectedIntent = rule;
      console.log('🎯 INTENT DETECTED:', rule.type);
      break;
    }
  }
  
  if (!detectedIntent) {
    console.log('❌ No specific intent detected, falling back to general');
  }

  // Fallback to general category detection
  if (!detectedIntent) {
    const categories = [
      { id: 32, intent: 'electronics', name: 'Électronique', terms: ['electronique', 'phone', 'laptop', 'ordinateur', 'smartphone', 'chargeur', 'écouteur'] },
      { id: 33, intent: 'fashion', name: 'Mode & Vêtements', terms: ['mode', 'vetement', 'vêtement', 'robe', 't-shirt', 'jean', 'pantalon', 'chaussure'] },
      { id: 34, intent: 'home', name: 'Maison & Déco', terms: ['maison', 'deco', 'décor', 'déco', 'meuble', 'lampe', 'tapis', 'cuisine'] },
      { id: 35, intent: 'food', name: 'Alimentation', terms: ['alimentation', 'food', 'épices', 'café', 'thé', 'boisson', 'snack'] },
      { id: 36, intent: 'beauty', name: 'Santé & Beauté', terms: ['sante', 'beauté', 'beauty', 'cosmetique', 'parfum', 'soin'] },
      { id: 37, intent: 'sports', name: 'Sport & Loisirs', terms: ['sport', 'loisir', 'fitness', 'vélo', 'ballon', 'raquette'] },
      { id: 38, intent: 'pets', name: 'Animaux', terms: ['animal', 'chien', 'chat', 'oiseau', 'poisson', 'nourriture animale'] },
      { id: 40, intent: 'office', name: 'Fournitures & Bureau', terms: ['bureau', 'fourniture', 'papier', 'stylo', 'cahier', 'imprimante'] },
      { id: 41, intent: 'gifts', name: 'Cadeaux & Culture', terms: ['cadeau', 'culture', 'livre', 'jeu', 'jouet', 'musique'] },
      { id: 46, intent: 'art', name: 'Artisanat & Art', terms: ['artisanat', 'art', 'peinture', 'sculpture', 'pottery', 'bijou'] },
      { id: 50, intent: 'garden', name: 'Jardinage', terms: ['jardin', 'jardinage', 'plante', 'fleur', 'outil jardin', 'terreau'] }
    ];

    for (const category of categories) {
      if (category.terms && category.terms.some(term => normalized.includes(term))) {
        detectedIntent = {
          type: category.intent,
          category_id: category.id,
          strict_filter: `category_id = ${category.id}`,
          reject_keywords: []
        };
        break;
      }
    }
  }

  // Price preference
  let priceRange = 'any';
  if (normalized.match(/رخيس|pas cher|cheap|bon marché|bon marche/i)) {
    priceRange = 'budget';
  } else if (normalized.match(/premium|luxury|luxe|غالي|cher|expensive/i)) {
    priceRange = 'premium';
  }

  // Keywords for search
  const stopWords = ['هل', 'ما', 'من', 'أين', 'متى', 'كيف', 'stp', 'svp', 'please', 'merci', 'sous', 'moins', 'under', 'prix', 'budget', 'cost', 'price', 'ثمن', 'سعر'];
  let keywords = normalizeAssistantQuery(normalized)
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.includes(w) && !/^\d+$/.test(w));

  // Add intent keywords for broader search
  if (detectedIntent) {
    keywords = [...new Set([...keywords, ...detectedIntent.keywords])];
  }

  return {
    budget,
    intent: detectedIntent ? detectedIntent.type : 'general',
    categoryId: detectedIntent ? detectedIntent.category_id : null,
    categoryName: detectedIntent ? detectedIntent.type : 'General',
    strictFilter: detectedIntent ? detectedIntent.strict_filter : null,
    rejectKeywords: detectedIntent ? detectedIntent.reject_keywords : [],
    priceRange,
    keywords,
    original: raw
  };
}

// 🧠 RANKING ALGORITHM (Amazon-like) 🔥 WITH STRICT RELEVANCE
function rankProducts(products, parsed) {
  return products.map(p => {
    // 🚨 STRICT RELEVANCE FILTER - Reject irrelevant products
    if (parsed.rejectKeywords && parsed.rejectKeywords.length > 0) {
      const productText = `${p.name} ${p.description || ''}`.toLowerCase();
      const hasRejectKeyword = parsed.rejectKeywords.some(rejectWord =>
        productText.includes(rejectWord.toLowerCase())
      );
      if (hasRejectKeyword) {
        return { ...p, score: 0, rejected: true };
      }
    }

    let score = 0;

    // 🎯 STRICT INTENT MATCH (HIGHEST PRIORITY)
    if (parsed.strictFilter) {
      // For specific intents like "phone", check if product matches the strict criteria
      const productText = p.name.toLowerCase();
      if (parsed.intent === 'phone' &&
          (productText.includes('phone') || productText.includes('smartphone') ||
           productText.includes('mobile') || productText.includes('téléphone'))) {
        score += 50; // Massive boost for actual phones
      } else if (parsed.intent === 'charger' &&
                 (productText.includes('chargeur') || productText.includes('charger'))) {
        score += 50;
      } else if (parsed.intent === 'laptop' &&
                 (productText.includes('laptop') || productText.includes('ordinateur'))) {
        score += 50;
      }
    }

    // Category match
    if (parsed.categoryId && p.category_id === parsed.categoryId) {
      score += 25;
    }

    // Keyword relevance
    const text = `${p.name} ${p.description} ${p.category_name || ''}`.toLowerCase();
    const keywordMatches = parsed.keywords.reduce((count, keyword) => {
      return count + (text.includes(keyword.toLowerCase()) ? 1 : 0);
    }, 0);
    score += Math.min(keywordMatches * 8, 20);

    // Price fit
    if (parsed.budget) {
      const priceDiff = Math.abs(p.price - parsed.budget);
      const priceMatch = Math.max(0, 100 - (priceDiff / parsed.budget * 100));
      score += (priceMatch / 100) * 15;
    }

    // Quality factors
    const avgRating = parseFloat(p.rating_avg) || 0;
    score += (avgRating / 5) * 15;

    const maxViews = 10000;
    const viewScore = Math.min(p.view_count || 0, maxViews);
    score += (viewScore / maxViews) * 8;

    // Stock availability
    if (p.stock > 50) score += 8;
    else if (p.stock > 20) score += 5;
    else if (p.stock > 5) score += 3;
    else if (p.stock > 0) score += 1;

    if (p.is_approved) score += 4;

    const maxReviews = 100;
    const reviewScore = Math.min(p.review_count || 0, maxReviews);
    score += (reviewScore / maxReviews) * 4;

    // Price preferences
    if (parsed.priceRange === 'budget' && p.price <= (parsed.budget || 500)) {
      score += 4;
    } else if (parsed.priceRange === 'premium' && p.price >= (parsed.budget || 1000)) {
      score += 5;
    }

    return {
      ...p,
      score: Math.min(100, Math.round(score)),
      price_match: parsed.budget ? Math.round(100 - (Math.abs(p.price - parsed.budget) / parsed.budget * 100)) : null,
      rejected: false
    };
  })
  .filter(p => !p.rejected) // Remove rejected products
  .sort((a, b) => b.score - a.score);
}

// 🔍 AI SHOPPING ASSISTANT ROUTE (POST - NEW & IMPROVED)
router.post('/smart-assistant', async (req, res) => {
  try {
    const db = req.db;
    const { message } = req.body;
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Parse user message
    const parsed = parseMessage(message);
    const searchTerms = parsed.keywords || [];

    let sql = `
      SELECT p.id, p.store_id, p.category_id, p.name, p.slug, p.description, p.price, p.stock, p.is_approved, p.is_active, p.rating_avg, p.review_count, p.view_count, p.created_at,
             s.name as store_name, s.slug as store_slug,
             c.name as category_name, c.slug as category_slug,
             GROUP_CONCAT(pi.image_url SEPARATOR '||') as images
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.is_approved = true AND p.is_active = true
    `;
    const params = [];
    const conditions = [];

    // 🎯 STRICT INTENT-BASED FILTERING (PRO VERSION)
    if (parsed.strictFilter) {
      // For specific intents like "phone", use strict SQL filter
      conditions.push(`(${parsed.strictFilter})`);
    } else if (parsed.categoryId) {
      // Fallback to category filter
      conditions.push('p.category_id = ?');
      params.push(parsed.categoryId);
    }

    // Apply search terms (only if no strict filter)
    if (!parsed.strictFilter && searchTerms.length > 0) {
      const termConditions = searchTerms
        .map(() => '(p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ? OR s.name LIKE ?)')
        .join(' OR ');
      conditions.push(`(${termConditions})`);
      searchTerms.forEach((term) => {
        const likeQuery = `%${term}%`;
        params.push(likeQuery, likeQuery, likeQuery, likeQuery);
      });
    }

    // Apply budget filter
    if (parsed.budget) {
      conditions.push('p.price <= ?');
      params.push(parsed.budget);
    }

    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }

    sql += ' GROUP BY p.id LIMIT 50'; // Get more products to rank

    const [allProducts] = await db.execute(sql, params);
    
    // Process images
    allProducts.forEach(product => {
      product.images = product.images ? product.images.split('||').filter(Boolean) : [];
    });

    // Rank products using intelligent algorithm
    const rankedProducts = rankProducts(allProducts, parsed)
      .filter(p => !p.rejected) // Remove rejected products
      .sort((a, b) => (b.score || 0) - (a.score || 0)); // Sort by score descending

    // Categorize results
    const top = rankedProducts.slice(0, 5);
    const alternatives = rankedProducts.slice(5, 10);
    
    // Best for you (highest match + good rating)
    const bestForYou = rankedProducts.filter(p => p.score >= 70 && p.rating_avg >= 3.5).slice(0, 3);
    
    // Cheaper option (lowest price with decent rating)
    const cheaperOption = rankedProducts
      .filter(p => p.rating_avg >= 3 && p.stock > 0)
      .sort((a, b) => a.price - b.price)
      .slice(0, 2);
    
    // Premium option (highest price with best rating)
    const premiumOption = rankedProducts
      .filter(p => p.rating_avg >= 4)
      .sort((a, b) => b.price - a.price)
      .slice(0, 2);

    // Generate intelligent response
    let responseMessage = '';

    // 🎯 Conversational responses based on intent
    if (parsed.intent === 'gift') {
      if (parsed.budget && top.length > 0) {
        responseMessage = `🎁 Parfait! Pour un cadeau à ${parsed.budget} DT, voici mes meilleures suggestions locales :\n🔥 ${top[0].name} (${top[0].price} DT) - Idéal pour faire plaisir!`;
      } else if (top.length > 0) {
        responseMessage = `🎁 Pour les cadeaux, j'ai trouvé ces belles pièces artisanales :\n🔥 ${top[0].name} (${top[0].price} DT) - Un cadeau qui vient du cœur!`;
      } else {
        responseMessage = `🎁 Pour les cadeaux, dites-moi votre budget et l'occasion (anniversaire, mariage, etc.) pour de meilleures suggestions!`;
      }
    } else if (parsed.intent === 'coffee') {
      if (top.length > 0) {
        responseMessage = `☕ Le café tunisien est une spécialité! Voici les meilleurs :\n🔥 ${top[0].name} (${top[0].price} DT) - Du vrai café de chez nous!`;
      } else {
        responseMessage = `☕ Vous cherchez du café tunisien? J'ai des cafés d'excellente qualité de différentes régions. Dites-moi votre préférence!`;
      }
    } else if (parsed.intent === 'home_decor') {
      if (top.length > 0) {
        responseMessage = `🏠 Pour décorer votre salon, voici de belles pièces :\n🔥 ${top[0].name} (${top[0].price} DT) - Ça va embellir votre intérieur!`;
      } else {
        responseMessage = `🏠 Pour la décoration de salon, j'ai des tapis, lampes et objets artisanaux magnifiques. Quel style préférez-vous?`;
      }
    } else if (parsed.intent === 'work_laptop') {
      if (top.length > 0) {
        responseMessage = `💻 Pour travailler à domicile, voici des ordinateurs fiables :\n🔥 ${top[0].name} (${top[0].price} DT) - Parfait pour la productivité!`;
      } else {
        responseMessage = `💻 Pour le travail à la maison, je recommande des portables avec bonne autonomie et performance. Quel est votre budget?`;
      }
    } else if (parsed.intent === 'phone') {
      if (parsed.budget && top.length > 0) {
        responseMessage = `📱 Téléphones sous ${parsed.budget} DT :\n🔥 ${top[0].name} (${top[0].price} DT) - Excellent rapport qualité-prix!`;
      } else if (top.length > 0) {
        responseMessage = `📱 Voici les meilleurs smartphones disponibles :\n🔥 ${top[0].name} (${top[0].price} DT) - Technologie de pointe!`;
      } else {
        responseMessage = `📱 Pour les téléphones, dites-moi votre budget et vos préférences (marque, caractéristiques) pour de meilleurs conseils!`;
      }
    } else if (parsed.budget && top.length > 0) {
      const topRating = parseFloat(top[0].rating_avg || 0).toFixed(1);
      responseMessage = `✨ J'ai trouvé ${rankedProducts.length} produits pour vous! Voici les meilleures recommandations à moins de ${parsed.budget} TND.\n🔥 Top match: ${top[0].name} (${top[0].price} TND, ⭐ ${topRating}/5)`;
    } else if (top.length > 0) {
      const topRating = parseFloat(top[0].rating_avg || 0).toFixed(1);
      responseMessage = `✨ J'ai trouvé ${rankedProducts.length} produits! Voici mes meilleures recommandations pour vous.\n🔥 Top match: ${top[0].name} (${top[0].price} TND, ⭐ ${topRating}/5)`;
    } else {
      // More conversational no-results message
      const suggestions = [];
      if (parsed.budget) suggestions.push(`budget de ${parsed.budget} DT`);
      if (parsed.intent !== 'general') suggestions.push(`catégorie ${parsed.intent}`);

      const suggestionText = suggestions.length > 0 ? ` pour ${suggestions.join(' et ')}` : '';

      responseMessage = `🤔 Je n'ai pas trouvé de produits${suggestionText}. Essayez de préciser votre recherche :\n• "café tunisien premium" pour du café de qualité\n• "déco salon pas cher" pour la décoration\n• "portable travail" pour les ordinateurs\n• "hédiye 100d" pour les cadeaux\n\nDites-moi ce que vous cherchez! 🔍`;
    }

    res.json({
      message: responseMessage,
      parsed: {
        budget: parsed.budget,
        intent: parsed.intent,
        categoryId: parsed.categoryId,
        categoryName: parsed.categoryName,
        strictFilter: parsed.strictFilter,
        rejectKeywords: parsed.reject_keywords,
        priceRange: parsed.priceRange
      },
      total_matches: rankedProducts.length,
      top,
      alternatives,
      recommendations: {
        bestForYou: bestForYou.length > 0 ? bestForYou : [],
        cheaperOption: cheaperOption.length > 0 ? cheaperOption : [],
        premiumOption: premiumOption.length > 0 ? premiumOption : []
      }
    });

  } catch (error) {
    console.error('Smart assistant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// LEGACY: GET endpoint for backward compatibility
router.get('/assistant', async (req, res) => {
  try {
    const db = req.db;
    const { query } = req.query;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Assistant query is required' });
    }

    const budget = parseBudget(query);
    const searchText = normalizeAssistantQuery(query);
    const searchTerms = searchText ? searchText.split(/\s+/).filter(Boolean) : [];

    let sql = `
      SELECT p.id, p.store_id, p.category_id, p.name, p.slug, p.description, p.price, p.stock, p.is_approved, p.is_active, p.rating_avg, p.review_count, p.view_count, p.created_at,
             s.name as store_name, s.slug as store_slug,
             c.name as category_name, c.slug as category_slug,
             GROUP_CONCAT(pi.image_url SEPARATOR '||') as images
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.is_approved = true AND p.is_active = true
    `;
    const params = [];
    const conditions = [];

    if (searchTerms.length > 0) {
      const termConditions = searchTerms
        .map(() => '(p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ? OR s.name LIKE ?)')
        .join(' OR ');
      conditions.push(`(${termConditions})`);
      searchTerms.forEach((term) => {
        const likeQuery = `%${term}%`;
        params.push(likeQuery, likeQuery, likeQuery, likeQuery);
      });
    }

    if (budget) {
      conditions.push('p.price <= ?');
      params.push(budget);
    }

    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }

    sql += ' GROUP BY p.id ORDER BY p.rating_avg DESC LIMIT 8';

    const [products] = await db.execute(sql, params);
    products.forEach(product => {
      if (product.images) {
        product.images = product.images.split('||');
      } else {
        product.images = [];
      }
    });

    const assistantMessage = budget
      ? `Suggestions locales à moins de ${budget} TND pour « ${query} ». Je comprends l’arabe, le français, l’anglais et le tounsi.`
      : `Produits trouvés pour « ${query} ». Je comprends l’arabe, le français, l’anglais et le tounsi.`;

    res.json({
      query,
      budget,
      products,
      message: assistantMessage,
    });
  } catch (error) {
    console.error('Assistant search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all products with filters
router.get('/', async (req, res) => {
  try {
    const db = req.db;
    const { category, search, store, minPrice, maxPrice, page = 1, limit = 20, sort = 'newest' } = req.query;

    let query = `
      SELECT p.id, p.store_id, p.category_id, p.name, p.slug, p.description, p.price, p.stock, p.is_approved, p.is_active, p.rating_avg, p.review_count, p.view_count, p.created_at,
             s.name as store_name, s.slug as store_slug,
             c.name as category_name, c.slug as category_slug,
             GROUP_CONCAT(pi.image_url SEPARATOR '||') as images
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.is_approved = true AND p.is_active = true
    `;

    const params = [];
    const conditions = [];

    if (category) {
      if (/^\d+$/.test(category)) {
        conditions.push('c.id = ?');
      } else {
        conditions.push('c.slug = ?');
      }
      params.push(category);
    }

    if (store) {
      conditions.push('s.slug = ?');
      params.push(store);
    }

    if (search) {
      conditions.push('(p.name LIKE ? OR p.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
      const minValue = Number(minPrice);
      if (!Number.isNaN(minValue)) {
        conditions.push('p.price >= ?');
        params.push(minValue);
      }
    }

    if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
      const maxValue = Number(maxPrice);
      if (!Number.isNaN(maxValue)) {
        conditions.push('p.price <= ?');
        params.push(maxValue);
      }
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    query += ' GROUP BY p.id';

    // Sorting
    const sortMap = {
      newest: { column: 'p.created_at', direction: 'DESC' },
      price_asc: { column: 'p.price', direction: 'ASC' },
      price_desc: { column: 'p.price', direction: 'DESC' },
      popular: { column: 'p.view_count', direction: 'DESC' },
      rating: { column: 'p.rating_avg', direction: 'DESC' },
    };

    const sortConfig = sortMap[sort] || sortMap.newest;
    query += ` ORDER BY ${sortConfig.column} ${sortConfig.direction}`;

    // Pagination
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [products] = await db.execute(query, params);

    // Process images and normalize response shape for frontend
    products.forEach(product => {
      const imageUrls = product.images ? product.images.split('||').filter(Boolean) : [];
      product.product_images = imageUrls.map((url, index) => ({ url: buildImageUrl(req, url), is_primary: index === 0 }));
      product.stock_qty = product.stock ?? 0;
      product.compare_price = product.compare_price ?? null;
      product.tags = product.tags ? (Array.isArray(product.tags) ? product.tags : product.tags.split(',').map((tag) => tag.trim()).filter(Boolean)) : [];
      product.is_featured = product.is_featured ?? false;
      product.is_published = product.is_published ?? true;
      product.sold_count = product.sold_count ?? 0;
      delete product.images;
    });

    res.json({ products, page: parseInt(page), limit: parseInt(limit) });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;

    const [products] = await db.execute(`
      SELECT p.*, s.name as store_name, s.slug as store_slug,
             c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ? AND p.is_approved = true AND p.is_active = true
    `, [id]);

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = products[0];

    // Get images
    const [images] = await db.execute(
      'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order',
      [id]
    );
    const imageUrls = images.map(img => img.image_url);
    product.product_images = imageUrls.map((url, index) => ({ url: buildImageUrl(req, url), is_primary: index === 0 }));
    product.stock_qty = product.stock ?? 0;
    product.compare_price = product.compare_price ?? null;
    product.tags = product.tags ? (Array.isArray(product.tags) ? product.tags : product.tags.split(',').map((tag) => tag.trim()).filter(Boolean)) : [];
    product.is_featured = product.is_featured ?? false;
    product.is_published = product.is_published ?? true;
    product.sold_count = product.sold_count ?? 0;

    // Increment view count
    await db.execute(
      'UPDATE products SET view_count = view_count + 1 WHERE id = ?',
      [id]
    );

    res.json({ product });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get seller store by seller id
router.get('/stores/seller/:sellerId', async (req, res) => {
  try {
    const db = req.db;
    const { sellerId } = req.params;

    const [stores] = await db.execute(`
      SELECT s.*
      FROM stores s
      WHERE s.owner_id = ? AND s.is_active = true
      LIMIT 1
    `, [sellerId]);

    if (stores.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }

    res.json({ store: stores[0] });
  } catch (error) {
    console.error('Get seller store error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create seller store if it does not exist yet
router.post('/stores/seller/:sellerId', authenticateToken, upload.single('logo'), async (req, res) => {
  try {
    if (req.user.role !== 'seller') {
      return res.status(403).json({ error: 'Only sellers can create a store' });
    }

    const sellerIdNum = parseInt(req.params.sellerId, 10);
    if (req.user.userId !== sellerIdNum) {
      return res.status(403).json({ error: 'You can only create your own store' });
    }

    const db = req.db;
    const [existingStores] = await db.execute(
      `SELECT * FROM stores WHERE owner_id = ? AND is_active = true LIMIT 1`,
      [sellerIdNum]
    );

    if (existingStores.length > 0) {
      return res.status(400).json({ error: 'Store already exists' });
    }

    const name = (req.body.name || `Boutique du vendeur`).trim();
    const description = req.body.description?.trim() || null;
    const banner_url = req.body.banner_url?.trim() || null;
    const phone = req.body.phone?.trim() || null;
    const email = req.body.email?.trim() || null;
    const governorate = req.body.governorate?.trim() || null;
    const address = req.body.address?.trim() || null;
    const logo_url = req.file ? `/uploads/${req.file.filename}` : null;

    const slugBase = name.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    const slug = slugBase || `boutique-${sellerIdNum}-${Date.now()}`;

    await db.execute(
      `INSERT INTO stores (owner_id, name, slug, description, logo_url, banner_url, phone, email, governorate, address, is_approved, is_active, commission_rate, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [sellerIdNum, name, slug, description, logo_url, banner_url, phone, email, governorate, address, false, true, 10]
    );

    const [newStores] = await db.execute(
      `SELECT * FROM stores WHERE owner_id = ? AND is_active = true LIMIT 1`,
      [sellerIdNum]
    );

    res.status(201).json({ store: newStores[0] });
  } catch (error) {
    console.error('Create seller store error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update seller store details
router.put('/stores/seller/:sellerId', authenticateToken, upload.single('logo'), async (req, res) => {
  try {
    if (req.user.role !== 'seller') {
      console.error('❌ Not a seller role:', req.user.role);
      return res.status(403).json({ error: 'Only sellers can update their store' });
    }

    const { sellerId } = req.params;
    const sellerIdNum = parseInt(sellerId, 10);
    console.log('🔍 Update store request:', { sellerId, userId: req.user.userId, role: req.user.role });
    
    if (req.user.userId !== sellerIdNum) {
      console.error('❌ User ID mismatch:', { userId: req.user.userId, sellerId: sellerIdNum });
      return res.status(403).json({ error: 'You can only update your own store' });
    }

    const db = req.db;
    const [stores] = await db.execute(
      `SELECT * FROM stores WHERE owner_id = ? AND is_active = true LIMIT 1`,
      [sellerIdNum]
    );

    if (stores.length === 0) {
      console.error('❌ Store not found for seller:', sellerId);
      return res.status(404).json({ error: 'Store not found' });
    }

    const store = stores[0];
    const {
      name = store.name,
      description = store.description,
      banner_url = store.banner_url,
      phone = store.phone,
      email = store.email,
      governorate = store.governorate,
      address = store.address,
    } = req.body;

    const logo_url = req.file ? `/uploads/${req.file.filename}` : store.logo_url;

    await db.execute(
      `UPDATE stores SET name = ?, description = ?, logo_url = ?, banner_url = ?, phone = ?, email = ?, governorate = ?, address = ?, updated_at = NOW() WHERE owner_id = ? AND is_active = true`,
      [name, description, logo_url, banner_url, phone, email, governorate, address, sellerIdNum]
    );

    const [updatedStores] = await db.execute(
      `SELECT * FROM stores WHERE owner_id = ? AND is_active = true LIMIT 1`,
      [sellerIdNum]
    );

    console.log('✅ Store updated successfully:', { sellerId: sellerIdNum, storeName: updatedStores[0]?.name });
    res.json({ store: updatedStores[0] });
  } catch (error) {
    console.error('❌ Update seller store error:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get seller-managed products by store slug
router.get('/stores/manage/:storeSlug', authenticateToken, requireSubscription, async (req, res) => {
  try {
    if (req.user.role !== 'seller') {
      return res.status(403).json({ error: 'Only sellers can access their products' });
    }

    const db = req.db;
    const { storeSlug } = req.params;

    const [stores] = await db.execute(
      `SELECT id FROM stores WHERE slug = ? AND owner_id = ? AND is_active = true LIMIT 1`,
      [storeSlug, req.user.userId]
    );

    if (stores.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const storeId = stores[0].id;

    const [products] = await db.execute(
      `SELECT p.id, p.store_id, p.category_id, p.name, p.slug, p.description, p.price, p.stock, p.is_approved, p.is_active, p.rating_avg, p.review_count, p.view_count, p.created_at,
              GROUP_CONCAT(pi.image_url SEPARATOR '||') as images
       FROM products p
       LEFT JOIN product_images pi ON p.id = pi.product_id
       WHERE p.store_id = ?
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [storeId]
    );

    products.forEach(product => {
      const imageUrls = product.images ? product.images.split('||').filter(Boolean) : [];
      product.product_images = imageUrls.map((url, index) => ({ url: buildImageUrl(req, url), is_primary: index === 0 }));
      product.stock_qty = product.stock ?? 0;
      product.compare_price = product.compare_price ?? null;
      product.tags = product.tags ? (Array.isArray(product.tags) ? product.tags : product.tags.split(',').map((tag) => tag.trim()).filter(Boolean)) : [];
      product.is_featured = product.is_featured ?? false;
      product.is_published = product.is_published ?? true;
      product.sold_count = product.sold_count ?? 0;
      delete product.images;
    });

    res.json({ products });
  } catch (error) {
    console.error('Get seller-managed products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get stores
router.get('/stores/list', async (req, res) => {
  try {
    const db = req.db;

    const [stores] = await db.execute(`
      SELECT s.id, s.name, s.slug, s.description, s.logo_url,
             COUNT(p.id) as product_count,
             AVG(p.rating_avg) as avg_rating
      FROM stores s
      LEFT JOIN products p ON s.id = p.store_id AND p.is_approved = true AND p.is_active = true
      WHERE s.is_approved = true AND s.is_active = true
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);

    res.json({ stores });

  } catch (error) {
    console.error('Get stores error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get categories
router.get('/categories/list', async (req, res) => {
  try {
    const db = req.db;

    const [categories] = await db.execute(
      'SELECT id, name, slug, description, icon_url FROM categories WHERE is_active = true ORDER BY display_order'
    );

    res.json({ categories });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create product (seller only)
router.post('/', authenticateToken, requireSubscription, upload.array('images', 8), [
  body('name').trim().isLength({ min: 2 }),
  body('description').optional({ checkFalsy: true }).trim().isLength({ min: 3 }),
  body('price').isFloat({ min: 0 }),
  body('compare_price').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('stock').optional({ checkFalsy: true }).isInt({ min: 0 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== 'seller') {
      return res.status(403).json({ error: 'Only sellers can create products' });
    }

    const db = req.db;
    const { name, description = '', price, stock, stock_qty, category_id, categoryId, compare_price, comparePrice, is_featured, isFeatured } = req.body;
    const resolvedStock = stock ?? stock_qty ?? 0;
    const resolvedCategoryId = category_id || categoryId || null;
    const resolvedComparePrice = compare_price ?? comparePrice ?? null;
    const resolvedIsFeatured = is_featured ?? isFeatured ? 1 : 0;
    const sellerId = req.user.userId || req.user.id;

    // Get seller's store
    const [stores] = await db.execute(
      'SELECT id FROM stores WHERE owner_id = ? AND is_approved = true',
      [sellerId]
    );

    if (stores.length === 0) {
      return res.status(400).json({ error: 'Seller must have an approved store' });
    }

    const storeId = stores[0].id;

    // Insert product
    const [result] = await db.execute(
      'INSERT INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, false, true)',
      [storeId, resolvedCategoryId, name, name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), description, price, resolvedStock]
    );

    const productId = result.insertId;

    // Handle images
    if (req.files && req.files.length > 0) {
      const placeholders = req.files.map(() => '(?, ?, ?)').join(', ');
      const imageValues = [];
      req.files.forEach((file, index) => {
        imageValues.push(productId, `/uploads/${file.filename}`, index);
      });

      await db.execute(
        `INSERT INTO product_images (product_id, image_url, sort_order) VALUES ${placeholders}`,
        imageValues
      );
    }

    res.status(201).json({ message: 'Product created successfully', productId });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product (seller only)
router.put('/:id', authenticateToken, requireSubscription, upload.array('images', 8), [
  body('name').optional().trim().isLength({ min: 2 }),
  body('description').optional({ checkFalsy: true }).trim().isLength({ min: 3 }),
  body('price').optional().isFloat({ min: 0 }),
  body('compare_price').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('stock').optional({ checkFalsy: true }).isInt({ min: 0 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (req.user.role !== 'seller') {
      return res.status(403).json({ error: 'Only sellers can update products' });
    }

    const db = req.db;
    const { id } = req.params;
    const { name, description, price, stock, stock_qty, category_id, categoryId, compare_price, comparePrice, is_featured, isFeatured, slug } = req.body;
    const sellerId = req.user.userId || req.user.id;

    // Check if product belongs to seller
    const [products] = await db.execute(
      'SELECT p.id FROM products p JOIN stores s ON p.store_id = s.id WHERE p.id = ? AND s.owner_id = ?',
      [id, sellerId]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found or not owned by seller' });
    }

    // Build update fields dynamically
    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
      updates.push('slug = ?');
      values.push(slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
    
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description || null);
    }
    
    if (price !== undefined) {
      updates.push('price = ?');
      values.push(price);
    }
    
    if (stock !== undefined || stock_qty !== undefined) {
      updates.push('stock = ?');
      values.push(stock ?? stock_qty ?? 0);
    }
    
    if (category_id !== undefined || categoryId !== undefined) {
      updates.push('category_id = ?');
      values.push(category_id || categoryId || null);
    }
    
    if (compare_price !== undefined || comparePrice !== undefined) {
      updates.push('compare_price = ?');
      values.push(compare_price ?? comparePrice ?? null);
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    if (updates.length > 1) { // At least one field + updated_at
      const sql = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;
      await db.execute(sql, values);
    }

    // Handle images (if provided)
    if (req.files && req.files.length > 0) {
      // Delete existing images
      await db.execute('DELETE FROM product_images WHERE product_id = ?', [id]);

      // Insert new images
      const placeholders = req.files.map(() => '(?, ?, ?)').join(', ');
      const imageValues = [];
      req.files.forEach((file, index) => {
        imageValues.push(id, `/uploads/${file.filename}`, index);
      });

      await db.execute(
        `INSERT INTO product_images (product_id, image_url, sort_order) VALUES ${placeholders}`,
        imageValues
      );
    }

    res.json({ message: 'Product updated successfully' });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product (seller only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'seller') {
      return res.status(403).json({ error: 'Only sellers can delete products' });
    }

    const db = req.db;
    const { id } = req.params;
    const sellerId = req.user.userId || req.user.id;

    // Check if product belongs to seller
    const [products] = await db.execute(
      'SELECT p.id FROM products p JOIN stores s ON p.store_id = s.id WHERE p.id = ? AND s.owner_id = ?',
      [id, sellerId]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found or not owned by seller' });
    }

    // Delete product (this will cascade to images)
    await db.execute('DELETE FROM products WHERE id = ?', [id]);

    res.json({ message: 'Product deleted successfully' });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

