-- Seed products for each seller in the local MySQL database
-- Run this file with MySQL after the database and stores exist.

USE souk_tn;

-- Seller 1: Électronique - Add phone products for testing
INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 1, 'Smartphone Samsung Galaxy A14', 'smartphone-samsung-galaxy-a14', 'Smartphone Android avec écran 6.6", 4GB RAM, 128GB stockage, caméra 50MP.', 399.00, 25, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller1@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://via.placeholder.com/300x300?text=Samsung+Galaxy+A14', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller1@souk.tn' AND p.slug = 'smartphone-samsung-galaxy-a14';

INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 1, 'Téléphone Xiaomi Redmi 12', 'telephone-xiaomi-redmi-12', 'Téléphone mobile avec écran HD+, processeur rapide, et batterie longue durée.', 299.00, 30, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller1@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://via.placeholder.com/300x300?text=Xiaomi+Redmi+12', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller1@souk.tn' AND p.slug = 'telephone-xiaomi-redmi-12';

INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 1, 'iPhone 12 Pro Max reconditionné', 'iphone-12-pro-max-reconditionne', 'iPhone 12 Pro Max en excellent état, débloqué, avec garantie 6 mois.', 1899.00, 5, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller1@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://via.placeholder.com/300x300?text=iPhone+12+Pro+Max', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller1@souk.tn' AND p.slug = 'iphone-12-pro-max-reconditionne';

-- Seller 1: Électronique
INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 2, 'Robe d’été tunisienne', 'robe-ete-tunisienne', 'Robe légère en coton, imprimé traditionnel, idéale pour les journées chaudes.', 219.00, 35, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller2@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://via.placeholder.com/300x300?text=Robe+d%27%C3%A9t%C3%A9', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller2@souk.tn' AND p.slug = 'robe-ete-tunisienne';

-- Seller 3: Maison & Déco
INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 3, 'Tapis artisanal fait main', 'tapis-artisanal-fait-main', 'Tapis de salon fait main, motif berbère, idéal pour décorer votre intérieur.', 349.00, 20, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller3@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://via.placeholder.com/300x300?text=Tapis+Artisanal', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller3@souk.tn' AND p.slug = 'tapis-artisanal-fait-main';

-- Seller 4: Alimentation
INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 4, 'Coffret d’épices tunisiennes', 'coffret-epices-tunisiennes', 'Un ensemble d’épices locales pour cuisine tunisienne : cumin, ras el hanout et coriandre.', 79.00, 80, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller4@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://via.placeholder.com/300x300?text=Coffret+d%27%C3%A9pices', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller4@souk.tn' AND p.slug = 'coffret-epices-tunisiennes';

-- Seller 5: Artisanat & Art
INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 5, 'Lampe en céramique peinte', 'lampe-ceramique-peinte', 'Lampe artisanale en céramique avec motifs peints à la main pour une ambiance chaleureuse.', 199.00, 25, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller5@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://via.placeholder.com/300x300?text=Lampe+en+C%C3%A9ramique', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller5@souk.tn' AND p.slug = 'lampe-ceramique-peinte';

-- Seller 6: Sport & Loisirs
INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 6, 'Tapis de yoga antidérapant', 'tapis-yoga-antiderapant', 'Tapis de yoga premium avec surface antidérapante et épaisseur confortable.', 159.00, 40, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller6@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://via.placeholder.com/300x300?text=Tapis+de+Yoga', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller6@souk.tn' AND p.slug = 'tapis-yoga-antiderapant';

-- Seller 7: Livres & Papeterie
INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 7, 'Carnet de notes artisanal', 'carnet-notes-artisanal', 'Carnet de notes fait main avec papier recyclé, parfait pour idées et croquis.', 59.00, 70, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller7@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://via.placeholder.com/300x300?text=Carnet+Artisanal', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller7@souk.tn' AND p.slug = 'carnet-notes-artisanal';

-- Seller 8: Santé & Beauté
INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 8, 'Savon naturel à l’huile d’olive', 'savon-naturel-huile-olive', 'Savon doux fait main, enrichi en huile d’olive locale et parfum frais.', 45.00, 90, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller8@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://via.placeholder.com/300x300?text=Savon+Naturel', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller8@souk.tn' AND p.slug = 'savon-naturel-huile-olive';

-- Seller 9: Jardinage
INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 9, 'Ensemble de graines aromatiques', 'ensemble-graines-aromatiques', 'Kit de graines aromatiques tunisiennes pour jardiniers débutants et confirmés.', 49.00, 100, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller9@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://via.placeholder.com/300x300?text=Graines+Aromatiques', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller9@souk.tn' AND p.slug = 'ensemble-graines-aromatiques';

-- Seller 10: Animaux
INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active, created_at)
SELECT s.id, 10, 'Jouet pour chien résistant', 'jouet-chien-resistant', 'Jouet en caoutchouc durable, idéal pour les chiens actifs et joueurs.', 89.00, 55, TRUE, TRUE, NOW()
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller10@souk.tn';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://via.placeholder.com/300x300?text=Jouet+Chien', 1
FROM products p
JOIN stores s ON p.store_id = s.id
JOIN profiles q ON s.owner_id = q.id
WHERE q.email = 'seller10@souk.tn' AND p.slug = 'jouet-chien-resistant';
