/**
 * gateway-core.js — Framework-agnostic gateway logic.
 *
 * This is the security boundary shared by the self-hosted backend. It is
 * deliberately free of Express/Fastify so it can be unit-tested in isolation.
 *
 * Responsibilities (migrated 1:1 from the Firebase Cloud Function gateway):
 *   - Fireauth ID token verification via Firebase Admin SDK verifyIdToken()
 *   - RBAC (reads = any verified user; mutations = admin only)
 *   - short-lived HMAC-SHA256 signed identity ticket issuance
 *   - forwarding to Apps Script preserving method/path/query/body + ticket
 *   - safe error responses
 */

const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Config (injected). The caller supplies a config object; this keeps the
// credentials out of the module and unit-testable.
// ---------------------------------------------------------------------------
const DEFAULTS = {
  ticketIssuer: 'yptt-ti-tracker-gateway',
  ticketAudience: 'yptt-ti-tracker-appsscript',
  ticketTtlSeconds: 120,
  appScriptUrl: '',
  ticketSecret: '',
  adminUids: [],
  // admin verification function: (decodedToken) => boolean
  // defaults to custom-claim + adminUids (matching Cloud Function)
};

function resolveConfig(overrides = {}) {
  return { ...DEFAULTS, ...overrides };
}

const MUTATING = new Set(['POST', 'PUT', 'DELETE']);

/** Base64URL (no padding) of a buffer/string. */
function b64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8');
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Sign a ticket (header.payload) with HMAC-SHA256 using the dedicated secret. */
function signTicket(signingInput, secret) {
  if (!secret) throw new Error('TICKET_SIGNING_SECRET is not configured');
  return crypto
    .createHmac('sha256', secret)
    .update(signingInput, 'utf8')
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Build a short-lived signed identity ticket for a verified user. */
function issueTicket(uid, email, role, cfg) {
  const header = { alg: 'HS256', typ: 'ticket' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: cfg.ticketIssuer,
    aud: cfg.ticketAudience,
    sub: uid,
    email: email || '',
    role,
    iat: now,
    exp: now + cfg.ticketTtlSeconds,
    jti: crypto.randomBytes(16).toString('hex'),
  };
  const headerPart = b64url(JSON.stringify(header));
  const payloadPart = b64url(JSON.stringify(payload));
  const signature = signTicket(`${headerPart}.${payloadPart}`, cfg.ticketSecret);
  return `${headerPart}.${payloadPart}.${signature}`;
}

/**
 * Determine admin from verified Firebase identity (never from the request body).
 * @param {Object} decodedToken - result of verifyIdToken()
 * @param {Object} cfg
 * @param {(decodedToken: Object, cfg: Object) => boolean} [isAdminFn] optional injectable
 */
function defaultIsAdmin(decodedToken, cfg) {
  if (decodedToken && decodedToken.admin === true) return true;
  if (decodedToken && decodedToken.uid && cfg.adminUids.includes(decodedToken.uid)) {
    return true;
  }
  return false;
}

/** Extract a Firebase ID token from an Authorization: Bearer ... header. */
function extractIdToken(authorizationHeader) {
  const authHeader = authorizationHeader || '';
  return authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : '';
}

/**
 * Build a URL pointing at Apps Script preserving method/path/query and the
 * short-lived ticket. Apps Script web apps (.exec) only dispatch GET to
 * doGet() and everything else to doPost(); PUT/DELETE are carried as POST with
 * an X-HTTP-Method-Override header (the Apps Script doPost() reads it).
 */
function buildAppScriptRequest(method, path, query, rawBody, ticket, cfg) {
  if (!cfg.appScriptUrl) {
    throw new Error('APP_SCRIPT_URL is not configured');
  }
  const url = new URL(cfg.appScriptUrl);
  const basePath = url.pathname.replace(/\/+$/, '');
  const requestPath = path && path !== '/' ? `/${String(path).replace(/^\/+/, '')}` : '';
  url.pathname = `${basePath}${requestPath}`;

  // Pass the short-lived identity ticket in a dedicated query parameter. The
  // backend overwrites any client-supplied value, so the frontend cannot inject
  // or substitute a ticket.
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (k === '__ticket') continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(',') : String(v));
    }
  }
  url.searchParams.set('__ticket', ticket);

  const overrideable = new Set(['PUT', 'DELETE']);
  const wireMethod = overrideable.has(method) ? 'POST' : method;

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (overrideable.has(method)) {
    headers['X-HTTP-Method-Override'] = method;
  }

  return {
    url: url.toString(),
    method: wireMethod,
    headers,
    body: rawBody && wireMethod !== 'GET' && wireMethod !== 'HEAD' ? rawBody : undefined,
  };
}

/**
 * Perform a single request handling step. Returns a normalized HTTP response
 * object { status, isJson, body } — never throws for client errors.
 *
 * @param {Object} deps
 * @param {(token: string) => Promise<Object>} deps.verifyIdToken
 * @param {Object} deps.config
 * @param {Object} deps.input  { method, path, query, rawBody, authorizationHeader }
 * @param {(url, init) => Promise<Response>} [deps.fetchImpl] fetch implementation (testable)
 */
async function handleRequest(deps) {
  const cfg = resolveConfig(deps.config);
  const { method, path, query, rawBody, authorizationHeader } = deps.input;

  // Liveness check — no auth (mirrors the /health contract).
  if (path === '/health') {
    return { status: 200, isJson: true, body: JSON.stringify({ status: 'ok' }) };
  }

  // Everything else requires a verified Firebase ID token.
  const idToken = extractIdToken(authorizationHeader);
  if (!idToken) {
    return {
      status: 401,
      isJson: true,
      body: JSON.stringify({ error: 'Authorization header with a valid ID token required' }),
    };
  }

  let decoded;
  try {
    decoded = await deps.verifyIdToken(idToken);
  } catch (err) {
    // verifyIdToken already validates format, expiration, issuer, audience,
    // subject AND the RS256 signature against Google's public keys.
    return { status: 401, isJson: true, body: JSON.stringify({ error: 'Invalid or expired ID token' }) };
  }

  // RBAC: reads for any verified user; mutations require admin.
  const isAdminFn = deps.isAdmin || defaultIsAdmin;
  const role = isAdminFn(decoded, cfg) ? 'admin' : 'user';
  if (MUTATING.has(method) && role !== 'admin') {
    return {
      status: 403,
      isJson: true,
      body: JSON.stringify({ error: 'Forbidden: admin role required for this operation' }),
    };
  }

  // Issue a short-lived signed identity ticket for the verified user.
  let ticket;
  try {
    ticket = issueTicket(decoded.uid, decoded.email, role, cfg);
  } catch (err) {
    return {
      status: 500,
      isJson: true,
      body: JSON.stringify({ error: 'Gateway misconfigured: unable to issue identity ticket' }),
    };
  }

  // Forward the preserved request to Apps Script.
  let requestSpec;
  try {
    requestSpec = buildAppScriptRequest(method, path, query, rawBody, ticket, cfg);
  } catch (err) {
    return {
      status: 500,
      isJson: true,
      body: JSON.stringify({ error: 'Gateway upstream error' }),
    };
  }

  const fetchImpl = deps.fetchImpl || globalThis.fetch;
  try {
    const response = await fetchImpl(requestSpec.url, {
      method: requestSpec.method,
      headers: requestSpec.headers,
      body: requestSpec.body,
    });
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text); } catch { json = null; }
    return { status: response.status, isJson: json !== null, body: json !== null ? text : text };
  } catch (err) {
    return { status: 500, isJson: true, body: JSON.stringify({ error: 'Gateway upstream error' }) };
  }
}

module.exports = {
  handleRequest,
  buildAppScriptRequest,
  extractIdToken,
  issueTicket,
  signTicket,
  defaultIsAdmin,
  b64url,
  MUTATING,
};
