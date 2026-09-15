const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');
const subscriptionRoutes = require('./routes/subscriptions');
const smartAssistantRoutes = require('./routes/smartAssistant');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL : true,
  credentials: true
};
app.use(cors(corsOptions));

app.use(express.urlencoded({ 
  extended: true,
  limit: '10mb'
}));

// UTF-8 response headers
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Uploads folder
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Database connection pool
let db;

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectDB({ retries = 5, delay = 2000 } = {}) {
  const cfg = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'souk_tn',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  db = mysql.createPool(cfg);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await db.getConnection();
      conn.release();
      console.log('✅ Connected to MySQL database pool');
      return;
    } catch (err) {
      console.warn(`⚠️  MySQL connection attempt ${attempt} failed: ${err.message}`);
      if (attempt < retries) {
        console.log(`Retrying in ${delay}ms...`);
        await wait(delay);
        delay *= 2; // exponential backoff
        continue;
      }
      console.error('❌ Could not connect to MySQL after multiple attempts:', err);
      // do not exit process immediately; allow process manager to restart or let app run degraded
      return;
    }
  }
}

// Make db available to routes
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Routes
app.use('/api/auth', express.json({ limit: '10mb' }), authRoutes);
app.use('/api/products', express.json({ limit: '10mb' }), productRoutes);
app.use('/api/orders', express.json({ limit: '10mb' }), orderRoutes);
app.use('/api/admin', express.json({ limit: '10mb' }), adminRoutes);
app.use('/api/payments', express.json({ limit: '10mb' }), paymentRoutes);
app.use('/api/subscriptions', express.json({ limit: '10mb' }), subscriptionRoutes);
app.use('/api/assistant', express.json({ limit: '10mb' }), smartAssistantRoutes);
app.use('/api/analytics', express.json({ limit: '10mb' }), analyticsRoutes);
app.use('/api/notifications', express.json({ limit: '10mb' }), notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Souk.tn Backend is running' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection at:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
  // depending on the error you may want to exit process
});