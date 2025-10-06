const crypto = require('crypto');

/**
 * Generate a secure API key
 * Run with: npm run generate-key
 */
function generateApiKey() {
  // Generate a random 32-byte key and convert to hex
  const apiKey = crypto.randomBytes(32).toString('hex');
  
  console.log('\n==============================================');
  console.log('🔑 New API Key Generated');
  console.log('==============================================\n');
  console.log('API Key:', apiKey);
  console.log('\n==============================================');
  console.log('⚠️  IMPORTANT:');
  console.log('1. Add this key to your .env file:');
  console.log(`   API_KEYS=${apiKey}`);
  console.log('2. Keep this key secure and never commit it!');
  console.log('3. Share this key only with authorized users');
  console.log('4. For multiple keys, separate with commas:');
  console.log('   API_KEYS=key1,key2,key3');
  console.log('==============================================\n');
  
  return apiKey;
}

// Generate the key
generateApiKey();
