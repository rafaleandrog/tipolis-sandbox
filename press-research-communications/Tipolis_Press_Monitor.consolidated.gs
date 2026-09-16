/**************************************************************************
 * TIPOLIS PRESS MONITOR — Consolidated single-file build
 * --------------------------------------------------------------------------
 * Generated from press-research-communications/apps-script/*.gs (11 files).
 * Paste this entire file into one .gs file in the Apps Script editor (e.g.
 * `Code.gs`) as a manual alternative to `clasp push`.
 *
 * All 11 source files run in a single shared global scope in Apps Script;
 * the numerical prefixes (00_, 01_, …) only control display order in the
 * editor. Concatenation preserves the same runtime behavior.
 *
 * If you later switch to clasp, delete this single file from the Apps
 * Script project so it does not conflict with the 11 individual files.
 *
 * Source of truth: the 11 files under apps-script/. Edits made directly in
 * Apps Script should be backported to that folder (or this file will drift).
 **************************************************************************/



/* ========================================================================
 * SECTION: 00_Config.gs
 * ====================================================================== */

/**************************************************************
 * TIPOLIS PRESS MONITOR — 00_Config.gs
 * Global configuration. No secrets here: API keys live in the
 * report_settings sheet (read via getSetting_()).
 **************************************************************/

const APP = {
  MENU: 'Tipolis',

  SHEETS: {
  TERMS: 'search_terms',
  COUNTRIES: 'tipolis_countries',
  RESULTS: 'search_results',
  APPROVED: 'approved_news',
  HISTORY: 'approved_history',
  SETTINGS: 'report_settings',
  LOGS: 'logs',
  FEEDBACK: 'feedback'
},

  HEADERS: {
    TERMS: [
      'term', 'enabled', 'days', 'match_type',
      'case_sensitive', 'language', 'country', 'max_results'
    ],
    COUNTRIES: [
      'country_name', 'region', 'priority_level', 'project_names', 'notes', 'added_at'
    ],
    RESULTS: [
      'Approved', 'Term', 'PublishedAt', 'Source', 'Title', 'Link',
      'Description', 'Content', 'FetchedAt',
      'ai_relevance', 'ai_category', 'ai_country', 'ai_region',
      'ai_reason', 'ai_duplicate_of', 'FilterStatus'
    ],
    APPROVED: [
      'Approved', 'ApprovedAt', 'Term', 'PublishedAt', 'Source', 'Title', 'Link',
      'Description', 'Content', 'Country', 'Region', 'Category',
      'AI_Bullets_Raw', 'Edited_Bullets', 'AI_Status', 'Edit_Status', 'Display_Order'
    ],
    HISTORY: [
      'ReportWeekNumber', 'ReportYear', 'ReportDate', 'ArchivedAt', 'Category',
      'Country', 'Region', 'Source', 'PublishedAt', 'Title', 'Link',
      'Final_Bullets', 'ReportDocId', 'ReportDocUrl'
    ],
    SETTINGS: ['key', 'value', 'description'],
    LOGS: ['DateTime', 'Step', 'Message'],
    FEEDBACK: ['Timestamp', 'Page', 'Type', 'Title', 'Description', 'Status']
  },

  // Column indexes (1-based) for frequently used sheets
  COL: {
    RESULTS: {
      APPROVED: 1, TERM: 2, PUBLISHED_AT: 3, SOURCE: 4, TITLE: 5, LINK: 6,
      DESCRIPTION: 7, CONTENT: 8, FETCHED_AT: 9,
      AI_RELEVANCE: 10, AI_CATEGORY: 11, AI_COUNTRY: 12, AI_REGION: 13,
      AI_REASON: 14, AI_DUPLICATE_OF: 15, FILTER_STATUS: 16
    },
    APPROVED: {
      APPROVED: 1, APPROVED_AT: 2, TERM: 3, PUBLISHED_AT: 4, SOURCE: 5, TITLE: 6,
      LINK: 7, DESCRIPTION: 8, CONTENT: 9, COUNTRY: 10, REGION: 11, CATEGORY: 12,
      AI_BULLETS_RAW: 13, EDITED_BULLETS: 14, AI_STATUS: 15, EDIT_STATUS: 16, DISPLAY_ORDER: 17
    }
  },

  DEFAULTS: {
    term_enabled: false,
    days: 1,                 // daily search window (last 24h)
    match_type: 'broad',
    case_sensitive: false,
    language: 'en',
    country: '',
    max_results: 40,          // was 20 — raised so RSS-primary has room to work with
    gemini_model: 'gemini-2.5-flash',
    daily_search_hour: 6,    // daily search runs ~06:00
    weekly_filter_hour: 7    // weekly AI filter runs ~07:00 (margin after search)
  },

  PROPERTIES: {
    LAST_NEWS_REQUEST_AT: 'LAST_NEWS_REQUEST_AT',
    FILTER_PROGRESS: 'FILTER_PROGRESS'
  },

  URLS: {
    GOOGLE_NEWS_RSS: 'https://news.google.com/rss/search',
    GNEWS_SEARCH: 'https://gnews.io/api/v4/search',
    GEMINI_BASE: 'https://generativelanguage.googleapis.com/v1beta/models/'
  },

  LIMITS: {
    MAX_CONTENT_CHARS: 12000,
    NEWS_REQUEST_SPACING_MS: 1200,   // 1.2s between news requests
    FILTER_BATCH_SIZE: 60,           // articles per AI Filter execution chunk
    GEMINI_MAX_RETRIES: 4
  },

  USER_AGENT:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36',

  REGIONS: [
    'Africa', 'Caribbean', 'Latin America', 'North America', 'Europe',
    'Middle East', 'South Asia', 'Southeast Asia', 'East Asia', 'Oceania', 'Global'
  ]
};

// Seed data for tipolis_countries (region mapping for the 14 priority countries).
const TIPOLIS_COUNTRY_SEED = [
  ['Saint Kitts and Nevis', 'Caribbean', 'high', 'Destiny', '', ''],
  ['Nevis', 'Caribbean', 'high', 'Destiny', '', ''],
  ['Cabo Verde', 'Africa', 'high', 'TechParkCV', '', ''],
  ['São Tomé and Príncipe', 'Africa', 'medium', '', '', ''],
  ['Brunei', 'Southeast Asia', 'medium', '', '', ''],
  ['Honduras', 'Latin America', 'high', 'Próspera, ZEDE', '', ''],
  ['Paraguay', 'Latin America', 'medium', '', '', ''],
  ['Argentina', 'Latin America', 'medium', '', '', ''],
  ['Ecuador', 'Latin America', 'medium', '', '', ''],
  ['El Salvador', 'Latin America', 'high', '', '', ''],
  ['Guatemala', 'Latin America', 'medium', '', '', ''],
  ['Belize', 'Caribbean', 'medium', '', '', ''],
  ['Uruguay', 'Latin America', 'medium', '', '', ''],
  ['Guyana', 'Latin America', 'medium', '', '', '']
];

// Seed data for report_settings (key, value, description).
// Fill the empty values manually after running setup.
const SETTINGS_SEED = [
  ['author_name', 'Rafael Leandro', 'Name printed on every report'],
  ['last_report_week_number', '20', 'Week number of the most recent report; next = this + 1'],
  ['last_report_date', '2026-05-18', 'Date (yyyy-mm-dd) of the most recent report'],
  ['gemini_api_key', '', 'Google AI Studio API key — PASTE HERE'],
  ['gemini_model', 'gemini-2.5-flash', 'Gemini model id (e.g. gemini-2.5-flash or gemini-3-flash-preview)'],
  ['gnews_api_key', '', 'GNews API key (fallback search) — PASTE HERE'],
  ['report_drive_folder_id', '', 'Drive folder ID where generated reports are saved — PASTE HERE'],
  ['report_template_doc_id', '', 'Google Doc ID of the report template — PASTE HERE'],
  ['daily_search_auto_run', 'true', 'Toggle the daily search trigger'],
  ['weekly_filter_auto_run', 'true', 'Toggle the weekly AI filter trigger'],
  ['frontend_bearer_token', '', 'Random 32+ char token the frontend must send — PASTE HERE']
];


/* ========================================================================
 * SECTION: 01_Menu_Setup.gs
 * ====================================================================== */

/**************************************************************
 * TIPOLIS PRESS MONITOR — 01_Menu_Setup.gs
 * Spreadsheet menu and one-time project setup.
 **************************************************************/

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(APP.MENU)
    .addItem('Create / repair project sheets', 'createProjectSheets')
    .addSeparator()
    .addItem('Run daily search now', 'runSearchNow')
    .addItem('Run backfill search (custom days, no AI)', 'runBackfillSearchNow')
    .addItem('Run AI classification now', 'runAIFilterNow')
    .addItem('Fix historical relevance/category mismatches (one-off)', 'fixHistoricalRelevanceMismatchesNow')
    .addItem('Approve checked results (build summaries)', 'approveCheckedResultsNow')
    .addSeparator()
    .addItem('Generate weekly report now', 'generateReportNow')
    .addItem('Archive & reset week', 'archiveWeekNow')
    .addSeparator()
    .addItem('Pause daily automation', 'pauseDailyAutomation')
    .addItem('Resume daily automation', 'resumeDailyAutomation')
    .addSeparator()
    .addItem('Install all triggers', 'installAllTriggers')
    .addItem('Delete all triggers', 'deleteAllProjectTriggers')
    .addToUi();
}

/**
 * Creates every sheet, sets headers, formatting, seeds reference data.
 * Safe to re-run: it repairs structure without wiping existing data rows
 * (except the reference sheets countries/settings which it seeds only if empty).
 */
function createProjectSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  ensureSheet_(ss, APP.SHEETS.TERMS, APP.HEADERS.TERMS);
  ensureSheet_(ss, APP.SHEETS.COUNTRIES, APP.HEADERS.COUNTRIES);
  ensureSheet_(ss, APP.SHEETS.RESULTS, APP.HEADERS.RESULTS);
  ensureSheet_(ss, APP.SHEETS.APPROVED, APP.HEADERS.APPROVED);
  ensureSheet_(ss, APP.SHEETS.HISTORY, APP.HEADERS.HISTORY);
  ensureSheet_(ss, APP.SHEETS.SETTINGS, APP.HEADERS.SETTINGS);
  ensureSheet_(ss, APP.SHEETS.LOGS, APP.HEADERS.LOGS);

  formatTermsSheet_(ss.getSheetByName(APP.SHEETS.TERMS));
  formatResultsSheet_(ss.getSheetByName(APP.SHEETS.RESULTS));
  formatApprovedSheet_(ss.getSheetByName(APP.SHEETS.APPROVED));

  seedCountriesIfEmpty_(ss.getSheetByName(APP.SHEETS.COUNTRIES));
  seedSettingsIfEmpty_(ss.getSheetByName(APP.SHEETS.SETTINGS));

  log_('createProjectSheets', 'Project sheets created/repaired.');
  SpreadsheetApp.getUi().alert(
    'Project sheets are ready.\n\n' +
    'Next: open report_settings and paste your gemini_api_key, ' +
    'report_drive_folder_id, report_template_doc_id, and frontend_bearer_token.'
  );
}

function ensureSheet_(ss, name, headers) {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  const existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0].map(String);
  if (existing.join('|') !== headers.map(String).join('|')) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f1f3f4');
  return sheet;
}

function seedCountriesIfEmpty_(sheet) {
  if (getLastDataRowInCols_(sheet, 1, APP.HEADERS.COUNTRIES.length) >= 2) return;
  const now = formatDateTime_(new Date());
  const rows = TIPOLIS_COUNTRY_SEED.map(r => { const c = r.slice(); c[5] = now; return c; });
  sheet.getRange(2, 1, rows.length, APP.HEADERS.COUNTRIES.length).setValues(rows);
  log_('seedCountries', `Seeded ${rows.length} priority countries.`);
}

function seedSettingsIfEmpty_(sheet) {
  if (getLastDataRowInCols_(sheet, 1, APP.HEADERS.SETTINGS.length) >= 2) return;
  sheet.getRange(2, 1, SETTINGS_SEED.length, APP.HEADERS.SETTINGS.length).setValues(SETTINGS_SEED);
  log_('seedSettings', `Seeded ${SETTINGS_SEED.length} settings keys.`);
}

function formatTermsSheet_(sheet) {
  const rows = Math.max(sheet.getMaxRows(), 1000);
  sheet.getRange(2, 2, rows - 1, 1).insertCheckboxes();        // enabled
  sheet.getRange(2, 5, rows - 1, 1).insertCheckboxes();        // case_sensitive
  const matchRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['exact', 'broad'], true).build();
  sheet.getRange(2, 4, rows - 1, 1).setDataValidation(matchRule);
}

function formatResultsSheet_(sheet) {
  const rows = Math.max(sheet.getMaxRows(), 2000);
  sheet.getRange(2, 1, rows - 1, 1).insertCheckboxes();        // Approved
}

function formatApprovedSheet_(sheet) {
  const rows = Math.max(sheet.getMaxRows(), 2000);
  sheet.getRange(2, 1, rows - 1, 1).insertCheckboxes();        // Approved
}


/* ========================================================================
 * SECTION: 02_Search.gs
 * ====================================================================== */

/**************************************************************
 * TIPOLIS PRESS MONITOR — 02_Search.gs
 * Daily search. Google News RSS is the PRIMARY source (same engine
 * as a manual news.google.com search — diverse countries/sources,
 * not dominated by one prolific outlet); GNews API is a FALLBACK
 * used only when RSS returns nothing. Near-duplicate titles are
 * deduped before the max_results cut. Appends new rows to
 * search_results. Dedups by URL against search_results (current
 * accumulator) and approved_history.
 **************************************************************/

function runSearchNow() {
  runSearchCore_('manual');
}

function runDailySearch() {
  if (!isAutoRunOn_('daily_search_auto_run')) {
    log_('runDailySearch', 'Skipped: daily search automation is paused.');
    return;
  }
  runSearchCore_('daily');
}

function runSearchCore_(mode) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    log_('runSearchCore', 'Skipped: another execution is running.');
    return;
  }
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const termsSheet = ss.getSheetByName(APP.SHEETS.TERMS);
    const resultsSheet = ss.getSheetByName(APP.SHEETS.RESULTS);

    const rules = getActiveTermRules_(termsSheet);
    if (!rules.length) { log_('runSearchCore', 'No active terms.'); return; }

    const knownUrls = getKnownUrls_(resultsSheet);  // results + history
    const rowsToAppend = [];
    const fetchedAt = formatDateTime_(new Date());

    log_('runSearchCore', `Started (${mode}). Active terms: ${rules.length}.`);

    for (const rule of rules) {
      try {
        const items = fetchNewsForRule_(rule);
        let added = 0, dup = 0, invalid = 0;
        for (const item of items) {
          const link = normalizeUrl_(item.link);
          if (!link) { invalid++; continue; }
          if (knownUrls.has(link)) { dup++; continue; }
          if (!passesLocalMatchRule_(rule, item)) { invalid++; continue; }
          rowsToAppend.push(buildResultRow_(rule.term, item, fetchedAt));
          knownUrls.add(link);
          added++;
        }
        log_('runSearchCore',
          `Term "${rule.term}": ${items.length} fetched, ${added} new, ${dup} dup, ${invalid} filtered.`);
      } catch (err) {
        log_('runSearchCore', `Error for "${rule.term}": ${getErrorMessage_(err)}`);
      }
    }

    if (rowsToAppend.length) {
      const startRow = getNextEmptyRowInCols_(resultsSheet, 1, APP.HEADERS.RESULTS.length);
      resultsSheet.getRange(startRow, 1, rowsToAppend.length, APP.HEADERS.RESULTS.length)
        .setValues(rowsToAppend);
      resultsSheet.getRange(startRow, 1, rowsToAppend.length, 1).insertCheckboxes();
      SpreadsheetApp.flush();
      log_('runSearchCore', `${rowsToAppend.length} row(s) written from row ${startRow}.`);
    } else {
      log_('runSearchCore', 'No new rows.');
    }
  } finally {
    lock.releaseLock();
  }
}

// Manual backfill: search the last N days (1..30), bypass AI filter and triage.
function runBackfillSearchNow() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt(
    'Backfill search',
    'How many days back to search? (1 to 30)\n\n' +
    'Results land in search_results with FilterStatus="Skipped". ' +
    'They are excluded from the AI filter (no Gemini cost) and from triage. ' +
    'Browse them directly in the search_results sheet.',
    ui.ButtonSet.OK_CANCEL
  );
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const days = parseInt(String(resp.getResponseText()).trim(), 10);
  if (!days || days < 1 || days > 30) {
    ui.alert('Please enter a whole number between 1 and 30.');
    return;
  }
  runBackfillSearchCore_(days);
}

function runBackfillSearchCore_(daysOverride) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    log_('runBackfillSearch', 'Skipped: another execution is running.');
    return;
  }
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const termsSheet = ss.getSheetByName(APP.SHEETS.TERMS);
    const resultsSheet = ss.getSheetByName(APP.SHEETS.RESULTS);

    // Reuse the same active terms, but override every term's window with daysOverride.
    const baseRules = getActiveTermRules_(termsSheet);
    if (!baseRules.length) { log_('runBackfillSearch', 'No active terms.'); return; }
    const rules = baseRules.map(r => Object.assign({}, r, { days: daysOverride }));

    const knownUrls = getKnownUrls_(resultsSheet);  // dedup against results + history
    const rowsToAppend = [];
    const fetchedAt = formatDateTime_(new Date());

    log_('runBackfillSearch', `Started (backfill ${daysOverride}d). Active terms: ${rules.length}.`);

    for (const rule of rules) {
      try {
        const items = fetchNewsForRule_(rule);
        let added = 0, dup = 0, invalid = 0;
        for (const item of items) {
          const link = normalizeUrl_(item.link);
          if (!link) { invalid++; continue; }
          if (knownUrls.has(link)) { dup++; continue; }
          if (!passesLocalMatchRule_(rule, item)) { invalid++; continue; }
          const row = buildResultRow_(rule.term, item, fetchedAt);
          // Mark Skipped so the AI filter and triage ignore these rows.
          row[APP.COL.RESULTS.FILTER_STATUS - 1] = 'Skipped';
          rowsToAppend.push(row);
          knownUrls.add(link);
          added++;
        }
        log_('runBackfillSearch',
          `Term "${rule.term}": ${items.length} fetched, ${added} new, ${dup} dup, ${invalid} filtered.`);
      } catch (err) {
        log_('runBackfillSearch', `Error for "${rule.term}": ${getErrorMessage_(err)}`);
      }
    }

    const ui = SpreadsheetApp.getUi();
    if (rowsToAppend.length) {
      const startRow = getNextEmptyRowInCols_(resultsSheet, 1, APP.HEADERS.RESULTS.length);
      resultsSheet.getRange(startRow, 1, rowsToAppend.length, APP.HEADERS.RESULTS.length)
        .setValues(rowsToAppend);
      resultsSheet.getRange(startRow, 1, rowsToAppend.length, 1).insertCheckboxes();
      SpreadsheetApp.flush();
      log_('runBackfillSearch', `${rowsToAppend.length} backfill row(s) written from row ${startRow}.`);
      ui.alert(`Backfill complete.\n\n${rowsToAppend.length} new row(s) added to search_results (FilterStatus="Skipped").`);
    } else {
      log_('runBackfillSearch', 'No new rows (all duplicates).');
      ui.alert('Backfill done.\n\nNo new rows — all results were already in the sheet (URL deduplication).');
    }
  } finally {
    lock.releaseLock();
  }
}

function getActiveTermRules_(sheet) {
  const lastRow = getLastDataRowInCols_(sheet, 1, APP.HEADERS.TERMS.length);
  if (lastRow < 2) return [];
  const data = sheet.getRange(2, 1, lastRow - 1, APP.HEADERS.TERMS.length).getValues();
  const rules = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const term = String(row[0] || '').trim();
    const enabled = toBoolean_(row[1], false);
    if (!term || !enabled) continue;
    rules.push({
      rowNumber: i + 2,
      term: term,
      days: toPositiveInt_(row[2], APP.DEFAULTS.days),
      matchType: normalizeMatchType_(row[3]),
      caseSensitive: toBoolean_(row[4], APP.DEFAULTS.case_sensitive),
      language: normalizeLanguage_(row[5]),
      country: normalizeCountry_(row[6]),
      maxResults: Math.min(100, Math.max(1, toPositiveInt_(row[7], APP.DEFAULTS.max_results)))
    });
  }
  return rules;
}

/* ---------- Fetching (RSS primary, GNews fallback) ---------- */

/**
 * Google News RSS is the same engine behind a manual news.google.com
 * search — it naturally surfaces diverse countries/sources instead of
 * being dominated by whichever outlet republishes the most. It's used
 * first; GNews API only kicks in if RSS comes back empty for a term.
 * Near-duplicate titles (the same wire story in 5 outlets) are removed
 * BEFORE the max_results cut, so real diversity survives the cap.
 */
function fetchNewsForRule_(rule) {
  const rssItems = fetchFromGoogleNewsRss_(rule);
  let items = dedupeByTitle_(rssItems).slice(0, rule.maxResults);

  if (!items.length) {
    log_('fetchNewsForRule', `RSS empty for "${rule.term}". Trying GNews API fallback.`);
    items = dedupeByTitle_(fetchFromGNewsApi_(rule)).slice(0, rule.maxResults);
  }

  // Cheap, local (no network) resolution of old-format Google News redirect
  // links to the real publisher URL. New-format links that need a network
  // call are resolved later, only for approved items (see 05_AISummary.gs),
  // to keep this bulk search step fast and inside the execution time limit.
  return items.map(item => {
    if (item.link && item.link.indexOf('news.google.com') >= 0) {
      const cheap = resolveArticleUrl_(item.link, /*allowNetwork*/ false);
      if (cheap) item.link = cheap;
    }
    return item;
  });
}

// Removes near-identical headlines (same wire story, different outlets)
// using the same normalization the AI filter uses, so the search step and
// the classification step agree on what counts as "the same article".
// Keeps the FIRST occurrence (RSS/GNews already return newest-first).
function dedupeByTitle_(items) {
  const seen = new Set();
  const out = [];
  items.forEach(item => {
    const norm = normalizeTitleForDedup_(item.title || '');
    if (norm && seen.has(norm)) return;
    if (norm) seen.add(norm);
    out.push(item);
  });
  return out;
}

function fetchFromGoogleNewsRss_(rule) {
  enforceRequestSpacing_();
  const term = rule.matchType === 'exact' ? `"${escapeQuotes_(rule.term)}"` : rule.term;
  const days = Math.max(1, rule.days || APP.DEFAULTS.days);
  const params = { q: `${term} when:${days}d` };
  // Only scope by language/country when the term row explicitly asks for
  // it. Left blank (the default), the query stays global — this is what
  // makes results match a plain manual Google News search instead of
  // being skewed toward one market.
  if (rule.language && rule.language !== APP.DEFAULTS.language) {
    params.hl = rule.country ? `${rule.language}-${rule.country}` : rule.language;
  } else if (rule.country) {
    params.hl = `en-${rule.country}`;
  }
  if (rule.country) { params.gl = rule.country; params.ceid = `${rule.country}:${rule.language || 'en'}`; }

  const url = APP.URLS.GOOGLE_NEWS_RSS + '?' + toQueryString_(params);
  try {
    const resp = UrlFetchApp.fetch(url, {
      method: 'get', muteHttpExceptions: true, followRedirects: true,
      headers: { 'User-Agent': APP.USER_AGENT, 'Accept': 'application/rss+xml, application/xml, text/xml, */*' }
    });
    const code = resp.getResponseCode();
    if (code < 200 || code >= 300) {
      log_('fetchFromGoogleNewsRss', `HTTP ${code} for "${rule.term}".`);
      return [];
    }
    return parseGoogleNewsRss_(resp.getContentText());
  } catch (err) {
    log_('fetchFromGoogleNewsRss', `Error for "${rule.term}": ${getErrorMessage_(err)}`);
    return [];
  }
}

function parseGoogleNewsRss_(xmlText) {
  const doc = XmlService.parse(xmlText);
  const channel = doc.getRootElement().getChild('channel');
  if (!channel) return [];
  const items = channel.getChildren('item') || [];
  return items.map(item => {
    const titleRaw = getChildText_(item, 'title');
    const description = cleanText_(getChildText_(item, 'description'));
    const sourceNode = item.getChild('source');
    const source = sourceNode ? cleanText_(sourceNode.getText()) : extractSourceFromGoogleTitle_(titleRaw);
    return {
      publishedAt: formatDateTimeFromValue_(getChildText_(item, 'pubDate')),
      source: source || 'Google News',
      title: cleanGoogleNewsTitle_(titleRaw),
      link: getChildText_(item, 'link'),
      description: description,
      content: description
    };
  }).filter(i => i.link);
}

function fetchFromGNewsApi_(rule) {
  enforceRequestSpacing_();
  const apiKey = getSetting_('gnews_api_key');
  if (!apiKey) { log_('fetchFromGNewsApi', 'No GNews key; skipping.'); return []; }

  const now = new Date();
  // GNews free tier delays data ~12h, so a 24h window only yields ~12h of usable data.
  // Use a wider hours-based window so delayed articles (incl. niche terms) appear.
  // Daily run + URL dedup makes the overlap harmless. 48h ≈ 36h of usable coverage.
  const GNEWS_LOOKBACK_HOURS = 48;
  const lookbackMs = Math.max(GNEWS_LOOKBACK_HOURS, (rule.days || 1) * 24) * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - lookbackMs);
  const term = rule.matchType === 'exact' ? `"${escapeQuotes_(rule.term)}"` : rule.term;
  const params = {
    q: term, max: String(Math.min(rule.maxResults, 100)),
    from: fromDate.toISOString(), to: now.toISOString(),
    in: 'title,description,content', sortby: 'publishedAt', apikey: apiKey
  };
  if (rule.language) params.lang = String(rule.language).toLowerCase();
  if (rule.country) params.country = String(rule.country).toLowerCase();

  const url = APP.URLS.GNEWS_SEARCH + '?' + toQueryString_(params);
  try {
    const resp = UrlFetchApp.fetch(url, {
      method: 'get', muteHttpExceptions: true,
      headers: { 'Accept': 'application/json', 'User-Agent': APP.USER_AGENT }
    });
    const code = resp.getResponseCode();
    if (code === 403 || code === 429) {
      log_('fetchFromGNewsApi', `QUOTA EXCEEDED (HTTP ${code}) for "${rule.term}". Not "no results" — the GNews plan limit was hit.`);
      return [];
    }
    if (code < 200 || code >= 300) {
      log_('fetchFromGNewsApi', `HTTP ${code} for "${rule.term}".`);
      return [];
    }
    const json = JSON.parse(resp.getContentText());
    const articles = Array.isArray(json.articles) ? json.articles : [];
    return articles.map(a => ({
      publishedAt: a.publishedAt || '',
      source: (a.source && a.source.name) ? a.source.name : 'GNews',
      title: cleanText_(a.title || ''),
      link: a.url || '',
      description: cleanText_(a.description || ''),
      content: cleanText_(a.content || '')
    })).filter(i => i.link);
  } catch (err) {
    log_('fetchFromGNewsApi', `Error for "${rule.term}": ${getErrorMessage_(err)}`);
    return [];
  }
}

function enforceRequestSpacing_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const props = PropertiesService.getScriptProperties();
    const nowMs = Date.now();
    const lastMs = Number(props.getProperty(APP.PROPERTIES.LAST_NEWS_REQUEST_AT) || 0);
    const elapsed = nowMs - lastMs;
    if (lastMs && elapsed < APP.LIMITS.NEWS_REQUEST_SPACING_MS) {
      Utilities.sleep(APP.LIMITS.NEWS_REQUEST_SPACING_MS - elapsed);
    }
    props.setProperty(APP.PROPERTIES.LAST_NEWS_REQUEST_AT, String(Date.now()));
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Result helpers ---------- */

function passesLocalMatchRule_(rule, item) {
  const text = [item.title, item.description, item.content, item.source].join(' ');
  if (!text.trim()) return false;
  const hay = rule.caseSensitive ? text : text.toLowerCase();
  const needle = rule.caseSensitive ? rule.term : rule.term.toLowerCase();
  if (rule.matchType === 'exact') return hay.indexOf(needle) >= 0;
  return needle.split(/\s+/).filter(Boolean).every(w => hay.indexOf(w) >= 0);
}

function buildResultRow_(term, item, fetchedAt) {
  return [
    false, term, item.publishedAt || '', item.source || '', item.title || '',
    item.link || '', item.description || '', item.content || '', fetchedAt,
    '', '', '', '', '', '', 'Pending'   // ai_* + FilterStatus
  ];
}

// URLs already in search_results OR approved_history (forever-dedup).
function getKnownUrls_(resultsSheet) {
  const set = new Set();
  const last = getLastDataRowInCols_(resultsSheet, 1, APP.HEADERS.RESULTS.length);
  if (last >= 2) {
    resultsSheet.getRange(2, APP.COL.RESULTS.LINK, last - 1, 1).getValues()
      .forEach(r => { const u = normalizeUrl_(r[0]); if (u) set.add(u); });
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hist = ss.getSheetByName(APP.SHEETS.HISTORY);
  if (hist) {
    const hLast = getLastDataRowInCols_(hist, 1, APP.HEADERS.HISTORY.length);
    if (hLast >= 2) {
      const linkCol = APP.HEADERS.HISTORY.indexOf('Link') + 1;
      hist.getRange(2, linkCol, hLast - 1, 1).getValues()
        .forEach(r => { const u = normalizeUrl_(r[0]); if (u) set.add(u); });
    }
  }
  return set;
}


/* ========================================================================
 * SECTION: 03_Gemini.gs
 * ====================================================================== */

/**************************************************************
 * TIPOLIS PRESS MONITOR — 03_Gemini.gs
 * Thin wrapper around the Gemini generateContent REST endpoint.
 * Forces JSON output via responseMimeType + responseSchema.
 **************************************************************/

/**
 * Calls Gemini and returns the parsed JSON object.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {Object} responseSchema  JSON schema object (Gemini dialect)
 * @return {Object} parsed JSON
 */
function callGeminiJson_(systemPrompt, userPrompt, responseSchema) {
  const apiKey = getSetting_('gemini_api_key');
  if (!apiKey) throw new Error('Missing gemini_api_key in report_settings.');
  const model = getSetting_('gemini_model') || APP.DEFAULTS.gemini_model;
  const url = APP.URLS.GEMINI_BASE + encodeURIComponent(model) + ':generateContent';

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json'
    }
  };
  if (responseSchema) body.generationConfig.responseSchema = responseSchema;

  let lastErr = null;
  for (let attempt = 0; attempt <= APP.LIMITS.GEMINI_MAX_RETRIES; attempt++) {
    try {
      const resp = UrlFetchApp.fetch(url, {
        method: 'post',
        muteHttpExceptions: true,
        contentType: 'application/json',
        headers: { 'x-goog-api-key': apiKey },
        payload: JSON.stringify(body)
      });
      const code = resp.getResponseCode();
      const text = resp.getContentText();
      if (code === 503 || code >= 500) {
        // Server overloaded/temporary: back off progressively and retry.
        lastErr = new Error(`Gemini HTTP ${code}: ${truncate_(text, 300)}`);
        Utilities.sleep(2000 * (attempt + 1));   // 2s, 4s, 6s, 8s
        continue;
      }
      if (code === 429) {
        // Quota exhausted: retrying won't help today. Fail fast.
        throw new Error(`Gemini HTTP 429: ${truncate_(text, 300)}`);
      }
      if (code < 200 || code >= 300) {
        throw new Error(`Gemini HTTP ${code}: ${truncate_(text, 400)}`);
      }
      const raw = extractGeminiText_(JSON.parse(text));
      if (!raw) throw new Error('Gemini returned empty content.');
      return JSON.parse(stripJsonFences_(raw));
    } catch (err) {
      lastErr = err;
      if (attempt < APP.LIMITS.GEMINI_MAX_RETRIES) { Utilities.sleep(1500); continue; }
    }
  }
  throw lastErr || new Error('Gemini call failed.');
}

function extractGeminiText_(json) {
  if (!json || !json.candidates || !json.candidates.length) return '';
  const cand = json.candidates[0];
  if (!cand.content || !cand.content.parts) return '';
  return cand.content.parts.map(p => p.text || '').join('').trim();
}

function stripJsonFences_(s) {
  return String(s || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}


/* ========================================================================
 * SECTION: 04_AIFilter.gs
 * ====================================================================== */

/**************************************************************
 * TIPOLIS PRESS MONITOR — 04_AIFilter.gs
 * Weekly AI Filter. Enforces the Mon-Sun window, then asks Gemini
 * to classify each in-window row (relevance, category, country, region).
 * Processes in batches to stay within the 6-minute execution limit;
 * re-arms itself with a continuation trigger if work remains.
 *
 * `category` (tipolis|industry|reject) is the ONLY field that decides
 * whether an article is kept or dropped — it's what the report sections
 * and the triage screen both gate on. `relevance` (high|medium|low) is
 * just a priority signal for articles that were kept; it can never be
 * "reject" (see FILTER_BATCH_SCHEMA_ and the defensive coercion below).
 **************************************************************/

function runAIFilterNow() {
  runAIFilter_();
}

function runDailyAIFilter() {
  if (!isAutoRunOn_('daily_filter_auto_run')) {
    log_('runDailyAIFilter', 'Skipped: daily AI classification automation is paused.');
    return;
  }
  runAIFilter_();
}

function runAIFilter_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) { log_('runAIFilter', 'Skipped: busy.'); return; }
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(APP.SHEETS.RESULTS);
    const last = getLastDataRowInCols_(sheet, 1, APP.HEADERS.RESULTS.length);
    if (last < 2) { log_('runAIFilter', 'No rows to filter.'); return; }

    const C = APP.COL.RESULTS;
    const data = sheet.getRange(2, 1, last - 1, APP.HEADERS.RESULTS.length).getValues();

    // 1) Collect rows needing classification. Skip Done, Error, Skipped (no loops).
    const pending = [];
    for (let i = 0; i < data.length; i++) {
      const status = String(data[i][C.FILTER_STATUS - 1] || '');
      if (status === 'Done' || status === 'Error' || status === 'Skipped') continue;
      pending.push({ rowNumber: i + 2, row: data[i] });
    }
    if (!pending.length) { log_('runAIFilter', 'Nothing pending.'); return; }

    // 2) Local pre-filter: reject obvious noise WITHOUT calling Gemini.
    const toClassify = [];
    let preRejected = 0;
    pending.forEach(p => {
      const reason = prefilterReject_(
        String(p.row[C.TITLE - 1] || ''),
        String(p.row[C.DESCRIPTION - 1] || ''),
        String(p.row[C.SOURCE - 1] || '')
      );
      if (reason) {
        sheet.getRange(p.rowNumber, C.AI_RELEVANCE, 1, 6).setValues([[
          'reject', 'reject', '', '', 'Pre-filtered: ' + reason, ''
        ]]);
        sheet.getRange(p.rowNumber, C.FILTER_STATUS).setValue('Done');
        preRejected++;
      } else {
        toClassify.push(p);
      }
    });
    if (preRejected) { SpreadsheetApp.flush(); log_('runAIFilter', `Pre-filtered ${preRejected} noise row(s) without AI.`); }
    if (!toClassify.length) { log_('runAIFilter', 'All pending rows pre-filtered. Done.'); return; }

    // 2b) Local dedup: near-identical titles (e.g. the same wire story picked
    // up by several outlets) are marked as duplicates of the first-seen row
    // without spending a Gemini call. Seeded from every row already in the
    // sheet (any FilterStatus) so it also catches duplicates fetched today.
    const seenTitles = {};   // normalized title -> link of the first-seen row
    data.forEach(row => {
      const norm = normalizeTitleForDedup_(String(row[C.TITLE - 1] || ''));
      if (norm && !seenTitles[norm]) seenTitles[norm] = normalizeUrl_(String(row[C.LINK - 1] || ''));
    });
    const deduped = [];
    let duplicated = 0;
    toClassify.forEach(p => {
      const norm = normalizeTitleForDedup_(String(p.row[C.TITLE - 1] || ''));
      const ownLink = normalizeUrl_(String(p.row[C.LINK - 1] || ''));
      const originalLink = norm ? seenTitles[norm] : '';
      if (originalLink && originalLink !== ownLink) {
        sheet.getRange(p.rowNumber, C.AI_RELEVANCE, 1, 6).setValues([[
          'low', 'reject', '', '', 'Duplicate of an already-classified article this week.', originalLink
        ]]);
        sheet.getRange(p.rowNumber, C.FILTER_STATUS).setValue('Done');
        duplicated++;
      } else {
        deduped.push(p);
      }
    });
    if (duplicated) { SpreadsheetApp.flush(); log_('runAIFilter', `Deduped ${duplicated} near-identical title(s) without AI.`); }
    if (!deduped.length) { log_('runAIFilter', 'All remaining rows were duplicates. Done.'); return; }

    // 3) Batch the rest through Gemini (10 articles per call).
    const systemPrompt = buildFilterSystemPrompt_(getTipolisCountriesText_());
    const BATCH_SIZE = 10;
    const SPACING_MS = 6500;
    const SAFE_MS = 5 * 60 * 1000;
    const startTime = Date.now();
    let classified = 0;

    for (let b = 0; b < deduped.length; b += BATCH_SIZE) {
      if (Date.now() - startTime > SAFE_MS) {
        scheduleFilterContinuation_();
        log_('runAIFilter', `Time budget reached after ${classified} classified. Continuation scheduled.`);
        return;
      }
      const batch = deduped.slice(b, b + BATCH_SIZE);
      let out;
      try {
        out = callGeminiJson_(systemPrompt, buildFilterBatchUserPrompt_(batch), FILTER_BATCH_SCHEMA_);
      } catch (err) {
        const msg = getErrorMessage_(err);
        if (msg.indexOf('429') >= 0) {
          // Daily quota reached: STOP. Leave rows Pending for the next daily run. Do NOT re-arm.
          removeTriggersByHandler_('runDailyAIFilter_continuation');
          log_('runAIFilter', `Gemini daily quota reached. Stopping. ${classified} classified; remaining stay Pending for tomorrow.`);
          return;
        }
        batch.forEach(p => {
          sheet.getRange(p.rowNumber, C.FILTER_STATUS).setValue('Error');
          sheet.getRange(p.rowNumber, C.AI_REASON).setValue(truncate_(msg, 200));
        });
        log_('runAIFilter', `Batch error (non-quota): ${truncate_(msg, 200)}`);
        continue;
      }

      const results = (out && Array.isArray(out.results)) ? out.results : [];
      const byId = {};
      results.forEach(r => { if (r && r.id != null) byId[Number(r.id)] = r; });

      batch.forEach((p, idx) => {
        const r = byId[idx + 1] || {};
        const category = String(r.category || 'industry');
        let relevance = String(r.relevance || 'low');
        // Defensive: `category` is the sole gate (see api_listTriage_). Never
        // let a stray "reject" relevance from the model hide a kept article.
        if (category !== 'reject' && relevance === 'reject') relevance = 'medium';
        sheet.getRange(p.rowNumber, C.AI_RELEVANCE, 1, 6).setValues([[
          relevance,
          category,
          String(r.country || ''),
          String(r.region || ''),
          String(r.reason || ''),
          ''
        ]]);
        sheet.getRange(p.rowNumber, C.FILTER_STATUS).setValue('Done');
        classified++;
      });
      SpreadsheetApp.flush();
      Utilities.sleep(SPACING_MS);
    }

    removeTriggersByHandler_('runDailyAIFilter_continuation');
    log_('runAIFilter', `Completed. ${preRejected} pre-filtered, ${duplicated} deduped, ${classified} AI-classified.`);
  } finally {
    lock.releaseLock();
  }
}

/**
 * One-off cleanup for rows classified before this fix: some have
 * category "tipolis"/"industry" (kept) but a leftover relevance of
 * "reject" from the old prompt. They're already visible in triage now
 * that api_listTriage_ gates on category, but the stale "reject" would
 * still show as a confusing priority badge — so tidy the column too.
 * Safe to run more than once; only touches rows with the old contradiction.
 */
function fixHistoricalRelevanceMismatchesNow() {
  const sheet = sheet_(APP.SHEETS.RESULTS);
  const C = APP.COL.RESULTS;
  const last = getLastDataRowInCols_(sheet, 1, APP.HEADERS.RESULTS.length);
  if (last < 2) { log_('fixHistoricalRelevanceMismatches', 'No rows.'); return; }
  const data = sheet.getRange(2, 1, last - 1, APP.HEADERS.RESULTS.length).getValues();
  let fixed = 0;
  data.forEach((row, i) => {
    const category = String(row[C.AI_CATEGORY - 1] || '');
    const relevance = String(row[C.AI_RELEVANCE - 1] || '');
    if ((category === 'tipolis' || category === 'industry') && relevance === 'reject') {
      sheet.getRange(i + 2, C.AI_RELEVANCE).setValue('medium');
      fixed++;
    }
  });
  log_('fixHistoricalRelevanceMismatches', `Fixed ${fixed} row(s) with a stale relevance="reject".`);
  try { SpreadsheetApp.getUi().alert(`Fixed ${fixed} row(s) that had a contradictory relevance="reject".`); } catch (e) { /* editor run: no UI */ }
}

function runDailyAIFilter_continuation() { runAIFilter_(); }

function scheduleFilterContinuation_() {
  removeTriggersByHandler_('runDailyAIFilter_continuation');
  ScriptApp.newTrigger('runDailyAIFilter_continuation')
    .timeBased().after(60 * 1000).create();
}

/* ---------- Prompt building ---------- */

function buildFilterSystemPrompt_(countriesText) {
  return [
    'You are a relevance classifier for the Tipolis weekly press summary.',
    '',
    'Tipolis priority countries:',
    countriesText,
    '',
    'Tracked projects: Próspera, Destiny, ZEDE, SSZ, Gelephu Mindfulness City, TechParkCV, Sherbro Island, Alpha Cities, Network States, Charter Cities.',
    '',
    'You will receive MULTIPLE articles, each with a numeric "id". Classify EACH one and return JSON only as {"results": [ ... ]}, with exactly one entry per article, echoing its "id".',
    'Rules per article:',
    '- "category" is the ONLY field that decides whether the article is kept. Set it to "reject" when: it mentions a priority country but for an unrelated topic (sports, weather, entertainment, generic crime, public health, culture); or it is promotional/opinion-only/fact-free.',
    '- "tipolis": ties a priority country OR a tracked project to a relevant topic (SEZ, free zone, private city, charter city, governance, investment, infrastructure, citizenship, regulatory reform).',
    '- "industry": SEZs / free zones / private cities / charter cities / network states / regulatory sandboxes / governance innovation / industrial corridors / technology hubs in a country NOT on the priority list.',
    '- Ties go to "tipolis" when any clear link to a priority country/project exists.',
    '- "relevance" is NEVER "reject" and never contradicts "category": it is only a priority signal (high/medium/low) for how strongly to feature an article whose category is "tipolis" or "industry". If category is "reject", set relevance to "low".',
    '- country: canonical English name, or "Multiple", or "Global". region: one of Africa, Caribbean, Latin America, North America, Europe, Middle East, South Asia, Southeast Asia, East Asia, Oceania, Global.'
  ].join('\n');
}

function buildFilterBatchUserPrompt_(batch) {
  const C = APP.COL.RESULTS;
  const parts = ['Classify each article below. Return {"results":[...]} with one entry per id.', ''];
  batch.forEach((p, idx) => {
    const row = p.row;
    parts.push(`--- id: ${idx + 1} ---`);
    parts.push(`Source: ${row[C.SOURCE - 1]}`);
    parts.push(`Title: ${row[C.TITLE - 1]}`);
    parts.push(`Description: ${truncate_(String(row[C.DESCRIPTION - 1] || ''), 400)}`);
    parts.push(`Search term: ${row[C.TERM - 1]}`);
    parts.push('');
  });
  return parts.join('\n');
}

const FILTER_BATCH_SCHEMA_ = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          relevance: { type: 'string', enum: ['high', 'medium', 'low'] },
          category: { type: 'string', enum: ['tipolis', 'industry', 'reject'] },
          country: { type: 'string' },
          region: { type: 'string' },
          reason: { type: 'string' }
        },
        required: ['id', 'relevance', 'category', 'country', 'region', 'reason']
      }
    }
  },
  required: ['results']
};

// Cheap text rules to drop obvious noise before spending a Gemini call.
function prefilterReject_(title, description, source) {
  const text = (String(title) + ' ' + String(description) + ' ' + String(source)).toLowerCase();
  const noise = [
    'world cup', 'fifa', 'copa do mundo', 'copa libertadores', 'copa sudamericana',
    'libertadores', 'sudamericana', 'concacaf', 'world cup squad', 'world cup team',
    'world cup tickets', 'kick-off', ' fixtures', 'live stream', 'tv channel',
    'tv schedule', 'where to watch', 'how to buy', ' stadium', 'soccer', 'softball',
    'playoffs', ' u20', ' u16', 'wushu', 'trail race', 'backyard ultra', 'big bike',
    'roland garros', 'pga tour', 'kia open',
    'tobacco-free', 'smoke-free', 'lpg-free', 'fmd-free', 'human-free zone',
    'zionist free zone', 'png target', 'png rollout',
    'prospera energy', 'prospera financial',
    'ben nevis', 'park rapids', 'red lake', 'centenarian',
    'sewage', 'straight through processing', 'sebi', 'okhla', 'stp infra',
    'pond rejuvenation',
    'music video', 'art on display', 'paintings from', 'galleries night',
    'literary prize', 'exposição', 'concerto', 'documentário', 'pillow cover',
    'wuling',
    'ebola', 'ébola', 'hantavirus', 'hantavírus', 'measles', 'rodent-borne',
    'iguanas', 'sea turtles', 'tartarugas'
  ];
  for (let i = 0; i < noise.length; i++) {
    if (text.indexOf(noise[i]) >= 0) return noise[i];
  }
  return null;
}

// Lowercases, strips accents/punctuation, and collapses whitespace so
// near-identical headlines from different outlets compare equal. Titles
// shorter than 12 normalized chars are treated as "no signal" (too generic
// to safely dedup on) and return ''.
function normalizeTitleForDedup_(title) {
  const t = String(title || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return t.length >= 12 ? t : '';
}

function buildFilterUserPrompt_(row) {
  const C = APP.COL.RESULTS;
  return [
    `Source: ${row[C.SOURCE - 1]}`,
    `Title: ${row[C.TITLE - 1]}`,
    `Description: ${truncate_(String(row[C.DESCRIPTION - 1] || ''), 1500)}`,
    `URL: ${row[C.LINK - 1]}`,
    `Search term: ${row[C.TERM - 1]}`
  ].join('\n');
}

const FILTER_SCHEMA_ = {
  type: 'object',
  properties: {
    relevance: { type: 'string', enum: ['high', 'medium', 'low'] },
    category: { type: 'string', enum: ['tipolis', 'industry', 'reject'] },
    country: { type: 'string' },
    region: { type: 'string' },
    reason: { type: 'string' }
  },
  required: ['relevance', 'category', 'country', 'region', 'reason']
};

function getTipolisCountriesText_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(APP.SHEETS.COUNTRIES);
  const last = getLastDataRowInCols_(sheet, 1, APP.HEADERS.COUNTRIES.length);
  if (last < 2) return '(none)';
  return sheet.getRange(2, 1, last - 1, 2).getValues()
    .filter(r => String(r[0] || '').trim())
    .map(r => `- ${r[0]} (${r[1]})`).join('\n');
}


/* ========================================================================
 * SECTION: 05_AISummary.gs
 * ====================================================================== */

/**************************************************************
 * TIPOLIS PRESS MONITOR — 05_AISummary.gs
 * Moves an approved search_results row into approved_news and
 * generates the Gemini bullet summary for it.
 **************************************************************/

/**
 * Approve a search_results row by its row number.
 * Copies to approved_news, then generates the AI summary.
 * Called by the frontend (/triage/approve) and by the manual menu.
 */
function approveResultRow_(resultsRowNumber, buildSummary) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const results = ss.getSheetByName(APP.SHEETS.RESULTS);
  const approved = ss.getSheetByName(APP.SHEETS.APPROVED);
  const C = APP.COL.RESULTS;

  const row = results.getRange(resultsRowNumber, 1, 1, APP.HEADERS.RESULTS.length).getValues()[0];
  const link = normalizeUrl_(row[C.LINK - 1]);
  if (!link) { log_('approveResultRow', `Row ${resultsRowNumber}: empty link.`); return null; }
  if (approvedLinkExists_(approved, link)) {
    log_('approveResultRow', `Row ${resultsRowNumber}: link already in approved_news.`);
    return null;
  }

  const nextOrder = getNextDisplayOrder_(approved);
  const newRow = [
    true,                              // Approved
    formatDateTime_(new Date()),       // ApprovedAt
    row[C.TERM - 1],                   // Term
    row[C.PUBLISHED_AT - 1],           // PublishedAt
    row[C.SOURCE - 1],                 // Source
    row[C.TITLE - 1],                  // Title
    row[C.LINK - 1],                   // Link
    row[C.DESCRIPTION - 1],            // Description
    row[C.CONTENT - 1],                // Content
    row[C.AI_COUNTRY - 1],             // Country (from filter)
    row[C.AI_REGION - 1],              // Region (from filter)
    (row[C.AI_CATEGORY - 1] === 'tipolis' ? 'tipolis' : 'industry'),  // Category
    '',                                // AI_Bullets_Raw
    '',                                // Edited_Bullets
    'Pending',                         // AI_Status
    'Pending',                         // Edit_Status
    nextOrder                          // Display_Order
  ];
  const targetRow = getNextEmptyRowInCols_(approved, 1, APP.HEADERS.APPROVED.length);
  approved.getRange(targetRow, 1, 1, APP.HEADERS.APPROVED.length).setValues([newRow]);
  results.getRange(resultsRowNumber, C.APPROVED).setValue(true);

  // Only build the summary inline when explicitly asked (menu batch).
  // The web approve path skips this so the HTTP call returns fast (no timeout).
  if (buildSummary) {
    generateSummaryForApprovedRow_(targetRow);
  }
  return targetRow;
}

/**
 * Generates (or regenerates) the AI bullet summary for an approved_news row.
 */
function generateSummaryForApprovedRow_(rowNumber) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const approved = ss.getSheetByName(APP.SHEETS.APPROVED);
  const A = APP.COL.APPROVED;
  const row = approved.getRange(rowNumber, 1, 1, APP.HEADERS.APPROVED.length).getValues()[0];

  try {
    // Full resolution (including the slower batchexecute network path) only
    // happens here, for the small set of approved items — not during bulk
    // search — so a Google News redirect link doesn't block a full-text
    // summary just because it wasn't resolved cheaply at search time.
    let articleUrl = String(row[A.LINK - 1] || '');
    if (articleUrl.indexOf('news.google.com') >= 0) {
      const resolved = resolveArticleUrl_(articleUrl, /*allowNetwork*/ true);
      if (resolved) {
        articleUrl = resolved;
        approved.getRange(rowNumber, A.LINK).setValue(resolved);
      }
    }

    const pageText = fetchArticleText_(articleUrl);
    const out = callGeminiJson_(
      getSummarySystemPrompt_(),
      buildSummaryUserPrompt_(row, pageText),
      SUMMARY_SCHEMA_
    );
    const payload = JSON.stringify({
      headline_line: String(out.headline_line || ''),
      bullets: Array.isArray(out.bullets) ? out.bullets.map(String) : []
    });
    approved.getRange(rowNumber, A.AI_BULLETS_RAW).setValue(payload);
    approved.getRange(rowNumber, A.EDITED_BULLETS).setValue(payload);
    approved.getRange(rowNumber, A.AI_STATUS).setValue('Done');
    log_('generateSummary',
      `Summary generated for approved_news row ${rowNumber}` +
      (pageText ? ' (full article text).' : ' (feed text only — page not fetchable).'));
  } catch (err) {
    approved.getRange(rowNumber, A.AI_STATUS).setValue('Error: ' + truncate_(getErrorMessage_(err), 150));
    log_('generateSummary', `Row ${rowNumber} error: ${getErrorMessage_(err)}`);
  }
}

/* ---------- Prompt building ---------- */

function getSummarySystemPrompt_() {
  // Compact inline version of the editorial spec.
  return [
    'You are an executive media analyst writing a Tipolis-style weekly press summary. Output language: English.',
    'Transform one article into 6 to 10 factual bullets; a human editor will trim to 3-5.',
    'Tone: neutral, factual, institutional, executive-briefing. ~80% active voice.',
    'Each bullet is ONE sentence ending in a period. Target 14-22 words, hard cap 35.',
    'Follow the hierarchy: main lead, institutional context, concrete data, strategic impact, risk/status.',
    'Preserve names, dates, locations, monetary values, percentages, project names, laws, institutions.',
    'No opinions, no promotion, no filler, no "the article says". Never invent facts.',
    'Include controversy, opposition, regulatory risk, or pending approval when present.',
    'Allowed inline formatting: markdown links (max 1 per bullet, to authoritative sources for named programs, never the source publication); **bold** for headline money values or anchor place names; *italic* for project names on first mention; comparative bullets "**Actor:** ..." only when comparing 3+ peers.',
    'headline_line format: "<PUBLICATION NAME>: [**<Headline>**](<URL>)". Replace <PUBLICATION NAME> with the actual source name provided; never write the literal word "Source".',
    'Return JSON only.'
  ].join(' ');
}

function buildSummaryUserPrompt_(row, fetchedText) {
  const A = APP.COL.APPROVED;
  const feedDesc = String(row[A.DESCRIPTION - 1] || '');
  const feedContent = String(row[A.CONTENT - 1] || '');
  const articleText = String(fetchedText || '').trim();
  // Use the fetched page when it's richer than the feed snippet; otherwise fall back.
  const bodyText = (articleText && articleText.length > feedContent.length)
    ? articleText
    : (feedContent || feedDesc);
  return [
    `Source: ${row[A.SOURCE - 1]}`,
    `Title: ${row[A.TITLE - 1]}`,
    `URL: ${row[A.LINK - 1]}`,
    `Published: ${row[A.PUBLISHED_AT - 1]}`,
    `Country: ${row[A.COUNTRY - 1]}`,
    `Category: ${row[A.CATEGORY - 1]}`,
    '',
    'Article text (use this as the primary source; do not invent beyond it):',
    truncate_(bodyText, APP.LIMITS.MAX_CONTENT_CHARS)
  ].join('\n');
}

const SUMMARY_SCHEMA_ = {
  type: 'object',
  properties: {
    headline_line: { type: 'string' },
    bullets: { type: 'array', items: { type: 'string' } }
  },
  required: ['headline_line', 'bullets']
};

/* ---------- Manual batch processor (menu) ---------- */

function approveCheckedResultsNow() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const results = ss.getSheetByName(APP.SHEETS.RESULTS);
  const last = getLastDataRowInCols_(results, 1, APP.HEADERS.RESULTS.length);
  if (last < 2) return;
  let count = 0;
  for (let r = 2; r <= last; r++) {
    if (results.getRange(r, APP.COL.RESULTS.APPROVED).getValue() === true) {
      if (approveResultRow_(r, true)) count++;
    }
  }
  log_('approveCheckedResultsNow', `Approved ${count} row(s).`);
}


/* ========================================================================
 * SECTION: 06_Report.gs
 * ====================================================================== */

/**************************************************************
 * TIPOLIS PRESS MONITOR — 06_Report.gs
 * Copies the Google Doc template, replaces metadata placeholders,
 * and injects approved_news items as native list items (level-0
 * headline + level-1 bullets), parsing inline markdown.
 **************************************************************/

function generateReportNow() {
  const res = generateWeeklyReport_();
  if (res && res.url) {
    SpreadsheetApp.getUi().alert('Report generated:\n' + res.url);
  } else {
    SpreadsheetApp.getUi().alert('Report generation failed. Check the logs sheet.');
  }
}

/**
 * @return {{docId:string, url:string, weekNumber:number, reportDate:string}}
 */
function generateWeeklyReport_() {
  const templateId = getSetting_('report_template_doc_id');
  const folderId = getSetting_('report_drive_folder_id');
  if (!templateId) throw new Error('Missing report_template_doc_id.');
  if (!folderId) throw new Error('Missing report_drive_folder_id.');

  const meta = computeNextWeekMeta_();
  const items = readApprovedItems_();

  const folder = DriveApp.getFolderById(folderId);
  const name = `Tipolis Press Summary - Week ${meta.weekNumber}_${meta.year}`;
  const copy = DriveApp.getFileById(templateId).makeCopy(name, folder);
  const doc = DocumentApp.openById(copy.getId());
  const body = doc.getBody();

  body.replaceText('\\{\\{WEEK_NUMBER\\}\\}', String(meta.weekNumber));
  body.replaceText('\\{\\{REPORT_DATE\\}\\}', meta.reportDateDisplay);
  body.replaceText('\\{\\{AUTHOR\\}\\}', getSetting_('author_name') || 'Rafael Leandro');

  injectSection_(body, '{{TIPOLIS_NEWS_PLACEHOLDER}}', items.filter(i => i.category === 'tipolis'));
  injectSection_(body, '{{INDUSTRY_NEWS_PLACEHOLDER}}', items.filter(i => i.category !== 'tipolis'));

  doc.saveAndClose();

  log_('generateWeeklyReport', `Generated "${name}" (${items.length} items).`);
  return {
    docId: copy.getId(),
    url: copy.getUrl(),
    weekNumber: meta.weekNumber,
    year: meta.year,
    reportDate: meta.reportDateIso,
    reportDateDisplay: meta.reportDateDisplay
  };
}

function readApprovedItems_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const approved = ss.getSheetByName(APP.SHEETS.APPROVED);
  const A = APP.COL.APPROVED;
  const last = getLastDataRowInCols_(approved, 1, APP.HEADERS.APPROVED.length);
  if (last < 2) return [];
  const data = approved.getRange(2, 1, last - 1, APP.HEADERS.APPROVED.length).getValues();
  const items = data.map((row, idx) => {
    const editedRaw = String(row[A.EDITED_BULLETS - 1] || row[A.AI_BULLETS_RAW - 1] || '');
    let headline = '', bullets = [];
    try {
      const parsed = JSON.parse(editedRaw);
      headline = String(parsed.headline_line || '');
      bullets = Array.isArray(parsed.bullets) ? parsed.bullets.map(String) : [];
    } catch (e) { /* leave empty */ }
    if (!headline) {
      headline = `${row[A.SOURCE - 1]}: [**${row[A.TITLE - 1]}**](${row[A.LINK - 1]})`;
    }
    return {
      sheetRow: idx + 2,
      category: row[A.CATEGORY - 1] === 'tipolis' ? 'tipolis' : 'industry',
      order: toPositiveInt_(row[A.DISPLAY_ORDER - 1], idx + 1),
      headline: headline,
      bullets: bullets
    };
  });
  items.sort((a, b) => a.order - b.order);
  return items;
}

function injectSection_(body, placeholder, items) {
  const found = body.findText(placeholder);
  if (!found) { log_('injectSection', `Placeholder not found: ${placeholder}`); return; }
  const placeholderPara = found.getElement().getParent();
  let index = body.getChildIndex(placeholderPara.asParagraph());

  if (!items.length) {
  const p = body.insertParagraph(index, 'No significant news this week.');
  p.setAttributes({}); // inherit default
  removePlaceholderParagraph_(body, placeholderPara);
  return;
}

  // Hanging indent (like the good W23 report): the bullet marker sits at firstLine,
// and the text wraps aligned at "start". HEAD ~0.63cm, BULLET ~1.25cm.
const HEAD_START = 18;    // 0.63 cm — where headline text aligns
const HEAD_FIRST = 0;     // marker position for headline
const BULLET_START = 35;  // 1.25 cm — where bullet text aligns
const BULLET_FIRST = 18;  // marker position for sub-bullets

items.forEach(item => {
  const headItem = body.insertListItem(index++, '');
  headItem.setGlyphType(DocumentApp.GlyphType.BULLET).setNestingLevel(0);
  headItem.setIndentStart(HEAD_START).setIndentFirstLine(HEAD_FIRST);
  headItem.setLineSpacing(1.15).setSpacingBefore(0).setSpacingAfter(4);
  applyMarkdownToListItem_(headItem, item.headline);

  item.bullets.forEach(b => {
  const li = body.insertListItem(index++, '');
  li.setGlyphType(DocumentApp.GlyphType.HOLLOW_BULLET).setNestingLevel(1);
  li.setIndentStart(BULLET_START).setIndentFirstLine(BULLET_FIRST);
  li.setLineSpacing(1.15).setSpacingBefore(0).setSpacingAfter(2);
  applyMarkdownToListItem_(li, b);
});
});

removePlaceholderParagraph_(body, placeholderPara);
}

// Removes the placeholder paragraph. If it's the last paragraph in the document
// (which Docs forbids removing), clears its text instead so {{...}} doesn't show.
function removePlaceholderParagraph_(body, placeholderPara) {
try {
  placeholderPara.removeFromParent();
} catch (e) {
  // Last paragraph of the section can't be removed; blank it out instead.
  placeholderPara.asParagraph().clear();
}
}

/* ---------- Inline markdown -> Doc formatting ---------- */

function applyMarkdownToListItem_(listItem, markdownText) {
  const segments = parseInlineMarkdown_(markdownText);
  const t = listItem.editAsText();
  t.setText('');
  let pos = 0;
  segments.forEach(seg => {
  if (!seg.text) return;
  t.appendText(seg.text);
  const end = pos + seg.text.length - 1;
  t.setBold(pos, end, seg.bold === true);
  t.setItalic(pos, end, seg.italic === true);
  if (seg.url) t.setLinkUrl(pos, end, seg.url);
  pos = end + 1;
});
}

/**
 * Parses **bold**, *italic*, and [text](url) (with optional **bold** inside the anchor).
 * Returns segments: [{text, bold, italic, url}]
 */
function parseInlineMarkdown_(md) {
  const s = String(md || '');
  const segments = [];
  const regex = /(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g;
  let lastIndex = 0, m;
  while ((m = regex.exec(s)) !== null) {
    if (m.index > lastIndex) {
      segments.push({ text: s.substring(lastIndex, m.index), bold: false, italic: false, url: null });
    }
    if (m[1]) {                       // [text](url)
      let linkText = m[2], bold = false;
      const bm = linkText.match(/^\*\*([\s\S]+)\*\*$/);
      if (bm) { linkText = bm[1]; bold = true; }
      segments.push({ text: linkText, bold: bold, italic: false, url: m[3] });
    } else if (m[4]) {                // **bold**
      segments.push({ text: m[5], bold: true, italic: false, url: null });
    } else if (m[6]) {                // *italic*
      segments.push({ text: m[7], bold: false, italic: true, url: null });
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < s.length) {
    segments.push({ text: s.substring(lastIndex), bold: false, italic: false, url: null });
  }
  return segments.length ? segments : [{ text: s, bold: false, italic: false, url: null }];
}


/* ========================================================================
 * SECTION: 07_Archive.gs
 * ====================================================================== */

/**************************************************************
 * TIPOLIS PRESS MONITOR — 07_Archive.gs
 * Moves approved_news into approved_history, then clears
 * approved_news and search_results. Bumps the week counter.
 * Call AFTER a report is generated (pass its meta in).
 **************************************************************/

function archiveWeekNow() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const approved = ss.getSheetByName(APP.SHEETS.APPROVED);
  const count = Math.max(0, getLastDataRowInCols_(approved, 1, APP.HEADERS.APPROVED.length) - 1);

  const resp = ui.alert(
    'Archive & reset week',
    `This will archive ${count} approved item(s) into approved_history, ` +
    'then clear approved_news and search_results.\n\nProceed?',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  // Use the most recent report meta if available; otherwise compute current.
  const meta = computeNextWeekMeta_();
  const result = archiveAndReset_(meta, '', '');
  ui.alert(`Archived ${result.archived} item(s). Week is reset.`);
}

/**
 * @param {Object} meta  from computeNextWeekMeta_()
 * @param {string} reportDocId
 * @param {string} reportDocUrl
 * @return {{archived:number}}
 */
function archiveAndReset_(meta, reportDocId, reportDocUrl) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const approved = ss.getSheetByName(APP.SHEETS.APPROVED);
    const history = ss.getSheetByName(APP.SHEETS.HISTORY);
    const results = ss.getSheetByName(APP.SHEETS.RESULTS);
    const A = APP.COL.APPROVED;

    const last = getLastDataRowInCols_(approved, 1, APP.HEADERS.APPROVED.length);
    let archived = 0;

    if (last >= 2) {
      const data = approved.getRange(2, 1, last - 1, APP.HEADERS.APPROVED.length).getValues();
      const archivedAt = formatDateTime_(new Date());
      const rows = data.map(row => {
        const editedRaw = String(row[A.EDITED_BULLETS - 1] || row[A.AI_BULLETS_RAW - 1] || '');
        return [
          meta.weekNumber, meta.year, meta.reportDateIso, archivedAt,
          row[A.CATEGORY - 1], row[A.COUNTRY - 1], row[A.REGION - 1], row[A.SOURCE - 1],
          row[A.PUBLISHED_AT - 1], row[A.TITLE - 1], row[A.LINK - 1],
          editedRaw, reportDocId, reportDocUrl
        ];
      });
      const startRow = getNextEmptyRowInCols_(history, 1, APP.HEADERS.HISTORY.length);
      history.getRange(startRow, 1, rows.length, APP.HEADERS.HISTORY.length).setValues(rows);
      archived = rows.length;
    }

    // Bump week counter so the next report is previous+1.
    setSetting_('last_report_week_number', String(meta.weekNumber));
    setSetting_('last_report_date', meta.reportDateIso);

    clearDataRows_(approved, APP.HEADERS.APPROVED.length);
    clearDataRows_(results, APP.HEADERS.RESULTS.length);

    SpreadsheetApp.flush();
    log_('archiveAndReset', `Archived ${archived} item(s) for Week ${meta.weekNumber}_${meta.year}. Sheets reset.`);
    return { archived: archived };
  } finally {
    lock.releaseLock();
  }
}

function clearDataRows_(sheet, numCols) {
  const last = sheet.getMaxRows();
  if (last >= 2) {
    sheet.getRange(2, 1, last - 1, Math.max(numCols, sheet.getMaxColumns())).clearContent();
  }
}


/* ========================================================================
 * SECTION: 08_Triggers.gs
 * ====================================================================== */

/**************************************************************
 * TIPOLIS PRESS MONITOR — 08_Triggers.gs
 * Installs the daily search and weekly AI filter triggers.
 **************************************************************/

function installAllTriggers() {
  removeTriggersByHandler_('runDailySearch');
  removeTriggersByHandler_('runWeeklyAIFilter');              // legacy cleanup
  removeTriggersByHandler_('runWeeklyAIFilter_continuation'); // legacy cleanup
  removeTriggersByHandler_('runDailyAIFilter');
  removeTriggersByHandler_('runDailyAIFilter_continuation');

  ScriptApp.newTrigger('runDailySearch')
    .timeBased().everyDays(1).atHour(APP.DEFAULTS.daily_search_hour).create();

  ScriptApp.newTrigger('runDailyAIFilter')
    .timeBased().everyDays(1).atHour(APP.DEFAULTS.weekly_filter_hour).create();

  log_('installAllTriggers', 'Daily search + daily AI classification triggers installed.');
  SpreadsheetApp.getUi().alert(
    'Triggers installed:\n' +
    `- Daily search ~${APP.DEFAULTS.daily_search_hour}:00\n` +
    `- Daily AI classification ~${APP.DEFAULTS.weekly_filter_hour}:00`
  );
}

function deleteAllProjectTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  log_('deleteAllProjectTriggers', `Deleted ${triggers.length} trigger(s).`);
  SpreadsheetApp.getUi().alert(`Deleted ${triggers.length} trigger(s).`);
}

function removeTriggersByHandler_(name) {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === name) ScriptApp.deleteTrigger(t);
  });
}


/* ========================================================================
 * SECTION: 09_WebApp.gs
 * ====================================================================== */

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


/* ========================================================================
 * SECTION: 10_Helpers.gs
 * ====================================================================== */

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
