// Local dev-only launcher for the self-hosted backend, using a stub ticket
// secret so the gateway boots without real secrets. Real deployments must use
// the environment (see .env.example / startServer).
const { buildApp } = require('./src/server');
const http = require('node:http');

const app = buildApp({
  appScriptUrl: process.env.APP_SCRIPT_URL || 'https://script.google.com/macros/s/ABCDEF/exec',
  ticketSecret: process.env.TICKET_SIGNING_SECRET || 'localtest-secret-not-for-production',
  ticketIssuer: process.env.TICKET_ISSUER || 'yptt-ti-tracker-gateway',
  ticketAudience: process.env.TICKET_AUDIENCE || 'yptt-ti-tracker-appsscript',
});
const port = Number(process.env.PORT || 8080);
const s = http.createServer(app);
s.listen(port, '127.0.0.1', () => console.log(`gateway up on :${port}`));
