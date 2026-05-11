/**
 * Multi-Language Response Generator
 * Generates messages in: Arabic, French, Tunisian, English
 */

const MESSAGES = {
  arabic: {
    welcome: "مرحبا! أنا مساعدك الذكي 🤖",
    searching: "ابحث عن أفضل الخيارات ليك... ⏳",
    found: "هاذي أفضل النتائج ليك 🔥",
    found_count: "وجدت {{count}} منتج يطابق بحثك ✅",
    no_results: "آسف ما لقيتش ما يطابق بحثك 😕",
    budget_info: "في ميزانيتك: {{budget}} دينار 💰",
    recommendations: "التوصيات الأساسية:",
    alternatives: "خيارات أخرى:",
    expensive: "المنتجات الغالية قليلة، إليك أقل سعر",
    cheap: "المنتجات الرخيصة متاعة {{intent}} موجودة هنا",
  },

  french: {
    welcome: "Bonjour! Je suis votre assistant intelligent 🤖",
    searching: "Je recherche les meilleures options pour vous... ⏳",
    found: "Voici les meilleures résultats pour vous 🔥",
    found_count: "J'ai trouvé {{count}} produits correspondant à votre recherche ✅",
    no_results: "Désolé, je n'ai pas trouvé ce que vous cherchez 😕",
    budget_info: "Dans votre budget: {{budget}} DT 💰",
    recommendations: "Mes recommandations:",
    alternatives: "Autres options:",
    expensive: "Les produits chers sont rares, voici le prix le plus bas",
    cheap: "Les produits {{intent}} bon marché sont disponibles ici",
  },

  english: {
    welcome: "Hello! I'm your smart assistant 🤖",
    searching: "Finding the best options for you... ⏳",
    found: "Here are the best results for you 🔥",
    found_count: "Found {{count}} products matching your search ✅",
    no_results: "Sorry, I couldn't find what you're looking for 😕",
    budget_info: "Your budget: {{budget}} DT 💰",
    recommendations: "My recommendations:",
    alternatives: "Other options:",
    expensive: "Expensive products are rare, here's the lowest price",
    cheap: "Cheap {{intent}} products are available here",
  },

  tunisian: {
    welcome: "السلام عليكم! أنا معاك متاع البحث 🤖",
    searching: "نبحث عليك احسن الحاجات... ⏳",
    found: "هاذي أحسن النتايج ليك 🔥",
    found_count: "لقيت {{count}} حاجة تطابق البحث متاعك ✅",
    no_results: "سورّي ما لقيتش حاجة تطابق 😕",
    budget_info: "في البجيت متاعك: {{budget}} دينار 💰",
    recommendations: "أحسن الحاجات ليك:",
    alternatives: "خيارات كويسة أخرى:",
    expensive: "الحاجات الغالية قليلة شوية، هاذي أرخص",
    cheap: "الحاجات الرخيصة {{intent}} موجودة هنا",
  },
};

// Get language from detected language
function getLanguageCode(detectedLanguage) {
  const map = {
    arabic: "arabic",
    tunisian: "tunisian",
    french: "french",
    english: "english",
    mixed: "french", // Default to French for mixed
  };
  return map[detectedLanguage] || "french";
}

// Replace placeholders in message
function formatMessage(message, variables = {}) {
  let formatted = message;
  for (const [key, value] of Object.entries(variables)) {
    formatted = formatted.replace(`{{${key}}}`, value);
  }
  return formatted;
}

// Generate welcome message
function generateWelcome(language) {
  const langCode = getLanguageCode(language);
  return MESSAGES[langCode]?.welcome || MESSAGES.english.welcome;
}

// Generate search message
function generateSearching(language) {
  const langCode = getLanguageCode(language);
  return MESSAGES[langCode]?.searching || MESSAGES.english.searching;
}

// Generate results found message
function generateResultsMessage(language, count) {
  const langCode = getLanguageCode(language);
  const template = MESSAGES[langCode]?.found_count || MESSAGES.english.found_count;
  return formatMessage(template, { count });
}

// Generate no results message
function generateNoResultsMessage(language) {
  const langCode = getLanguageCode(language);
  return MESSAGES[langCode]?.no_results || MESSAGES.english.no_results;
}

// Generate budget info message
function generateBudgetMessage(language, budget) {
  const langCode = getLanguageCode(language);
  const template = MESSAGES[langCode]?.budget_info || MESSAGES.english.budget_info;
  return formatMessage(template, { budget });
}

// Generate main response message
function generateMainResponse(language, count, intent, budget) {
  const langCode = getLanguageCode(language);

  if (count === 0) {
    return generateNoResultsMessage(language);
  }

  let message = MESSAGES[langCode]?.found || MESSAGES.english.found;

  if (budget) {
    message += `\n${generateBudgetMessage(language, budget)}`;
  }

  return message;
}

// Generate full response
function generateResponse(data) {
  const {
    language,
    intent,
    budget,
    total_matches,
    products_count,
    quality,
  } = data;

  const langCode = getLanguageCode(language);
  const messageData = MESSAGES[langCode] || MESSAGES.english;

  let response = {
    message: generateMainResponse(language, products_count || total_matches, intent, budget),
    recommendations_title: messageData.recommendations,
    alternatives_title: messageData.alternatives,
    language: langCode,
  };

  if (quality) {
    if (quality === "cheap") {
      response.quality_hint = formatMessage(messageData.cheap, { intent });
    } else if (quality === "expensive") {
      response.quality_hint = messageData.expensive;
    }
  }

  return response;
}

module.exports = {
  MESSAGES,
  getLanguageCode,
  formatMessage,
  generateWelcome,
  generateSearching,
  generateResultsMessage,
  generateNoResultsMessage,
  generateBudgetMessage,
  generateMainResponse,
  generateResponse,
};
