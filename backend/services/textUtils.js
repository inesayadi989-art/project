/**
 * Text processing utilities for Arabic/Latin conversion and normalization
 */

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
  const replacements = [
    [/\b(dj|dt|dinar|dinars|دينار|دينارات|د|دينار)\b/gi, ''],
    [/\b(prix|budget|cost|price|ثمن|سعر|سعرها|قيمة)\b/gi, ''],
    [/\b(هدية|هديه|gift|present|cadeau|اهداء|للاهداء|pour cadeau)\b/gi, 'cadeau'],
    [/\b(ديكور|deco|decoration|decor|décoration|ديكور|زينة)\b/gi, 'déco'],
    [/\b(مايون|maison|dar|بيت|دار|منزل|salon|صالون|صالة)\b/gi, 'maison'],
    [/\b(كوزينة|cuisine|kitchen|كitchen|مطبخ)\b/gi, 'cuisine'],
    [/\b(كمبيوتر|laptop|ordinateur|portable|notebook|pc|لابتوب|حاسوب)\b/gi, 'portable'],
    [/\b(rkhis|رخيس|رخيس برشا|pas cher|cheap|bon marché|bonmarche|رخيص|منخفض)\b/gi, 'pas cher'],
    [/\b(tounsi|tunisi|tn|تونسي|تونسية|تونس|تونيزي)\b/gi, 'tunisien'],
    [/\b(قهوة|café|coffee|قهوة تونسية|tunisian coffee)\b/gi, 'café tunisien'],
    [/\b(شاي|thé|tea|شاي أخضر|شاي أسود)\b/gi, 'thé'],
    [/\b(توابل|épices|spices|بهارات)\b/gi, 'épices'],
    [/\b(سوبر|supreme|suprême|ممتاز|عالي الجودة|premium|haute qualité)\b/gi, 'premium'],
    [/\b(عادي|normal|ordinaire|عادة)\b/gi, 'normal'],
    [/\b(للعمل|travail|work|للشغل|pour travailler|à domicile|منزلي)\b/gi, 'travail'],
    [/\b(للمنزل|domicile|home|بيتي|داري)\b/gi, 'domicile'],
    [/\b(هاتف|تلفون|mobile|phone|smartphone|تيليفون)\b/gi, 'phone'],
    [/\b(شاحن|chargeur|charger|بطارية)\b/gi, 'chargeur'],
    [/\b(ساعة|montre|watch|ساعة يد)\b/gi, 'montre'],
    [/\b(حقيبة|bag|sac|حقيبة يد)\b/gi, 'sac'],
    [/\b(نظارات|lunettes|glasses|نظارات شمسية)\b/gi, 'lunettes'],
    [/\b(أحذية|chaussures|shoes|حذاء)\b/gi, 'chaussures'],
    [/\b(ملابس|vêtements|clothes|هدوم|لباس)\b/gi, 'vêtements'],
    [/\b(أطفال|enfants|kids|طفل|ولد)\b/gi, 'enfants'],
    [/\b(نساء|femmes|women|مرأة|ست)\b/gi, 'femmes'],
    [/\b(رجال|hommes|men|راجل|رجل)\b/gi, 'hommes'],
    [/\b(رياضة|sport|sports|رياضي)\b/gi, 'sport'],
    [/\b(طبخ|cooking|cuisine|طبخ|طبخي)\b/gi, 'cuisine'],
    [/\b(جميل|beau|beautiful|جذاب|أنيق)\b/gi, 'beau'],
    [/\b(كبير|grand|large|كبير الحجم)\b/gi, 'grand'],
    [/\b(صغير|petit|small|صغير الحجم)\b/gi, 'petit'],
    [/\b(أحمر|rouge|red|أحمر)\b/gi, 'rouge'],
    [/\b(أزرق|bleu|blue|أزرق)\b/gi, 'bleu'],
    [/\b(أخضر|vert|green|أخضر)\b/gi, 'vert'],
    [/\b(أسود|noir|black|أسود)\b/gi, 'noir'],
    [/\b(أبيض|blanc|white|أبيض)\b/gi, 'blanc'],
    [/\b(ذهبي|doré|gold|ذهبي)\b/gi, 'doré'],
    [/\b(فضي|argenté|silver|فضي)\b/gi, 'argenté'],
  ];

  let result = arabicDigitsToLatin(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u064B-\u065F]/g, '');

  replacements.forEach(([pattern, replacement]) => {
    result = result.replace(pattern, replacement);
  });

  return result.replace(/\s+/g, ' ').trim();
};

module.exports = {
  arabicDigitsToLatin,
  parseBudget,
  normalizeAssistantQuery
};
