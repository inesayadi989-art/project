const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const router = express.Router();
const emailService = require('../utils/emailService');

const TEST_SELLER_EMAILS = [
  'seller1@souk.tn',
  'seller2@souk.tn',
  'seller3@souk.tn',
  'seller4@souk.tn',
  'seller6@souk.tn',
  'seller8@souk.tn',
];

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('fullName').trim().isLength({ min: 2 }),
  body('role').isIn(['customer', 'seller'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, fullName, role } = req.body;
    const db = req.db;

    // Check if user exists
    const [existing] = await db.execute(
      'SELECT id FROM profiles WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert user
    // Ensure profiles has email_verified column
    const [colsCheck] = await db.execute("SHOW COLUMNS FROM profiles LIKE 'email_verified'");
    if (colsCheck.length === 0) {
      await db.execute('ALTER TABLE profiles ADD COLUMN email_verified BOOLEAN DEFAULT FALSE');
    }

    const [result] = await db.execute(
      'INSERT INTO profiles (email, full_name, role, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [email, fullName, role, hashedPassword]
    );

    const userId = result.insertId;
    const isTestSeller = TEST_SELLER_EMAILS.includes(email.toLowerCase());
    const isAdminAccount = role === 'admin';

    if (isTestSeller || isAdminAccount) {
      await db.execute('UPDATE profiles SET email_verified = TRUE WHERE id = ?', [userId]);
    }

    // Create store for sellers
    if (role === 'seller') {
      const slug = `${fullName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
      await db.execute(
        'INSERT INTO stores (owner_id, name, slug, is_approved, is_active, commission_rate, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [userId, `Boutique de ${fullName}`, slug, true, true, 10]
      );
    }

    if (!isTestSeller) {
      // Create email_codes table if missing and send verification code
      await db.execute(`CREATE TABLE IF NOT EXISTS email_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(10) NOT NULL,
        purpose ENUM('verify','reset') NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await db.execute(
        'INSERT INTO email_codes (email, code, purpose, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))',
        [email, code, 'verify']
      );

      await emailService.sendVerificationEmail(email, code);
    }

    res.status(201).json({
      message: isTestSeller ? 'User created and auto-verified for test seller' : 'User created, verification code sent',
      user: { id: userId, email, fullName, role, email_verified: isTestSeller }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    console.log('Login attempt:', { email: req.body.email, hasPassword: !!req.body.password });
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const db = req.db;

    // Get user (include email_verified)
    const [users] = await db.execute(
      'SELECT id, email, full_name, role, password_hash, is_banned, email_verified FROM profiles WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    if (user.is_banned) {
      return res.status(403).json({ error: 'Account is banned' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // If email not verified and not a known test seller or admin, send a new code and ask to verify
    if (!user.email_verified && !TEST_SELLER_EMAILS.includes(email.toLowerCase()) && user.role !== 'admin') {
      // ensure email_codes exists
      await db.execute(`CREATE TABLE IF NOT EXISTS email_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(10) NOT NULL,
        purpose ENUM('verify','reset') NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await db.execute(
        'INSERT INTO email_codes (email, code, purpose, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))',
        [email, code, 'verify']
      );
      await emailService.sendVerificationEmail(email, code);

      return res.status(403).json({ error: 'Email not verified. Code resent.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const db = req.db;
    const [users] = await db.execute(
      'SELECT id, email, full_name, role, avatar_url, phone, address_line1, city, governorate, postal_code, is_banned, created_at FROM profiles WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { fullName, phone, addressLine1, city, governorate, postalCode } = req.body;
    const db = req.db;

    await db.execute(
      'UPDATE profiles SET full_name = ?, phone = ?, address_line1 = ?, city = ?, governorate = ?, postal_code = ?, updated_at = NOW() WHERE id = ?',
      [fullName, phone, addressLine1, city, governorate, postalCode, req.user.userId]
    );

    res.json({ message: 'Profile updated successfully' });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.put('/password', authenticateToken, [
  body('currentPassword').exists(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const db = req.db;

    // Get current password hash
    const [users] = await db.execute(
      'SELECT password_hash FROM profiles WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await db.execute(
      'UPDATE profiles SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [hashedNewPassword, req.user.userId]
    );

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

// --- Email code endpoints: send code, verify code, reset password via code ---

// Send a verification or reset code by email
router.post('/send-email-code', async (req, res) => {
  try {
    const { email, purpose } = req.body; // purpose: 'verify' | 'reset'
    if (!email || !purpose || !['verify', 'reset'].includes(purpose)) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    const db = req.db;

    // Ensure email_codes table exists
    await db.execute(`CREATE TABLE IF NOT EXISTS email_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      code VARCHAR(10) NOT NULL,
      purpose ENUM('verify','reset') NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await db.execute(
      'INSERT INTO email_codes (email, code, purpose, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))',
      [email, code, purpose]
    );

    if (purpose === 'verify') {
      await emailService.sendVerificationEmail(email, code);
    } else {
      await emailService.sendResetPasswordEmail(email, code);
    }

    res.json({ message: 'Code envoyé' });
  } catch (error) {
    console.error('send-email-code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify email code and mark profile as verified
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Missing parameters' });
    const db = req.db;

    const [rows] = await db.execute(
      "SELECT * FROM email_codes WHERE email = ? AND purpose = 'verify' AND code = ? AND expires_at > NOW() ORDER BY id DESC LIMIT 1",
      [email, code]
    );
    if (rows.length === 0) return res.status(400).json({ error: 'Code invalide ou expiré' });

    // Ensure profiles table has email_verified column
    const [cols] = await db.execute("SHOW COLUMNS FROM profiles LIKE 'email_verified'");
    if (cols.length === 0) {
      await db.execute('ALTER TABLE profiles ADD COLUMN email_verified BOOLEAN DEFAULT FALSE');
    }

    await db.execute('UPDATE profiles SET email_verified = TRUE WHERE email = ?', [email]);
    res.json({ message: 'Email vérifié' });
  } catch (error) {
    console.error('verify-email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify reset code (step 1)
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Missing parameters' });
    const db = req.db;

    const [rows] = await db.execute(
      "SELECT * FROM email_codes WHERE email = ? AND purpose = 'reset' AND code = ? AND expires_at > NOW() ORDER BY id DESC LIMIT 1",
      [email, code]
    );
    if (rows.length === 0) return res.status(400).json({ error: 'Code invalide ou expiré' });
    res.json({ message: 'Code valide' });
  } catch (error) {
    console.error('verify-reset-code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete password reset (step 2)
router.put('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ error: 'Missing parameters' });
    const db = req.db;

    const [rows] = await db.execute(
      "SELECT * FROM email_codes WHERE email = ? AND purpose = 'reset' AND code = ? AND expires_at > NOW() ORDER BY id DESC LIMIT 1",
      [email, code]
    );
    if (rows.length === 0) return res.status(400).json({ error: 'Code invalide ou expiré' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await db.execute('UPDATE profiles SET password_hash = ?, updated_at = NOW() WHERE email = ?', [hashed, email]);
    res.json({ message: 'Mot de passe mis à jour' });
  } catch (error) {
    console.error('reset-password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});