# خطوات إنشاء حسابات المستخدمين في Souk.tn

## 📋 قائمة الحسابات المراد إنشاؤها

### Admin Account
- **Email:** admin@souk.tn
- **Password:** admin123
- **Role:** Admin

### Seller Accounts (10 Vendeurs)
```
seller1@souk.tn / Seller123
seller2@souk.tn / Seller123
seller3@souk.tn / Seller123
seller4@souk.tn / Seller123
seller5@souk.tn / Seller123
seller6@souk.tn / Seller123
seller7@souk.tn / Seller123
seller8@souk.tn / Seller123
seller9@souk.tn / Seller123
seller10@souk.tn / Seller123
```

---

## 🔧 خطوات التنفيذ

### الخطوة 1: الوصول إلى Supabase Dashboard

1. اذهب إلى https://supabase.com/dashboard
2. سجّل الدخول باستخدام حسابك
3. اختر المشروع **souk-tn** أو **cqvwokjrtenqbbcscetx**

### الخطوة 2: إنشاء المستخدمين عبر Authentication

**للطريقة الأولى (عبر الواجهة):**

1. اذهب إلى **Authentication** → **Users**
2. انقر على **Add user**
3. أضف البيانات:
   - Email: `admin@souk.tn`
   - Password: `admin123`
4. كرّر العملية لجميع accounts الـ Sellers

### الخطوة 3: تحديث ملفات الملف الشخصي (Profiles)

**للطريقة الثانية (عبر SQL Editor):**

1. اذهب إلى **SQL Editor** في Supabase
2. انقر على **New Query**
3. انسخ محتوى الملف `database/create_users.sql`
4. الصق الكود وأضغط **Run** (Ctrl+Enter)

هذا سيضيف جميع المستخدمين مع الأدوار الصحيحة.

### الخطوة 4: التحقق من البيانات

```sql
SELECT email, full_name, role, created_at 
FROM public.profiles 
WHERE role IN ('admin', 'seller') 
ORDER BY created_at DESC;
```

---

## ⚠️ ملاحظات مهمة

1. **روابط الأدوار:** 
   - Admin: لديه صلاحيات إدارية كاملة
   - Seller: يمكنه فتح متجر والبيع
   - Customer: المشتري العادي

2. **إنشاء المتاجر (Stores):**
   بعد إنشاء حسابات الـ Sellers، قد تحتاج إلى إنشاء متاجرهم في جدول `stores`:

   ```sql
   INSERT INTO public.stores (owner_id, name, slug, is_approved, is_active, commission_rate)
   VALUES (
     (SELECT id FROM public.profiles WHERE email = 'seller1@souk.tn' LIMIT 1),
     'Vendeur 1 Store',
     'vendeur-1-store',
     true,
     true,
     15
   );
   ```

   كرّر هذا لكل seller مع تغيير البيانات.

3. **الأدوار (Roles) المتاحة:**
   - `admin` - مسؤول النظام
   - `seller` - بائع/متجر
   - `customer` - عميل/مشتري

---

## 🔐 معلومات التسجيل

بعد إنشاء الحسابات، يمكن للمستخدمين تسجيل الدخول من خلال:

**صفحة تسجيل الدخول:** http://localhost/project/dist/#/login

استخدم:
- البريد الإلكتروني
- كلمة المرور المحددة

---

## 📌 ملفات ذات صلة

- `database/create_users.sql` - السكريبت الرئيسي لإنشاء المستخدمين
- Supabase SQL Editor - للتنفيذ المباشر
