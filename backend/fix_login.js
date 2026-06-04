const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function debugLogin() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'souk_tn'
    });

    console.log('\n========== DEBUG LOGIN ==========\n');

    // Get seller1 info
    const [users] = await conn.execute(
      'SELECT id, email, full_name, role, password_hash FROM profiles WHERE email = ?',
      ['seller1@souk.tn']
    );

    if (users.length === 0) {
      console.log('❌ seller1@souk.tn not found in database');
      conn.end();
      return;
    }

    const user = users[0];
    console.log('User found:', {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      password_hash: user.password_hash ? user.password_hash.substring(0, 20) + '...' : 'NO HASH'
    });

    // Test password comparison
    const testPassword = 'seller123';
    console.log(`\nTesting password: "${testPassword}"`);

    const isValid = await bcrypt.compare(testPassword, user.password_hash);
    console.log(`Password match: ${isValid ? '✅ YES' : '❌ NO'}`);

    // If password doesn't match, update it
    if (!isValid) {
      console.log('\n🔧 Updating password...');
      const newHash = await bcrypt.hash(testPassword, 12);
      await conn.execute('UPDATE profiles SET password_hash = ? WHERE email = ?', [newHash, 'seller1@souk.tn']);
      console.log('✅ Password updated for seller1@souk.tn');

      // Verify update
      const [updated] = await conn.execute(
        'SELECT password_hash FROM profiles WHERE email = ?',
        ['seller1@souk.tn']
      );
      const verifyMatch = await bcrypt.compare(testPassword, updated[0].password_hash);
      console.log(`Verification after update: ${verifyMatch ? '✅ YES' : '❌ NO'}`);
    }

    // Update all other sellers too
    console.log('\n📋 Updating all sellers...');
    const [sellers] = await conn.execute('SELECT email FROM profiles WHERE role = "seller"');
    
    for (const seller of sellers) {
      const newHash = await bcrypt.hash('seller123', 12);
      await conn.execute('UPDATE profiles SET password_hash = ? WHERE email = ?', [newHash, seller.email]);
      console.log(`  ✅ ${seller.email}`);
    }

    console.log('\n========== COMPLETE ==========\n');
    console.log('All sellers can now login with password: seller123');

    conn.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

debugLogin();
