require('dotenv').config({ path: require('path').join(__dirname, '.env') });

console.log('🔍 Vérification des variables Twilio:');
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Configuré' : '❌ Manquant');
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✅ Configuré' : '❌ Manquant');
console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER ? '✅ Configuré' : '❌ Manquant');
console.log('TWILIO_VERIFY_SERVICE_SID:', process.env.TWILIO_VERIFY_SERVICE_SID ? '✅ Configuré' : '❌ Manquant');

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID &&
    !process.env.TWILIO_ACCOUNT_SID.includes('your-twilio') &&
    !process.env.TWILIO_AUTH_TOKEN.includes('your-twilio') &&
    !process.env.TWILIO_VERIFY_SERVICE_SID.includes('your-twilio')) {
  console.log('✅ Twilio est prêt pour l\'envoi de SMS via Verify Service');
} else {
  console.log('⚠️ Twilio n\'est pas configuré - SMS simulé');
}