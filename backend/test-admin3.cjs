const admin = require('firebase-admin');
async function test() {
  // Initialize with project ID (ADC)
  admin.initializeApp({ projectId: 'yptt-ti' });
  console.log('Apps initialized:', admin.apps.length);
  
  // Read fresh token from file
  const fs = require('fs');
  const token = fs.readFileSync('C:\\Users\\Admin\\AppData\\Local\\Temp\\opencode\\admin-token.txt', 'utf8').trim();
  console.log('Token length:', token.length);
  
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    console.log('SUCCESS: Token verified!');
    console.log('Email:', decoded.email);
    console.log('UID:', decoded.uid);
  } catch(e) {
    console.log('Verify error:', e.message.substring(0, 200));
  }
}
test();