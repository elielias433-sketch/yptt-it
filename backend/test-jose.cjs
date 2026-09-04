// Test jose CJS require
try {
  const jose = require('jose');
  console.log('jose CJS require OK');
  console.log('Keys:', Object.keys(jose).slice(0, 5));
} catch(e) {
  console.log('jose CJS error:', e.message);
}

// Try to decode a token
const token = require('fs').readFileSync('C:\\Users\\Admin\\AppData\\Local\\Temp\\opencode\\admin-token.txt', 'utf8').trim();
try {
  const decoded = require('jose').jwtDecode(token, { complete: true });
  console.log('Token decoded OK, iss:', decoded.header.alg);
} catch(e) {
  console.log('Token decode error:', e.message.substring(0, 100));
}