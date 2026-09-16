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

// Missing/blank/true => ON. Only an explicit off value pauses it.
function isAutoRunOn_(key) {
  const v = String(getSetting_(key) || '').trim().toLowerCase();
  return v !== 'false' && v !== 'off' && v !== '0' && v !== 'no';
}

function pauseDailyAutomation() {
  setSetting_('daily_search_auto_run', 'false');
  setSetting_('daily_filter_auto_run', 'false');
  log_('automation', 'Daily automation PAUSED (search + AI classification).');
  SpreadsheetApp.getUi().alert(
    'Automação diária PAUSADA.\n\n' +
    'A busca das 06h e a classificação das 07h não vão rodar até você religar. ' +
    'Os comandos manuais do menu continuam funcionando normalmente.'
  );
}

function resumeDailyAutomation() {
  setSetting_('daily_search_auto_run', 'true');
  setSetting_('daily_filter_auto_run', 'true');
  log_('automation', 'Daily automation RESUMED (search + AI classification).');
  SpreadsheetApp.getUi().alert(
    'Automação diária RELIGADA.\n\n' +
    'Busca diária (~06h) e classificação (~07h) estão ativas de novo.'
  );
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

// Fetches the real article page so the summary is built from full text, not just the feed snippet.
// Falls back to '' on paywalls, bot-blocks, JS-rendered pages, or any error.
function fetchArticleText_(url) {
  if (!url) return '';
  try {
    const resp = UrlFetchApp.fetch(url, {
      method: 'get', muteHttpExceptions: true, followRedirects: true,
      headers: { 'User-Agent': APP.USER_AGENT, 'Accept': 'text/html,application/xhtml+xml,*/*' }
    });
    const code = resp.getResponseCode();
    if (code < 200 || code >= 300) {
      log_('fetchArticleText', `HTTP ${code} for ${truncate_(String(url), 120)}`);
      return '';
    }
    let html = resp.getContentText();
    if (!html) return '';
    // Drop scripts/styles/comments, then prefer the <article> block if present.
    html = html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
              .replace(/<style[\s\S]*?<\/style>/gi, ' ')
              .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
              .replace(/<!--[\s\S]*?-->/g, ' ');
    const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
    if (articleMatch) html = articleMatch[0];
    const text = cleanText_(html);   // strips tags, decodes entities, collapses whitespace
    return text.length >= 200 ? truncate_(text, APP.LIMITS.MAX_CONTENT_CHARS) : '';
  } catch (err) {
    log_('fetchArticleText', `Error for ${truncate_(String(url), 120)}: ${getErrorMessage_(err)}`);
    return '';
  }
}

/* ============================================================
* ARTICLE READING TEST KIT (no AI, no changes to existing flow)
* Run testArticleReading from the editor; results go to the logs sheet.
* ============================================================ */

function testArticleReading() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(APP.SHEETS.RESULTS);
  var C = APP.COL.RESULTS;
  var last = getLastDataRowInCols_(sheet, 1, APP.HEADERS.RESULTS.length);
  if (last < 2) { log_('testRead', 'No rows in search_results.'); return; }

  var SAMPLE = 8;  // how many links to test
  var data = sheet.getRange(2, 1, last - 1, APP.HEADERS.RESULTS.length).getValues();
  var picked = [];
  for (var i = 0; i < data.length && picked.length < SAMPLE; i++) {
    var link = String(data[i][C.LINK - 1] || '').trim();
    if (link) picked.push({ row: i + 2, link: link, title: String(data[i][C.TITLE - 1] || '') });
  }
  if (!picked.length) { log_('testRead', 'No rows with a link.'); return; }

  log_('testRead', '=== Article reading test: ' + picked.length + ' links ===');
  var fullOk = 0, thin = 0;
  picked.forEach(function (p) {
    var isGN = p.link.indexOf('news.google.com') >= 0;
    var resolved = resolveArticleUrl_(p.link, /*allowNetwork*/ true);
    var fetchUrl = resolved || p.link;
    var chars = countArticleChars_(fetchUrl);
    var label = isGN ? (resolved ? 'GN->resolved' : 'GN->UNRESOLVED') : 'direct';
    if (chars >= 600) fullOk++; else thin++;
    log_('testRead',
      'Row ' + p.row + ' [' + label + '] ' + chars + ' chars | ' +
      truncate_(p.title, 45) + ' | ' + truncate_(fetchUrl, 90));
    Utilities.sleep(800);
  });
  log_('testRead', '=== Summary: ' + fullOk + ' full-text OK, ' + thin +
    ' thin/failed (of ' + picked.length + ') ===');
  try {
    SpreadsheetApp.getUi().alert(
      'Article reading test done.\n\n' +
      fullOk + ' of ' + picked.length + ' links returned full article text.\n' +
      'Open the logs sheet for per-link details.'
    );
  } catch (e) { /* running from editor: no UI, results are in logs */ }
}

// Fetch + clean a page and return the character count (no threshold, for diagnosis).
function countArticleChars_(url) {
  if (!url) return 0;
  try {
    var resp = UrlFetchApp.fetch(url, {
      method: 'get', muteHttpExceptions: true, followRedirects: true,
      headers: { 'User-Agent': APP.USER_AGENT, 'Accept': 'text/html,application/xhtml+xml,*/*' }
    });
    if (resp.getResponseCode() < 200 || resp.getResponseCode() >= 300) return 0;
    var html = resp.getContentText();
    if (!html) return 0;
    html = html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
              .replace(/<style[\s\S]*?<\/style>/gi, ' ')
              .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
              .replace(/<!--[\s\S]*?-->/g, ' ');
    var am = html.match(/<article[\s\S]*?<\/article>/i);
    if (am) html = am[0];
    return cleanText_(html).length;
  } catch (e) {
    return 0;
  }
}

/**
 * Resolves a Google News redirect link to the real publisher URL.
 * allowNetwork=false (used during bulk search): only the cheap, local
 * base64 decode is tried — no HTTP calls, so it can't blow the search
 * step's execution-time budget. allowNetwork=true (used when approving/
 * summarizing one article): also tries the slower batchexecute network
 * path for "new-format" links the cheap decode can't handle.
 * Returns null if it can't resolve (caller should keep the original link).
 */
function resolveArticleUrl_(url, allowNetwork) {
  if (!url) return null;
  if (url.indexOf('news.google.com') < 0) return url;   // already a direct URL (e.g. from GNews)
  var m = url.match(/\/(?:rss\/)?articles\/([^?\/]+)/) || url.match(/\/read\/([^?\/]+)/);
  if (!m) return null;
  var articleId = m[1];
  var decoded = decodeGoogleNewsBase64_(articleId);   // cheap path (old-format links)
  if (decoded) return decoded;
  if (!allowNetwork) return null;
  return resolveViaBatchExecute_(articleId);           // fragile path (new-format links)
}

// Old-format Google News links: the real URL is embedded in the base64 blob.
function decodeGoogleNewsBase64_(articleId) {
  try {
    var bytes;
    try { bytes = Utilities.base64DecodeWebSafe(articleId); }
    catch (e1) {
      var b64 = articleId.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      bytes = Utilities.base64Decode(b64);
    }
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i] & 0xff);
    var m = s.match(/https?:\/\/[A-Za-z0-9._~:\/?#\[\]@!$&'()*+,;=%-]+/);
    if (m && m[0].indexOf('google.com') < 0) return m[0];
    return null;
  } catch (e) {
    return null;
  }
}

// New-format Google News links: ask Google's internal endpoint for the real URL.
function resolveViaBatchExecute_(articleId) {
  try {
    var page = UrlFetchApp.fetch('https://news.google.com/rss/articles/' + articleId, {
      method: 'get', muteHttpExceptions: true, followRedirects: true,
      headers: { 'User-Agent': APP.USER_AGENT }
    });
    if (page.getResponseCode() !== 200) return null;
    var html = page.getContentText();
    var sgM = html.match(/data-n-a-sg="([^"]+)"/);
    var tsM = html.match(/data-n-a-ts="([^"]+)"/);
    if (!sgM || !tsM) return null;

    var inner = JSON.stringify([
      'garturlreq',
      [['X','X',['X','X'],null,null,1,1,'US:en',null,1,null,null,null,null,null,0,1],
      'X','X',1,[1,1,1],1,1,null,0,0,null,0],
      articleId, Number(tsM[1]), sgM[1]
    ]);
    var freq = JSON.stringify([[['Fbv4je', inner, null, 'generic']]]);

    var resp = UrlFetchApp.fetch(
      'https://news.google.com/_/DotsSplashUi/data/batchexecute',
      { method: 'post', muteHttpExceptions: true,
        contentType: 'application/x-www-form-urlencoded;charset=UTF-8',
        payload: 'f.req=' + encodeURIComponent(freq),
        headers: { 'User-Agent': APP.USER_AGENT } }
    );
    if (resp.getResponseCode() !== 200) return null;

    var un = resp.getContentText()
      .replace(/\\u003d/g, '=').replace(/\\u0026/g, '&')
      .replace(/\\\//g, '/').replace(/\\"/g, '"');
    var found = un.match(/https?:\/\/[^"\\\s]+/g) || [];
    for (var i = 0; i < found.length; i++) {
      if (found[i].indexOf('google.com') < 0 && found[i].indexOf('gstatic.com') < 0) {
        return found[i];
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

/* ============================================================
* ARTICLE READING TEST V2 — run AFTER inverting search + a fresh search.
* Reads the NEWEST rows (which now come from GNews = real URLs).
* Reuses countArticleChars_ from the previous test kit (keep it).
* No AI calls. Results go to the logs sheet (Step = testReadV2).
* ============================================================ */

function testArticleReadingV2() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(APP.SHEETS.RESULTS);
  var C = APP.COL.RESULTS;
  var last = getLastDataRowInCols_(sheet, 1, APP.HEADERS.RESULTS.length);
  if (last < 2) { log_('testReadV2', 'No rows in search_results.'); return; }

  var SAMPLE = 8;
  var startRow = Math.max(2, last - 40);          // scan the last ~40 rows (newest)
  var height = last - startRow + 1;
  var data = sheet.getRange(startRow, 1, height, APP.HEADERS.RESULTS.length).getValues();

  var picked = [];
  for (var i = data.length - 1; i >= 0 && picked.length < SAMPLE; i--) {
    var link = String(data[i][C.LINK - 1] || '').trim();
    if (link) picked.push({ row: startRow + i, link: link, title: String(data[i][C.TITLE - 1] || '') });
  }
  if (!picked.length) { log_('testReadV2', 'No rows with a link.'); return; }

  log_('testReadV2', 'TEST START: reading ' + picked.length + ' newest links');
  var fullOk = 0, thin = 0, redirects = 0;
  picked.forEach(function (p) {
    var isGN = p.link.indexOf('news.google.com') >= 0;
    if (isGN) redirects++;
    var chars = countArticleChars_(p.link);       // read the page directly, count chars
    if (chars >= 600) fullOk++; else thin++;
    var label = isGN ? 'google-news-redirect' : 'direct';
    log_('testReadV2',
      'Row ' + p.row + ' [' + label + '] ' + chars + ' chars | ' +
      truncate_(p.title, 45) + ' | ' + truncate_(p.link, 90));
    Utilities.sleep(800);
  });
  log_('testReadV2', 'TEST SUMMARY: ' + fullOk + ' full-text OK, ' + thin +
    ' thin/failed, ' + redirects + ' still google-news redirects (of ' + picked.length + ')');
  try {
    SpreadsheetApp.getUi().alert(
      'Reading test v2 done.\n\n' +
      fullOk + ' of ' + picked.length + ' links returned full article text.\n' +
      redirects + ' were still Google News redirects.\n' +
      'See the logs sheet for details.'
    );
  } catch (e) { /* editor run: no UI */ }
}

/* ============================================================
* SUMMARY QUALITY TEST — Gemini, on real full-article text.
* Reads the newest readable (direct) rows, fetches the full page,
* sends to Gemini with the REAL summary prompt/spec, and logs the
* generated bullets so you can judge density. Does NOT touch
* approved_news. Uses up to 3 Gemini calls (quota-aware).
* ============================================================ */

function testSummaryQualityGemini() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(APP.SHEETS.RESULTS);
  var C = APP.COL.RESULTS;
  var last = getLastDataRowInCols_(sheet, 1, APP.HEADERS.RESULTS.length);
  if (last < 2) { log_('testSummary', 'No rows in search_results.'); return; }

  var SAMPLE = 3;
  var startRow = Math.max(2, last - 40);
  var height = last - startRow + 1;
  var data = sheet.getRange(startRow, 1, height, APP.HEADERS.RESULTS.length).getValues();

  // Pick newest rows whose link is a real (non-Google-News) URL.
  var picked = [];
  for (var i = data.length - 1; i >= 0 && picked.length < SAMPLE; i--) {
    var link = String(data[i][C.LINK - 1] || '').trim();
    if (link && link.indexOf('news.google.com') < 0) {
      picked.push({
        row: startRow + i, link: link,
        source: String(data[i][C.SOURCE - 1] || ''),
        title: String(data[i][C.TITLE - 1] || ''),
        publishedAt: String(data[i][C.PUBLISHED_AT - 1] || ''),
        country: String(data[i][C.AI_COUNTRY - 1] || ''),
        category: String(data[i][C.AI_CATEGORY - 1] || '')
      });
    }
  }
  if (!picked.length) { log_('testSummary', 'No readable (direct) rows found in the recent range.'); return; }

  log_('testSummary', 'TEST START: summarizing ' + picked.length + ' articles with Gemini');

  picked.forEach(function (p) {
    var pageText = fetchArticleText_(p.link);
    if (!pageText) {
      log_('testSummary', 'Row ' + p.row + ' SKIPPED (page not readable): ' + truncate_(p.title, 50));
      return;
    }
    // Build a row-shaped object so we can reuse the real prompt builder.
    var A = APP.COL.APPROVED;
    var fakeRow = [];
    fakeRow[A.SOURCE - 1] = p.source;
    fakeRow[A.TITLE - 1] = p.title;
    fakeRow[A.LINK - 1] = p.link;
    fakeRow[A.PUBLISHED_AT - 1] = p.publishedAt;
    fakeRow[A.COUNTRY - 1] = p.country;
    fakeRow[A.CATEGORY - 1] = p.category;
    fakeRow[A.DESCRIPTION - 1] = '';
    fakeRow[A.CONTENT - 1] = '';

    try {
      var out = callGeminiJson_(
        getSummarySystemPrompt_(),
        buildSummaryUserPrompt_(fakeRow, pageText),
        SUMMARY_SCHEMA_
      );
      var bullets = Array.isArray(out.bullets) ? out.bullets : [];
      log_('testSummary', 'Row ' + p.row + ' | ' + pageText.length + ' chars in | ' +
        bullets.length + ' bullets out | ' + truncate_(p.title, 50));
      log_('testSummary', '  HEADLINE: ' + truncate_(String(out.headline_line || ''), 300));
      bullets.forEach(function (b, idx) {
        log_('testSummary', '  • [' + (idx + 1) + '] ' + truncate_(String(b), 400));
      });
    } catch (err) {
      log_('testSummary', 'Row ' + p.row + ' ERROR: ' + truncate_(getErrorMessage_(err), 200));
    }
    Utilities.sleep(6500);
  });

  log_('testSummary', 'TEST DONE. Review the bullets above in the logs sheet.');
  try {
    SpreadsheetApp.getUi().alert('Summary quality test done.\n\nOpen the logs sheet and read the testSummary lines to judge the bullets.');
  } catch (e) {}
}

/* ============================================================
* GNEWS DIAGNOSTIC — shows exactly what GNews returns per term.
* Logs the called URL (key masked), HTTP code, and raw body head.
* Run from the editor. No AI. Uses a few GNews requests.
* ============================================================ */

function diagnoseGNews() {
  var termsToTest = ['free zone'];   // ONE term only, to isolate the hang
  var apiKey = getSetting_('gnews_api_key');
  log_('gnewsDiag', 'TEST START. Key present: ' + (apiKey ? 'YES (' + apiKey.length + ' chars)' : 'NO'));

  termsToTest.forEach(function (term) {
    var now = new Date();
    var fromDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    var params = {
      q: term, max: '10',
      from: fromDate.toISOString(), to: now.toISOString(),
      in: 'title,description,content', sortby: 'publishedAt', apikey: apiKey
    };
    var url = APP.URLS.GNEWS_SEARCH + '?' + toQueryString_(params);
    var masked = url.replace(apiKey, 'KEY_HIDDEN');
    log_('gnewsDiag', 'Calling: ' + truncate_(masked, 300));
    var t0 = Date.now();
    try {
      var resp = UrlFetchApp.fetch(url, {
        method: 'get',
        muteHttpExceptions: true,
        validateHttpsCertificates: true,
        headers: { 'Accept': 'application/json', 'User-Agent': APP.USER_AGENT }
      });
      var ms = Date.now() - t0;
      log_('gnewsDiag', 'Returned in ' + ms + ' ms, HTTP ' + resp.getResponseCode());
      log_('gnewsDiag', 'BODY: ' + truncate_(resp.getContentText(), 350));
    } catch (err) {
      var ms2 = Date.now() - t0;
      log_('gnewsDiag', 'EXCEPTION after ' + ms2 + ' ms: ' + getErrorMessage_(err));
    }
  });
  log_('gnewsDiag', 'TEST DONE.');
  try { SpreadsheetApp.getUi().alert('GNews diagnostic done. Open the logs (Step = gnewsDiag).'); } catch (e) {}
}
