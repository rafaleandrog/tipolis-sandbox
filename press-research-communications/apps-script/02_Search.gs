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
