/**
 * sheets-router.js — Map gateway API paths to direct Google Sheets reads.
 *
 * Once the backend has verified the Firebase ID token + RBAC (done upstream),
 * this module resolves the request path to a spreadsheet tab and returns JSON
 * built from the live sheet data.
 *
 * Env:
 *   SHEET_ID   spreadsheet id (1wP6sHi1-...)
 */

const svc = require('./sheets-service');

const SUL_TAB = 'Site_SUL';
const KAL_TAB = 'Site_KAL';

const DEFAULT_TABS = {
  sites: [SUL_TAB, KAL_TAB],
  teams: ['Team List'],
  materials: [],            // no dedicated tab; material/equipment data - inbound has material detail
  validations: ['Validasi'],
  workorders: [],           // no dedicated tab in this workbook
  upgrades: [],
  inbound: ['Inbound'],
  ineom: ['Ineom'],
  lom: ['LOM'],
  "inbound-return": ['Inbound Return'],
};

const REGION_TAB_MAP = {
  sulawesi: [SUL_TAB],
  kalimantan: [KAL_TAB],
};

function resolveTabs(key) {
  return DEFAULT_TABS[key] || [];
}

/**
 * Extract a status-ish token from a row using the actual columns of each tab.
 * Completed: COMPLETED / DONE / SELESAI / CLOSED / PASSED / APPROVED
 * Active:    PROGRESS / PENDING / ACTIVE / STARTED / ONGOING / OPEN / DRAFT
 */
function classifyStatus(row, tab) {
  const s = tab.includes('SUL')
      ? String(row['Site Productivity Status'] || row['SM Status'] || row['Status'] || '').toUpperCase()
      : String(row['STATUS'] || row['Status'] || row['CI Status'] || '').toUpperCase();
  if (/COMPLETED|DONE|SELESAI|CLOSED|PASSED|APPROVED|FINISHED/.test(s)) return 'completed';
  if (/PROGRESS|PENDING|ACTIVE|STARTED|ONGOING|OPEN|DRAFT|IN_/.test(s)) return 'active';
  return 'other';
}

/** Best-effort date from a row for "completed this month" checks. */
function doneDate(row, tab) {
  const candidates = tab.includes('SUL')
      ? ['Connected Date', 'Dismantle Date', 'Date Upload', 'eATP Approve TSEL Date']
      : ['Date Submit ATP', 'Clock out Date', 'Date'];
  for (const key of candidates) {
    const v = row[key];
    const t = v ? Date.parse(String(v)) : NaN;
    if (Number.isFinite(t)) return new Date(t);
  }
  return null;
}

async function collectWorkItems(tabs) {
  const all = [];
  for (const tab of tabs) {
    const rows = await svc.readSheet(process.env.SHEET_ID, tab);
    for (const r of rows) {
      const kl = classifyStatus(r, tab);
      if (kl !== 'other') all.push({ ...r, _tab: tab, _klass: kl });
    }
  }
  return all;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function dashboardSummary() {
  const items = await collectWorkItems([SUL_TAB, KAL_TAB]);
  const completed = items.filter((i) => i._klass === 'completed');
  const active = items.filter((i) => i._klass === 'active');
  const now = new Date();
  const completedThisMonth = completed
    .filter((i) => {
      const d = doneDate(i, i._tab);
      return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

  let materialsInbound = 0;
  try {
    materialsInbound = (await svc.readSheet(process.env.SHEET_ID, 'Inbound')).length;
  } catch (e) { /* ignore */ }

  let validationRate = 0;
  try {
    const vrows = await svc.readSheet(process.env.SHEET_ID, 'Validasi');
    const hasDmt = vrows.filter((r) => /done|passed|approved|selesai|ok/i.test(String(r.DMT || r.ATP || ''))).length;
    validationRate = vrows.length ? Math.round((hasDmt / vrows.length) * 100) : 0;
  } catch (e) { /* ignore */ }

  return {
    totalWorkItems: items.length,
    activeWorkItems: active.length,
    completedThisMonth,
    overdueMilestones: 0,
    materialsInbound,
    validationRate,
  };
}

async function dashboardRegional() {
  const out = {};
  for (const [key, tabs] of Object.entries(REGION_TAB_MAP)) {
    const items = await collectWorkItems(tabs);
    const completed = items.filter((i) => i._klass === 'completed').length;
    const active = items.filter((i) => i._klass === 'active').length;
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
  const items = await collectWorkItems([SUL_TAB, KAL_TAB]);
  const completed = items.filter((i) => i._klass === 'completed');
  return {
    totalWorkItems: items.length,
    activeWorkItems: items.filter((i) => i._klass === 'active').length,
    completedTotal: completed.length,
    overAllRate: items.length ? Math.round((completed.length / items.length) * 100) : 0,
    regions: Object.keys(REGION_TAB_MAP).map((k) => k),
  };
}

async function dashboardWorkitems(req) {
  const items = await collectWorkItems([SUL_TAB, KAL_TAB]);
  const limit = Number(req.query.limit || 10);
  const sort = String(req.query.sort || '').toLowerCase();
  const order = String(req.query.order || 'desc').toLowerCase();
  if (sort && items.length && items[0][sort] !== undefined) {
    items.sort((a, b) => {
      const cmp = String(a[sort] || '').localeCompare(String(b[sort] || ''));
      return order === 'asc' ? cmp : -cmp;
    });
  } else {
    items.sort((a, b) => {
      const da = doneDate(a, a._tab);
      const db = doneDate(b, b._tab);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return order === 'asc' ? ta - tb : tb - ta;
    });
  }
  return items.slice(0, limit).map((i) => {
    const { _tab, _klass, ...rest } = i;
    return { ...rest, status: _klass, region: _tab.includes('SUL') ? 'Sulawesi' : 'Kalimantan' };
  });
}

async function listRows(req) {
  const parts = req.path.split('/').filter(Boolean);
  const resource = parts[1] || '';
  const tabs = resolveTabs(resource);
  const rows = [];
  for (const tab of tabs) {
    const items = await svc.readSheet(process.env.SHEET_ID, tab);
    rows.push(...items.map((r) => ({ ...r, tab })));
  }
  const limit = Number(req.query.limit || (rows.length === 0 ? 20 : Math.min(rows.length, 20)));
  return rows.slice(0, limit);
}

/**
 * Route an authorized request to the correct handler.
 * Returns { status, body } or null when the path is not handled here.
 */
async function handlePath({ method, path, query }) {
  const parts = path.split('/').filter(Boolean);
  if (parts[0] !== 'api') return null;

  if (method === 'GET') {
    if (path.startsWith('/api/dashboard/summary')) return { status: 200, body: await dashboardSummary() };
    if (path.startsWith('/api/dashboard/regional')) return { status: 200, body: await dashboardRegional() };
    if (path.startsWith('/api/dashboard/kpi')) return { status: 200, body: await dashboardKpi() };
    if (path.startsWith('/api/dashboard/workitems')) return { status: 200, body: await dashboardWorkitems({ query }) };
    if (path.startsWith('/api/dashboard/')) return { status: 200, body: {} };
    return { status: 200, body: await listRows({ path, query }) };
  }

  if (['POST', 'PUT', 'DELETE'].includes(method) && parts.length >= 2) {
    const resource = parts[1];
    const tabs = resolveTabs(resource);
    if (tabs.length === 0) {
      return { status: 501, body: { error: `Write not supported yet for resource: ${resource}` } };
    }
    return { status: 501, body: { error: `Write via Sheets direct: not yet implemented for ${resource}` } };
  }

  return null;
}

module.exports = {
  handlePath,
  dashboardSummary,
  dashboardRegional,
  dashboardKpi,
  dashboardWorkitems,
  listRows,
};