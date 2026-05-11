const axios = require('axios');

(async () => {
  try {
    const base = 'http://localhost:5000/api';
    console.log('🔍 Test Twilio Verify Integration');

    // 1. Login as seller
    const login = await axios.post(`${base}/auth/login`, {
      email: 'seller@souk.tn',
      password: 'seller123',
    });
    console.log('✅ Login successful');

    const token = login.data.token;
    const headers = { headers: { Authorization: `Bearer ${token}` } };

    // 2. Create subscription
    const create = await axios.post(
      `${base}/subscriptions/create`,
      { paymentMethod: 'd17' },
      headers
    );
    console.log('✅ Subscription created:', create.data.subscriptionId);

    const subscriptionId = create.data.subscriptionId;

    // 3. Send OTP
    const send = await axios.post(
      `${base}/subscriptions/otp/send/${subscriptionId}`,
      { phone: '+21624567890' },
      headers
    );
    console.log('📱 OTP Send Response:', send.data);

    if (send.data.previewCode) {
      console.log('🔧 DEV MODE: Preview code available for testing');
      console.log('📝 Code:', send.data.previewCode);

      // 4. Verify OTP (using preview code for testing)
      const verify = await axios.post(
        `${base}/subscriptions/otp/verify/${subscriptionId}`,
        { code: send.data.previewCode },
        headers
      );
      console.log('✅ OTP Verified:', verify.data);
    } else {
      console.log('📱 PRODUCTION MODE: Real SMS sent - check your phone for code');
    }

  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
})();
