-- Souk.tn Database Schema
-- Run this in phpMyAdmin or MySQL Workbench

DROP DATABASE IF EXISTS souk_tn;
CREATE DATABASE souk_tn CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE souk_tn;

SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
SET time_zone = '+00:00';

-- Users table
CREATE TABLE IF NOT EXISTS profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('customer', 'seller', 'admin') DEFAULT 'customer',
  avatar_url VARCHAR(500),
  phone VARCHAR(20),
  address_line1 VARCHAR(255),
  city VARCHAR(100),
  governorate VARCHAR(100),
  postal_code VARCHAR(10),
  is_banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon_url VARCHAR(500),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Stores table
CREATE TABLE IF NOT EXISTS stores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  logo_url VARCHAR(500),
  banner_url VARCHAR(500),
  phone VARCHAR(20),
  email VARCHAR(255),
  governorate VARCHAR(100),
  address VARCHAR(500),
  is_approved BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  commission_rate DECIMAL(5,2) DEFAULT 10.00,
  total_sales DECIMAL(10,2) DEFAULT 0.00,
  total_revenue DECIMAL(10,2) DEFAULT 0.00,
  wallet_balance DECIMAL(10,2) DEFAULT 0.00,
  threshold_notified BOOLEAN DEFAULT FALSE,
  rating_avg DECIMAL(3,2) DEFAULT 0.00,
  review_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  store_id INT NOT NULL,
  category_id INT,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INT DEFAULT 0,
  is_approved BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  rating_avg DECIMAL(3,2) DEFAULT 0.00,
  review_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Product images table
CREATE TABLE IF NOT EXISTS product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Carts table
CREATE TABLE IF NOT EXISTS carts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE KEY unique_customer_cart (customer_id)
) ENGINE=InnoDB;

-- Cart items table
CREATE TABLE IF NOT EXISTS cart_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cart_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_cart_product (cart_id, product_id)
) ENGINE=InnoDB;

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  store_id INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'pending_vendor', 'pending_vendor_confirmation', 'confirmed', 'paid_confirmed', 'completed', 'rejected_by_vendor', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
  payment_status ENUM('unpaid', 'pending', 'paid', 'failed') DEFAULT 'unpaid',
  payment_method VARCHAR(50),
  payment_id INT,
  admin_commission DECIMAL(10,2) DEFAULT 0.00,
  vendor_amount DECIMAL(10,2) DEFAULT 0.00,
  paid_at TIMESTAMP NULL,
  shipping_address JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  customer_id INT NOT NULL,
  amount DECIMAL(10,3) NOT NULL,
  currency VARCHAR(3) DEFAULT 'TND',
  status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
  payment_method VARCHAR(50),
  konnect_payment_id VARCHAR(255) UNIQUE,
  konnect_session_id VARCHAR(255) UNIQUE,
  merchant_reference VARCHAR(255),
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  payment_url TEXT,
  error_message TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES profiles(id) ON DELETE CASCADE,
  INDEX idx_order_id (order_id),
  INDEX idx_customer_id (customer_id),
  INDEX idx_status (status),
  INDEX idx_konnect_payment_id (konnect_payment_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- Payment attempts table
CREATE TABLE IF NOT EXISTS payment_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_id INT NOT NULL,
  attempt_number INT DEFAULT 1,
  status VARCHAR(50),
  error_message TEXT,
  response_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  INDEX idx_payment_id (payment_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

ALTER TABLE orders
  ADD CONSTRAINT fk_orders_payment_id FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_product (user_id, product_id)
) ENGINE=InnoDB;

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  order_id INT,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_product_review (user_id, product_id)
) ENGINE=InnoDB;

-- Subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'TND',
  interval_type ENUM('month', 'year') DEFAULT 'month',
  interval_count INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT NOT NULL,
  status ENUM('active', 'canceled', 'past_due', 'incomplete', 'pending') DEFAULT 'active',
  konnect_session_id VARCHAR(255) DEFAULT NULL,
  merchant_reference VARCHAR(255) DEFAULT NULL,
  current_period_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  current_period_end TIMESTAMP NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_subscription (user_id)
) ENGINE=InnoDB;

CREATE INDEX idx_konnect_session_id ON subscriptions(konnect_session_id);
CREATE INDEX idx_merchant_reference ON subscriptions(merchant_reference);

-- Seller subscriptions table
CREATE TABLE IF NOT EXISTS seller_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  seller_id INT NOT NULL,
  plan_name VARCHAR(100) DEFAULT 'Souk Business',
  plan_price DECIMAL(10,2) DEFAULT 30.00,
  amount DECIMAL(10,2) DEFAULT 30.00,
  comment TEXT NULL,
  status ENUM('pending_admin', 'active', 'rejected', 'expired') DEFAULT 'pending_admin',
  payment_status ENUM('unpaid', 'paid') DEFAULT 'unpaid',
  start_date TIMESTAMP NULL,
  end_date TIMESTAMP NULL,
  rejected_reason TEXT,
  approved_by INT,
  approved_at TIMESTAMP NULL,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  paid_at TIMESTAMP NULL,
  subscription_revenue_added BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Seed categories
INSERT IGNORE INTO categories (name, slug, description, display_order) VALUES
('Électronique', 'electronique', 'Produits électroniques et gadgets', 1),
('Mode & Vêtements', 'mode-vetements', 'Vêtements et accessoires de mode', 2),
('Maison & Déco', 'maison-deco', 'Articles pour la maison et décoration', 3),
('Santé & Beauté', 'sante-beaute', 'Produits bien-être, beauté et santé', 4),
('Sport & Loisirs', 'sport-loisirs', 'Équipements de sport et activités de loisir', 5),
('Artisanat & Art', 'artisanat-art', 'Produits artisanaux et œuvres d''art', 6);

-- Seed subscription plans
INSERT IGNORE INTO subscription_plans (name, slug, description, amount, interval_type, interval_count) VALUES
('Abonnement Unique', 'single-plan', 'Abonnement unique pour vendeurs - 30 TND/mois', 30.00, 'month', 1);

-- Sample users (mot de passe : admin123 / seller123 / customer123)
INSERT IGNORE INTO profiles (email, full_name, role, password_hash) VALUES
('admin@souk.tn', 'Admin Souk', 'admin', '$2a$12$HShNJOk4p3qgTxG1cJ05SewCuCz6iiC1Kld8nBaLRbF/WXoC9pz1u'),
('seller1@souk.tn', 'Vendeur 1', 'seller', '$2a$12$rPfQVfGxu0v3UYdi17KAouYywuY2zgrdIe7TQczTkGk/qyBI9K89O'),
('seller2@souk.tn', 'Vendeur 2', 'seller', '$2a$12$rPfQVfGxu0v3UYdi17KAouYywuY2zgrdIe7TQczTkGk/qyBI9K89O'),
('seller3@souk.tn', 'Vendeur 3', 'seller', '$2a$12$rPfQVfGxu0v3UYdi17KAouYywuY2zgrdIe7TQczTkGk/qyBI9K89O'),
('customer1@souk.tn', 'Client 1', 'customer', '$2a$12$lIFj0ZmshsNu4yyt3Vt42OMipKh.yEY2xQgM4AoOauQImVhLvLbmu'),
('customer2@souk.tn', 'Client 2', 'customer', '$2a$12$lIFj0ZmshsNu4yyt3Vt42OMipKh.yEY2xQgM4AoOauQImVhLvLbmu');

-- Sample stores for sellers
INSERT IGNORE INTO stores (owner_id, name, slug, description, phone, email, governorate, address, is_approved, is_active, commission_rate)
SELECT p.id,
       CONCAT('Boutique de ', p.full_name),
       CONCAT('boutique-', LOWER(REPLACE(p.full_name, ' ', '-')), '-', p.id),
       CONCAT('Boutique officielle de ', p.full_name, ' sur Souk.tn'),
       '000000000',
       p.email,
       'Tunis',
       'Rue des Souks, Tunis',
       TRUE,
       TRUE,
       10.00
FROM profiles p
WHERE p.role = 'seller';

-- Sample products
INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active)
SELECT s.id, 1, 'Écouteurs Bluetooth Premium', 'ecouteurs-bluetooth-premium', 'Écouteurs sans fil avec réduction de bruit et autonomie 24h.', 89.99, 25, TRUE, TRUE
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller1@souk.tn';

INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active)
SELECT s.id, 1, 'Clavier Gaming RGB', 'clavier-gaming-rgb', 'Clavier mécanique avec rétroéclairage RGB, silencieux et réactif.', 129.99, 30, TRUE, TRUE
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller1@souk.tn';

INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active)
SELECT s.id, 2, 'Pull Femme Hiver Cosy', 'pull-femme-hiver-cosy', 'Pull chaud en tricot doux, parfait pour l''hiver.', 59.99, 35, TRUE, TRUE
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller2@souk.tn';

INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active)
SELECT s.id, 2, 'Sac à Main Cuir Authentique', 'sac-main-cuir-authentique', 'Sac à main en cuir véritable avec fermeture magnétique.', 119.99, 15, TRUE, TRUE
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller2@souk.tn';

INSERT IGNORE INTO products (store_id, category_id, name, slug, description, price, stock, is_approved, is_active)
SELECT s.id, 3, 'Lampe Décorative Artisanale', 'lampe-decorative-artisanale', 'Lampe de table peinte à la main pour une ambiance chaleureuse.', 79.99, 20, TRUE, TRUE
FROM stores s
JOIN profiles p ON s.owner_id = p.id
WHERE p.email = 'seller3@souk.tn';

-- Sample product images
INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://source.unsplash.com/featured/?wireless-earbuds,audio', 1
FROM products p
WHERE p.slug = 'ecouteurs-bluetooth-premium';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://source.unsplash.com/featured/?gaming-keyboard', 1
FROM products p
WHERE p.slug = 'clavier-gaming-rgb';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://source.unsplash.com/featured/?wool-sweater', 1
FROM products p
WHERE p.slug = 'pull-femme-hiver-cosy';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://source.unsplash.com/featured/?leather-handbag', 1
FROM products p
WHERE p.slug = 'sac-main-cuir-authentique';

INSERT IGNORE INTO product_images (product_id, image_url, sort_order)
SELECT p.id, 'https://source.unsplash.com/featured/?ceramic-lamp,decor', 1
FROM products p
WHERE p.slug = 'lampe-decorative-artisanale';

-- Sample seller subscription
INSERT IGNORE INTO seller_subscriptions (seller_id, plan_name, plan_price, amount, status, payment_status, start_date, end_date, approved_by, approved_at, paid_at, created_at, updated_at)
SELECT p.id, 'Souk Business', 30.00, 30.00, 'active', 'paid', NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), 1, NOW(), NOW(), NOW(), NOW()
FROM profiles p
WHERE p.email = 'seller1@souk.tn';

-- Sample customer order and payment
INSERT IGNORE INTO orders (customer_id, store_id, total, status, payment_status, payment_method, shipping_address, created_at, updated_at)
SELECT c.id, s.id, 219.98, 'confirmed', 'pending', 'card', JSON_OBJECT('street','Rue de la Paix','city','Tunis','governorate','Tunis','postal_code','1000'), NOW(), NOW()
FROM profiles c
JOIN profiles seller ON seller.email = 'seller1@souk.tn'
JOIN stores s ON s.owner_id = seller.id
WHERE c.email = 'customer1@souk.tn';

INSERT IGNORE INTO order_items (order_id, product_id, quantity, price, created_at)
SELECT o.id, p.id, 1, p.price, NOW()
FROM orders o
JOIN products p ON p.slug = 'ecouteurs-bluetooth-premium'
JOIN profiles c ON c.id = o.customer_id
WHERE c.email = 'customer1@souk.tn' AND o.status = 'confirmed'
LIMIT 1;

INSERT IGNORE INTO payments (order_id, customer_id, amount, currency, status, payment_method, merchant_reference, customer_name, customer_email, customer_phone, created_at, updated_at)
SELECT o.id, o.customer_id, o.total, 'TND', 'completed', 'card', CONCAT('ORD-', o.id), c.full_name, c.email, c.phone, NOW(), NOW()
FROM orders o
JOIN profiles c ON c.id = o.customer_id
WHERE c.email = 'customer1@souk.tn' AND o.payment_status = 'pending'
LIMIT 1;

UPDATE orders o
JOIN payments p ON p.order_id = o.id
SET o.payment_id = p.id,
    o.payment_status = 'paid',
    o.status = 'completed',
    o.paid_at = NOW(),
    o.updated_at = NOW()
WHERE o.payment_id IS NULL;

INSERT IGNORE INTO reviews (user_id, product_id, order_id, rating, comment, created_at)
SELECT c.id, p.id, o.id, 5, 'Excellent produit, livraison rapide et service de qualité.', NOW()
FROM profiles c
JOIN orders o ON o.customer_id = c.id
JOIN products p ON p.slug = 'ecouteurs-bluetooth-premium'
WHERE c.email = 'customer1@souk.tn' AND o.status = 'completed'
LIMIT 1;
