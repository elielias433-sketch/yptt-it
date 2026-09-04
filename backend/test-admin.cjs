// Test if fresh Admin SDK can verify token
const admin = require('firebase-admin');

// Check if already initialized
console.log('Existing apps:', admin.apps.length);

// Try to initialize with just project ID (ADC)
try {
  admin.initializeApp({ projectId: 'yptt-ti' });
  console.log('Initialized with project ID only');
} catch(e) {
  console.log('Init error:', e.message.substring(0, 100));
}

// Try verifyIdToken
const token = require('fs').readFileSync('C:\\Users\\Admin\\AppData\\Local\\Temp\\opencode\\admin-token.txt', 'utf8').trim();

try {
  const decoded = await admin.auth().verifyIdToken(token);
  console.log('SUCCESS: Token verified!');
  console.log('Email:', decoded.email);
  console.log('UID:', decoded.uid);
} catch(e) {
  console.log('Verify error:', e.message.substring(0, 100));
}