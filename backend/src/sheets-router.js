/**
 * sheets-router.js — Direct Google Sheets CRUD via service account.
 *
 * Handles /api/* after Firebase token verification + RBAC (enforced upstream
 * in server.js). Uses the compat-config mapping so reads/writes line up with
 * the original Apps Script Compat adapter (canonical keys, per-resource tabs).
 *
 * Env:
 *   SHEET_ID   spreadsheet id (1wP6sHi1-...)
 */

const svc = require('./sheets-service');
const compat = require('./compat-config');

const SUL = 'sites_sul';
const KAL = 'sites_kal';

/** Resolve the resource key subsets for sites reads. */
function siteTabs() {
  return [compat.resource(SUL), compat.resource(KAL)];
}

/** Which legacy tab (and resource descriptor) to write a site row to. */
function resolveSiteTab(data) {
  const region = String(data.region || data.regionCity || '').toLowerCase();
  if (region.includes('kal') || region.includes('banjar') || region.includes('samarinda')) {
    return compat.resource(KAL);
  }
  return compat.resource(SUL);
}

/** Read a tab via compat config and return canonical rows (tagged with _tab). */
async function readCanonical(descriptor) {
  const { headers, rows } = await svc.readTab(process.env.SHEET_ID, descriptor.legacyTab);
  return rows.map((row) => ({
    ...compat.rowToCanonical(descriptorName(descriptor), headers, row),
    _tab: descriptor.legacyTab,
  }));
}

function descriptorName(d) {
  for (const [k, v] of Object.entries(compat.RESOURCES)) if (v === d) return k;
  return null;
}

// ---------------------------------------------------------------------------
// READ
// ---------------------------------------------------------------------------

async function listResource(resourceName, query = {}) {
  const desc = compat.resource(resourceName);
  if (!desc) return { status: 404, body: { error: 'Unknown resource' } };

  let rows = [];
  if (resourceName === 'sites') {
    for (const d of siteTabs()) rows = rows.concat(await readCanonical(d));
  } else {
    rows = await readCanonical(desc);
  }

  // Filtering (case-insensitive partial match on query keys).
  for (const [k, v] of Object.entries(query)) {
    if (!v || k === 'limit' || k === 'offset' || k === 'sort' || k === 'order' || k === 'page') continue;
    const key = v.toLowerCase();
    rows = rows.filter((r) => (r[k] !== undefined && String(r[k]).toLowerCase().includes(key)));
  }

  const offset = Number(query.offset || 0);
  const limit = Number(query.limit || Math.max(rows.length, 20));
  const sliced = rows.slice(offset, offset + limit);
  return { status: 200, body: sliced };
}

async function getResourceById(resourceName, id) {
  const desc = compat.resource(resourceName);
  if (!desc) return { status: 404, body: { error: 'Unknown resource' } };
  const isSites = resourceName === 'sites';
  const descs = isSites ? siteTabs() : [desc];

  for (const d of descs) {
    const key = d.key;
    if (!key) continue;
    const keyHeaders = await svc.readTab(process.env.SHEET_ID, d.legacyTab, 'A1:ZZ');
    const keyCol = compat.canonicalToColumn(descriptorName(d), key, keyHeaders.headers);
    if (keyCol < 0) continue;
    const found = await svc.findRowsByValue(process.env.SHEET_ID, d.legacyTab, keyCol, id);
    if (found.length === 1) {
      const { headers, rows } = await svc.readTab(process.env.SHEET_ID, d.legacyTab);
      const idx = found[0] - 2;
      if (rows[idx]) {
        const canonical = compat.rowToCanonical(descriptorName(d), headers, rows[idx]);
        return { status: 200, body: { ...canonical, tab: d.legacyTab, rowIndex: found[0] } };
      }
    }
  }
  return { status: 404, body: { error: 'Not found' } };
}

// ---------------------------------------------------------------------------
// CREATE / UPDATE / DELETE
// ---------------------------------------------------------------------------

async function createResource(resourceName, method, body = {}) {
  const isSites = resourceName === 'sites';
  const desc = isSites ? resolveSiteTab(body) : compat.resource(resourceName);
  if (!desc) return { status: 404, body: { error: 'Unknown resource' } };
  const dname = descriptorName(desc);
  if (!(desc.allowedOps || []).includes('CREATE')) {
    return { status: 403, body: { error: `Create is not allowed for ${resourceName}` } };
  }

  const { headers } = await svc.readTab(process.env.SHEET_ID, desc.legacyTab);
  const row = compat.buildCreateRow(dname, headers, body);
  const updated = await svc.appendRow(process.env.SHEET_ID, desc.legacyTab, row);

  // Audit (append to _AUDIT_LOG).
  try {
    await svc.appendRow(process.env.SHEET_ID, '_AUDIT_LOG', [
      new Date().toISOString(),
      String(body._actorUid || ''),
      String(body._actorEmail || ''),
      `${method} ${resourceName}`,
      desc.legacyTab,
      String(body.wid || body.id || ''),
      '',
      '',
      JSON.stringify(body).substring(0, 500),
      '200',
      '',
      '',
    ]);
  } catch (e) { /* audit best-effort */ }

  const { rows } = await svc.readTab(process.env.SHEET_ID, desc.legacyTab);
  const canonical = compat.rowToCanonical(dname, headers, rows[rows.length - 1]);
  return { status: 201, body: { ...canonical, tab: desc.legacyTab, created: true } };
}

async function updateResource(resourceName, method, id, body = {}) {
  const isSites = resourceName === 'sites';
  const desc = isSites ? resolveSiteTab(body) : compat.resource(resourceName);
  if (!desc) return { status: 404, body: { error: 'Unknown resource' } };
  const dname = descriptorName(desc);
  if (!(desc.allowedOps || []).includes('UPDATE')) {
    return { status: 403, body: { error: `Update is not allowed for ${resourceName}` } };
  }
  const key = desc.key;
  if (!key) return { status: 409, body: { error: `No stable key for ${resourceName}; update by id unsupported` } };

  const { headers } = await svc.readTab(process.env.SHEET_ID, desc.legacyTab);
  const keyCol = compat.canonicalToColumn(dname, key, headers);
  if (keyCol < 0) return { status: 500, body: { error: 'Key column not found' } };
  const matches = await svc.findRowsByValue(process.env.SHEET_ID, desc.legacyTab, keyCol, id);
  if (matches.length === 0) return { status: 404, body: { error: 'Not found' } };
  if (matches.length > 1) return { status: 409, body: { error: `Ambiguous: ${matches.length} rows match ${key}=${id}` } };

  const allowedFields = Object.keys(desc.fieldMap);
  const cleanPatch = compat.buildUpdatePatch(dname, headers, body, allowedFields);
  await svc.patchRow(process.env.SHEET_ID, desc.legacyTab, matches[0], cleanPatch);

  try {
    await svc.appendRow(process.env.SHEET_ID, '_AUDIT_LOG', [
      new Date().toISOString(),
      String(body._actorUid || ''),
      String(body._actorEmail || ''),
      `${method} ${resourceName}`,
      desc.legacyTab,
      String(id),
      '',
      '',
      JSON.stringify(cleanPatch).substring(0, 500),
      '200',
      '',
      '',
    ]);
  } catch (e) { /* best-effort */ }

  const { rows } = await svc.readTab(process.env.SHEET_ID, desc.legacyTab);
  const idx = matches[0] - 2;
  const canonical = rows[idx] ? compat.rowToCanonical(dname, headers, rows[idx]) : {};
  return { status: 200, body: { ...canonical, tab: desc.legacyTab, rowIndex: matches[0], updated: true } };
}

/** DELETE: intentionally disabled (safety) — matches legacy Compat policy. */
function deleteResource(resourceName) {
  return {
    status: 501,
    body: { error: `Delete is not implemented for ${resourceName} (row removal on production spreadsheet is disabled)` },
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

async function dashboardSummary() {
  let items = [];
  for (const d of siteTabs()) items = items.concat(await readCanonical(d));
  const byStatus = (re) => items.filter((r) => re.test(String(r.status || ''))).length;
  const completed = byStatus(/completed|done|selesai|closed|passed|approved/i);
  const active = byStatus(/progress|pending|active|in progress|started|onprocess|draft/i);
  let materialsInbound = 0;
  try { materialsInbound = (await svc.readTab(process.env.SHEET_ID, 'Inbound')).rows.length; } catch (e) {}
  return {
    totalWorkItems: items.length,
    activeWorkItems: active,
    completedThisMonth: completed,
    overdueMilestones: 0,
    materialsInbound,
    validationRate: 0,
  };
}

async function dashboardRegional() {
  const out = {};
  for (const [key, d] of [['sulawesi', compat.resource(SUL)], ['kalimantan', compat.resource(KAL)]]) {
    const items = await readCanonical(d);
    const completed = items.filter((r) => /completed|done|selesai|closed|passed|approved/i.test(String(r.status || ''))).length;
    const active = items.filter((r) => /progress|pending|active|in progress|started|onprocess|draft/i.test(String(r.status || ''))).length;
    out[key] = {
      workItems: items.length,
      active,
      completed,
      completionRate: items.length ? Math.round((completed / items.length) * 100) : 0,
      target: items.length,
    };
  }
  return out;
}

async function dashboardKpi() {
  let items = [];
  for (const d of siteTabs()) items = items.concat(await readCanonical(d));
  const completed = items.filter((r) => /completed|done|selesai|closed|passed|approved/i.test(String(r.status || ''))).length;
  const active = items.filter((r) => /progress|pending|active|in progress|started|onprocess|draft/i.test(String(r.status || ''))).length;
  return {
    totalWorkItems: items.length,
    activeWorkItems: active,
    completedTotal: completed,
    overAllRate: items.length ? Math.round((completed / items.length) * 100) : 0,
    regions: Object.keys({ sulawesi: 1, kalimantan: 1 }),
  };
}

async function dashboardWorkitems(req) {
  let items = [];
  for (const d of siteTabs()) items = items.concat(await readCanonical(d));
  if (!Array.isArray(items)) return [];
  const decorated = items.map((i) => ({
    ...i,
    status: /completed|done|selesai|closed|passed|approved/i.test(String(i.status || '')) ? 'completed'
      : /progress|pending|active|in progress|started|onprocess|draft/i.test(String(i.status || '')) ? 'active'
      : 'planning',
    region: i._tab ? (String(i._tab).includes('SUL') ? 'Sulawesi' : 'Kalimantan') : '',
  })).filter((i) => i.wid);

  const limit = Math.max(1, Number(req?.query?.limit || 10));
  return decorated.slice(0, limit);
}

/** Route an authorized request. Returns { status, body } or null (unhandled). */
async function handlePath({ method, path, query, body }) {
  const parts = path.split('/').filter(Boolean);
  if (parts[0] !== 'api') return null;

  if (method === 'GET') {
    if (path.startsWith('/api/dashboard/summary')) return { status: 200, body: await dashboardSummary() };
    if (path.startsWith('/api/dashboard/regional')) return { status: 200, body: await dashboardRegional() };
    if (path.startsWith('/api/dashboard/kpi')) return { status: 200, body: await dashboardKpi() };
    if (path.startsWith('/api/dashboard/workitems')) return { status: 200, body: await dashboardWorkitems({ query }) };
    if (path.startsWith('/api/dashboard/')) {
      const tally = await dashboardSummary();
      return { status: 200, body: { totalWorkItems: tally.totalWorkItems, activeWorkItems: tally.activeWorkItems, completedTotal: tally.completedThisMonth, overAllRate: tally.totalWorkItems ? Math.round((tally.completedThisMonth / tally.totalWorkItems) * 100) : 0 } };
    }
    const resourceName = parts[1];
    const id = parts[2];
    if (!compat.resource(resourceName) && resourceName !== 'inbound' && resourceName !== 'lom') {
      return { status: 404, body: { error: `Unknown resource: ${resourceName}` } };
    }
    if (id) return getResourceById(resourceName, id);
    return listResource(resourceName, query || {});
  }

  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    const resourceName = parts[1];
    const id = parts[2];
    if (method === 'POST') return createResource(resourceName, method, body || {});
    if (method === 'PUT') return updateResource(resourceName, method, id, body || {});
    return deleteResource(resourceName);
  }

  return { status: 405, body: { error: 'Method not allowed' } };
}

module.exports = {
  handlePath,
  listResource,
  getResourceById,
  createResource,
  updateResource,
  deleteResource,
  dashboardSummary,
  dashboardRegional,
  dashboardKpi,
  dashboardWorkitems,
};