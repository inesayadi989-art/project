const twilio = require('twilio');
require('dotenv').config();

async function testSms() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !twilioPhoneNumber ||
      accountSid.includes('your-twilio') ||
      authToken.includes('your-twilio') ||
      twilioPhoneNumber.includes('your-twilio')) {
    console.log('❌ Twilio non configuré. Configurez les variables dans .env');
    return;
  }

  try {
    const client = twilio(accountSid, authToken);
    const message = await client.messages.create({
      body: 'Test SMS Souk.tn - Code: 123456',
      from: twilioPhoneNumber,
      to: '+21612345678' // Remplacez par un numéro de test
    });
    console.log('✅ SMS envoyé avec succès:', message.sid);
  } catch (error) {
    console.error('❌ Erreur SMS:', error.message);
  }
}

testSms();