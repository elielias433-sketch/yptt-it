// Test all Google certs to find one that verifies the token
const { importX509, jwtVerify } = require('jose');

async function test() {
  const fetch = require('node-fetch');
  const res = await fetch('https://www.googleapis.com/oauth2/v1/certs');
  const certs = await res.json();
  console.log('Certs loaded, count:', Object.keys(certs).length);
  
  const fs = require('fs');
  const token = fs.readFileSync('C:\\Users\\Admin\\AppData\\Local\\Temp\\opencode\\admin-token.txt', 'utf8').trim();
  
  // Try each cert
  const kids = Object.keys(certs);
  console.log('Trying', kids.length, 'certs...');
  
  for (let i = 0; i < kids.length; i++) {
    const kid = kids[i];
    const certPem = certs[kid];
    try {
      const publicKey = await importX509(certPem, 'RS256');
      const verified = await jwtVerify(token, publicKey, { algorithms: ['RS256'] });
      console.log('\\n=== SUCCESS with cert', kid, '===');
      console.log('Email:', verified.payload.email);
      console.log('UID:', verified.payload.sub);
      return;
    } catch(e) {
      // console.log('Cert', kid, 'failed:', e.message.substring(0, 50));
    }
  }
  console.log('\\nFAILED: No cert verified the token');
}

test();