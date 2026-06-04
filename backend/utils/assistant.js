/**
 * Smart Assistant Engine
 * Handles natural language understanding + intelligent product recommendations
 */

const arabicDigitsToLatin = (text) => {
  return text.replace(/[٠-٩]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit).toString());
};

function parseMessage(message) {
  const raw = message || '';
  const msg = arabicDigitsToLatin(raw.toLowerCase().trim()).normalize('NFD');

  const budgetMatch = msg.match(/(\d+(?:\.\d{1,2})?)\s*(?:dt|dinar|dinars|دينار|دينارات|د)/i);
  const budget = budgetMatch ? parseFloat(budgetMatch[1]) : null;

  const categories = [
    { id: 1, intent: 'tech', name: 'Électronique', terms: ['phone', 'téléphone', 'mobile', 'smartphone', 'portable', 'laptop', 'ordinateur', 'pc', 'tablet', 'airpods', 'headphone', 'casque', 'charger', 'chargeur', 'electronics', 'electronique'] },
    { id: 2, intent: 'fashion', name: 'Mode & Vêtements', terms: ['robe', 't-shirt', 'jean', 'pantalon', 'chaussure', 'shoes', 'chaussures', 'vetement', 'vêtement', 'fashion', 'mode', 'sac', 'accessoire', 'tuniques', 'chemise'] },
    { id: 3, intent: 'home', name: 'Maison & Déco', terms: ['deco', 'décor', 'déco', 'maison', 'dar', 'meuble', 'lampe', 'tapis', 'cuisine', 'kitchen', 'vaisselle', 'decoration', 'home', 'déco', 'décoration'] },
    { id: 4, intent: 'food', name: 'Alimentation', terms: ['food', 'alimentation', 'épices', 'café', 'thé', 'boisson', 'snack', 'olive', 'huile', 'pain', 'plat', 'gâteau', 'gateau'] },
    { id: 5, intent: 'artisanat', name: 'Artisanat & Art', terms: ['artisanat', 'art', 'handmade', 'fait main', 'artisan', 'cadeau', 'cadeaux', 'artisanal'] },
    { id: 8, intent: 'beauty', name: 'Santé & Beauté', terms: ['beauté', 'parfum', 'cosmétique', 'soin', 'makeup', 'masque', 'crème', 'santé', 'beaute'] },
    { id: 9, intent: 'garden', name: 'Jardinage', terms: ['jardin', 'plante', 'seed', 'semence', 'garden', 'pot', 'plantes', 'implantation'] },
    { id: 10, intent: 'pets', name: 'Animaux', terms: ['animal', 'pet', 'chien', 'chat', 'oiseau', 'petit animal', 'pets', 'chien', 'chat'] }
  ];

  let intent = 'general';
  let categoryId = null;
  let categoryName = 'General';

  for (const category of categories) {
    if (category.terms.some(term => msg.includes(term))) {
      intent = category.intent;
      categoryId = category.id;
      categoryName = category.name;
      break;
    }
  }

  if (intent === 'general' && /(هدية|هديه|cadeau|gift|present)/i.test(msg)) {
    intent = 'gift';
  }

  const stopWords = ['هل', 'ما', 'من', 'أين', 'متى', 'كيف', 'stp', 'svp', 'please', 'merci'];
  const keywords = msg
    .replace(/(dt|dinar|dinars|دينار|دينارات|د|prix|budget|cost|price|ثمن|سعر)/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.includes(w))
    .slice(0, 6);

  return {
    budget,
    intent,
    categoryId,
    categoryName,
    keywords,
    original: raw
  };
}

function rankProducts(products, parsed) {
  return products
    .map(p => {
      let score = 0;

      if (parsed.categoryId) {
        score += 60;
      } else {
        score += 20;
      }

      if (parsed.budget) {
        const priceDiff = Math.abs(p.price - parsed.budget);
        const priceScore = Math.max(0, 20 - (priceDiff / (parsed.budget || 1) * 20));
        score += priceScore;
      }

      const rating = Number(p.rating_avg) || 3;
      score += (Math.min(rating, 5) / 5) * 10;

      const viewScore = Math.min((p.view_count || 0) / 5000, 1);
      score += viewScore * 5;

      const reviewScore = Math.min((p.review_count || 0) / 100, 1);
      score += reviewScore * 5;

      if (p.stock > 50) score += 5;
      else if (p.stock > 20) score += 3;
      else if (p.stock > 0) score += 1;

      if (parsed.keywords && parsed.keywords.length > 0) {
        const text = `${p.name} ${p.description}`.toLowerCase();
        parsed.keywords.forEach(keyword => {
          if (text.includes(keyword)) score += 2;
        });
      }

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
      p.rating_avg, p.review_count, p.view_count, p.sold_count,
      p.is_featured, p.is_approved, p.is_active, p.category_id,
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

module.exports = {
  parseMessage,
  rankProducts,
  buildQuery,
  generateMessage
};
