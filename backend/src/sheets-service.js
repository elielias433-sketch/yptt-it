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

module.exports = {
  getAuth,
  getSheets,
  listTabs,
  readSheet,
  appendRow,
  updateRow,
};