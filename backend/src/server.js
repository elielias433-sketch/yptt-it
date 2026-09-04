/**
 * Express server for the YPTT TI Tracker self-hosted gateway.
 *
 * Replaces the Firebase Cloud Functions gateway. The Express app is a plain
 * Node.js HTTP server (no Firebase Functions runtime, no Blaze plan required).
 *
 * Responsibilities that remain server-side:
 *   - Firebase ID token verification via Firebase Admin SDK verifyIdToken()
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

const { handleRequest } = require('./gateway-core');

/**
 * Idempotent Firebase Admin initialization.
 * Prefers FIREBASE_SERVICE_ACCOUNT (base64 of the service-account JSON).
 * Falls back to Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS).
 */
function ensureFirebaseAdmin() {
  if (admin.apps.length > 0) return admin.app();

  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountEnv) {
    let credential;
    try {
      credential = JSON.parse(Buffer.from(serviceAccountEnv, 'base64').toString('utf8'));
      return admin.initializeApp({
        credential: admin.credential.cert(credential),
        projectId: process.env.FIREBASE_PROJECT_ID || credential.project_id,
      });
    } catch (e) {
      console.error('FIREBASE_SERVICE_ACCOUNT is invalid base64 or JSON.');
      throw e;
    }
  }

  // Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS path)
  return admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

function buildApp(options = {}) {
  const app = options.app || express();

  // Ensure Firebase Admin is initialized before any request is handled.
  // This also covers the Vercel serverless adapter, which only calls buildApp().
  ensureFirebaseAdmin();

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
      verifyIdToken: options.verifyIdToken || ((token) => admin.auth().verifyIdToken(token)),
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
  ensureFirebaseAdmin();

  const app = buildApp();
  const port = Number(process.env.PORT || 8080);
  app.listen(port, () => {
    console.log(`YPTT TI Tracker self-hosted gateway listening on :${port}`);
  });
}

module.exports = { buildApp, startServer, ensureFirebaseAdmin };

// Start when run directly: node src/server.js
if (require.main === module) {
  // eslint-disable-next-line no-undef
  startServer();
}