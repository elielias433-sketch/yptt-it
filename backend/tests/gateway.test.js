/**
 * Backend gateway security + integration tests (migrated from Cloud Functions
 * test suite to the self-hosted backend).
 *
 * Run: node --test tests/gateway.test.js
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const core = require('../src/gateway-core');
const { buildApp } = require('../src/server');

const TEST_SECRET = 'test-hmac-secret-' + Date.now();
const WRONG_SECRET = 'wrong-secret-does-not-match';

// ---------------------------------------------------------------------------
// Fake verifyIdToken: in unit tests we do NOT require a live Firebase project.
// A "valid" token is one our fake verifier accepts; invalid/expired/malformed
// throw, mirroring real verifyIdToken behavior.
// ---------------------------------------------------------------------------
function makeVerifier(allowedClaim = {}) {
  return async (token) => {
    if (token === 'valid-token') {
      return {
        uid: allowedClaim.uid || 'uid-123',
        email: allowedClaim.email || 'test@example.com',
        admin: allowedClaim.admin || undefined,
      };
    }
    if (token === 'expired-token') {
      const err = new Error('Firebase ID token has expired');
      err.code = 'auth/id-token-expired';
      throw err;
    }
    const err = new Error('Firebase ID token is invalid');
    err.code = 'auth/argument-error';
    throw err;
  };
}

function stubFetch(url, init) {
  return async (_url, _init) => {
    return {
      status: 200,
      text: async () => JSON.stringify({ ok: true, forwardedUrl: url, forwardedMethod: init && init.method, hasTicket: _init ? (_init.url || _url).includes('__ticket=') : true }),
    };
  };
}

describe('Backend — Authentication', () => {
  const cfg = {
    config: {
      appScriptUrl: 'https://script.google.com/macros/s/ABCDEF/exec',
      ticketSecret: TEST_SECRET,
      ticketIssuer: 'yptt-ti-tracker-gateway',
      ticketAudience: 'yptt-ti-tracker-appsscript',
      ticketTtlSeconds: 120,
      adminUids: [],
    },
    verifyIdToken: makeVerifier(),
    input: {
      method: 'GET',
      path: '/api/sites',
      query: {},
      rawBody: null,
      authorizationHeader: '',
    },
    fetchImpl: async () => ({ status: 200, text: async () => JSON.stringify({ ok: true }) }),
  };

  it('health endpoint returns 200 without auth', async () => {
    const r = await core.handleRequest({ ...cfg, input: { ...cfg.input, path: '/health' } });
    assert.equal(r.status, 200);
    assert.equal(JSON.parse(r.body).status, 'ok');
  });

  it('missing token → 401', async () => {
    const r = await core.handleRequest({ ...cfg });
    assert.equal(r.status, 401);
  });

  it('malformed Bearer (no space / invalid) → 401', async () => {
    const r = await core.handleRequest({ ...cfg, input: { ...cfg.input, authorizationHeader: 'Bearer-not-a-token' } });
    assert.equal(r.status, 401);
  });

  it('valid token → passes (200) for authenticated read', async () => {
    const r = await core.handleRequest({ ...cfg, input: { ...cfg.input, authorizationHeader: 'Bearer valid-token' } });
    assert.equal(r.status, 200);
  });

  it('invalid token → 401', async () => {
    const r = await core.handleRequest({ ...cfg, input: { ...cfg.input, authorizationHeader: 'Bearer forged-token' } });
    assert.equal(r.status, 401);
  });

  it('expired token → 401', async () => {
    const r = await core.handleRequest({ ...cfg, input: { ...cfg.input, authorizationHeader: 'Bearer expired-token' } });
    assert.equal(r.status, 401);
  });
});

describe('Backend — RBAC', () => {
  const baseCfg = {
    config: {
      appScriptUrl: 'https://script.google.com/macros/s/ABCDEF/exec',
      ticketSecret: TEST_SECRET,
      ticketIssuer: 'yptt-ti-tracker-gateway',
      ticketAudience: 'yptt-ti-tracker-appsscript',
      ticketTtlSeconds: 120,
      adminUids: ['admin-uid-1'],
    },
    verifyIdToken: makeVerifier(),
    fetchImpl: async () => ({ status: 200, text: async () => JSON.stringify({ ok: true }) }),
  };

  it('authenticated user (non-admin) cannot mutate', async () => {
    const r = await core.handleRequest({
      ...baseCfg,
      input: { method: 'POST', path: '/api/sites', query: {}, rawBody: '{}', authorizationHeader: 'Bearer valid-token' },
    });
    assert.equal(r.status, 403);
  });

  it('admin (via ADMIN_UIDS) can mutate', async () => {
    const r = await core.handleRequest({
      ...baseCfg,
      verifyIdToken: makeVerifier({ uid: 'admin-uid-1' }),
      input: { method: 'POST', path: '/api/sites', query: {}, rawBody: '{"x":1}', authorizationHeader: 'Bearer valid-token' },
    });
    assert.equal(r.status, 200);
  });

  it('admin (via custom claim admin===true) can mutate', async () => {
    const r = await core.handleRequest({
      ...baseCfg,
      config: { ...baseCfg.config, adminUids: [] },
      verifyIdToken: makeVerifier({ uid: 'uid-any', admin: true }),
      input: { method: 'DELETE', path: '/api/sites/wid-1', query: {}, rawBody: null, authorizationHeader: 'Bearer valid-token' },
    });
    assert.equal(r.status, 200);
  });

  it('client-supplied role in body is ignored (role from verified token only)', async () => {
    // body sends role:admin, but verified token has no admin → denied
    const r = await core.handleRequest({
      ...baseCfg,
      config: { ...baseCfg.config, adminUids: [] },
      input: { method: 'POST', path: '/api/sites', query: {}, rawBody: '{"role":"admin"}', authorizationHeader: 'Bearer valid-token' },
    });
    assert.equal(r.status, 403);
  });
});

describe('Backend — Identity ticket', () => {
  const cfg = {
    ticketSecret: TEST_SECRET,
    ticketIssuer: 'yptt-ti-tracker-gateway',
    ticketAudience: 'yptt-ti-tracker-appsscript',
    ticketTtlSeconds: 120,
    adminUids: [],
  };

  it('ticket carries only allowed claims', () => {
    const ticket = core.issueTicket('uid-1', 'a@b.com', 'user', { ...cfg, ticketSecret: TEST_SECRET });
    const [, payload] = ticket.split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
    const allowed = ['iss', 'aud', 'sub', 'email', 'role', 'iat', 'exp', 'jti'];
    assert.deepEqual(Object.keys(decoded).sort(), allowed.sort());
    assert.equal(decoded.sub, 'uid-1');
    assert.equal(decoded.role, 'user');
  });

  it('ticket is signed and has jti/exp/iat', () => {
    const ticket = core.issueTicket('uid-1', 'a@b.com', 'admin', { ...cfg, ticketSecret: TEST_SECRET });
    const parts = ticket.split('.');
    assert.equal(parts.length, 3);
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    assert.ok(payload.jti, 'has jti');
    assert.ok(payload.exp > payload.iat, 'exp after iat');
  });
});

describe('Backend — Apps Script forwarding', () => {
  it('builds URL with path and __ticket', () => {
    const spec = core.buildAppScriptRequest(
      'GET',
      '/api/sites',
      { region: 'KAL' },
      null,
      'TICKET',
      { appScriptUrl: 'https://script.google.com/macros/s/ABCDEF/exec', ticketSecret: TEST_SECRET }
    );
    assert.match(spec.url, /ABCDEF\/exec\/api\/sites/);
    assert.ok(spec.url.includes('__ticket=TICKET'));
    assert.ok(spec.url.includes('region=KAL'));
    assert.equal(spec.method, 'GET');
  });

  it('PUT/DELETE are sent as POST with X-HTTP-Method-Override', () => {
    const spec = core.buildAppScriptRequest(
      'PUT',
      '/api/workorders/wid-1',
      {},
      '{}',
      'TICKET',
      { appScriptUrl: 'https://script.google.com/macros/s/ABCDEF/exec', ticketSecret: TEST_SECRET }
    );
    assert.equal(spec.method, 'POST');
    assert.equal(spec.headers['X-HTTP-Method-Override'], 'PUT');
  });

  it('strips client-supplied __ticket (cannot substitute)', () => {
    const spec = core.buildAppScriptRequest(
      'GET',
      '/api/sites',
      { __ticket: 'ATTACKER_TICKET' },
      null,
      'REAL_TICKET',
      { appScriptUrl: 'https://script.google.com/macros/s/ABCDEF/exec', ticketSecret: TEST_SECRET }
    );
    assert.ok(!spec.url.includes('__ticket=ATTACKER_TICKET'));
    assert.ok(spec.url.includes('__ticket=REAL_TICKET'));
  });
});

describe('Backend — Express integration (buildApp)', () => {
  it('server boots and health works via HTTP', async (t) => {
    const app = buildApp({
      corsOrigins: '*',
      verifyIdToken: makeVerifier(),
      fetchImpl: async (_url) => ({ status: 200, text: async () => JSON.stringify({ ok: true }) }),
      appScriptUrl: 'https://script.google.com/macros/s/ABCDEF/exec',
      ticketSecret: TEST_SECRET,
    });
    // Use app.call via a lightweight server
    const http = require('node:http');
    const server = http.createServer(app);
    await new Promise((res) => server.listen(0, '127.0.0.1', res));
    const port = server.address().port;

    // health
    const healthRes = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(healthRes.status, 200);
    assert.equal((await healthRes.json()).status, 'ok');

    // missing token → 401
    const unauth = await fetch(`http://127.0.0.1:${port}/api/sites`);
    assert.equal(unauth.status, 401);

    // valid token read → 200
    const authed = await fetch(`http://127.0.0.1:${port}/api/sites`, {
      headers: { Authorization: 'Bearer valid-token' },
    });
    assert.equal(authed.status, 200);

    await new Promise((res) => server.close(res));
  });
});
