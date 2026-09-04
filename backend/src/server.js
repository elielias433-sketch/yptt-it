/**
 * Express server for the YPTT TI Tracker self-hosted gateway.
 *
 * Replaces the Firebase Cloud Functions gateway. The Express app is a plain
 * Node.js HTTP server (no Firebase Functions runtime, no Blaze plan required).
 *
 * Responsibilities that remain server-side:
 *   - Firebase ID token verification via custom JWT verification
 *   - RBAC (reads = any verified user; mutations = admin only)
 *   - short-lived HMAC-SHA256 signed identity ticket issuance
 *   - forwarding to Apps Script
 *   - CORS + security headers
 *
 * Credentials: initialized via Application Default Credentials
 * (GOOGLE_APPLICATION_CREDENTIALS) or FIREBASE_SERVICE_ACCOUNT. Never exposed.
 */

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { verifyIdToken: joseVerify } = require('jose');

const { handleRequest } = require('./gateway-core');

function buildApp(options = {}) {
  const app = options.app || express();

  // Parse JSON bodies.
  app.use(express.json({ limit: '1mb' }));

  // CORS. Default: allow any origin (Apps Script / frontend are cross-origin).
  const origins = (options.corsOrigins || process.env.CORS_ORIGINS || '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const corsOptions = options.corsOptions || {
    origin: origins.includes('*') ? true : origins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-HTTP-Method-Override'],
  };
  app.use(cors(corsOptions));

  // Security headers.
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  // Custom Firebase ID token verification using jose + Google's public keys.
  // This avoids reliance on Application Default Credentials (ADC) or a
  // FIREBASE_SERVICE_ACCOUNT env var, which can be lost after process restarts.
  async function verifyFirebaseIdToken(token) {
    try {
      // Fetch Google's OAuth2 public keys (X509 certificates).
      // These certificates rotate periodically; fetching each request ensures
      // we always use a valid key for RS256 signature verification.
      const certsRes = await fetch('https://www.googleapis.com/oauth2/v1/certs');
      if (!certsRes.ok) throw new Error('Failed to fetch Google certs');
      const certs = await certsRes.json();

      // Decode the token header to find the kid.
      const headerB64 = token.split('.')[0];
      const headerJson = JSON.parse(Buffer.from(headerB64, 'base64').toString());
      const kid = headerJson.kid;
      if (!kid) throw new Error('Token header missing kid');

      // Find the matching certificate by kid.
      const certPem = certs[kid];
      if (!certPem) throw new Error(`No certificate found for kid: ${kid}`);

      // Import the X509 certificate into jose format.
      const publicKey = await jose.importX509(certPem, 'RS256');

      // Verify the JWT using the imported key and RS256.
      const { jwtVerify } = require('jose');
      const payload = await jwtVerify(token, publicKey, { algorithms: ['RS256'] });

      return payload.payload;
    } catch (err) {
      console.error('Custom verifyIdToken error:', err.message);
      throw err;
    }
  }

  // Liveness + all API routes.
  app.use(async (req, res) => {
    const method = req.method;
    const pathname = req.path || '/';
    const rawBodyHeader = req.get('Content-Type');
    // Reconstruct raw JSON body exactly (Apps Script expects the original body).
    let rawBody = null;
    if (rawBodyHeader && rawBodyHeader.includes('application/json')) {
      rawBody = JSON.stringify(req.body ?? {});
    }
    // Preserve original query string (arrays).
    const query = {};
    for (const [k, v] of Object.entries(req.query)) {
      query[k] = v;
    }

    const cfg = {
      appScriptUrl: options.appScriptUrl || process.env.APP_SCRIPT_URL || '',
      ticketSecret: options.ticketSecret || process.env.TICKET_SIGNING_SECRET || '',
      ticketIssuer: options.ticketIssuer || process.env.TICKET_ISSUER || 'yptt-ti-tracker-gateway',
      ticketAudience: options.ticketAudience || process.env.TICKET_AUDIENCE || 'yptt-ti-tracker-appsscript',
      ticketTtlSeconds: Number(options.ticketTtlSeconds || process.env.TICKET_TTL_SECONDS || 120),
      adminUids: (options.adminUids || process.env.ADMIN_UIDS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    const result = await handleRequest({
      config: cfg,
      // Use custom verification instead of admin.auth().verifyIdToken()
      // which depends on ADC/FIREBASE_SERVICE_ACCOUNT that may be unavailable.
      verifyIdToken: options.verifyIdToken || ((token) => verifyFirebaseIdToken(token)),
      input: {
        method,
        path: pathname,
        query,
        rawBody,
        authorizationHeader: req.get('Authorization') || req.get('authorization') || '',
      },
      isAdmin: options.isAdmin,
      fetchImpl: options.fetchImpl,
    });

    if (result.isJson) {
      res.status(result.status).setHeader('Content-Type', 'application/json');
      res.send(result.body);
    } else {
      res.status(result.status).send(result.body);
    }
  });

  return app;
}

function startServer() {
  // --- Firebase Admin initialization via ADC / service account env ---
  // Supports either GOOGLE_APPLICATION_CREDENTIALS (path) or
  // FIREBASE_SERVICE_ACCOUNT (base64 of the JSON). Never logs the content.
  // The Admin SDK is initialized but the verifyIdToken fallback above
  // uses jose+Google certs so token verification works regardless of ADC.
  if (!admin.apps.length) {
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountEnv) {
      let credential;
      try {
        credential = JSON.parse(Buffer.from(serviceAccountEnv, 'base64').toString('utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(credential),
          projectId: process.env.FIREBASE_PROJECT_ID || credential.project_id,
        });
      } catch (e) {
        console.error('FIREBASE_SERVICE_ACCOUNT is invalid base64 or JSON.');
        throw e;
      }
    } else {
      // Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS path)
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }
  }

  const app = buildApp();
  const port = Number(process.env.PORT || 8080);
  app.listen(port, () => {
    console.log(`YPTT TI Tracker self-hosted gateway listening on :${port}`);
  });
}

module.exports = { buildApp, startServer };