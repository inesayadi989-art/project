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
app.use(cors({
  origin: true,
  credentials: true
}));

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
function connectDB() {
  try {
    db = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'souk_tn',
      charset: 'utf8mb4',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    console.log('✅ Connected to MySQL database pool');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
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
function startServer() {
  connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
  });
}

startServer();