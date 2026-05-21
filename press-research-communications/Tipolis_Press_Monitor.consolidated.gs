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
    LOGS: 'logs'
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
    LOGS: ['DateTime', 'Step', 'Message']
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
    max_results: 20,
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
    GEMINI_MAX_RETRIES: 1
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
    .addItem('Run weekly AI filter now', 'runAIFilterNow')
    .addSeparator()
    .addItem('Generate weekly report now', 'generateReportNow')
    .addItem('Archive & reset week', 'archiveWeekNow')
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
 * Daily search. Google News RSS first, GNews API fallback.
 * Appends new rows to search_results. Dedups by URL against
 * search_results (current accumulator) and approved_history.
 **************************************************************/

function runSearchNow() {
  runSearchCore_('manual');
}

function runDailySearch() {
  if (getSetting_('daily_search_auto_run') !== 'true') {
    log_('runDailySearch', 'Skipped: daily_search_auto_run is not true.');
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

/* ---------- Fetching ---------- */

function fetchNewsForRule_(rule) {
  const rss = fetchFromGoogleNewsRss_(rule);
  if (rss.length) return rss.slice(0, rule.maxResults);
  log_('fetchNewsForRule', `RSS empty for "${rule.term}". Trying GNews fallback.`);
  return fetchFromGNewsApi_(rule).slice(0, rule.maxResults);
}

function fetchFromGoogleNewsRss_(rule) {
  enforceRequestSpacing_();
  const term = rule.matchType === 'exact' ? `"${escapeQuotes_(rule.term)}"` : rule.term;
  const days = Math.max(1, rule.days || APP.DEFAULTS.days);
  const params = { q: `${term} when:${days}d` };
  if (rule.language) params.hl = rule.country ? `${rule.language}-${rule.country}` : rule.language;
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
  const fromDate = new Date(now.getTime() - rule.days * 24 * 60 * 60 * 1000);
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
      if (code === 429 || code >= 500) {
        lastErr = new Error(`Gemini HTTP ${code}: ${truncate_(text, 300)}`);
        Utilities.sleep(2000);
        continue;
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
 **************************************************************/

function runAIFilterNow() {
  runAIFilter_();
}

function runWeeklyAIFilter() {
  if (getSetting_('weekly_filter_auto_run') !== 'true') {
    log_('runWeeklyAIFilter', 'Skipped: weekly_filter_auto_run is not true.');
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

    const window = getReportWindow_();
    const countriesList = getTipolisCountriesText_();
    const systemPrompt = buildFilterSystemPrompt_(countriesList);

    const C = APP.COL.RESULTS;
    const data = sheet.getRange(2, 1, last - 1, APP.HEADERS.RESULTS.length).getValues();

    let processed = 0;
    const startTime = Date.now();
    const SAFE_MS = 5 * 60 * 1000;  // leave 1 minute of margin

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2;
      const status = String(row[C.FILTER_STATUS - 1] || '');
      if (status === 'Done' || status === 'OutOfWindow') continue;

      // Window check
      const published = parseDateLoose_(row[C.PUBLISHED_AT - 1]);
      if (!published || published < window.start || published > window.end) {
        sheet.getRange(rowNumber, C.FILTER_STATUS).setValue('OutOfWindow');
        continue;
      }

      // Time-budget guard: re-arm continuation if running low
      if (Date.now() - startTime > SAFE_MS) {
        scheduleFilterContinuation_();
        log_('runAIFilter', `Time budget reached after ${processed} rows. Continuation scheduled.`);
        return;
      }

      try {
        const userPrompt = buildFilterUserPrompt_(row);
        const out = callGeminiJson_(systemPrompt, userPrompt, FILTER_SCHEMA_);
        sheet.getRange(rowNumber, C.AI_RELEVANCE, 1, 6).setValues([[
          String(out.relevance || 'low'),
          String(out.category || 'industry'),
          String(out.country || ''),
          String(out.region || ''),
          String(out.reason || ''),
          ''   // ai_duplicate_of reserved
        ]]);
        sheet.getRange(rowNumber, C.FILTER_STATUS).setValue('Done');
        processed++;
        if (processed % 10 === 0) SpreadsheetApp.flush();
      } catch (err) {
        sheet.getRange(rowNumber, C.FILTER_STATUS).setValue('Error');
        sheet.getRange(rowNumber, C.AI_REASON).setValue(truncate_(getErrorMessage_(err), 200));
        log_('runAIFilter', `Row ${rowNumber} error: ${getErrorMessage_(err)}`);
      }
    }
    SpreadsheetApp.flush();
    removeTriggersByHandler_('runWeeklyAIFilter_continuation');
    log_('runAIFilter', `Completed. Classified ${processed} in-window row(s).`);
  } finally {
    lock.releaseLock();
  }
}

function runWeeklyAIFilter_continuation() { runAIFilter_(); }

function scheduleFilterContinuation_() {
  removeTriggersByHandler_('runWeeklyAIFilter_continuation');
  ScriptApp.newTrigger('runWeeklyAIFilter_continuation')
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
    'Classify the article and return JSON only.',
    'Rules:',
    '- "reject": mentions a priority country but for an unrelated topic (sports, weather, entertainment, generic crime); or promotional/opinion-only/fact-free.',
    '- "tipolis": ties a priority country OR a tracked project to a relevant topic (SEZ, free zone, private city, charter city, governance, investment, infrastructure, citizenship, regulatory reform).',
    '- "industry": SEZs / free zones / private cities / charter cities / network states / regulatory sandboxes / governance innovation / industrial corridors / technology hubs in a country NOT on the priority list.',
    '- Ties go to "tipolis" when any clear link to a priority country/project exists.',
    '- country: canonical English name, or "Multiple", or "Global". region: one of Africa, Caribbean, Latin America, North America, Europe, Middle East, South Asia, Southeast Asia, East Asia, Oceania, Global.'
  ].join('\n');
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
    relevance: { type: 'string', enum: ['high', 'medium', 'low', 'reject'] },
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
function approveResultRow_(resultsRowNumber) {
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
  approved.appendRow(newRow);
  const targetRow = approved.getLastRow();
  results.getRange(resultsRowNumber, C.APPROVED).setValue(true);

  generateSummaryForApprovedRow_(targetRow);
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
    const out = callGeminiJson_(
      getSummarySystemPrompt_(),
      buildSummaryUserPrompt_(row),
      SUMMARY_SCHEMA_
    );
    const payload = JSON.stringify({
      headline_line: String(out.headline_line || ''),
      bullets: Array.isArray(out.bullets) ? out.bullets.map(String) : []
    });
    approved.getRange(rowNumber, A.AI_BULLETS_RAW).setValue(payload);
    // Seed Edited_Bullets with the raw bullets so the editor starts populated.
    approved.getRange(rowNumber, A.EDITED_BULLETS).setValue(payload);
    approved.getRange(rowNumber, A.AI_STATUS).setValue('Done');
    log_('generateSummary', `Summary generated for approved_news row ${rowNumber}.`);
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
    'headline_line format: "Source: [**Headline**](URL)".',
    'Return JSON only.'
  ].join(' ');
}

function buildSummaryUserPrompt_(row) {
  const A = APP.COL.APPROVED;
  return [
    `Source: ${row[A.SOURCE - 1]}`,
    `Title: ${row[A.TITLE - 1]}`,
    `URL: ${row[A.LINK - 1]}`,
    `Published: ${row[A.PUBLISHED_AT - 1]}`,
    `Country: ${row[A.COUNTRY - 1]}`,
    `Category: ${row[A.CATEGORY - 1]}`,
    '',
    'Description:',
    truncate_(String(row[A.DESCRIPTION - 1] || ''), 3000),
    '',
    'Content:',
    truncate_(String(row[A.CONTENT - 1] || ''), APP.LIMITS.MAX_CONTENT_CHARS)
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
      if (approveResultRow_(r)) count++;
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
    placeholderPara.removeFromParent();
    return;
  }

  items.forEach(item => {
    const headItem = body.insertListItem(index++, '');
    headItem.setGlyphType(DocumentApp.GlyphType.BULLET).setNestingLevel(0);
    applyMarkdownToListItem_(headItem, item.headline);

    item.bullets.forEach(b => {
      const li = body.insertListItem(index++, '');
      li.setGlyphType(DocumentApp.GlyphType.BULLET).setNestingLevel(1);
      applyMarkdownToListItem_(li, b);
    });
  });

  placeholderPara.removeFromParent();
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
    if (seg.bold) t.setBold(pos, end, true);
    if (seg.italic) t.setItalic(pos, end, true);
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
  removeTriggersByHandler_('runWeeklyAIFilter');
  removeTriggersByHandler_('runWeeklyAIFilter_continuation');

  // Daily search ~06:00 every day.
  ScriptApp.newTrigger('runDailySearch')
    .timeBased().everyDays(1).atHour(APP.DEFAULTS.daily_search_hour).create();

  // Weekly AI filter ~07:00 on Mondays (margin after the 06:00 search).
  ScriptApp.newTrigger('runWeeklyAIFilter')
    .timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(APP.DEFAULTS.weekly_filter_hour).create();

  log_('installAllTriggers', 'Daily search + weekly AI filter triggers installed.');
  SpreadsheetApp.getUi().alert(
    'Triggers installed:\n' +
    `- Daily search ~${APP.DEFAULTS.daily_search_hour}:00\n` +
    `- Weekly AI filter Mondays ~${APP.DEFAULTS.weekly_filter_hour}:00`
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
  const data = sheet.getRange(2, 1, last - 1, APP.HEADERS.RESULTS.length).getValues();
  const out = [];
  data.forEach((r, i) => {
    const status = String(r[C.FILTER_STATUS - 1] || '');
    if (status !== 'Done') return;                     // only classified, in-window rows
    const rel = String(r[C.AI_RELEVANCE - 1] || '');
    if (!showRejected && rel === 'reject') return;
    if (r[C.APPROVED - 1] === true) return;            // hide already-approved
    out.push({
      row: i + 2,
      term: r[C.TERM - 1], publishedAt: r[C.PUBLISHED_AT - 1], source: r[C.SOURCE - 1],
      title: r[C.TITLE - 1], link: r[C.LINK - 1], description: r[C.DESCRIPTION - 1],
      relevance: rel, category: r[C.AI_CATEGORY - 1], country: r[C.AI_COUNTRY - 1],
      region: r[C.AI_REGION - 1], reason: r[C.AI_REASON - 1]
    });
  });
  return out;
}

function api_approve_(body) {
  const targetRow = approveResultRow_(Number(body.row));
  return { approvedNewsRow: targetRow };
}

function api_reject_(body) {
  const sheet = sheet_(APP.SHEETS.RESULTS);
  sheet.getRange(Number(body.row), APP.COL.RESULTS.AI_RELEVANCE).setValue('reject');
  return { rejected: Number(body.row) };
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
