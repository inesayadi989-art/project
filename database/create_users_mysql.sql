-- Souk.tn MySQL user creation script
-- استخدم هذا السكريبت في phpMyAdmin أو أي قاعدة بيانات MySQL/MariaDB

INSERT IGNORE INTO profiles (email, full_name, role, is_banned, created_at, updated_at)
VALUES
  ('admin@souk.tn', 'Admin Souk', 'admin', false, NOW(), NOW()),
  ('seller1@souk.tn', 'Vendeur 1', 'seller', false, NOW(), NOW()),
  ('seller2@souk.tn', 'Vendeur 2', 'seller', false, NOW(), NOW()),
  ('seller3@souk.tn', 'Vendeur 3', 'seller', false, NOW(), NOW()),
  ('seller4@souk.tn', 'Vendeur 4', 'seller', false, NOW(), NOW()),
  ('seller5@souk.tn', 'Vendeur 5', 'seller', false, NOW(), NOW()),
  ('seller6@souk.tn', 'Vendeur 6', 'seller', false, NOW(), NOW()),
  ('seller7@souk.tn', 'Vendeur 7', 'seller', false, NOW(), NOW()),
  ('seller8@souk.tn', 'Vendeur 8', 'seller', false, NOW(), NOW()),
  ('seller9@souk.tn', 'Vendeur 9', 'seller', false, NOW(), NOW()),
  ('seller10@souk.tn', 'Vendeur 10', 'seller', false, NOW(), NOW());

-- ملاحظة: هذه الأوامر تضيف فقط البيانات في جدول profiles.
-- إذا لم يكن جدول profiles موجوداً أو أعمدته مختلفة، يجب تعديل أسماء الجدول/الأعمدة accordingly.
