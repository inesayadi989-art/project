/**
 * Multi-Language Parser
 * Handles: Arabic (عربي), French (Français), Tunisian (تونسي), English
 */

// Normalize text - remove accents, lowercase, trim, handle mixed languages
function normalizeText(text) {
  if (!text) return "";

  // Handle Arabic text (preserve Arabic characters)
  if (/[\u0600-\u06FF]/.test(text)) {
    // For Arabic, normalize but keep Arabic chars
    return text
      .replace(/\s+/g, ' ') // normalize spaces
      .trim();
  }

  // For Latin text, normalize accents and case
  return text
    .toLowerCase()
    .replace(/[éèêë]/g, "e")
    .replace(/[àâä]/g, "a")
    .replace(/[ùûü]/g, "u")
    .replace(/[ôö]/g, "o")
    .replace(/[ïî]/g, "i")
    .replace(/[ç]/g, "c")
    .replace(/\s+/g, ' ') // normalize spaces
    .trim();
}

// Detect language
function detectLanguage(text) {
  if (!text) return "unknown";

  // Arabic detection (Arabic Unicode range)
  if (/[\u0600-\u06FF]/.test(text)) {
    // Check if it's Tunisian (contains Tunisian dialect patterns)
    if (isArabicDialect(text)) {
      return "tunisian";
    }
    return "arabic";
  }

  // French detection (French words and patterns)
  const frenchWords = /\b(je|tu|il|elle|nous|vous|ils|elles|est|sont|suis|avoir|être|bonjour|merci|please|cherche|recherche)\b/i;
  if (frenchWords.test(text)) {
    return "french";
  }

  // English detection
  const englishWords = /\b(i|you|he|she|it|we|they|am|is|are|have|has|do|does|hello|thanks|want|need|looking)\b/i;
  if (englishWords.test(text)) {
    return "english";
  }

  // Mixed language
  if (/[a-zA-Z]/.test(text) && /[\u0600-\u06FF]/.test(text)) {
    return "mixed";
  }

  return "unknown";
}

// Check if text is Arabic dialect (Tunisian)
function isArabicDialect(text) {
  // Tunisian dialect markers - expanded list
  const tunisianMarkers = /\b(nheb|n7eb|nehb|nhab|خاطر|براهم|يالله|والاه|المح|زايدة|بعد|قالت|قالع|شنوة|شنية|شنو|كيفاش|كيفك|شكون|عندي|عندك|معايا|معاك|هاي|هيك|هال|تلك|هاذي|هاذا|نقال|تيليفون|تليفون|حاسوبة|حاسوب|كمبيوتر|أورديناتور|ديكور|تزيين|زينة|ملابس|لباس|قميص|حذاء|جزمة|رياضة|كتاب|قراية)\b/i;
  return tunisianMarkers.test(text);
}

// Spelling correction for common misspellings
function correctSpelling(word) {
  const corrections = {
    // Phones
    telephon: "telephone",
    teliphone: "telephone",
    tel: "telephone",
    phone: "telephone",
    telifon: "telephone",
    // Laptops
    pcportable: "laptop",
    pc: "laptop",
    ordi: "laptop",
    ordinateur: "laptop",
    // Clothing
    vetement: "clothing",
    libas: "clothing",
    // Home
    deco: "decoration",
    maison: "home",
    // Accessories
    accessoire: "accessories",
    akseswar: "accessories",
    // Shoes
    chaussure: "shoes",
    // Books
    livre: "book",
    // Sport
    sport: "sport",
    // Common misspellings
    cherch: "cherche",
    recherche: "cherche",
    // Tunisian romanized
    nheb: "cherche",
    n7eb: "cherche",
    nehb: "cherche",
    nhab: "cherche"
  };

  return corrections[word.toLowerCase()] || word;
}

// Extract price from text
function extractPrice(text) {
  // Match patterns like: 500, 500dt, 500tnd, 500 dinar, 500 دينار
  const priceRegex = /(\d+(?:\.\d+)?)\s*(?:tnd|dt|dinar|دينار|€|dollar|دولار)?/gi;
  const matches = text.match(priceRegex);

  if (!matches) return null;

  // Return the first price found
  const firstMatch = matches[0].match(/(\d+(?:\.\d+)?)/);
  return firstMatch ? Number(firstMatch[1]) : null;
}

// Extract intent keywords
function extractIntent(text) {
  const lower = text.toLowerCase();

  if (lower.includes('cherche') || lower.includes('nheb') || lower.includes('want') || lower.includes('need') ||
      lower.includes('looking') || lower.includes('بحث') || lower.includes('ابحث')) {
    return 'search';
  }

  if (lower.includes('prix') || lower.includes('price') || lower.includes('سعر')) {
    return 'price_inquiry';
  }

  return 'unknown';
}

// Extract synonyms and alternatives with spelling correction
function extractKeywords(text, language) {
  const normalized = normalizeText(text);

  // Split into words, filter short ones
  let keywords = normalized.split(/[\s\-\.,!?]+/)
    .filter(w => w.length > 1)
    .map(correctSpelling); // Apply spelling correction

  // Language-specific keyword mappings
  const synonyms = {
    telephone: ["telephone", "téléphone", "تيليفون", "تليفون", "phone", "portable", "mobile", "gsm", "نقال", "telephon", "tel"],
    laptop: ["pc", "laptop", "ordinateur", "كمبيوتر", "حاسوبة", "حاسوب", "أورديناتور", "pcportable", "ordi"],
    decoration: ["deco", "décoration", "ديكور", "تزيين", "زينة", "home", "maison", "بيت"],
    clothing: ["vetement", "vêtement", "ملابس", "libas", "لباس", "dress", "robe", "قميص", "clothes"],
    accessories: ["accessoire", "اكسوار", "حلية", "jewels", "مجوهرات"],
    shoes: ["chaussure", "حذاء", "جزمة", "sneaker", "nike", "adidas"],
    book: ["livre", "book", "كتاب", "قراية"],
    sport: ["sport", "رياضة", "exercise", "fitness"],
  };

  // Expand keywords with synonyms
  const expandedKeywords = new Set(keywords);
  keywords.forEach(word => {
    Object.entries(synonyms).forEach(([key, values]) => {
      if (values.includes(word.toLowerCase())) {
        expandedKeywords.add(key);
        values.forEach(syn => expandedKeywords.add(syn));
      }
    });
  });

  return {
    keywords: Array.from(expandedKeywords),
    normalized,
    originalKeywords: keywords
  };
}

// Main parser function
function parseInput(text) {
  const language = detectLanguage(text);
  const { keywords, normalized, originalKeywords } = extractKeywords(text, language);
  const price = extractPrice(text);
  const intent = extractIntent(text);

  return {
    original: text,
    normalized,
    language,
    keywords,
    originalKeywords,
    price,
    intent,
    timestamp: new Date(),
  };
}

module.exports = {
  normalizeText,
  detectLanguage,
  isArabicDialect,
  correctSpelling,
  extractPrice,
  extractIntent,
  extractKeywords,
  parseInput,
};
