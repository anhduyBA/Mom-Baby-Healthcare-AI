import dotenv from 'dotenv';
dotenv.config();

console.log('\n🔍 Checking Notification System Configuration\n');
console.log('='.repeat(60));

console.log('\n📧 EMAIL CONFIGURATION:');
console.log('   SMTP_HOST:', process.env.SMTP_HOST ? '✅ Set' : '❌ Missing');
console.log('   SMTP_PORT:', process.env.SMTP_PORT ? '✅ Set' : '❌ Missing');
console.log('   SMTP_USER:', process.env.SMTP_USER ? '✅ Set' : '❌ Missing');
console.log('   SMTP_PASS:', process.env.SMTP_PASS ? '✅ Set' : '❌ Missing');
console.log('   SMTP_SECURE:', process.env.SMTP_SECURE || 'false');

console.log('\n📱 TWILIO SMS CONFIGURATION:');
console.log('   TWILIO_SID:', process.env.TWILIO_SID ? '✅ Set' : '❌ Missing');
console.log('   TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing');
console.log('   TWILIO_PHONE:', process.env.TWILIO_PHONE || '❌ Missing');

console.log('\n' + '='.repeat(60));

const emailReady = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
const smsReady = process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE;

console.log('\n📊 SYSTEM STATUS:');
console.log('   Email Notifications:', emailReady ? '✅ READY' : '❌ NOT CONFIGURED');
console.log('   SMS Notifications:', smsReady ? '✅ READY' : '❌ NOT CONFIGURED');

if (emailReady && smsReady) {
  console.log('\n🎉 All notification systems are configured!');
  console.log('   Your app can send Email and SMS notifications.');
} else {
  console.log('\n⚠️  Some notification systems need configuration.');
  if (!emailReady) {
    console.log('\n   To enable Email: Add SMTP_HOST, SMTP_USER, SMTP_PASS to .env file');
  }
  if (!smsReady) {
    console.log('\n   To enable SMS: Add TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE to .env file');
  }
}

console.log('\n' + '='.repeat(60) + '\n');
