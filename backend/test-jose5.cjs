// Test jose verification with Google OAuth2 certs - actual verification
const jose = require('jose');
const fetch = require('node-fetch');

const token = require('fs').readFileSync('C:\\Users\\Admin\\AppData\\Local\\Temp\\opencode\\admin-token.txt', 'utf8').trim();

async function test() {
  // Fetch the certificates
  const res = await fetch('https://www.googleapis.com/oauth2/v1/certs');
  const jwks = await res.json();
  
  // Get the token kid
  const headerPart = token.split('.')[0];
  const headerJson = JSON.parse(Buffer.from(headerPart, 'base64').toString());
  const kid = headerJson.kid;
  console.log('Token kid:', kid);
  
  // Find the matching certificate by kid
  const certPem = jwks[kid];
  console.log('Cert PEM found:', certPem ? 'yes' : 'no');
  console.log('Cert PEM prefix:', certPem ? certPem.substring(0, 50) : 'n/a');
  
  if (certPem) {
    // Convert PEM certificate to jose format
    const x509 = await jose.importX509(certPem, 'RS256');
    console.log('Certificate imported OK');
    
    // Verify the token
    try {
      const verified = await jose.jwtVerify(token, x509, { algorithms: ['RS256'] });
      console.log('\n=== SUCCESS: Token VERIFIED ===');
      console.log('Decoded payload:', JSON.stringify(verified.payload, null, 2).substring(0, 500));
    } catch(e) {
      console.log('\nVerification error:', e.message.substring(0, 200));
    }
  }
}

test().catch(console.error);