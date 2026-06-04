const express = require("express");
const router = express.Router();

// Créer la table stats si elle n'existe pas
async function initStatsTable(db) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS assistant_stats (
      id INT AUTO_INCREMENT PRIMARY KEY,
      question TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// ─── POST /api/assistant/chat ─────────────────────────────────────────────────
router.post("/chat", async (req, res) => {
  const { messages } = req.body;
  const db = req.db;

  try {
    // Init table stats
    try { await initStatsTable(db); } catch (_) {}

    // Dernière question du client
    const lastUserMsg = messages.filter(m => m.role === "user").pop();
    const userQuestion = lastUserMsg?.parts?.[0]?.text || "";

    // Sauvegarder la question dans les stats
    if (userQuestion) {
      try {
        await db.execute("INSERT INTO assistant_stats (question) VALUES (?)", [userQuestion]);
      } catch (_) {}
    }

    // Charger le catalogue depuis la BDD
    let catalogueText = "Catalogue non disponible.";
    let allProducts = [];
    try {
      const [products] = await db.execute(`
        SELECT p.id, p.name, p.price, p.slug, p.stock,
               c.name as category_name,
               (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) as image
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.is_approved = true AND p.is_active = true AND p.stock > 0
        ORDER BY p.created_at DESC
        LIMIT 80
      `);
      allProducts = products;
      if (products.length > 0) {
        catalogueText = products.map(p =>
          `- ${p.name} | Prix: ${p.price} DT | Catégorie: ${p.category_name || "Général"} | Stock: ${p.stock}`
        ).join("\n");
        console.log(`✅ Catalogue chargé: ${products.length} produits`);
      }
    } catch (dbErr) {
      console.warn("⚠️ Erreur catalogue:", dbErr.message);
    }

    // Rechercher des produits pertinents pour afficher des cartes
    let suggestedProducts = [];
    if (userQuestion && allProducts.length > 0) {
      const words = userQuestion.toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 2);

      suggestedProducts = allProducts
        .filter(p => {
          const text = `${p.name} ${p.category_name || ""}`.toLowerCase();
          return words.some(w => text.includes(w));
        })
        .slice(0, 3);
    }

    // Appel Gemini 2.5
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: `Tu es Sarra, une conseillère shopping intelligente et chaleureuse sur Souk.tn, une plateforme e-commerce tunisienne.

RÈGLES IMPORTANTES :
- Détecte automatiquement la langue du client (français ou darija tunisien) et réponds TOUJOURS dans la même langue
- Si le client écrit en arabe ou darija tunisien, réponds en arabe tunisien naturel
- Si le client écrit en français, réponds en français
- Tu connais UNIQUEMENT les produits listés dans le catalogue ci-dessous
- Ne recommande jamais un produit qui n'est pas dans le catalogue
- Sois concise, chaleureuse et utile
- Aide le client à choisir selon son budget et ses besoins
- Mentionne toujours le prix exact du produit en DT
- Si le client demande quelque chose qui n'est pas disponible, dis-le honnêtement

CATALOGUE ACTUEL (produits en stock) :
${catalogueText}

INFORMATIONS BOUTIQUE :
- Livraison disponible partout en Tunisie
- Paiement: carte bancaire
- Pour toute question sur une commande existante, rediriger vers le service client`
            }]
          },
          contents: messages
        })
      }
    );

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Désolé, réessaie.";

    res.json({ reply, products: suggestedProducts });

  } catch (err) {
    console.error("❌ Erreur:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── GET /api/assistant/stats ─────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  const db = req.db;
  try {
    await initStatsTable(db);

    const [topQuestions] = await db.execute(`
      SELECT question, COUNT(*) as count
      FROM assistant_stats
      GROUP BY question
      ORDER BY count DESC
      LIMIT 20
    `);

    const [totalRows] = await db.execute(
      "SELECT COUNT(*) as total FROM assistant_stats"
    );

    const [todayRows] = await db.execute(
      "SELECT COUNT(*) as today FROM assistant_stats WHERE DATE(created_at) = CURDATE()"
    );

    res.json({
      total: totalRows[0].total,
      today: todayRows[0].today,
      topQuestions
    });

  } catch (err) {
    console.error("❌ Stats error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;