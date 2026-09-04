const fetch = require('node-fetch');
fetch('https://www.googleapis.com/oauth2/v1/certs').then(r => r.json()).then(certs => {
  const kid = '247f8060039b5f40d9496938bb189706ef88933d';
  const pem = certs[kid] || 'not found';
  if (pem !== 'not found') {
    console.log('PEM starts with:', pem.substring(0, 30));
    console.log('PEM length:', pem.length);
    console.log('Has BEGIN:', pem.includes('-----BEGIN'));
    console.log('Has END:', pem.includes('-----END'));
  } else {
    console.log('Kid not found as direct key');
    console.log('Available keys:', Object.keys(certs).slice(0,3));
  }
});