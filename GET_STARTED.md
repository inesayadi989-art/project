# 🚀 Souk.tn - Get Started Guide

## ⚠️ IMPORTANT: Start MySQL First!

### Step 1: Start XAMPP Services

**On Windows:**

1. Open **XAMPP Control Panel**
   - Search for `xampp-control.exe` or go to `C:\xampp\xampp-control.exe`
   
2. Click **"Start"** for:
   - ✅ Apache
   - ✅ MySQL

3. Wait until both turn **GREEN** ✅

### Step 2: Setup Database (One-time only)

Open a terminal in the backend folder:

```bash
cd backend
npm run setup
```

OR manually:

```bash
npm run seed-test-users
```

This creates the test users with these credentials:

```
Admin:
  Email: admin@souk.tn
  Password: admin123

Seller:
  Email: seller@souk.tn
  Password: seller123

Customer:
  Email: customer@souk.tn
  Password: customer123
```

## 🎯 Running the Application

### Terminal 1: Start Backend

```bash
cd backend
npm start
```

You should see:
```
✅ Connected to MySQL database
🚀 Server running on http://localhost:5000
```

### Terminal 2: Start Frontend

```bash
npm run dev
```

You should see:
```
  Local: http://localhost:5173
  ```
  
  ### Terminal 3: Open in Browser
  
  Go to: **http://localhost:5173/login**

### "Failed to fetch" Error?
- ❌ MySQL not running → Start it in XAMPP Control Panel
- ❌ Backend not started → Run `npm start` in backend folder
- ❌ Wrong port → Check backend console shows port 5000

### MySQL won't start?
- Close XAMPP and re-open
- Run XAMPP Control Panel as Administrator
- Check no other MySQL process is running:
  ```bash
  tasklist | findstr mysqld
  ```

### Database error?
- Ensure database `souk_tn` exists
- Check MySQL is running
- Try seeding again: `npm run seed-test-users`

## 📊 Project Structure

```
project/
├── backend/          ← Node.js API server
│   ├── routes/       ← API endpoints
│   ├── middleware/   ← Authentication
│   ├── server.js     ← Main server file
│   └── setup.js      ← Database setup
├── database/         ← SQL schema and seed files
└── frontend/         ← React frontend application
```

## 🔗 Important URLs

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api
- Database Admin: http://localhost/phpmyadmin

## ✅ What to Test

After login as admin:

1. **Dashboard** - View analytics
2. **Sellers** - Manage vendors
3. **Products** - Browse marketplace
4. **Orders** - View transactions
5. **Subscriptions** - Check SaaS features

## 💡 Next Steps

- Read the [Architecture documentation](./ARCHITECTURE.md)
- Check [TODO](./TODO.md) for features to implement
- Review [Subscription Flow](./SUBSCRIPTION_FLOW.md)

---

**Need help?** Check the terminal output for error messages! 🔍
