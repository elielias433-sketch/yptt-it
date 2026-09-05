/**
 * compat-config.js — Port of Apps Script Compat.gs mapping (canonical → legacy)
 * into the backend so direct-Sheets reads/writes use the same column mapping as
 * the original secured Apps Script. Never mutates headers / tabs.
 */

function headerIndexes(headers) {
  const map = {};
  headers.forEach((h, i) => {
    const key = String(h || '').toLowerCase().trim();
    if (key !== '') map[key] = i; // last occurrence wins (Team List has 2 header blocks)
  });
  return map;
}

const CANONICAL_ALIASES = {
  'wid': 'wid', 'siteId': 'siteId', 'siteid': 'siteId',
  'site name': 'siteName', 'siteName': 'siteName', 'site name impl': 'siteName',
  'status': 'status', 'program': 'program', 'sow': 'sow', 'workType': 'workType',
  'worktype': 'workType', 'band': 'band', 'region': 'region', 'partner': 'partner',
  'partnerActual': 'partner', 'assignmentDate': 'assignmentDate',
  'monthlyTarget': 'monthlyTarget', 'monthlyAssignment': 'monthlyAssignment',
  'poYear': 'poYear', 'yearsAssigned': 'yearsAssigned', 'remark': 'remark',
  'remarks': 'remark', 'zteZone': 'zteZone', 'type': 'type',
  'materialName': 'materialName', 'material name': 'materialName',
  'quantity': 'quantity', 'dateRealise': 'dateRealise', 'datePickup': 'datePickup',
  'dateInbound': 'dateInbound', 'muverBy': 'muverBy', 'atp': 'atp',
  'totalPoAmt': 'totalPoAmt', 'name': 'name', 'position': 'position',
  'contact': 'contact', 'email': 'email', 'regionCity': 'regionCity',
  'iepmsAccount': 'iepmsAccount', 'teamInfo': 'teamInfo', 'idCardNo': 'idCardNo',
};

const RESOURCES = {
  sites_kal: {
    legacyTab: 'Site_KAL',
    key: 'wid',
    allowedOps: ['READ', 'CREATE', 'UPDATE'],
    fieldMap: {
      wid: ['WID'], siteId: ['Site ID', 'Site ID Impl'], siteName: ['Site Name', 'Site Name Impl'],
      program: ['Program CAPEX', 'Program'], sow: ['SOW Details', 'SOW', 'Detail SOW'],
      workType: ['Work Type'], band: ['Band'], region: ['Region', 'RTPO / Kabupaten'],
      status: ['Site Productivity Status', 'STATUS', 'Simple Closing (%)'],
      assignmentDate: ['ASSIGNMENT DATE', 'Assignment Date'],
      monthlyTarget: ['Monthly Target'], monthlyAssignment: ['Monthly Assignment'],
      poYear: ['PO Year'], yearsAssigned: ['Years Assigned'],
      remark: ['Remark', 'Remarks', 'REMARK'], zteZone: ['ZTE Zone', 'ZTE ZONE', 'Cluster', 'Branch'],
      connectedDate: ['Connected Date', 'Date Submit ATP'],
      partner: ['Partner Actual'],
    },
  },
  sites_sul: {
    legacyTab: 'Site_SUL',
    key: 'wid',
    allowedOps: ['READ', 'CREATE', 'UPDATE'],
    fieldMap: {
      wid: ['WID'], siteId: ['Site ID Impl', 'Site ID'], siteName: ['Site Name Impl', 'Site Name'],
      program: ['Program CAPEX', 'Program'], sow: ['SOW Details', 'SOW'], workType: ['Work Type'],
      band: ['Band'], region: ['Region'], status: ['Site Productivity Status', 'STATUS'],
      assignmentDate: ['Assignment Date'], monthlyTarget: ['Monthly Target'],
      monthlyAssignment: ['Monthly Assignment'], poYear: ['PO Year'],
      yearsAssigned: ['Years Assigned'], remark: ['Remark', 'Daily REMARK'],
      zteZone: ['ZTE Zone'], connectedDate: ['Connected Date', 'Date Submit ATP'], partner: ['Partner Actual'],
    },
  },
  materials: {
    legacyTab: 'Inbound',
    key: 'wid',
    allowedOps: ['READ', 'CREATE', 'UPDATE'],
    fieldMap: {
      wid: ['WID'], siteId: ['Site ID'], siteName: ['Site Name'],
      region: ['Region'], sow: ['SOW'], workType: ['Work Type'],
      materialName: ['Detail Material', 'Material Name'], status: ['Status LDM', 'Status Inbound', 'Status DR'],
      dateRealise: ['Date Realise'], datePickup: ['Date Pickup'], dateInbound: ['Date Inbound'],
      muverBy: ['Muver By'], type: ['Status Tagging'], remark: ['Remark'], quantity: ['Freq'],
    },
  },
  upgrades: {
    legacyTab: 'Site_Upgrade PLN',
    key: 'wid',
    allowedOps: ['READ', 'CREATE', 'UPDATE'],
    fieldMap: {
      wid: ['WID'], siteId: ['Site ID Impl'], siteName: ['Site Name Impl'],
      sow: ['SOW Planning'], workType: ['Work Type'], atp: ['ATP'],
      totalPoAmt: ['Total PO Amt (IDR) No Tax'], status: ['Site PLN Productivity Status'],
      remark: ['remarks', 'remarks Upgrade'],
    },
  },
  teams: {
    legacyTab: 'Team List',
    key: '',
    allowedOps: ['READ', 'CREATE', 'UPDATE'],
    fieldMap: {
      name: ['Name'], position: ['Position'], contact: ['Kontak'],
      email: ['Email'], regionCity: ['Region / City'],
      iepmsAccount: ['Akun Iepms'], teamInfo: ['Info Team'], idCardNo: ['ID Card No.'],
    },
  },
  validations: {
    legacyTab: 'Validasi',
    key: '',
    allowedOps: ['READ', 'CREATE', 'UPDATE'],
    fieldMap: {
      zteZone: ['ZTE ZONE'], tiEngineer: ['TI Engineer'],
      status: ['Status SM ATP'], gapAnalysis: ['GAP Analysis'],
      dismantleStatus: ['Dismantle Status'], ldmStatus: ['Status LDM'],
      siteId: ['Site ID'], wid: ['WID'],
    },
  },
};

/** Resolve resource descriptor by canonical resource name. */
function resource(name) {
  const key =
    name === 'sites' || name === 'sites_kal' ? 'sites_kal' :
    name === 'sites_sul' ? 'sites_sul' :
    name === 'materials' ? 'materials' :
    name === 'upgrades' ? 'upgrades' :
    name === 'teams' ? 'teams' :
    name === 'validations' ? 'validations' :
    null;
  return key ? RESOURCES[key] : null;
}

/** Map canonical field -> legacy column index within headers (-1 if n/a). */
function canonicalToColumn(resourceName, canonical, headers) {
  const r = resource(resourceName);
  if (!r) return -1;
  const candidates = r.fieldMap[canonical];
  if (!candidates || !candidates.length) return -1;
  const idx = headerIndexes(headers);
  for (const c of candidates) {
    const i = idx[String(c).toLowerCase().trim()];
    if (i !== undefined) return i;
  }
  return -1;
}

/** Extract canonical fields from a raw row (array) given headers. */
function rowToCanonical(resourceName, headers, row) {
  const r = resource(resourceName);
  const out = {};
  if (!r) return out;
  for (const canonical of Object.keys(r.fieldMap)) {
    const col = canonicalToColumn(resourceName, canonical, headers);
    if (col >= 0 && row[col] !== undefined) out[canonical] = row[col];
  }
  if (r.key && out[r.key] === undefined && r.key !== '') out[r.key] = '';
  return out;
}

/** Build a legacy row (empty padded) for CREATE with only mapped fields set. */
function buildCreateRow(resourceName, headers, data) {
  const r = resource(resourceName);
  const row = new Array(headers.length).fill('');
  if (!r) return row;
  for (const canonical of Object.keys(r.fieldMap)) {
    const col = canonicalToColumn(resourceName, canonical, headers);
    if (col < 0) continue;
    row[col] = data[canonical] !== undefined ? String(data[canonical]) : '';
  }
  if (r.key && data[r.key] !== undefined) {
    const keyCol = canonicalToColumn(resourceName, r.key, headers);
    if (keyCol >= 0) row[keyCol] = String(data[r.key]);
  }
  return row;
}

/** Build UPDATE patch: list of { col, value } for allowed fields present in data. */
function buildUpdatePatch(resourceName, headers, data, allowedFields) {
  const patch = [];
  for (const canonical of allowedFields) {
    const col = canonicalToColumn(resourceName, canonical, headers);
    if (col < 0) continue;
    if (data[canonical] !== undefined) patch.push({ col, value: String(data[canonical]) });
  }
  return patch;
}

/** Distance helper: which resource describes a legacy tab. */
function resourceForTab(legacyTab) {
  const t = String(legacyTab || '').toLowerCase().trim();
  for (const r of Object.values(RESOURCES)) {
    if (String(r.legacyTab).toLowerCase().trim() === t) return r;
  }
  return null;
}

module.exports = {
  RESOURCES,
  CANONICAL_ALIASES,
  resource,
  resourceForTab,
  headerIndexes,
  canonicalToColumn,
  rowToCanonical,
  buildCreateRow,
  buildUpdatePatch,
};