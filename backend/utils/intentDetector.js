/**
 * Intent Detector & Budget Extractor
 * Detects what user wants and budget constraints
 */

const { normalizeText } = require("./languageParser");

// Intent categories
const INTENTS = {
  PHONE: "phone",
  LAPTOP: "laptop",
  DECORATION: "decoration",
  CLOTHING: "clothing",
  ACCESSORIES: "accessories",
  SHOES: "shoes",
  BOOK: "book",
  SPORT: "sport",
  GENERAL: "general",
};

// Intent keywords in multiple languages
const INTENT_KEYWORDS = {
  [INTENTS.PHONE]: [
    "phone",
    "telephone",
    "téléphone",
    "تيليفون",
    "تليفون",
    "نقال",
    "هاتف",
    "موبايل",
    "جوال",
    "portable",
    "mobile",
    "gsm",
    "iphone",
    "samsung",
    "huawei",
    "xiaomi",
    "oppo",
    "ايفون",
    "سامسونج",
    "هواوي",
    "شاومي",
    "أوبو"
  ],
  [INTENTS.LAPTOP]: [
    "laptop",
    "pc",
    "ordinateur",
    "كمبيوتر",
    "حاسوبة",
    "حاسوب",
    "أورديناتور",
    "لابتوب",
    "كمبيوتر محمول",
    "computer",
  ],
  [INTENTS.DECORATION]: [
    "deco",
    "décoration",
    "ديكور",
    "تزيين",
    "زينة",
    "home",
    "maison",
    "بيت",
    "decoration",
  ],
  [INTENTS.CLOTHING]: [
    "vetement",
    "vêtement",
    "ملابس",
    "libas",
    "لباس",
    "dress",
    "robe",
    "قميص",
    "clothing",
  ],
  [INTENTS.ACCESSORIES]: [
    "accessoire",
    "اكسوار",
    "حلية",
    "jewelry",
    "مجوهرات",
    "accessory",
  ],
  [INTENTS.SHOES]: ["chaussure", "حذاء", "جزمة", "sneaker", "shoe"],
  [INTENTS.BOOK]: ["livre", "book", "كتاب", "قراية"],
  [INTENTS.SPORT]: ["sport", "رياضة", "exercise", "fitness", "gym"],
};

// Quality keywords (to understand what user wants)
const QUALITY_KEYWORDS = {
  cheap: ["cheap", "bon marche", "رخيص", "بيه", "راخص", "رخيصة", "رخيصين", "بأسعار منخفضة"],
  expensive: ["cher", "expensive", "غالي", "غالية", "غاليين", "غاليات"],
  good: ["bon", "good", "بايه", "حسن", "برافو", "جيد", "جيدة", "جيدين", "جيدات"],
  best: ["meilleur", "best", "أفضل", "أحسن", "أجود", "أفضل جودة"],
  fast: ["rapide", "fast", "بسرعة", "تع", "سريع", "سريعة"],
  reliable: ["fiable", "reliable", "موثوق"],
};

// Detect intent from text
function detectIntent(text) {
  const normalized = normalizeText(text);

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalized.includes(normalizeText(keyword))) {
        return intent;
      }
    }
  }

  return INTENTS.GENERAL;
}

// Extract budget/price from text
function extractBudget(text) {
  // Match patterns like: "500", "500dt", "500 dinar", "€500", "$500"
  const patterns = [
    /(\d+)\s*(?:dt|dinar|tunisien|دينار|د\.ت|دت)/i,
    /(\d+)\s*(?:€|euros?|euro)/i,
    /\$\s*(\d+)|(\d+)\s*\$/i,
    /(?:sous|under|less than|اقل من|أقل من|menos de|تحت)\s*(\d+)/i,
    /(?:max|maximum|حد أقصى|أقصى)\s*(\d+)/i,
    /(?:prix|price|ثمن|سعر)\s*(?:de\s*)?(\d+)/i,
    /^(\d+)(?:\s|$)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const budget = parseInt(match[1] || match[2] || match[3] || 0);
      return budget > 0 ? budget : null;
    }
  }

  return null;
}

// Extract quality preference
function extractQualityPreference(text) {
  const normalized = normalizeText(text);

  for (const [quality, keywords] of Object.entries(QUALITY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalized.includes(normalizeText(keyword))) {
        return quality;
      }
    }
  }

  return null;
}

// Check if user wants min or max price
function isPriceUpperBound(text) {
  const normalized = normalizeText(text);
  return /(?:sous|under|max|moins|less than|اقل من|حد أقصى)/.test(normalized);
}

// Main intent parser
function parseUserIntent(text) {
  const intent = detectIntent(text);
  const budget = extractBudget(text);
  const quality = extractQualityPreference(text);
  const priceIsMax = isPriceUpperBound(text);

  return {
    intent,
    budget,
    budgetType: budget ? (priceIsMax ? "max" : "exact") : null,
    quality,
    hasPrice: budget !== null,
    parsed_at: new Date(),
  };
}

module.exports = {
  INTENTS,
  INTENT_KEYWORDS,
  QUALITY_KEYWORDS,
  detectIntent,
  extractBudget,
  extractQualityPreference,
  isPriceUpperBound,
  parseUserIntent,
};
