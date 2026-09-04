// Test custom verifyIdToken with jose + Google certs
const { importX509, jwtVerify } = require('jose');

async function test() {
  try {
    // Fetch Google certs (using global fetch from earlier tests)
    const fetch = require('node-fetch');
    const res = await fetch('https://www.googleapis.com/oauth2/v1/certs');
    const certs = await res.json();
    console.log('Certs loaded, keys count:', Object.keys(certs).length);
    
    // Read token from file
    const fs = require('fs');
    const token = fs.readFileSync('C:\\Users\\Admin\\AppData\\Local\\Temp\\opencode\\admin-token.txt', 'utf8').trim();
    console.log('Token length:', token.length);
    
    // Decode header
    const headerB64 = token.split('.')[0];
    const headerJson = JSON.parse(Buffer.from(headerB64, 'base64').toString());
    const kid = headerJson.kid;
    console.log('Token kid:', kid);
    
    // Find matching cert
    const certPem = certs[kid];
    console.log('Cert PEM found:', !!certPem);
    if (certPem) console.log('Cert PEM prefix:', certPem.substring(0, 60));
    
    if (certPem) {
      const publicKey = await importX509(certPem, 'RS256');
      console.log('Key imported OK');
      
      // Verify the token
      const verified = await jwtVerify(token, publicKey, { algorithms: ['RS256'] });
      console.log('\\n=== SUCCESS: Token VERIFIED ===');
      console.log('Email:', verified.payload.email);
      console.log('UID:', verified.payload.sub);
    } else {
      console.log('No cert found for kid:', kid);
      // List available kids
      console.log('Available kids:', Object.keys(certs).slice(0, 5).join(', '));
    }
  } catch(e) {
    console.log('Error:', e.message.substring(0, 300));
  }
}

test();