-- ====================================
-- Souk.tn User Creation Script
-- ====================================
-- هذا السكريبت ينشئ حسابات Admin والـ Sellers
-- استخدمه في Supabase SQL Editor
-- ====================================

-- 1. إنشاء حساب Admin
-- Email: admin@souk.tn
-- Password: admin123
INSERT INTO public.profiles (email, full_name, role, is_banned, created_at, updated_at)
VALUES ('admin@souk.tn', 'Admin Souk', 'admin', false, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- ====================================
-- 2. إنشاء حسابات Sellers/Vendeurs
-- ====================================

-- Seller 1
INSERT INTO public.profiles (email, full_name, role, is_banned, created_at, updated_at)
VALUES ('seller1@souk.tn', 'Vendeur 1', 'seller', false, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Seller 2
INSERT INTO public.profiles (email, full_name, role, is_banned, created_at, updated_at)
VALUES ('seller2@souk.tn', 'Vendeur 2', 'seller', false, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Seller 3
INSERT INTO public.profiles (email, full_name, role, is_banned, created_at, updated_at)
VALUES ('seller3@souk.tn', 'Vendeur 3', 'seller', false, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Seller 4
INSERT INTO public.profiles (email, full_name, role, is_banned, created_at, updated_at)
VALUES ('seller4@souk.tn', 'Vendeur 4', 'seller', false, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Seller 5
INSERT INTO public.profiles (email, full_name, role, is_banned, created_at, updated_at)
VALUES ('seller5@souk.tn', 'Vendeur 5', 'seller', false, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Seller 6
INSERT INTO public.profiles (email, full_name, role, is_banned, created_at, updated_at)
VALUES ('seller6@souk.tn', 'Vendeur 6', 'seller', false, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Seller 7
INSERT INTO public.profiles (email, full_name, role, is_banned, created_at, updated_at)
VALUES ('seller7@souk.tn', 'Vendeur 7', 'seller', false, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Seller 8
INSERT INTO public.profiles (email, full_name, role, is_banned, created_at, updated_at)
VALUES ('seller8@souk.tn', 'Vendeur 8', 'seller', false, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Seller 9
INSERT INTO public.profiles (email, full_name, role, is_banned, created_at, updated_at)
VALUES ('seller9@souk.tn', 'Vendeur 9', 'seller', false, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Seller 10
INSERT INTO public.profiles (email, full_name, role, is_banned, created_at, updated_at)
VALUES ('seller10@souk.tn', 'Vendeur 10', 'seller', false, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- ====================================
-- للتحقق من البيانات المضافة:
-- ====================================
-- SELECT email, full_name, role FROM public.profiles 
-- WHERE role IN ('admin', 'seller') 
-- ORDER BY created_at DESC;
