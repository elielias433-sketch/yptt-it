// Test jose verification with Firebase public keys
const jose = require('jose');
const fetch = require('node-fetch');

// Read the admin token
const fs = require('fs');
const token = fs.readFileSync('C:\\Users\\Admin\\AppData\\Local\\Temp\\opencode\\admin-token.txt', 'utf8').trim();

console.log('Testing jose token verification...');
console.log('Token length:', token.length);

// Fetch Firebase JWKS
async function test() {
  try {
    // Firebase public keys endpoint
    const jwksUrl = 'https://www.googleapis.com/identitytoolkit/v2/publicKeys';
    const res = await fetch(jwksUrl);
    const jwks = await res.json();
    console.log('JWKS status:', res.status);
    console.log('JWKS keys count:', jwks ? Object.keys(jwks).length : 0);
    if (jwks && jwks.keys) {
      console.log('First key kid:', jwks.keys[0]?.kid);
      console.log('First key kty:', jwks.keys[0]?.kty);
      console.log('First key alg:', jwks.keys[0]?.alg);
    }
    
    // Now try to verify the token
    // Get the header to find kid
    const headerPart = token.split('.')[0];
    const headerJson = JSON.parse(Buffer.from(headerPart, 'base64').toString());
    console.log('Token header kid:', headerJson.kid);
    console.log('Token header alg:', headerJson.alg);
    
    // Try to verify using jose with the kid
    if (jwks && jwks.keys && headerJson.kid) {
      const key = jwks.keys.find(k => k.kid === headerJson.kid);
      if (key) {
        console.log('Found matching key!');
        try {
          const verified = await jose.jwtVerify(token, key, { algorithms: ['RS256'] });
          console.log('TOKEN VERIFIED SUCCESSFULLY!');
          console.log('Decoded:', JSON.stringify(verified.payload, null, 2).substring(0, 300));
        } catch(e) {
          console.log('Verification error:', e.message.substring(0, 200));
        }
      } else {
        console.log('No matching key found with kid:', headerJson.kid);
        console.log('Available kids:', jwks.keys.map(k => k.kid).join(', '));
      }
    }
  } catch(e) {
    console.log('Error:', e.message.substring(0, 300));
  }
}

test();