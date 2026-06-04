const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function testLogin() {
  try {
    const db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      database: 'souk_tn'
    });

    console.log('✅ Connected to database\n');

    // Test credentials
    const email = 'seller1@souk.tn';
    const password = 'seller123';

    // Get user from database
    const [users] = await db.execute(
      'SELECT id, email, full_name, role, password_hash FROM profiles WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      console.log('❌ User not found:', email);
      return;
    }

    const user = users[0];
    console.log('👤 User Found:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.full_name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Password Hash: ${user.password_hash.substring(0, 20)}...`);

    // Test password comparison
    console.log(`\n🔐 Testing password verification:`);
    console.log(`   Input password: "${password}"`);
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log(`   Password match: ${isValidPassword ? '✅ YES' : '❌ NO'}`);

    if (isValidPassword) {
      console.log('\n✅ LOGIN SUCCESSFUL - Password verification works!');
    } else {
      console.log('\n❌ LOGIN FAILED - Password does not match');
      console.log('\nDebugging:');
      console.log(`   Trying to compare: "${password}" against hash`);
      
      // Try re-hashing the password to verify bcrypt works
      const testHash = await bcrypt.hash('seller123', 12);
      const testCompare = await bcrypt.compare('seller123', testHash);
      console.log(`   bcrypt test (fresh hash): ${testCompare ? '✅ Works' : '❌ Failed'}`);
    }

    await db.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLogin();
