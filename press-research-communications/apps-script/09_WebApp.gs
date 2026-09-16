/**************************************************************
 * TIPOLIS PRESS MONITOR — 09_WebApp.gs
 * Web App endpoints for the GitHub Pages frontend.
 * Deploy: Deploy > New deployment > Web app
 *   Execute as: Me
 *   Who has access: Anyone
 * All requests must carry the token: ?token=<frontend_bearer_token>
 * POST bodies are sent as text/plain JSON (avoids CORS preflight).
 **************************************************************/

function doGet(e) {
  return handleRequest_(e, 'GET');
}

function doPost(e) {
  return handleRequest_(e, 'POST');
}

function handleRequest_(e, method) {
  try {
    const token = (e && e.parameter && e.parameter.token) || '';
    if (token !== getSetting_('frontend_bearer_token') || !token) {
      return jsonOut_({ ok: false, error: 'Unauthorized' });
    }
    const path = (e && e.parameter && e.parameter.path) || '';
    const body = (e && e.postData && e.postData.contents)
      ? JSON.parse(e.postData.contents) : {};

    const route = method + ' ' + path;
    switch (route) {
      case 'GET /terms':            return jsonOut_({ ok: true, data: api_listTerms_() });
      case 'POST /terms':           return jsonOut_({ ok: true, data: api_saveTerms_(body) });
      case 'GET /countries':        return jsonOut_({ ok: true, data: api_listCountries_() });
      case 'POST /countries':       return jsonOut_({ ok: true, data: api_saveCountries_(body) });

      case 'GET /triage':           return jsonOut_({ ok: true, data: api_listTriage_(e.parameter) });
      case 'POST /triage/approve':  return jsonOut_({ ok: true, data: api_approve_(body) });
      case 'POST /triage/reject':   return jsonOut_({ ok: true, data: api_reject_(body) });

      case 'GET /summary':          return jsonOut_({ ok: true, data: api_listSummary_() });
      case 'POST /summary/save':    return jsonOut_({ ok: true, data: api_saveSummary_(body) });
      case 'POST /summary/reorder': return jsonOut_({ ok: true, data: api_reorder_(body) });

      case 'GET /report/preview':   return jsonOut_({ ok: true, data: api_reportPreview_() });
      case 'POST /report/generate': return jsonOut_({ ok: true, data: api_generateReport_() });
      case 'POST /report/archive':  return jsonOut_({ ok: true, data: api_archive_(body) });

      case 'GET /history':          return jsonOut_({ ok: true, data: api_history_(e.parameter) });
      case 'GET /history/countries':return jsonOut_({ ok: true, data: api_historyCountries_() });

      case 'POST /search/run':      return jsonOut_({ ok: true, data: (runSearchNow(), { started: true }) });
      case 'POST /filter/run':      return jsonOut_({ ok: true, data: (runAIFilterNow(), { started: true }) });
      case 'POST /feedback':        return jsonOut_({ ok: true, data: api_submitFeedback_(body) });

      case 'POST /summary/build':   return jsonOut_({ ok: true, data: api_buildPendingSummaries_(body) });

      // Manual link ingestion — paste a URL you found by hand and it gets
      // scraped + inserted into search_results with every column filled,
      // then classified immediately so it shows up in /triage.
      case 'POST /manual/add':      return jsonOut_({ ok: true, data: api_addManualLink_(body) });

      default: return jsonOut_({ ok: false, error: 'Unknown route: ' + route });
    }
  } catch (err) {
    log_('webapp', getErrorMessage_(err));
    return jsonOut_({ ok: false, error: getErrorMessage_(err) });
  }
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function api_submitFeedback_(body) {
const ss = SpreadsheetApp.getActiveSpreadsheet();
let sheet = ss.getSheetByName(APP.SHEETS.FEEDBACK);
// Auto-create the sheet if it doesn't exist yet.
if (!sheet) {
  sheet = ss.insertSheet(APP.SHEETS.FEEDBACK);
  sheet.getRange(1, 1, 1, APP.HEADERS.FEEDBACK.length).setValues([APP.HEADERS.FEEDBACK]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, APP.HEADERS.FEEDBACK.length).setFontWeight('bold').setBackground('#f1f3f4');
}
const page = String(body.page || '').trim();
const type = String(body.type || '').trim().toLowerCase();
const title = String(body.title || '').trim();
const description = String(body.description || '').trim();
// Light validation: title is required; type must be bug or suggestion.
if (!title) throw new Error('Title is required.');
if (type !== 'bug' && type !== 'suggestion') throw new Error('Type must be bug or suggestion.');
const row = getNextEmptyRowInCols_(sheet, 1, APP.HEADERS.FEEDBACK.length);
sheet.getRange(row, 1, 1, APP.HEADERS.FEEDBACK.length).setValues([[
  formatDateTime_(new Date()), page, type, title, description, 'New'
]]);
log_('feedback', `New ${type} on "${page}": ${truncate_(title, 80)}`);
return { saved: true, row: row };
}

function api_buildPendingSummaries_(body) {
const ss = SpreadsheetApp.getActiveSpreadsheet();
const approved = ss.getSheetByName(APP.SHEETS.APPROVED);
const A = APP.COL.APPROVED;
const last = getLastDataRowInCols_(approved, 1, APP.HEADERS.APPROVED.length);
if (last < 2) return { built: 0, remaining: 0 };

// How many to build in this call (keep small so the request returns before timeout).
const MAX_PER_CALL = (body && Number(body.max)) ? Number(body.max) : 2;

const statuses = approved.getRange(2, A.AI_STATUS, last - 1, 1).getValues();
let built = 0, remaining = 0;
for (let i = 0; i < statuses.length; i++) {
  const status = String(statuses[i][0] || '');
  const needs = (status === '' || status === 'Pending' || status.indexOf('Error') === 0);
  if (!needs) continue;
  if (built < MAX_PER_CALL) {
    generateSummaryForApprovedRow_(i + 2);   // row number
    built++;
  } else {
    remaining++;
  }
}
log_('buildPendingSummaries', `Built ${built}, ${remaining} still pending.`);
return { built: built, remaining: remaining };
}

/* ---------- Terms ---------- */

function api_listTerms_() {
  const sheet = sheet_(APP.SHEETS.TERMS);
  const last = getLastDataRowInCols_(sheet, 1, APP.HEADERS.TERMS.length);
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, APP.HEADERS.TERMS.length).getValues().map((r, i) => ({
    row: i + 2, term: r[0], enabled: r[1] === true, days: r[2], match_type: r[3],
    case_sensitive: r[4] === true, language: r[5], country: r[6], max_results: r[7]
  }));
}

function api_saveTerms_(body) {
  const sheet = sheet_(APP.SHEETS.TERMS);
  const rows = (body.terms || []).map(t => [
    t.term || '', t.enabled === true, toPositiveInt_(t.days, APP.DEFAULTS.days),
    normalizeMatchType_(t.match_type), t.case_sensitive === true,
    normalizeLanguage_(t.language), normalizeCountry_(t.country),
    toPositiveInt_(t.max_results, APP.DEFAULTS.max_results)
  ]);
  clearDataRows_(sheet, APP.HEADERS.TERMS.length);
  if (rows.length) sheet.getRange(2, 1, rows.length, APP.HEADERS.TERMS.length).setValues(rows);
  formatTermsSheet_(sheet);
  return { saved: rows.length };
}

/* ---------- Countries ---------- */

function api_listCountries_() {
  const sheet = sheet_(APP.SHEETS.COUNTRIES);
  const last = getLastDataRowInCols_(sheet, 1, APP.HEADERS.COUNTRIES.length);
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, APP.HEADERS.COUNTRIES.length).getValues().map((r, i) => ({
    row: i + 2, country_name: r[0], region: r[1], priority_level: r[2],
    project_names: r[3], notes: r[4]
  }));
}

function api_saveCountries_(body) {
  const sheet = sheet_(APP.SHEETS.COUNTRIES);
  const now = formatDateTime_(new Date());
  const rows = (body.countries || []).map(c => [
    c.country_name || '', c.region || '', c.priority_level || '',
    c.project_names || '', c.notes || '', now
  ]);
  clearDataRows_(sheet, APP.HEADERS.COUNTRIES.length);
  if (rows.length) sheet.getRange(2, 1, rows.length, APP.HEADERS.COUNTRIES.length).setValues(rows);
  return { saved: rows.length };
}

/* ---------- Triage ---------- */

function api_listTriage_(params) {
  const sheet = sheet_(APP.SHEETS.RESULTS);
  const C = APP.COL.RESULTS;
  const last = getLastDataRowInCols_(sheet, 1, APP.HEADERS.RESULTS.length);
  if (last < 2) return [];
  const showRejected = params && params.showRejected === 'true';
  const allDates = params && params.allDates === 'true';
  const win = getReportWindow_();
  const data = sheet.getRange(2, 1, last - 1, APP.HEADERS.RESULTS.length).getValues();
  const out = [];
  data.forEach((r, i) => {
    const status = String(r[C.FILTER_STATUS - 1] || '');
    if (status !== 'Done') return;
    const rel = String(r[C.AI_RELEVANCE - 1] || '');
    const category = String(r[C.AI_CATEGORY - 1] || '');
    // `category` is the sole gate (it's what report sections and
    // approveResultRow_ key off). `relevance` is a display-only priority
    // signal and must never hide an article `category` says to keep — see
    // 04_AIFilter.gs for the classifier-side half of this fix.
    if (!showRejected && category === 'reject') return;
    if (r[C.APPROVED - 1] === true) return;
    if (!allDates) {
      const pub = parseDateLoose_(r[C.PUBLISHED_AT - 1]);
      if (!pub || pub < win.start || pub > win.end) return;   // report-window only
    }
    out.push({
      row: i + 2,
      term: r[C.TERM - 1], publishedAt: r[C.PUBLISHED_AT - 1], source: r[C.SOURCE - 1],
      title: r[C.TITLE - 1], link: r[C.LINK - 1], description: r[C.DESCRIPTION - 1],
      relevance: rel, category: category, country: r[C.AI_COUNTRY - 1],
      region: r[C.AI_REGION - 1], reason: r[C.AI_REASON - 1]
    });
  });
  return out;
}

function api_approve_(body) {
  const targetRow = approveResultRow_(Number(body.row), false);
  return { approvedNewsRow: targetRow };
}

function api_reject_(body) {
  const sheet = sheet_(APP.SHEETS.RESULTS);
  const row = Number(body.row);
  // category is what api_listTriage_ actually gates on (see 04_AIFilter.gs
  // comments) — setting only ai_relevance never removed the item from the
  // queue, so a rejected article kept coming back on every refresh.
  sheet.getRange(row, APP.COL.RESULTS.AI_CATEGORY).setValue('reject');
  sheet.getRange(row, APP.COL.RESULTS.AI_RELEVANCE).setValue('reject');
  return { rejected: row };
}

/**
 * Manual link ingestion. Body: { url: string, term?: string }
 * Scrapes Open Graph / meta tags from the page, fills every search_results column
 * the same way the automated search does, inserts the row, then runs a
 * single (cheap, 1-article) Gemini classification so it's immediately
 * visible in /triage with relevance/category/country/region set.
 * A manually-added link is never auto-rejected by the AI or by any other
 * automated step — you chose to add it, so it always reaches your triage
 * screen for you to decide, even if Gemini fails or returns "reject".
 */
function api_addManualLink_(body) {
  const url = normalizeUrl_(String(body.url || '').trim());
  if (!url) throw new Error('URL is required.');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const resultsSheet = ss.getSheetByName(APP.SHEETS.RESULTS);
  const knownUrls = getKnownUrls_(resultsSheet);
  if (knownUrls.has(url)) {
    throw new Error('This URL is already in search_results or approved_history.');
  }

  const meta = fetchArticleMetadata_(url);
  const term = String(body.term || '').trim() || 'Manual';
  const fetchedAt = formatDateTime_(new Date());

  const row = buildResultRow_(term, {
    publishedAt: meta.publishedAt || fetchedAt,
    source: meta.source || meta.hostname,
    title: meta.title || url,
    link: url,
    description: meta.description || '',
    content: meta.content || ''
  }, fetchedAt);
  row[APP.COL.RESULTS.FILTER_STATUS - 1] = 'Pending';

  const startRow = getNextEmptyRowInCols_(resultsSheet, 1, APP.HEADERS.RESULTS.length);
  resultsSheet.getRange(startRow, 1, 1, APP.HEADERS.RESULTS.length).setValues([row]);
  resultsSheet.getRange(startRow, 1, 1, 1).insertCheckboxes();
  SpreadsheetApp.flush();

  // A manual entry was already vetted by a human (you found it, you're
  // adding it on purpose) — no AI or automated step is allowed to hide it
  // from triage. The AI still runs, but only to fill country/region/
  // relevance as helpful context; its "category" can never come back as
  // "reject" for a manual row, and if the call fails entirely the row is
  // still marked Done with safe defaults so it shows up immediately either
  // way, instead of getting stuck as "Pending" (which would keep it out of
  // /triage, since that view only lists FilterStatus="Done" rows).
  let relevance = 'medium', category = 'industry', country = '', region = '',
      reason = 'Manual entry — added by you, always shown regardless of AI classification.';
  try {
    const systemPrompt = buildFilterSystemPrompt_(getTipolisCountriesText_());
    const out = callGeminiJson_(systemPrompt, buildFilterUserPrompt_(row), FILTER_SCHEMA_);
    relevance = String(out.relevance || 'medium');
    category = String(out.category || 'industry');
    if (category === 'reject') category = 'industry';   // manual entries are never auto-rejected
    if (relevance === 'reject') relevance = 'medium';
    country = String(out.country || '');
    region = String(out.region || '');
    reason = String(out.reason || reason) + ' (manual entry — never auto-rejected)';
  } catch (err) {
    log_('addManualLink', `Classification failed, using safe defaults so the row still shows in triage: ${getErrorMessage_(err)}`);
  }
  resultsSheet.getRange(startRow, APP.COL.RESULTS.AI_RELEVANCE, 1, 5).setValues([[
    relevance, category, country, region, reason
  ]]);
  resultsSheet.getRange(startRow, APP.COL.RESULTS.FILTER_STATUS).setValue('Done');

  log_('addManualLink', `Manual link added at row ${startRow}: ${truncate_(url, 100)}`);
  return { row: startRow, title: meta.title, source: meta.source, category: category, relevance: relevance };
}

// Scrapes title/description/source/publishedAt from a bare URL using
// og:* and standard meta tags, falling back gracefully when absent.
function fetchArticleMetadata_(url) {
  const resp = UrlFetchApp.fetch(url, {
    method: 'get', muteHttpExceptions: true, followRedirects: true,
    headers: { 'User-Agent': APP.USER_AGENT, 'Accept': 'text/html,application/xhtml+xml,*/*' }
  });
  const code = resp.getResponseCode();
  if (code < 200 || code >= 300) throw new Error(`Could not fetch URL (HTTP ${code}).`);
  const html = resp.getContentText();
  const hostname = url.match(/^https?:\/\/([^\/]+)/) ? RegExp.$1.replace(/^www\./, '') : '';

  const meta = (prop) => {
    const m = html.match(new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i'
    )) || html.match(new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'
    ));
    return m ? decodeHtml_(m[1]) : '';
  };
  const titleTagMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);

  return {
    title: meta('og:title') || (titleTagMatch ? decodeHtml_(titleTagMatch[1]) : ''),
    description: meta('og:description') || meta('description'),
    source: meta('og:site_name') || hostname,
    hostname: hostname,
    publishedAt: formatDateTimeFromValue_(
      meta('article:published_time') || meta('og:updated_time') || ''
    ),
    content: fetchArticleText_(url)
  };
}

/* ---------- Summary ---------- */

function api_listSummary_() {
  const sheet = sheet_(APP.SHEETS.APPROVED);
  const A = APP.COL.APPROVED;
  const last = getLastDataRowInCols_(sheet, 1, APP.HEADERS.APPROVED.length);
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, APP.HEADERS.APPROVED.length).getValues().map((r, i) => {
    const edited = String(r[A.EDITED_BULLETS - 1] || r[A.AI_BULLETS_RAW - 1] || '{}');
    let parsed = { headline_line: '', bullets: [] };
    try { parsed = JSON.parse(edited); } catch (e) {}
    return {
      row: i + 2, source: r[A.SOURCE - 1], title: r[A.TITLE - 1], link: r[A.LINK - 1],
      publishedAt: r[A.PUBLISHED_AT - 1], country: r[A.COUNTRY - 1], region: r[A.REGION - 1],
      category: r[A.CATEGORY - 1], description: r[A.DESCRIPTION - 1],
      aiStatus: r[A.AI_STATUS - 1], editStatus: r[A.EDIT_STATUS - 1],
      displayOrder: r[A.DISPLAY_ORDER - 1],
      headline_line: parsed.headline_line || '',
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets : []
    };
  }).sort((a, b) => a.displayOrder - b.displayOrder);
}

function api_saveSummary_(body) {
  const sheet = sheet_(APP.SHEETS.APPROVED);
  const A = APP.COL.APPROVED;
  const row = Number(body.row);
  const payload = JSON.stringify({
    headline_line: String(body.headline_line || ''),
    bullets: Array.isArray(body.bullets) ? body.bullets.map(String) : []
  });
  sheet.getRange(row, A.EDITED_BULLETS).setValue(payload);
  if (body.country !== undefined) sheet.getRange(row, A.COUNTRY).setValue(body.country);
  if (body.region !== undefined) sheet.getRange(row, A.REGION).setValue(body.region);
  if (body.category !== undefined) sheet.getRange(row, A.CATEGORY).setValue(body.category);
  sheet.getRange(row, A.EDIT_STATUS).setValue('Edited');
  return { saved: row };
}

function api_reorder_(body) {
  const sheet = sheet_(APP.SHEETS.APPROVED);
  const A = APP.COL.APPROVED;
  (body.order || []).forEach((row, idx) => {
    sheet.getRange(Number(row), A.DISPLAY_ORDER).setValue(idx + 1);
  });
  return { reordered: (body.order || []).length };
}

/* ---------- Report ---------- */

function api_reportPreview_() {
  return readApprovedItems_().map(i => ({
    sheetRow: i.sheetRow, category: i.category, order: i.order,
    headline: i.headline, bullets: i.bullets
  }));
}

function api_generateReport_() {
  const res = generateWeeklyReport_();
  return res;
}

function api_archive_(body) {
  const meta = computeNextWeekMeta_();
  return archiveAndReset_(meta, body.docId || '', body.docUrl || '');
}

/* ---------- History ---------- */

function api_history_(params) {
  const sheet = sheet_(APP.SHEETS.HISTORY);
  const last = getLastDataRowInCols_(sheet, 1, APP.HEADERS.HISTORY.length);
  if (last < 2) return [];
  const H = colIndexMap_(APP.HEADERS.HISTORY);
  const data = sheet.getRange(2, 1, last - 1, APP.HEADERS.HISTORY.length).getValues();
  const fCountry = params && params.country;
  const fCategory = params && params.category;
  const fRegion = params && params.region;
  return data.filter(r => {
    if (fCountry && String(r[H.Country]) !== fCountry) return false;
    if (fCategory && String(r[H.Category]) !== fCategory) return false;
    if (fRegion && String(r[H.Region]) !== fRegion) return false;
    return true;
  }).map(r => {
    let bullets = [], headline = '';
    try { const p = JSON.parse(r[H.Final_Bullets]); headline = p.headline_line || ''; bullets = p.bullets || []; } catch (e) {}
    return {
      week: r[H.ReportWeekNumber], year: r[H.ReportYear], reportDate: r[H.ReportDate],
      category: r[H.Category], country: r[H.Country], region: r[H.Region],
      source: r[H.Source], publishedAt: r[H.PublishedAt], title: r[H.Title],
      link: r[H.Link], headline_line: headline, bullets: bullets,
      docUrl: r[H.ReportDocUrl]
    };
  });
}

function api_historyCountries_() {
  const sheet = sheet_(APP.SHEETS.HISTORY);
  const last = getLastDataRowInCols_(sheet, 1, APP.HEADERS.HISTORY.length);
  if (last < 2) return [];
  const H = colIndexMap_(APP.HEADERS.HISTORY);
  const data = sheet.getRange(2, 1, last - 1, APP.HEADERS.HISTORY.length).getValues();
  const map = {};
  data.forEach(r => {
    const country = String(r[H.Country] || 'Unknown');
    if (!map[country]) map[country] = { country: country, region: r[H.Region], count: 0, latest: '' };
    map[country].count++;
    const pub = String(r[H.PublishedAt] || '');
    if (pub > map[country].latest) map[country].latest = pub;
  });
  return Object.keys(map).map(k => map[k]).sort((a, b) => b.count - a.count);
}
