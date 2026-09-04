// Test jose verification with Firebase token
const jose = require('jose');

// Read the admin token
const fs = require('fs');
const token = fs.readFileSync('C:\\Users\\Admin\\AppData\\Local\\Temp\\opencode\\admin-token.txt', 'utf8').trim();

console.log('Token length:', token.length);

// Try jwtVerify - need the right public key
// Firebase ID tokens are RS256, public keys at: https://www.googleapis.com/identitytoolkit/v2/publicKeys
// Or we can use jose's built-in fetch

async function test() {
  try {
    // Try fetching Firebase public keys
    const jwksUrl = 'https://www.googleapis.com/identitytoolkit/v2/publicKeys';
    const res = await fetch(jwksUrl);
    const jwks = await res.json();
    console.log('JWKS keys found:', jwks ? Object.keys(jwks).length : 0);
    
    // Try to verify the token using jose with the kid from the token header
    // First, decode the token to get the kid
    const header = require('@spec').decode(token).header;  // won't work
    console.log('Header:', typeof header);
  } catch(e) {
    console.log('Error:', e.message.substring(0, 200));
  }
}

test().catch(console.error);