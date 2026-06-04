# 🔥 BI Integrity Architecture

## الفلسفة الأساسية

**Database هي الحقيقة الوحيدة**. كل شيء آخر (Frontend, Notifications, UI) مجرد عرض.

---

## 📋 البنية الطبقية

```
┌─────────────────────────────────────────┐
│         API ROUTES (routes/)            │
│  - Receive requests only                │
│  - Validate input                       │
│  - Call services                        │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│      BUSINESS LOGIC (services/)         │
│  - FinancialService                     │
│  - VerificationService                  │
│  - PaymentService                       │
└─────────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│      DATABASE (MySQL)                   │
│  - financial_transactions               │
│  - bi_audit_log                         │
│  - bi_verification_log                  │
│  - orders, stores, payments             │
└─────────────────────────────────────────┘
```

---

## 🔐 Layers المسؤولية

### 1️⃣ Routes Layer
- استقبال الطلبات فقط
- تحقق من الـ inputs
- استدعاء الـ services

❌ **لا تحسب الفلوس هنا!**

### 2️⃣ Services Layer
- **FinancialService**: كل العمليات المالية
- **VerificationService**: التحقق من الصحة
- **PaymentService**: معالجة الدفع

✅ **كل الحسابات تتم هنا**

### 3️⃣ Database Layer
- جداول مركزية
- Transactions ACID
- Audit logs

✅ **المصدر الوحيد للحقيقة**

---

## 💰 العمليات المالية الأساسية

### Order Payment Flow

```
1️⃣ Customer يدفع
   ↓
2️⃣ FinancialService.recordTransaction()
   - نسجل في financial_transactions
   - Verify: total = vendor + commission
   - Update vendor wallet
   - Update order status
   ↓
3️⃣ Check Threshold
   - إذا >= 500 TND → notification
   ↓
4️⃣ Verify Integrity
   - التحقق من أن كل الحسابات صحيحة
   ↓
5️⃣ Commit/Rollback
   - ACID transaction: يا الكل ينجح يا الكل يفشل
```

### Vendor Payout Flow

```
1️⃣ Admin يختار vendor
   ↓
2️⃣ FinancialService.processVendorPayout()
   - نسجل في financial_transactions (type: vendor_payout)
   - نسجل في vendor_settlements
   - Reset wallet_balance = 0
   - Reset threshold_notified = FALSE
   ↓
3️⃣ Create notification للـ vendor
   ↓
4️⃣ Log في audit
```

---

## 🔍 Verification & Validation

### Order Payment Verification

```
Verify: order.total = order.admin_commission + order.vendor_amount

مثال:
100 TND
└─ vendor: 90 TND
└─ platform: 10 TND
= 100 TND ✅
```

### Financial Integrity Check

```sql
-- Check: All paid orders have transaction recorded
SELECT COUNT(*) FROM orders o
WHERE o.payment_status = 'paid'
AND NOT EXISTS (
  SELECT 1 FROM financial_transactions ft
  WHERE ft.order_id = o.id
);

-- Check: Wallet balance = sum of transactions
SELECT s.id, s.wallet_balance,
       SUM(ft.vendor_amount) as calculated
FROM stores s
LEFT JOIN financial_transactions ft ON s.id = ft.store_id
GROUP BY s.id
HAVING ABS(s.wallet_balance - calculated) > 0.01;
```

---

## 📊 BI Data Sources

### Source of Truth

```
financial_transactions
├─ order_payment transactions
├─ vendor_payout transactions
├─ subscription transactions
└─ refund transactions

Orders Table
├─ payment_status
├─ admin_commission
├─ vendor_amount
└─ total

Stores Table
├─ wallet_balance
├─ threshold_notified
└─ total_revenue
```

### ❌ NOT Trusted for BI

- ❌ Notifications (just UI)
- ❌ Frontend state (temporary)
- ❌ Email/SMS logs (not financial)
- ❌ Cache (stale data)

---

## 🛡️ ACID Transactions

### Implementation

```javascript
async processOrderPayment(db, order) {
  const connection = await this.db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Step 1: Record transaction
    await recordTransaction(...);
    
    // Step 2: Update wallet
    await connection.execute('UPDATE stores SET wallet_balance = ...');
    
    // Step 3: Update order
    await connection.execute('UPDATE orders SET payment_status = ...');
    
    // Step 4: Verify
    const verification = await verifyOrderPayment(...);
    if (!verification.isValid) throw new Error(...);
    
    await connection.commit();
    
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}
```

**نتيجة:**
- ✅ إما كل العمليات تنجح
- ✅ أو لا شيء يحصل (rollback)
- ❌ لا نصفية حالات

---

## 📝 Audit Log

### ما يتم تسجيله

```json
{
  "transaction_id": 123,
  "action": "transaction_recorded",
  "details": {
    "order_id": 456,
    "store_id": 789,
    "amount": 100.00,
    "vendor_amount": 90.00,
    "platform_amount": 10.00,
    "reference": "ORD-456-1780064209000"
  },
  "created_at": "2026-05-29T14:10:00Z"
}
```

### الفوائد

✅ تتبع كل عملية
✅ تدقيق الحسابات
✅ معرفة من فعل ماذا
✅ حل المشاكل بسهولة

---

## 🔧 API Endpoints

### BI Analytics

```
GET /api/analytics/bi-health
  → Check integrity of all financial data

GET /api/analytics/financial-summary
  → Total revenue, commissions, payouts

GET /api/analytics/transactions
  → All financial transactions (filterable)

GET /api/analytics/audit-log
  → Complete audit trail

POST /api/analytics/verify-order/:orderId
  → Manual verification of specific order
```

---

## 🚀 Deployment Checklist

- [ ] Run migration: `node migrate_bi_integrity.js`
- [ ] Verify tables created in database
- [ ] Test `POST /payments/create-payment` with transaction
- [ ] Test payout flow
- [ ] Run BI health check: `GET /analytics/bi-health`
- [ ] Monitor logs in `bi_audit_log`

---

## 💡 Key Principles

1. **Database is Truth**
   - لا تعتمد على الـ UI للحسابات

2. **Consistent Calculations**
   - نفس الصيغة دائماً: `total = vendor + commission`

3. **Atomic Transactions**
   - يا الكل يا لا شيء

4. **Complete Logging**
   - كل عملية مالية تُسجل

5. **Regular Verification**
   - تحقق يومياً من الـ BI integrity

6. **Transparent Audit Trail**
   - كل من أراد يعرف ما حصل ومتى

---

## 🎯 Result

✅ BI صحيحة ومستقرة
✅ حتى لو كل شيء "demo"
✅ البيانات دقيقة ومصرحة
✅ سهل الـ debugging والـ reconciliation
✅ Production-ready architecture
