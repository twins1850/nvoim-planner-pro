#!/usr/bin/env node

/**
 * Generate AES-256-GCM Encryption Key for API Key Storage
 *
 * This script generates a secure 256-bit encryption key for use with
 * the API key management system.
 *
 * Usage:
 *   node scripts/generate-encryption-key.js
 *
 * Output:
 *   - Base64-encoded 256-bit key for API_KEY_ENCRYPTION_KEY environment variable
 */

const crypto = require('crypto');

// Generate 256-bit (32 bytes) random key
const key = crypto.randomBytes(32);

// Encode to base64 for storage in environment variable
const keyBase64 = key.toString('base64');

console.log('\n=================================================================');
console.log('🔐 API Key Encryption Key Generated');
console.log('=================================================================\n');

console.log('Add this to your Supabase Edge Functions environment variables:\n');
console.log(`API_KEY_ENCRYPTION_KEY=${keyBase64}\n`);

console.log('How to set in Supabase:');
console.log('1. Go to Supabase Dashboard → Settings → Edge Functions');
console.log('2. Add environment variable:');
console.log('   Name: API_KEY_ENCRYPTION_KEY');
console.log(`   Value: ${keyBase64}`);
console.log('3. Deploy your Edge Functions\n');

console.log('⚠️  SECURITY WARNING:');
console.log('- Keep this key SECRET');
console.log('- Never commit this key to git');
console.log('- Store it securely (password manager, secrets vault)');
console.log('- If lost, all encrypted API keys will be inaccessible\n');

console.log('=================================================================\n');
