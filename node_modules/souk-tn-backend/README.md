# Souk.tn Backend API

Backend Node.js/Express API لمشروع Souk.tn - منصة التجارة الإلكترونية التونسية.

## المتطلبات

- Node.js (v16 أو أحدث)
- MySQL/MariaDB
- npm أو yarn

## التثبيت

1. انتقل إلى مجلد الـ backend:
   ```bash
   cd backend
   ```

2. ثبت التبعيات:
   ```bash
   npm install
   ```

3. أنشئ قاعدة البيانات:
   - افتح phpMyAdmin أو MySQL Workbench
   - نفذ الملف الموجود في `../database/database_schema.sql`

4. أعد تسمية ملف `.env` وضبط الإعدادات:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=souk_tn
   JWT_SECRET=your-super-secret-jwt-key
   PORT=5000
   ```

## التشغيل

### للتطوير:
```bash
npm run dev
```

### للإنتاج:
```bash
npm start
```

الخادم سيعمل على `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - تسجيل مستخدم جديد
- `POST /api/auth/login` - تسجيل الدخول
- `GET /api/auth/profile` - الحصول على ملف المستخدم
- `PUT /api/auth/profile` - تحديث ملف المستخدم
- `PUT /api/auth/password` - تغيير كلمة المرور

### Products
- `GET /api/products` - الحصول على المنتجات (مع فلاتر)
- `GET /api/products/:id` - الحصول على منتج واحد
- `GET /api/products/stores/list` - قائمة المتاجر
- `GET /api/products/categories/list` - قائمة الفئات
- `POST /api/products` - إنشاء منتج (بائع فقط)
- `PUT /api/products/:id` - تحديث منتج (بائع فقط)
- `DELETE /api/products/:id` - حذف منتج (بائع فقط)

### Orders
- `GET /api/orders` - طلبات المستخدم
- `GET /api/orders/:id` - طلب واحد
- `POST /api/orders` - إنشاء طلب
- `PUT /api/orders/:id/status` - تحديث حالة الطلب
- `GET /api/orders/seller/orders` - طلبات البائع

### Admin
- `GET /api/admin/stats` - إحصائيات لوحة التحكم
- `GET /api/admin/users` - إدارة المستخدمين
- `PUT /api/admin/users/:id/ban` - حظر/إلغاء حظر مستخدم
- `GET /api/admin/stores` - إدارة المتاجر
- `PUT /api/admin/stores/:id/approve` - الموافقة على متجر
- `GET /api/admin/products` - إدارة المنتجات
- `PUT /api/admin/products/:id/approve` - الموافقة على منتج
- `GET /api/admin/orders` - إدارة الطلبات

## هيكل قاعدة البيانات

- `profiles` - المستخدمون
- `stores` - المتاجر
- `categories` - الفئات
- `products` - المنتجات
- `product_images` - صور المنتجات
- `carts` - عربات التسوق
- `cart_items` - عناصر عربة التسوق
- `orders` - الطلبات
- `order_items` - عناصر الطلبات
- `wishlists` - قوائم الرغبات
- `reviews` - التقييمات

## الأدوار

- `customer` - عميل عادي
- `seller` - بائع/مالك متجر
- `admin` - مدير النظام

## المصادقة

يستخدم JWT للمصادقة. أرسل التوكن في header:
```
Authorization: Bearer <token>
```

## ملاحظات مهمة

1. جميع كلمات المرور مشفرة بـ bcrypt
2. التحقق من صحة البيانات بـ express-validator
3. دعم CORS للتواصل مع الفرونت اند
4. معالجة الأخطاء المركزية
5. دعم رفع الملفات (في المستقبل)

## التطوير

لإضافة endpoint جديد:
1. أضف المسار في الملف المناسب في `routes/`
2. استخدم middleware `authenticateToken` للمصادقة
3. استخدم `req.db` للوصول إلى قاعدة البيانات
4. أعد تشغيل الخادم

## نشر الإنتاج

1. غيّر `JWT_SECRET` إلى مفتاح قوي
2. استخدم متغيرات البيئة الآمنة
3. فعّل HTTPS
4. استخدم connection pooling لقاعدة البيانات
5. أضف logging و monitoring