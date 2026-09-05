/**
 * sheets-service.js — Direct Google Sheets access via service account.
 *
 * Replaces the Apps Script forwarding layer for production reads/writes.
 * The service account (from FIREBASE_SERVICE_ACCOUNT) authenticates with
 * Google Sheets API v4 directly, so no Apps Script web-app is required.
 *
 * Env:
 *   FIREBASE_SERVICE_ACCOUNT  base64 of the service-account JSON (reused)
 *   SHEET_ID                  spreadsheet id (e.g. 1wP6sHi1-...)
 */

const { google } = require('googleapis');

let cachedAuth = null;

/** Build a JWT-authenticated Google client for the service account. */
function getAuth() {
  if (cachedAuth) return cachedAuth;
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!b64) throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured');
  const key = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  cachedAuth = auth;
  return auth;
}

function getSheets() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

/** Resolve spreadsheet id from env or explicit value. */
function resolveSheetId(explicit) {
  return explicit || process.env.SHEET_ID;
}

/** List all sheet (tab) names in a spreadsheet. */
async function listTabs(spreadsheetId) {
  const id = resolveSheetId(spreadsheetId);
  const res = await getSheets().spreadsheets.get({
    spreadsheetId: id,
  });
  return (res.data.sheets || []).map((s) => s.properties.title);
}

/**
 * Read a sheet as array of objects.
 * First row is treated as headers unless `headers` is provided.
 */
async function readSheet(spreadsheetId, tab, options = {}) {
  const id = resolveSheetId(spreadsheetId);
  const range = `${tab}!${options.range || 'A1:ZZ'}`;
  const res = await getSheets().spreadsheets.values.get({
    spreadsheetId: id,
    range,
  });
  const rows = res.data.values || [];
  if (rows.length === 0) return [];
  const headers = options.headers || rows[0];
  const body = options.headers && options.includeHeaderRow ? rows : rows.slice(options.headers ? 0 : 1);
  const objects = body.map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      const key = String(h || '').trim();
      if (!key) return;
      obj[key] = row[i] !== undefined ? row[i] : '';
    });
    return obj;
  });
  return objects.filter((o) => Object.keys(o).length > 0);
}

/** Append a row to a sheet. */
async function appendRow(spreadsheetId, tab, values) {
  const id = resolveSheetId(spreadsheetId);
  const res = await getSheets().spreadsheets.values.append({
    spreadsheetId: id,
    range: `${tab}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
  return res.data.updates;
}

/** Update an existing row (rowIndex is 1-based sheet row). */
async function updateRow(spreadsheetId, tab, rowIndex, values) {
  const id = resolveSheetId(spreadsheetId);
  const res = await getSheets().spreadsheets.values.update({
    spreadsheetId: id,
    range: `${tab}!A${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
  return res.data.updatedRows || 0;
}

/** Read raw rows of a tab: { headers, rows } where rows are arrays (excl. header). */
async function readTab(spreadsheetId, tab, range = 'A1:ZZ') {
  const id = resolveSheetId(spreadsheetId);
  const res = await getSheets().spreadsheets.values.get({
    spreadsheetId: id,
    range: `${tab}!${range}`,
  });
  const values = res.data.values || [];
  if (values.length === 0) return { headers: [], rows: [] };
  return { headers: values[0], rows: values.slice(1) };
}

/**
 * Find all row indexes (1-based, header row = 1) where a column exact-matches value.
 * @returns {number[]} sheet row numbers (start at 2 for first data row).
 */
async function findRowsByValue(spreadsheetId, tab, columnIndex, value) {
  const { rows } = await readTab(spreadsheetId, tab);
  const matches = [];
  const target = String(value == null ? '' : value).trim().toLowerCase();
  rows.forEach((row, i) => {
    const cell = row[columnIndex] !== undefined ? String(row[columnIndex]).trim().toLowerCase() : '';
    if (cell === target) matches.push(i + 2); // sheet row = data index + 1 (header) + 1
  });
  return matches;
}

/** Patch cells on a specific sheet row (1-based). patch = [{col, value}]. */
async function patchRow(spreadsheetId, tab, rowIndex, patch) {
  const id = resolveSheetId(spreadsheetId);
  const colLetter = (c) => {
    let n = c;
    let s = '';
    while (n >= 0) { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; }
    return s;
  };
  for (const { col, value } of patch) {
    const range = `${tab}!${colLetter(col)}${rowIndex}`;
    await getSheets().spreadsheets.values.update({
      spreadsheetId: id,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[value]] },
    });
  }
  return patch.length;
}

/** Delete a whole row (1-based sheet row) from a tab. */
async function deleteRowRow(spreadsheetId, tab, rowIndex) {
  const id = resolveSheetId(spreadsheetId);
  const meta = await getSheets().spreadsheets.get({ spreadsheetId: id });
  const sheet = (meta.data.sheets || []).find((s) => s.properties.title === tab);
  if (!sheet) throw new Error(`Tab not found: ${tab}`);
  const sheetId = sheet.properties.sheetId;
  await getSheets().spreadsheets.batchUpdate({
    spreadsheetId: id,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex },
        },
      }],
    },
  });
  return rowIndex;
}

module.exports = {
  getAuth,
  getSheets,
  listTabs,
  readSheet,
  readTab,
  findRowsByValue,
  appendRow,
  updateRow,
  patchRow,
  deleteRowRow,
};