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

/** Read a tab via compat config and return canonical rows (tagged _tab, _row). */
async function readCanonical(descriptor) {
  const { headers, rows } = await svc.readTab(process.env.SHEET_ID, descriptor.legacyTab);
  return rows.map((row, i) => ({
    ...compat.rowToCanonical(descriptorName(descriptor), headers, row),
    _tab: descriptor.legacyTab,
    _row: i + 2,
  }));
}

/** Strip internal markers, expose `id` (sheet row) for client use. */
function exposeRows(rows) {
  return rows.map(({ _tab, _row, ...rest }) => ({ ...rest, id: _row }));
}

function descriptorName(d) {
  for (const [k, v] of Object.entries(compat.RESOURCES)) if (v === d) return k;
  return null;
}

// ---------------------------------------------------------------------------
// READ
// ---------------------------------------------------------------------------

/** Frontend response shapes: resource -> response key (wrapped { key, total }). */
const RESPONSE_SHAPE = {
  sites: 'sites',
  materials: 'materials',
  validations: 'validations',
  workorders: 'workOrders',
};

async function listResource(resourceName, query = {}) {
  const desc = compat.resource(resourceName);
  let rows = [];
  if (desc) {
    if (resourceName === 'sites') {
      for (const d of siteTabs()) rows = rows.concat(await readCanonical(d));
    } else {
      rows = await readCanonical(desc);
    }
  }
  // 'workorders' uses the site workbook as its data source (work items).
  if (resourceName === 'workorders') {
    for (const d of siteTabs()) rows = rows.concat(await readCanonical(d));
  }

    // Decorate sites/workorders rows with region from source tab.
  if (resourceName === 'sites' || resourceName === 'workorders') {
    rows = rows.map((r) => ({
      ...r,
      region: r._tab && String(r._tab).toUpperCase().includes('KAL')
        ? 'KAL'
        : r._tab && String(r._tab).toUpperCase().includes('SUL')
          ? 'SUL'
          : (r.region || 'SUL'),
    }));
  }

  const CONTROL = new Set(['limit', 'offset', 'page', 'sort', 'order', 'sortField', 'sortOrder', 'search', 'tab']);
  // Explicit filters (region, status, workType, zone, ...) with forgiving matching.
  for (const [k, v] of Object.entries(query)) {
    if (!v || CONTROL.has(k)) continue;
    const want = String(v).toLowerCase().trim();
    rows = rows.filter((r) => {
      // 'zone' query maps to zteZone field on each row.
      const field = k === 'zone' ? 'zteZone' : k;
      const val = String(r[field] === undefined ? '' : r[field]).toLowerCase();
      if (k === 'region') {
        return want === 'kal' ? val.includes('kal') : val.includes('sul');
      }
      if (!r[field] && ['status', 'workType'].includes(field)) return false;
      if (k === 'zone') return val.includes(want);
      return val.includes(want);
    });
  }
  // Free-text search across important fields
  if (query.search) {
    const s = String(query.search).toLowerCase();
    rows = rows.filter((r) =>
      ['wid', 'siteId', 'siteName', 'sow', 'workType', 'program', 'zteZone'].some((f) =>
        r[f] !== undefined && String(r[f]).toLowerCase().includes(s)));
  }
  // Sorting
  const sortField = String(query.sortField || query.sort || '').toLowerCase();
  const sortOrder = String(query.sortOrder || query.order || 'asc').toLowerCase();
  if (sortField && !['updatedat', 'period', 'createdat'].includes(sortField)) {
    rows.sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      const an = Number(String(av || '').replace(/[^0-9.\-]/g, ''));
      const bn = Number(String(bv || '').replace(/[^0-9.\-]/g, ''));
      let cmp;
      if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) cmp = an - bn;
      else cmp = String(av || '').localeCompare(String(bv || ''));
      return sortOrder === 'desc' ? -cmp : cmp;
    });
  }
  // Pagination
  const limit = Math.max(1, Number(query.limit || 20));
  const page = Math.max(1, Number(query.page || 1));
  const offset = query.offset !== undefined ? Number(query.offset) : (page - 1) * limit;
  const sliced = rows.slice(offset, offset + limit);

  if (RESPONSE_SHAPE[resourceName]) {
    const body = { [RESPONSE_SHAPE[resourceName]]: exposeRows(sliced), total: rows.length };
    if (resourceName === 'validations') body.zones = ['Pare Pare', 'Makassar', 'Other'];
    return { status: 200, body };
  }
  // teams / upgrades return a plain array
  return { status: 200, body: exposeRows(sliced) };
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
        // Build raw: full row keyed by every header (for full-column editing).
        const raw = {};
        headers.forEach((header, i) => {
          const h = String(header || '').trim();
          if (h !== '' && !/^no\.?$/i.test(h)) raw[h] = rows[idx][i] !== undefined ? rows[idx][i] : '';
        });
        return { status: 200, body: { ...exposeRows([{ ...canonical, _row: found[0] }])[0], tab: d.legacyTab, rowIndex: found[0], raw } };
      }
    }
  }
  return { status: 404, body: { error: 'Not found' } };
}

/** Related data for a site detail page (materials from Inbound by site id). */
async function siteRelated(wid) {
  let materials = [];
  try {
    const desc = compat.resource('materials'); // maps to Inbound
    if (desc) {
      materials = await readCanonical(desc);
      const w = String(wid || '').toLowerCase();
      materials = materials.filter((r) =>
        r.siteId && String(r.siteId).toLowerCase() === w);
    }
  } catch (e) { /* ignore */ }
  return {
    status: 200,
    body: { materials, validations: [], milestones: [], assignments: [] },
  };
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
  // Resolve the exact appended sheet row from the API's updatedRange.
  let rowIndex = rows.length; // fallback (last data row)
  const m = String(updated?.updatedRange || '').split('!').pop().match(/(\d+)$/);
  if (m) rowIndex = Number(m[1]);
  const rawRow = rows[rowIndex - 2];
  const canonical = rawRow ? compat.rowToCanonical(dname, headers, rawRow) : {};
  return { status: 201, body: { ...exposeRows([{ ...canonical, _row: rowIndex }])[0], tab: desc.legacyTab, rowIndex, created: true } };
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
  const { headers } = await svc.readTab(process.env.SHEET_ID, desc.legacyTab);
  let targetRow;
  if (key) {
    const keyCol = compat.canonicalToColumn(dname, key, headers);
    if (keyCol < 0) return { status: 500, body: { error: 'Key column not found' } };
    const matches = await svc.findRowsByValue(process.env.SHEET_ID, desc.legacyTab, keyCol, id);
    if (matches.length === 0) return { status: 404, body: { error: 'Not found' } };
    if (matches.length > 1) return { status: 409, body: { error: `Ambiguous: ${matches.length} rows match ${key}=${id}` } };
    targetRow = matches[0];
  } else {
    // No stable key (teams/validations) -> id is the sheet row number.
    const rowNum = Number(id);
    if (!Number.isInteger(rowNum) || rowNum < 2) return { status: 400, body: { error: 'Invalid row id' } };
    const total = (await svc.readTab(process.env.SHEET_ID, desc.legacyTab)).rows.length;
    if (rowNum > total + 1) return { status: 404, body: { error: 'Not found' } };
    targetRow = rowNum;
  }

  const allowedFields = Object.keys(desc.fieldMap);
  const cleanPatch = compat.buildUpdatePatch(dname, headers, body, allowedFields);
  // Support full-column editing: body.raw = { <header>: value } for every column.
  if (body.raw && typeof body.raw === 'object') {
    const idx = compat.headerIndexes(headers);
    for (const [headerKey, val] of Object.entries(body.raw)) {
      const col = idx[String(headerKey).toLowerCase().trim()];
      if (col === undefined || col <= 0) continue; // skip index column, protect row
      cleanPatch.push({ col, value: String(val === undefined ? '' : val) });
    }
  }
  // Merge duplicate column patches (last value wins).
  const merged = [];
  const seen = new Set();
  for (const p of cleanPatch) {
    if (seen.has(p.col)) {
      const old = merged.findIndex((m) => m.col === p.col);
      merged[old] = p;
    } else {
      seen.add(p.col);
      merged.push(p);
    }
  }
  await svc.patchRow(process.env.SHEET_ID, desc.legacyTab, targetRow, merged);

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
  const idx = targetRow - 2;
  const canonical = rows[idx] ? compat.rowToCanonical(dname, headers, rows[idx]) : {};
  return { status: 200, body: { ...canonical, tab: desc.legacyTab, rowIndex: targetRow, updated: true } };
}

/** DELETE — removes the matching row (admin-only, enforced upstream). */
async function deleteResource(resourceName, id) {
  const desc = compat.resource(resourceName);
  if (!desc) return { status: 404, body: { error: 'Unknown resource' } };
  const isSites = resourceName === 'sites';
  const descs = isSites ? siteTabs() : [desc];
  const dname = isSites ? descriptorName(descs[0]) : descriptorName(desc);

  // Row-based delete (teams/validations): id = sheet row number.
  if (!desc.key) {
    const rowNum = Number(id);
    if (!Number.isInteger(rowNum) || rowNum < 2) return { status: 400, body: { error: 'Invalid row id' } };
    await svc.deleteRowRow(process.env.SHEET_ID, desc.legacyTab, rowNum);
    return { status: 200, body: { deleted: true, tab: desc.legacyTab, rowIndex: rowNum } };
  }

  // Key-based delete (sites/materials/upgrades): search by key across tabs.
  for (const d of descs) {
    const dn = isSites ? descriptorName(d) : descriptorName(desc);
    const { headers } = await svc.readTab(process.env.SHEET_ID, d.legacyTab, 'A1:ZZ');
    const keyCol = compat.canonicalToColumn(dn, d.key, headers);
    if (keyCol < 0) continue;
    const matches = await svc.findRowsByValue(process.env.SHEET_ID, d.legacyTab, keyCol, id);
    for (const m of matches.slice().reverse()) {
      await svc.deleteRowRow(process.env.SHEET_ID, d.legacyTab, m);
    }
    if (matches.length) {
      return { status: 200, body: { deleted: true, tab: d.legacyTab, rows: matches } };
    }
  }
  return { status: 404, body: { error: 'Not found' } };
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

/** Date used for monthly aggregation (completed date / connected date). */
function itemMonth(item) {
  const candidates = item._tab && String(item._tab).includes('SUL')
    ? ['Connected Date', 'Dismantle Date', 'Date Upload', 'eATP Approve TSEL Date']
    : ['Date Submit ATP', 'Clock out Date', 'ASSIGNMENT DATE'];
  for (const key of candidates) {
    const t = Date.parse(String(item[key] || ''));
    if (Number.isFinite(t)) return new Date(t);
  }
  return null;
}

/** Monthly trend lines (for KPI Trends chart). */
async function kpiTrends() {
  let items = [];
  for (const d of siteTabs()) items = items.concat(await readCanonical(d));
  const months = 6;
  const now = new Date();
  const buckets = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      label: `${d.toLocaleString('en', { month: 'short' })} ${String(d.getFullYear()).slice(2)}`,
      total: 0,
      done: 0,
    });
  }
  for (const it of items) {
    const dt = itemMonth(it) || new Date();
    const diff = (now.getFullYear() - dt.getFullYear()) * 12 + (now.getMonth() - dt.getMonth());
    const idx = months - 1 - diff;
    if (idx >= 0 && idx < months) {
      buckets[idx].total++;
      if (/completed|done|selesai|closed|passed|approved/i.test(String(it.status || ''))) buckets[idx].done++;
    }
  }
  return [
    { label: 'WID Volume', data: buckets.map((b) => b.total), color: '#3b82f6' },
    { label: 'Completion', data: buckets.map((b) => (b.total ? Math.round((b.done / b.total) * 100) : 0)), color: '#10b981' },
  ];
}

/** KPI breakdown by region / program / status. */
async function kpiBreakdown() {
  let items = [];
  for (const d of siteTabs()) items = items.concat(await readCanonical(d));
  const count = (key) => {
    const map = {};
    for (const it of items) {
      const v = String(it[key] || it.program || 'Unknown').trim() || 'Unknown';
      map[v] = (map[v] || 0) + 1;
    }
    return map;
  };
  const byRegion = {};
  for (const it of items) {
    const r = it._tab && String(it._tab).includes('SUL') ? 'Sulawesi' : 'Kalimantan';
    byRegion[r] = (byRegion[r] || 0) + 1;
  }
  const byStatus = {};
  for (const it of items) {
    const s = /completed|done|selesai|closed|passed|approved/i.test(String(it.status || '')) ? 'Completed'
      : /progress|pending|active|in progress|started|onprocess|draft/i.test(String(it.status || '')) ? 'Active'
      : 'Planning';
    byStatus[s] = (byStatus[s] || 0) + 1;
  }
  return { byRegion, byProgram: count('program'), byStatus };
}

/** Route an authorized request. Returns { status, body } or null (unhandled). */
async function handlePath({ method, path, query, body }) {
  const parts = path.split('/').filter(Boolean);
  if (parts[0] !== 'api') return null;

  if (method === 'GET') {
    if (path.startsWith('/api/dashboard/summary')) return { status: 200, body: await dashboardSummary() };
    if (path.startsWith('/api/dashboard/regional')) return { status: 200, body: await dashboardRegional() };
    if (path.startsWith('/api/dashboard/kpi/trends')) return { status: 200, body: await kpiTrends() };
    if (path.startsWith('/api/dashboard/kpi/breakdown')) return { status: 200, body: await kpiBreakdown() };
    if (path.startsWith('/api/dashboard/kpi')) return { status: 200, body: await dashboardKpi() };
    if (path.startsWith('/api/dashboard/workitems')) return { status: 200, body: await dashboardWorkitems({ query }) };
    if (path.startsWith('/api/dashboard/')) {
      const tally = await dashboardSummary();
      return { status: 200, body: { totalWorkItems: tally.totalWorkItems, activeWorkItems: tally.activeWorkItems, completedTotal: tally.completedThisMonth, overAllRate: tally.totalWorkItems ? Math.round((tally.completedThisMonth / tally.totalWorkItems) * 100) : 0 } };
    }
    const resourceName = parts[1];
    const id = parts[2];
    const KNOWN = new Set(['workorders', 'inbound', 'lom', 'ineom', 'inbound-return']);
    if (!compat.resource(resourceName) && !KNOWN.has(resourceName)) {
      return { status: 404, body: { error: `Unknown resource: ${resourceName}` } };
    }
    const decodedId = (() => { try { return decodeURIComponent(id); } catch (e) { return id; } })();
    if (id && parts[3] === 'related' && resourceName === 'sites') return siteRelated(decodedId);
    if (id) return getResourceById(resourceName, decodedId);
    return listResource(resourceName, query || {});
  }

  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    const resourceName = parts[1];
    const id = parts[2];
    const decodedId = (() => { try { return decodeURIComponent(id); } catch (e) { return id; } })();
    if (method === 'POST') return createResource(resourceName, method, body || {});
    if (method === 'PUT') return updateResource(resourceName, method, decodedId, body || {});
    return deleteResource(resourceName, decodedId);
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
  kpiTrends,
  kpiBreakdown,
};