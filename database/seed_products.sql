-- Seed products for each seller in the local MySQL database
-- Run this file with MySQL after the database and stores exist.
-- Small business realistic products for Tunisian marketplace

USE souk_tn;

-- Seller 1: Électronique - Tech Store Sousse
INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 1, 'Écouteurs Bluetooth Premium', 'ecouteurs-bluetooth-premium', 'Écouteurs sans fil avec réduction de bruit, batterie 24h, son cristallin.', 89.99, 25, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller1@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://source.unsplash.com/featured/?wireless-earbuds,audio', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller1@souk.tn' AND p.slug = 'ecouteurs-bluetooth-premium';

INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 1, 'Clavier Gaming RGB', 'clavier-gaming-rgb', 'Clavier mécanique avec rétroéclairage RGB, 50 millions de frappes, réactif et précis.', 129.99, 30, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller1@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://source.unsplash.com/featured/?gaming-keyboard', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller1@souk.tn' AND p.slug = 'clavier-gaming-rgb';

INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 1, 'Support Téléphone Ajustable', 'support-telephone-ajustable', 'Support universel pour smartphone et tablette, rotatif 360°, anti-glisse.', 24.99, 50, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller1@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://source.unsplash.com/featured/?phone-stand', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller1@souk.tn' AND p.slug = 'support-telephone-ajustable';


-- Seller 2: Mode & Vêtements - Boutique Lina Fashion
INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 2, 'Pull Femme Hiver Cosy', 'pull-femme-hiver-cosy', 'Pull chaud et confortable en tricot fin, parfait pour l\'automne et l\'hiver, disponible en plusieurs couleurs.', 59.99, 35, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller2@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://source.unsplash.com/featured/?woman-sweater', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller2@souk.tn' AND p.slug = 'pull-femme-hiver-cosy';

INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 2, 'Sac à Main Cuir Authentique', 'sac-main-cuir-authentique', 'Sac à main en cuir véritable, fait main, avec fermeture magnétique sécurisée, style classique intemporel.', 119.99, 15, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller2@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://source.unsplash.com/featured/?leather-handbag', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller2@souk.tn' AND p.slug = 'sac-main-cuir-authentique';

INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 2, 'Sneakers Homme Confort', 'sneakers-homme-confort', 'Chaussures de sport élégantes avec semelle confortable et aérée, idéales pour la ville et le sport.', 89.99, 28, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller2@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://source.unsplash.com/featured/?mens-sneakers', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller2@souk.tn' AND p.slug = 'sneakers-homme-confort';


-- Seller 3: Maison & Déco - Maison Artisanale TN
INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 3, 'Lampe Décorative Artisanale', 'lampe-decorative-artisanale', 'Lampe de table en céramique peinte à la main avec motifs traditionnels tunisiens, ambiance chaleureuse garantie.', 79.99, 20, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller3@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://source.unsplash.com/featured/?ceramic-lamp,decor', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller3@souk.tn' AND p.slug = 'lampe-decorative-artisanale';

INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 3, 'Miroir Mural Marocain', 'miroir-mural-marocain', 'Miroir octogonal aux motifs marocains, cadre en bois travaillé, parfait pour embellir votre intérieur.', 94.99, 18, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller3@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://source.unsplash.com/featured/?wall-mirror,home', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller3@souk.tn' AND p.slug = 'miroir-mural-marocain';

INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 3, 'Tapis Artisanal Fait Main', 'tapis-artisanal-fait-main', 'Tapis berbère traditionnel tressé à la main, motifs géométriques, très durable et authentique.', 189.99, 12, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller3@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://source.unsplash.com/featured/?handmade-rug,carpet', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller3@souk.tn' AND p.slug = 'tapis-artisanal-fait-main';


-- Seller 4: Santé & Beauté - Beauty Shop Tunis
INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 4, 'Crème Visage Naturelle Bio', 'creme-visage-naturelle-bio', 'Crème hydratante 100% naturelle et bio, sans parabènes, idéale pour tous les types de peau.', 54.99, 40, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller4@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://source.unsplash.com/featured/?skincare,cream', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller4@souk.tn' AND p.slug = 'creme-visage-naturelle-bio';

INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 4, 'Parfum Femme Oriental', 'parfum-femme-oriental', 'Parfum aux notes orientales luxueuses, tenue 8h, spray 100ml, délicieux et enivrant.', 74.99, 25, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller4@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://source.unsplash.com/featured/?perfume,fragrance', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller4@souk.tn' AND p.slug = 'parfum-femme-oriental';

INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 4, 'Bougie Parfumée Artisanale', 'bougie-parfumee-artisanale', 'Bougie écologique en cire naturelle, parfumée aux huiles essentielles, 200g, 40h de combustion.', 49.99, 60, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller4@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://source.unsplash.com/featured/?scented-candle', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller4@souk.tn' AND p.slug = 'bougie-parfumee-artisanale';


-- Seller 5: Artisanat & Art - Délices El Medina
INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 5, 'Huile d\'Olive Bio Pressée à Froid', 'huile-olive-bio-pressée-froid', 'Huile d\'olive extra vierge 100% bio, pressée à froid de manière traditionnelle, saveur authentique, 500ml.', 39.99, 45, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller5@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://source.unsplash.com/featured/?olive-oil', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller5@souk.tn' AND p.slug = 'huile-olive-bio-pressée-froid';

INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 5, 'Harissa Artisanale Tunisienne', 'harissa-artisanale-tunisienne', 'Harissa faite maison selon la recette traditionnelle, saveur authentique et épicée, 250g.', 14.99, 80, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller5@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://source.unsplash.com/featured/?spices,paste', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller5@souk.tn' AND p.slug = 'harissa-artisanale-tunisienne';

INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 5, 'Miel Naturel Pur Montagne', 'miel-naturel-pur-montagne', 'Miel 100% naturel récolté en montagne, sans additifs, cristallisé naturellement, 400g.', 24.99, 35, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller5@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://source.unsplash.com/featured/?honey', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller5@souk.tn' AND p.slug = 'miel-naturel-pur-montagne';

-- Seller 6: Sport & Loisirs
INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 5, 'Tapis de yoga antidérapant', 'tapis-yoga-antiderapant', 'Tapis de yoga premium avec surface antidérapante et épaisseur confortable.', 159.00, 40, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller6@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://via.placeholder.com/300x300?text=Tapis+de+Yoga', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller6@souk.tn' AND p.slug = 'tapis-yoga-antiderapant';

-- Seller 8: Santé & Beauté
INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 4, 'Savon naturel à l’huile d’olive', 'savon-naturel-huile-olive', 'Savon doux fait main, enrichi en huile d’olive locale et parfum frais.', 45.00, 90, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller8@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://via.placeholder.com/300x300?text=Savon+Naturel', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller8@souk.tn' AND p.slug = 'savon-naturel-huile-olive';


