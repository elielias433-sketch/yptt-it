const jose = require('jose');
const fetch = require('node-fetch');

async function test() {
  const res = await fetch('https://www.googleapis.com/oauth2/v1/certs');
  const certs = await res.json();
  console.log('Cert keys:', Object.keys(certs));
  
  const certPem = certs['d6a0e659c3392d9e592a4b0ad88e7b2b88076909'];
  if (certPem) {
    const cert = new jose.X509Certificate(certPem);
    console.log('Cert parsed OK');
    console.log('Cert kid:', cert.raw?.kid || 'no kid');
    console.log('Cert alg:', cert.raw?.alg || 'no alg');
  }
}
test();