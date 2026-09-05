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

/** Region-aware tabs based on query.region (''=all, kal/sul). */
function tabsForRegion(query) {
  const r = String((query && query.region) || '').toLowerCase();
  if (r.includes('kal')) return [compat.resource(KAL)];
  if (r.includes('sul')) return [compat.resource(SUL)];
  return siteTabs();
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

/** List available site columns (all headers) from Site_SUL/KAL for the create form,
 *  tagging columns that hold date data so the UI can use a date picker. */
async function siteFields() {
  const isDateCol = (name) => {
    const lower = String(name || '').trim().toLowerCase();
    if (lower === '' || lower.startsWith('remark') || /^no\.?$/.test(lower)) return false;
    const patterns = [
      /date/i,
      /\bhi (start|done)\b/,
      /\binstallation start\b/,
      /expired|expire/,
      /release/,
      /\bclock in\b/,
      /^baut approved/,
      /submit/i,
      /\b(done|start|inbound|inbond|pickup|realise|realize|upload|finished)\b/,
    ];
    return patterns.some((re) => re.test(lower));
  };
  const fields = {};
  for (const [key, d] of [['sul', compat.resource(SUL)], ['kal', compat.resource(KAL)]]) {
    const { headers } = await svc.readTab(process.env.SHEET_ID, d.legacyTab);
    fields[key] = headers
      .map((h) => String(h || '').trim())
      .filter((h) => h !== '' && !/^no\.?$/i.test(h))
      .map((h) => ({
        name: h,
        type: isDateCol(h) ? 'date' : 'text',
      }));
  }
  return { status: 200, body: fields };
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

/** Related data for a site detail page (materials + validations joined). */
async function siteRelated(wid) {
  let materials = [];
  let validations = [];
  try {
    // Fetch site detail to learn siteId + zone for joins.
    const detail = await getResourceById('sites', wid);
    const siteId = detail.body && detail.body.siteId;
    const zone = detail.body && detail.body.zteZone;

    // Materials from Inbound by Site ID (exact).
    const mdesc = compat.resource('materials');
    if (mdesc) {
      materials = await readCanonical(mdesc);
      if (siteId) {
        const s = String(siteId).toLowerCase();
        materials = materials.filter((r) => r.siteId && String(r.siteId).toLowerCase() === s);
      }
    }

    // Validations: try exact WID, then Site ID, then zone fallback.
    const vdesc = compat.resource('validations');
    if (vdesc) {
      const allValidations = await readCanonical(vdesc);
      const w = String(wid || '').toLowerCase();
      let byKey = allValidations.filter((r) => (r.wid && String(r.wid).toLowerCase().includes(w)));
      if (byKey.length) {
        validations = byKey;
      } else if (siteId) {
        const bySid = allValidations.filter((r) =>
          r.siteId && String(r.siteId).toLowerCase() === String(siteId).toLowerCase());
        validations = bySid.length ? bySid : allValidations;
      } else {
        validations = allValidations;
      }
      // If still nothing by key/site, fall back to zone.
      if ((!byKey.length) && (!siteId || !allValidations.some((r) => r.siteId && String(r.siteId).toLowerCase() === String(siteId).toLowerCase())) && zone) {
        validations = allValidations.filter((r) =>
          r.zteZone && String(r.zteZone).toLowerCase() === String(zone).toLowerCase());
      }
    }
  } catch (e) { /* ignore */ }
  return {
    status: 200,
    body: { materials, validations, milestones: [], assignments: [] },
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

async function dashboardKpi(query) {
  let items = [];
  for (const d of tabsForRegion(query)) items = items.concat(await readCanonical(d));
  const isDone = (s) => /completed|done|selesai|closed|passed|approved/i.test(String(s || ''));
  const completed = items.filter((r) => isDone(r.status)).length;
  const active = items.filter((r) => /progress|pending|active|in progress|started|onprocess|draft/i.test(String(r.status || ''))).length;

  // avgTAT: average days between assignmentDate and connectedDate for completed items
  let tatSum = 0;
  let tatCount = 0;
  for (const r of items) {
    if (!isDone(r.status)) continue;
    const a = itemMonth(r); // fallback to connectedDate
    const assign = Date.parse(String(r.assignmentDate || ''));
    if (a && Number.isFinite(assign)) {
      const diff = Math.round((a.getTime() - assign) / 86400000);
      if (diff > 0 && diff < 1000) { tatSum += diff; tatCount++; }
    }
  }
  const avgTAT = tatCount ? Math.round(tatSum / tatCount) : 0;

  // onTimeDelivery: connected within 60 days of assignment
  let onTime = 0;
  for (const r of items) {
    if (!isDone(r.status)) continue;
    const a = itemMonth(r);
    const assign = Date.parse(String(r.assignmentDate || ''));
    if (a && Number.isFinite(assign)) {
      const diff = Math.round((a.getTime() - assign) / 86400000);
      if (diff >= 0 && diff <= 60) onTime++;
    }
  }
  const onTimeDelivery = completed ? Math.round((onTime / completed) * 100) : 0;

  // materialOnTime: % inbound items completed from Inbound tab
  let matTotal = 0;
  let matDone = 0;
  try {
    const matItems = await svc.readTab(process.env.SHEET_ID, 'Inbound');
    matTotal = matItems.rows.length;
    // Prefer "Status LDM" (progress), fallback to any status-ish column.
    const h = matItems.headers.map((x) => String(x || '').toLowerCase());
    let statusCol = h.findIndex((x) => x === 'status ldm');
    if (statusCol < 0) statusCol = h.findIndex((x) => /status/i.test(x));
    if (statusCol >= 0) {
      matDone = matItems.rows.filter((r) => /completed|done|done tagging|ldm done|inbound done|complete|selesai|finished|approved|pass/i.test(String(r[statusCol] || ''))).length;
    }
  } catch (e) { /* ignore */ }
  const materialOnTime = matTotal ? Math.round((matDone / matTotal) * 100) : 0;

  return {
    totalWorkItems: items.length,
    activeWorkItems: active,
    completedWorkItems: completed,
    overdueWorkItems: 0,
    completionRate: items.length ? Math.round((completed / items.length) * 100) : 0,
    avgTAT,
    onTimeDelivery,
    materialOnTime,
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
  const candidates = ['connectedDate'];
  for (const key of candidates) {
    if (item[key] && item[key].trim) {
      const t = Date.parse(String(item[key]));
      if (Number.isFinite(t)) return new Date(t);
    }
  }
  const fallback = item._tab && String(item._tab).includes('SUL')
    ? ['Dismantle Date', 'Date Upload', 'eATP Approve TSEL Date']
    : ['Clock out Date', 'ASSIGNMENT DATE'];
  for (const key of fallback) {
    const t = Date.parse(String(item[key] || ''));
    if (Number.isFinite(t)) return new Date(t);
  }
  return null;
}

/** Monthly trend lines (for KPI Trends chart). */
async function kpiTrends(query) {
  let items = [];
  for (const d of tabsForRegion(query)) items = items.concat(await readCanonical(d));
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
  return {
    months: buckets.map((b) => b.label),
    series: [
      { label: 'WID Volume', data: buckets.map((b) => b.total), color: '#3b82f6' },
      { label: 'Completion', data: buckets.map((b) => (b.total ? Math.round((b.done / b.total) * 100) : 0)), color: '#10b981' },
    ],
  };
}

/** KPI breakdown by region / program / status. */
async function kpiBreakdown(query) {
  let items = [];
  for (const d of tabsForRegion(query)) items = items.concat(await readCanonical(d));
  const byProgram = {};
  for (const it of items) {
    const p = String(it.program || 'Unknown').trim() || 'Unknown';
    if (!byProgram[p]) byProgram[p] = { total: 0, active: 0, completed: 0 };
    byProgram[p].total++;
    if (/completed|done|selesai|closed|passed|approved/i.test(String(it.status || ''))) byProgram[p].completed++;
    else if (/progress|pending|active|in progress|started|onprocess|draft/i.test(String(it.status || ''))) byProgram[p].active++;
  }
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
  // Per-region rows for the Breakdown table (real data, not placeholders).
  const rows = [];
  const regionPairs = [
    ['Sulawesi', compat.resource(SUL)],
    ['Kalimantan', compat.resource(KAL)],
  ].filter(([, d]) => tabsForRegion(query).includes(d));
  for (const [key, d] of regionPairs) {
    const regItems = await readCanonical(d);
    const comp = regItems.filter((r) => /completed|done|selesai|closed|passed|approved/i.test(String(r.status || ''))).length;
    const act = regItems.filter((r) => /progress|pending|active|in progress|started|onprocess|draft/i.test(String(r.status || ''))).length;
    rows.push({
      region: key,
      total: regItems.length,
      active: act,
      completed: comp,
      overdue: 0,
      completionRate: regItems.length ? Math.round((comp / regItems.length) * 100) : 0,
      avgTAT: 0,
    });
  }
  // Monthly target vs actual (last 6 months): target=items with Monthly Target set
  // that were assigned that month; actual=items with Connected Date that month.
  const monthly = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    let target = 0;
    let actual = 0;
    for (const it of items) {
      const mt = Number(String(it.monthlyTarget || '').replace(/[^0-9.\-]/g, ''));
      const dm = itemMonth(it);
      if (!Number.isNaN(mt) && mt > 0 && dm && dm.getFullYear() === y && dm.getMonth() === m) target++;
      if (dm && dm.getFullYear() === y && dm.getMonth() === m &&
          /completed|done|selesai|closed|passed|approved/i.test(String(it.status || ''))) actual++;
    }
    monthly.push({
      label: `${d.toLocaleString('en', { month: 'short' })} ${String(y).slice(2)}`,
      target,
      actual,
      variance: actual - target,
      achievement: target ? Math.round((actual / target) * 100) : 0,
    });
  }
  return { byRegion, byProgram, byStatus, rows, monthly };
}

/** Read Dashboard_SULAWESI (Excel summary) tab into region blocks. */
async function dashboardSulawesi() {
  const res = await svc.getSheets().spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: 'Dashboard_SULAWESI!A1:G300',
  });
  const rows = res.data.values || [];
  const out = {};
  let current = null;
  for (const r of rows) {
    const idx = String(r[0] || '').trim();
    if (/SUMMARY$/i.test(idx)) {
      const name = idx.replace(/\s+SUMMARY.*/i, '').toLowerCase();
      current = name;
      out[name] = { rows: [] };
      continue;
    }
    if (/^Milestone$/i.test(idx)) continue; // header
    if (!current || idx === '') continue;
    out[current].rows.push({
      milestone: idx,
      assignment: r[1] !== undefined ? r[1] : '',
      plan: r[2] !== undefined ? r[2] : '',
      ach: r[3] !== undefined ? r[3] : '',
      delta: r[4] !== undefined ? r[4] : '',
      pct: r[5] !== undefined ? String(r[5]) : '',
      remarks: r[6] !== undefined ? String(r[6]) : '',
    });
  }
  return out;
}

/** Route an authorized request. Returns { status, body } or null (unhandled). */
async function handlePath({ method, path, query, body }) {
  const parts = path.split('/').filter(Boolean);
  if (parts[0] !== 'api') return null;

  if (method === 'GET') {
    if (path.startsWith('/api/dashboard/summary')) return { status: 200, body: await dashboardSummary() };
    if (path.startsWith('/api/dashboard/sulawesi')) return { status: 200, body: await dashboardSulawesi() };
    if (path.startsWith('/api/dashboard/regional')) return { status: 200, body: await dashboardRegional() };
    if (path.startsWith('/api/dashboard/kpi/trends')) return { status: 200, body: await kpiTrends(query || {}) };
    if (path.startsWith('/api/dashboard/kpi/breakdown')) return { status: 200, body: await kpiBreakdown(query || {}) };
    if (path.startsWith('/api/dashboard/kpi')) return { status: 200, body: await dashboardKpi(query || {}) };
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
    if (resourceName === 'sites' && parts[2] === 'fields') return siteFields();
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
  dashboardSulawesi,
  siteFields,
};