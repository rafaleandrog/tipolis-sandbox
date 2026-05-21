/**************************************************************
 * TIPOLIS PRESS MONITOR — 10_Helpers.gs
 * Shared utilities: settings access, dates, week math, parsing,
 * sheet helpers, logging.
 **************************************************************/

/* ---------- Settings ---------- */

function getSetting_(key) {
  const sheet = sheet_(APP.SHEETS.SETTINGS);
  const last = getLastDataRowInCols_(sheet, 1, APP.HEADERS.SETTINGS.length);
  if (last < 2) return '';
  const data = sheet.getRange(2, 1, last - 1, 2).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) return String(data[i][1]);
  }
  return '';
}

function setSetting_(key, value) {
  const sheet = sheet_(APP.SHEETS.SETTINGS);
  const last = getLastDataRowInCols_(sheet, 1, APP.HEADERS.SETTINGS.length);
  if (last >= 2) {
    const data = sheet.getRange(2, 1, last - 1, 1).getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() === key) {
        sheet.getRange(i + 2, 2).setValue(value);
        return;
      }
    }
  }
  sheet.appendRow([key, value, '']);
}

/* ---------- Week math ----------
 * Report runs on Monday. The window it covers is the previous full week:
 * previous Monday 00:00:00 to previous Sunday 23:59:59.
 */
function getReportWindow_() {
  const now = new Date();
  const daysSinceMonday = (now.getDay() + 6) % 7;     // 0 if Monday
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - daysSinceMonday);
  thisMonday.setHours(0, 0, 0, 0);
  const start = new Date(thisMonday); start.setDate(thisMonday.getDate() - 7);
  const end = new Date(thisMonday.getTime() - 1000);  // previous Sunday 23:59:59
  return { start: start, end: end, thisMonday: thisMonday };
}

/**
 * Next report metadata: week number = last + 1, date = this Monday.
 */
function computeNextWeekMeta_() {
  const lastWeek = parseInt(getSetting_('last_report_week_number'), 10) || 0;
  const win = getReportWindow_();
  const d = win.thisMonday;
  return {
    weekNumber: lastWeek + 1,
    year: d.getFullYear(),
    reportDateIso: Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    reportDateDisplay: Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy')
  };
}

/* ---------- Sheet helpers ---------- */

function sheet_(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function colIndexMap_(headers) {
  const map = {};
  headers.forEach((h, i) => { map[h] = i; });   // 0-based for array access
  return map;
}

function getLastDataRowInCols_(sheet, startCol, numCols) {
  const maxRows = sheet.getMaxRows();
  const values = sheet.getRange(1, startCol, maxRows, numCols).getValues();
  for (let i = values.length - 1; i >= 0; i--) {
    const hasData = values[i].some(v =>
      (typeof v === 'boolean') ? v === true : String(v || '').trim() !== '');
    if (hasData) return i + 1;
  }
  return 1;
}

function getNextEmptyRowInCols_(sheet, startCol, numCols) {
  return getLastDataRowInCols_(sheet, startCol, numCols) + 1;
}

function getNextDisplayOrder_(approvedSheet) {
  const A = APP.COL.APPROVED;
  const last = getLastDataRowInCols_(approvedSheet, 1, APP.HEADERS.APPROVED.length);
  if (last < 2) return 1;
  const vals = approvedSheet.getRange(2, A.DISPLAY_ORDER, last - 1, 1).getValues();
  let max = 0;
  vals.forEach(v => { const n = Number(v[0]); if (Number.isFinite(n) && n > max) max = n; });
  return max + 1;
}

function approvedLinkExists_(approvedSheet, link) {
  const A = APP.COL.APPROVED;
  const last = getLastDataRowInCols_(approvedSheet, 1, APP.HEADERS.APPROVED.length);
  if (last < 2) return false;
  const target = normalizeUrl_(link);
  return approvedSheet.getRange(2, A.LINK, last - 1, 1).getValues()
    .some(r => normalizeUrl_(r[0]) === target);
}

/* ---------- Parsing / formatting ---------- */

function getChildText_(element, name) {
  const child = element.getChild(name);
  return child ? child.getText() : '';
}

function cleanGoogleNewsTitle_(title) {
  return cleanText_(title || '').replace(/\s+-\s+[^-]+$/, '').trim();
}

function extractSourceFromGoogleTitle_(title) {
  const parts = String(title || '').split(/\s+-\s+/);
  return parts.length > 1 ? cleanText_(parts[parts.length - 1]) : '';
}

function cleanText_(text) {
  return decodeHtml_(stripTags_(String(text || ''))).replace(/\s+/g, ' ').trim();
}

function stripTags_(text) { return String(text || '').replace(/<[^>]+>/g, ' '); }

function decodeHtml_(text) {
  return String(text || '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
}

function normalizeUrl_(url) { return String(url || '').trim(); }
function normalizeMatchType_(v) { return String(v || '').trim().toLowerCase() === 'exact' ? 'exact' : 'broad'; }
function normalizeLanguage_(v) { return (String(v || '').trim().toLowerCase()) || APP.DEFAULTS.language; }
function normalizeCountry_(v) { return String(v || '').trim().toUpperCase(); }

function toBoolean_(v, fallback) {
  if (typeof v === 'boolean') return v;
  const s = String(v || '').trim().toLowerCase();
  if (['true', 'yes', '1', 'y', 'sim'].includes(s)) return true;
  if (['false', 'no', '0', 'n', 'nao', 'não', ''].includes(s)) return false;
  return fallback;
}

function toPositiveInt_(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function toQueryString_(params) {
  return Object.keys(params)
    .filter(k => params[k] !== null && params[k] !== undefined && params[k] !== '')
    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
}

function escapeQuotes_(t) { return String(t || '').replace(/"/g, '\\"'); }

function truncate_(t, max) {
  const s = String(t || '');
  return s.length <= max ? s : s.substring(0, max - 3) + '...';
}

function formatDateTime_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

function formatDateTimeFromValue_(value) {
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value || '') : formatDateTime_(d);
}

function parseDateLoose_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  const d = new Date(String(value || ''));
  return isNaN(d.getTime()) ? null : d;
}

function getErrorMessage_(error) {
  return error && error.message ? error.message : String(error);
}

function log_(step, message) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(APP.SHEETS.LOGS) || ss.insertSheet(APP.SHEETS.LOGS);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, APP.HEADERS.LOGS.length).setValues([APP.HEADERS.LOGS]);
    sheet.setFrozenRows(1);
  }
  const row = getNextEmptyRowInCols_(sheet, 1, APP.HEADERS.LOGS.length);
  sheet.getRange(row, 1, 1, APP.HEADERS.LOGS.length)
    .setValues([[formatDateTime_(new Date()), step, message]]);
}
