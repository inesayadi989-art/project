const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function main() {
  const db = await mysql.createConnection({ host: 'localhost', user: 'root', password: '', database: 'souk_tn' });
  const email = 'fresh_seller_test@example.com';
  const password = 'Password123!';
  const fullName = 'Nouveau Vendeur';
  const role = 'seller';
  const hash = await bcrypt.hash(password, 12);
  const [existing] = await db.execute('SELECT id FROM profiles WHERE email = ?', [email]);
  if (existing.length > 0) {
    console.log('Seller already exists:', email);
  } else {
    const [result] = await db.execute(
      'INSERT INTO profiles (email, full_name, role, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [email, fullName, role, hash]
    );
    const userId = result.insertId;
    const slug = `${fullName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    await db.execute(
      'INSERT INTO stores (owner_id, name, slug, is_approved, is_active, commission_rate, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [userId, `Boutique de ${fullName}`, slug, true, true, 10]
    );
    console.log('New seller created:', email, 'password:', password);
  }
  await db.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});