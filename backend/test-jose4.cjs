// Test jose verification with Google OAuth2 certs
const jose = require('jose');
const fetch = require('node-fetch');

const token = require('fs').readFileSync('C:\\Users\\Admin\\AppData\\Local\\Temp\\opencode\\admin-token.txt', 'utf8').trim();

async function test() {
  // Try Google OAuth2 certs endpoint
  const urls = [
    'https://www.googleapis.com/oauth2/v1/certs',
    'https://www.googleapis.com/token/v1/jwks',
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
  ];
  
  for (const url of urls) {
    try {
      const res = await fetch(url);
      const contentType = res.headers.get('content-type');
      console.log(`URL: ${url}`);
      console.log(`  Status: ${res.status}`);
      console.log(`  Content-Type: ${contentType}`);
      if (res.status === 200) {
        let data;
        try { data = await res.json(); } catch(e) { data = await res.text(); }
        console.log(`  Data (first 200 chars): ${typeof data === 'string' ? data.substring(0, 200) : JSON.stringify(data).substring(0, 200)}`);
      }
    } catch(e) {
      console.log(`URL: ${url} - Error: ${e.message.substring(0, 100)}`);
  }}
  
  // Also try to just decode the token header
  const headerPart = token.split('.')[0];
  const headerJson = JSON.parse(Buffer.from(headerPart, 'base64').toString());
  console.log('\nToken header:', JSON.stringify(headerJson, null, 2));
}

test();