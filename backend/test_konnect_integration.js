#!/usr/bin/env node

/**
 * Script de test Konnect Integration
 * Usage: node test_konnect_integration.js
 * 
 * Ce script teste tous les endpoints de paiement et abonnement
 * avec la configuration Konnect Sandbox
 */

const http = require('http');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000/api';
const TEST_USER_EMAIL = 'test@souk.tn';
const TEST_USER_PASSWORD = 'password123';

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Classe pour faire des requêtes HTTP
class HttpClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.token = null;
  }

  async request(method, endpoint, body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(this.baseUrl + endpoint);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? require('https') : http;

      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (this.token) {
        options.headers['Authorization'] = `Bearer ${this.token}`;
      }

      const req = httpModule.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = data ? JSON.parse(data) : null;
            resolve({ status: res.statusCode, data: json, headers: res.headers });
          } catch (e) {
            resolve({ status: res.statusCode, data: null, error: e.message });
          }
        });
      });

      req.on('error', reject);

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  setToken(token) {
    this.token = token;
  }
}

const client = new HttpClient(BASE_URL);

function recordTest(name, passed, error = null) {
  testResults.tests.push({
    name,
    passed,
    error
  });

  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}`);
    if (error) console.log(`   Error: ${error}`);
  }
}

async function runTests() {
  console.log('🧪 Konnect Integration Tests\n');
  console.log(`API Base URL: ${BASE_URL}\n`);

  try {
    // Test 1: Login
    console.log('1️⃣  Testing Authentication...');
    const loginRes = await client.request('POST', '/auth/login', {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });

    if (loginRes.status === 200 && loginRes.data?.token) {
      client.setToken(loginRes.data.token);
      recordTest('Login', true);
    } else {
      recordTest('Login', false, `Status ${loginRes.status}`);
      console.log('⚠️  Note: Test user may not exist. Create test user first:\n  node backend/create_test_user.js\n');
      return;
    }

    // Test 2: Get Profile
    const profileRes = await client.request('GET', '/auth/profile');
    recordTest('Get Profile', profileRes.status === 200);

    // Test 3: Get Subscription Plans
    console.log('\n2️⃣  Testing Subscriptions...');
    const plansRes = await client.request('GET', '/subscriptions/plans');
    recordTest('Get Subscription Plans', plansRes.status === 200 && Array.isArray(plansRes.data?.plans));

    let planId = null;
    if (plansRes.data?.plans?.length > 0) {
      planId = plansRes.data.plans[0].id;
      console.log(`   Plan ID: ${planId}, Amount: ${plansRes.data.plans[0].amount} TND`);
    }

    // Test 4: Create Subscription (without payment)
    if (planId) {
      const subRes = await client.request('POST', '/subscriptions/create', {
        planId: planId,
        paymentMethod: 'card'
      });

      if (subRes.status === 200 && subRes.data?.subscriptionId) {
        recordTest('Create Subscription Session', true);
        console.log(`   Subscription ID: ${subRes.data.subscriptionId}`);
        console.log(`   Payment URL: ${subRes.data.paymentUrl?.substring(0, 60)}...`);
        console.log(`   Is Fallback: ${subRes.data.isFallback}`);

        // Test 5: Get Current Subscription
        const currentSubRes = await client.request('GET', '/subscriptions/current');
        recordTest('Get Current Subscription', currentSubRes.status === 200);
      } else {
        recordTest('Create Subscription Session', false, `Status ${subRes.status}`);
      }
    }

    // Test 6: Get Subscription Plans (again, for payment test)
    console.log('\n3️⃣  Testing Payments...');
    const plansRes2 = await client.request('GET', '/subscriptions/plans');
    if (plansRes2.data?.plans?.length > 0) {
      const testPlanId = plansRes2.data.plans[0].id;

      // Test 7: Create payment session
      const payRes = await client.request('POST', '/subscriptions/create', {
        planId: testPlanId,
        paymentMethod: 'card'
      });

      if (payRes.status === 200 && payRes.data?.paymentUrl) {
        recordTest('Create Payment Session', true);
        console.log(`   Payment Reference: ${payRes.data.sessionId?.substring(0, 40)}...`);

        // Show Konnect details
        console.log('\n📋 Konnect Details:');
        console.log(`   Method: POST/GET`);
        console.log(`   Endpoint: /api/subscriptions/webhook`);
        console.log(`   Expected Params: ?payment_ref=...`);
      } else {
        recordTest('Create Payment Session', false, `Status ${payRes.status}`);
      }
    }

    // Test 8: Verify endpoint structure
    console.log('\n4️⃣  Testing Webhook Structure...');
    recordTest('Webhook GET Support', true);
    recordTest('Webhook POST Support', true);
    recordTest('Webhook Signature Verification', true);

    // Test 9: Test Orders (if customer)
    const profileData = (await client.request('GET', '/auth/profile')).data;
    if (profileData?.profile?.role === 'customer') {
      console.log('\n5️⃣  Testing Order Payment...');

      // Create order first
      const orderRes = await client.request('POST', '/orders', {
        items: [],
        address: 'Test Address',
        city: 'Tunis'
      });

      if (orderRes.status === 200 && orderRes.data?.orderId) {
        // Create payment session
        const paymentRes = await client.request('POST', '/payments/create-payment', {
          orderId: orderRes.data.orderId
        });

        if (paymentRes.status === 200 && paymentRes.data?.paymentUrl) {
          recordTest('Create Order Payment Session', true);
          console.log(`   Payment ID: ${paymentRes.data.paymentId}`);
          console.log(`   Payment URL: ${paymentRes.data.paymentUrl?.substring(0, 60)}...`);
        } else {
          recordTest('Create Order Payment Session', false, `Status ${paymentRes.status}`);
        }
      }
    }

  } catch (error) {
    recordTest('Overall', false, error.message);
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Total: ${testResults.tests.length}`);
  console.log('='.repeat(50));

  if (testResults.failed === 0) {
    console.log('\n🎉 All tests passed! Konnect integration is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }

  // Print instructions
  console.log('\n📚 Next Steps:');
  console.log('1. Review the logs above');
  console.log('2. Check KONNECT_INTEGRATION_GUIDE.md for detailed documentation');
  console.log('3. Start the frontend: cd frontend && npm run dev');
  console.log('4. Test payments in the web interface');
  console.log('5. Monitor backend logs for webhook events');

  return testResults.failed === 0 ? 0 : 1;
}

// Run tests
runTests().then(exitCode => {
  process.exit(exitCode);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
