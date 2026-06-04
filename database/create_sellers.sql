USE souk_tn;

-- Create sellers (profiles)
INSERT IGNORE INTO profiles (email, full_name, password_hash, phone, role, created_at) VALUES
('seller1@souk.tn', 'Hamza Ben Ali', 'hashed', '21612345678', 'seller', NOW()),
('seller2@souk.tn', 'Lina Gharbi', 'hashed', '21622345678', 'seller', NOW()),
('seller3@souk.tn', 'Mohamed Ayouni', 'hashed', '21632345678', 'seller', NOW()),
('seller4@souk.tn', 'Amira Khaled', 'hashed', '21642345678', 'seller', NOW()),
('seller6@souk.tn', 'Riad Sport', 'hashed', '21652345678', 'seller', NOW()),
('seller8@souk.tn', 'Nadia Beauty', 'hashed', '21662345678', 'seller', NOW());

-- Create stores for sellers
INSERT IGNORE INTO stores (owner_id, name, slug, description, is_approved, created_at)
SELECT id, 'Tech Store Sousse', 'tech-store-sousse', 'Électronique et technologie à Sousse', TRUE, NOW() FROM profiles WHERE email='seller1@souk.tn'
UNION ALL
SELECT id, 'Boutique Lina Fashion', 'boutique-lina-fashion', 'Mode et vêtements tendance', TRUE, NOW() FROM profiles WHERE email='seller2@souk.tn'
UNION ALL
SELECT id, 'Maison Artisanale TN', 'maison-artisanale-tn', 'Décoration et artisanat tunisien', TRUE, NOW() FROM profiles WHERE email='seller3@souk.tn'
UNION ALL
SELECT id, 'Beauty Shop Tunis', 'beauty-shop-tunis', 'Beauté et soins naturels', TRUE, NOW() FROM profiles WHERE email='seller4@souk.tn'
UNION ALL
SELECT id, 'Sport & Wellness', 'sport-wellness', 'Équipement sport et loisirs', TRUE, NOW() FROM profiles WHERE email='seller6@souk.tn'
UNION ALL
SELECT id, 'Natural Beauty', 'natural-beauty', 'Produits beauté naturels', TRUE, NOW() FROM profiles WHERE email='seller8@souk.tn';
