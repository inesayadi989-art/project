/**
 * Smart Assistant Service - Product search & ranking logic
 */

const INTENT_RULES = [
  { type: 'gift', category_id: null, keywords: ['cadeau', 'gift', 'present', 'هدية', 'اهداء', 'pour offrir', 'pour cadeau'], strict_filter: 'p.price <= 200', reject_keywords: [] },
  { type: 'coffee', category_id: 35, keywords: ['café tunisien', 'قهوة تونسية', 'tunisian coffee', 'café', 'coffee'], strict_filter: 'p.name LIKE "%café%" OR p.name LIKE "%قهوة%" OR p.name LIKE "%coffee%"', reject_keywords: [] },
  { type: 'home_decor', category_id: 34, keywords: ['déco salon', 'salon deco', 'decoration salon', 'ديكور صالون', 'زينة صالة'], strict_filter: 'category_id = 34', reject_keywords: [] },
  { type: 'work_laptop', category_id: 32, keywords: ['portable travail', 'laptop work', 'ordinateur travail', 'pour travailler', 'travail domicile'], strict_filter: 'p.name LIKE "%laptop%" OR p.name LIKE "%ordinateur%"', reject_keywords: ['phone', 'chargeur', 'gaming'] },
  { type: 'phone', category_id: 32, keywords: ['phone', 'téléphone', 'mobile', 'smartphone'], strict_filter: 'p.name LIKE "%phone%" OR p.name LIKE "%smartphone%" OR p.name LIKE "%mobile%"', reject_keywords: ['chargeur', 'coque', 'écouteur'] },
  { type: 'charger', category_id: 32, keywords: ['chargeur', 'charger', 'power bank', 'batterie'], strict_filter: 'p.name LIKE "%chargeur%" OR p.name LIKE "%charger%"', reject_keywords: [] },
  { type: 'laptop', category_id: 32, keywords: ['laptop', 'ordinateur', 'pc', 'portable', 'notebook'], strict_filter: 'p.name LIKE "%laptop%" OR p.name LIKE "%ordinateur%"', reject_keywords: ['phone'] },
  { type: 'fashion', category_id: 33, keywords: ['robe', 't-shirt', 'jean', 'pantalon', 'chaussure', 'mode'], strict_filter: 'category_id = 33', reject_keywords: [] },
  { type: 'home', category_id: 34, keywords: ['deco', 'décor', 'déco', 'maison', 'meuble', 'lampe', 'tapis'], strict_filter: 'category_id = 34', reject_keywords: [] },
  { type: 'food', category_id: 35, keywords: ['food', 'alimentation', 'épices', 'café', 'thé'], strict_filter: 'category_id = 35', reject_keywords: [] }
];

const FALLBACK_CATEGORIES = [
  { id: 32, intent: 'electronics', terms: ['electronique', 'phone', 'laptop', 'ordinateur', 'smartphone'] },
  { id: 33, intent: 'fashion', terms: ['mode', 'vetement', 'vêtement', 'robe', 't-shirt', 'jean'] },
  { id: 34, intent: 'home', terms: ['maison', 'deco', 'décor', 'meuble', 'lampe', 'tapis'] },
  { id: 35, intent: 'food', terms: ['alimentation', 'food', 'épices', 'café', 'thé'] }
];

const STOP_WORDS = ['هل', 'ما', 'من', 'أين', 'متى', 'كيف', 'stp', 'svp', 'please', 'merci', 'prix', 'budget', 'cost', 'price', 'ثمن', 'سعر'];

// Parse user message for intent and budget
function parseMessage(msg, { arabicDigitsToLatin, normalizeAssistantQuery }) {
  const raw = msg || '';
  const normalized = arabicDigitsToLatin(raw.toLowerCase().trim());

  // Extract budget
  const budgetMatch = normalized.match(/(\d+(?:\.\d{1,2})?)\s*(?:dt|dinar|dinars|دينار)/i);
  const budget = budgetMatch ? parseFloat(budgetMatch[1]) : null;

  // Detect specific intent
  let detectedIntent = null;
  for (const rule of INTENT_RULES) {
    if (rule.keywords.some(keyword => normalized.includes(keyword))) {
      detectedIntent = rule;
      break;
    }
  }

  // Fallback to general category
  if (!detectedIntent) {
    for (const category of FALLBACK_CATEGORIES) {
      if (category.terms.some(term => normalized.includes(term))) {
        detectedIntent = { type: category.intent, category_id: category.id, strict_filter: `category_id = ${category.id}`, reject_keywords: [] };
        break;
      }
    }
  }

  // Price preference
  let priceRange = 'any';
  if (normalized.match(/رخيس|pas cher|cheap/i)) priceRange = 'budget';
  else if (normalized.match(/premium|luxury|luxe/i)) priceRange = 'premium';

  // Extract keywords
  let keywords = normalizeAssistantQuery(normalized)
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.includes(w) && !/^\d+$/.test(w));

  if (detectedIntent) {
    keywords = [...new Set([...keywords, ...detectedIntent.keywords])];
  }

  return {
    budget, intent: detectedIntent ? detectedIntent.type : 'general', categoryId: detectedIntent ? detectedIntent.category_id : null,
    categoryName: detectedIntent ? detectedIntent.type : 'General', strictFilter: detectedIntent ? detectedIntent.strict_filter : null,
    rejectKeywords: detectedIntent ? detectedIntent.reject_keywords : [], priceRange, keywords, original: raw
  };
}

// Rank products using scoring algorithm
function rankProducts(products, parsed) {
  return products.map(p => {
    if (parsed.rejectKeywords?.length && parsed.rejectKeywords.some(w => `${p.name} ${p.description || ''}`.toLowerCase().includes(w.toLowerCase()))) {
      return { ...p, score: 0, rejected: true };
    }

    let score = 0;

    // Intent match
    if (parsed.intent === 'phone' && /phone|smartphone|mobile|téléphone/.test(p.name.toLowerCase())) score += 50;
    else if (parsed.intent === 'charger' && /chargeur|charger/.test(p.name.toLowerCase())) score += 50;
    else if (parsed.intent === 'laptop' && /laptop|ordinateur/.test(p.name.toLowerCase())) score += 50;

    // Category match
    if (parsed.categoryId && p.category_id === parsed.categoryId) score += 25;

    // Keyword relevance
    const text = `${p.name} ${p.description} ${p.category_name || ''}`.toLowerCase();
    const matches = parsed.keywords.filter(k => text.includes(k.toLowerCase())).length;
    score += Math.min(matches * 8, 20);

    // Price fit
    if (parsed.budget) {
      const diff = Math.abs(p.price - parsed.budget);
      score += Math.max(0, (100 - (diff / parsed.budget * 100)) / 100 * 15);
    }

    // Quality factors
    score += (parseFloat(p.rating_avg || 0) / 5) * 15;
    score += Math.min((p.view_count || 0) / 10000, 1) * 8;
    score += (p.stock > 50 ? 8 : p.stock > 20 ? 5 : p.stock > 5 ? 3 : p.stock > 0 ? 1 : 0);
    if (p.is_approved) score += 4;
    score += Math.min((p.review_count || 0) / 100, 1) * 4;

    // Price preferences
    if (parsed.priceRange === 'budget' && p.price <= (parsed.budget || 500)) score += 4;
    else if (parsed.priceRange === 'premium' && p.price >= (parsed.budget || 1000)) score += 5;

    return { ...p, score: Math.min(100, Math.round(score)), rejected: false };
  })
  .filter(p => !p.rejected)
  .sort((a, b) => b.score - a.score);
}

// Generate conversational response
function generateResponse(parsed, rankedProducts) {
  const top = rankedProducts.slice(0, 5);
  const messageMap = {
    gift: parsed.budget && top.length ? `🎁 Parfait! Pour un cadeau à ${parsed.budget} DT, voici ma sélection :\n🔥 ${top[0].name} (${top[0].price} DT)` : '🎁 Pour les cadeaux, dites-moi votre budget!',
    coffee: top.length ? `☕ Voici nos meilleurs cafés tunisiens :\n🔥 ${top[0].name} (${top[0].price} DT)` : '☕ Cherchez-vous du café tunisien spécial?',
    home_decor: top.length ? `🏠 Pour décorer votre salon :\n🔥 ${top[0].name} (${top[0].price} DT)` : '🏠 Pour la décoration, dites-moi votre style!',
    phone: parsed.budget && top.length ? `📱 Téléphones sous ${parsed.budget} DT :\n🔥 ${top[0].name} (${top[0].price} DT)` : '📱 Pour les téléphones, précisez votre budget!',
  };

  if (messageMap[parsed.intent]) return messageMap[parsed.intent];
  if (parsed.budget && top.length) return `✨ ${rankedProducts.length} produits trouvés!\n🔥 Top match: ${top[0].name} (${top[0].price} TND)`;
  if (top.length) return `✨ ${rankedProducts.length} produits trouvés!`;
  return `🤔 Aucun produit trouvé. Précisez votre recherche! 🔍`;
}

module.exports = { parseMessage, rankProducts, generateResponse, INTENT_RULES, STOP_WORDS };
