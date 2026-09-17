/**************************************************************
 * TIPOLIS PRESS MONITOR — 02_Search.gs
 * Daily search. Google News RSS is the PRIMARY source (same engine
 * as a manual news.google.com search — diverse countries/sources,
 * not dominated by one prolific outlet); GNews API is a FALLBACK
 * used only when RSS returns nothing. Near-duplicate titles are
 * deduped before the max_results cut. Appends new rows to
 * search_results. Dedups by URL against search_results (current
 * accumulator) and approved_history.
 *
 * Rows are written to the sheet PER TERM, right after that term is
 * fetched — not accumulated in memory and written once at the end.
 * Apps Script kills a run that exceeds its execution time limit
 * (~6 min on a personal account), and with 45+ active terms a daily
 * run can hit that. Writing incrementally means a mid-run kill only
 * costs the terms not yet reached (picked up on the next daily run);
 * it no longer loses everything already fetched that day.
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
    const fetchedAt = formatDateTime_(new Date());
    const topicVocab = getTopicKeywords_();
    const gateMode = String(getSetting_('topic_gate_mode') || 'skip').trim().toLowerCase();
    const maxRows = toPositiveInt_(
      getSetting_('max_rows_per_search_run'), APP.LIMITS.DEFAULT_MAX_ROWS_PER_SEARCH_RUN);

    // One read, at the start. Before this the row cursor came from
    // getNextEmptyRowInCols_ once per term — and that helper scans the
    // whole sheet (maxRows x 16 columns), so 51 terms meant 51 full-sheet
    // reads inside a 6-minute execution budget.
    let writeCursor = getNextEmptyRowInCols_(resultsSheet, 1, APP.HEADERS.RESULTS.length);
    let totalWritten = 0, totalOffTopic = 0, totalRows = 0;
    // maxRows bounds the AI-bound rows, which is what costs money. Parked
    // off-topic rows are free but not weightless — they still take sheet
    // rows and write time — so they get a looser ceiling of their own.
    const maxTotalRows = maxRows * 4;

    // Round-robin start: resume where the previous run stopped, so the row
    // cap never starves the same tail terms day after day.
    const props = PropertiesService.getScriptProperties();
    const startAt = rules.length ? (Number(props.getProperty(APP.PROPERTIES.TERM_CURSOR) || 0) % rules.length) : 0;
    const ordered = rules.slice(startAt).concat(rules.slice(0, startAt));
    let processed = 0;

    log_('runSearchCore',
      `Started (${mode}). Active terms: ${rules.length}, starting at #${startAt + 1}. ` +
      `Row cap: ${maxRows}. Topic gate: ${topicVocab.block.length + topicVocab.require.length} keyword(s), ` +
      `${topicVocab.block.length} block / ${topicVocab.require.length} require, mode ${gateMode}.`);

    for (const rule of ordered) {
      if (totalWritten >= maxRows || totalRows >= maxTotalRows) {
        const why = totalWritten >= maxRows
          ? `Row cap of ${maxRows} AI-bound row(s) reached`
          : `Hard cap of ${maxTotalRows} written row(s) reached`;
        log_('runSearchCore', `${why}. ${ordered.length - processed} term(s) will start the next run.`);
        break;
      }
      processed++;
      try {
        const items = fetchNewsForRule_(rule);
        const rowsForTerm = [];
        let added = 0, dup = 0, invalid = 0, offTopic = 0;
        for (const item of items) {
          const link = normalizeUrl_(item.link);
          if (!link) { invalid++; continue; }
          if (knownUrls.has(link)) { dup++; continue; }
          if (!passesLocalMatchRule_(rule, item)) { invalid++; continue; }

          const row = buildResultRow_(rule.term, item, fetchedAt);
          const gateVerdict = topicGateVerdict_(item, topicVocab);
          if (gateVerdict) {
            offTopic++;
            if (gateMode === 'drop') { knownUrls.add(link); continue; }
            // Default 'skip' mode: the article is not lost, it is parked.
            // It costs no AI call and stays out of triage, but it is still
            // in the sheet — which is the only way to audit what the gate
            // throws away and tune topic_keywords against real data. The
            // reason names the exact keyword, so a bad one is easy to find.
            row[APP.COL.RESULTS.FILTER_STATUS - 1] = 'Skipped';
            row[APP.COL.RESULTS.AI_REASON - 1] = 'Topic gate (' + gateVerdict + ').';
          } else {
            added++;
          }
          rowsForTerm.push(row);
          knownUrls.add(link);
        }
        // Write this term's rows now, not at the end of the whole loop —
        // see the file header comment for why.
        if (rowsForTerm.length) {
          resultsSheet.getRange(writeCursor, 1, rowsForTerm.length, APP.HEADERS.RESULTS.length)
            .setValues(rowsForTerm);
          resultsSheet.getRange(writeCursor, 1, rowsForTerm.length, 1).insertCheckboxes();
          SpreadsheetApp.flush();
          writeCursor += rowsForTerm.length;
          totalRows += rowsForTerm.length;
        }
        totalWritten += added;   // the cap counts rows that will cost an AI call
        totalOffTopic += offTopic;
        log_('runSearchCore',
          `Term "${rule.term}": ${items.length} fetched, ${added} new, ${dup} dup, ` +
          `${invalid} filtered, ${offTopic} off-topic.`);
      } catch (err) {
        log_('runSearchCore', `Error for "${rule.term}": ${getErrorMessage_(err)}`);
      }
    }

    props.setProperty(APP.PROPERTIES.TERM_CURSOR,
      String(rules.length ? (startAt + processed) % rules.length : 0));

    log_('runSearchCore', totalWritten || totalOffTopic
      ? `${totalWritten} row(s) queued for AI, ${totalOffTopic} parked as off-topic, across ${processed} term(s).`
      : 'No new rows.');
    rotateLogs_();
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
    const fetchedAt = formatDateTime_(new Date());
    let totalWritten = 0;

    log_('runBackfillSearch', `Started (backfill ${daysOverride}d). Active terms: ${rules.length}.`);

    for (const rule of rules) {
      try {
        const items = fetchNewsForRule_(rule);
        const rowsForTerm = [];
        let added = 0, dup = 0, invalid = 0;
        for (const item of items) {
          const link = normalizeUrl_(item.link);
          if (!link) { invalid++; continue; }
          if (knownUrls.has(link)) { dup++; continue; }
          if (!passesLocalMatchRule_(rule, item)) { invalid++; continue; }
          const row = buildResultRow_(rule.term, item, fetchedAt);
          // Mark Skipped so the AI filter and triage ignore these rows.
          row[APP.COL.RESULTS.FILTER_STATUS - 1] = 'Skipped';
          rowsForTerm.push(row);
          knownUrls.add(link);
          added++;
        }
        // Write this term's rows now, not at the end of the whole loop —
        // same protection as runSearchCore_ (see file header comment).
        if (rowsForTerm.length) {
          const startRow = getNextEmptyRowInCols_(resultsSheet, 1, APP.HEADERS.RESULTS.length);
          resultsSheet.getRange(startRow, 1, rowsForTerm.length, APP.HEADERS.RESULTS.length)
            .setValues(rowsForTerm);
          resultsSheet.getRange(startRow, 1, rowsForTerm.length, 1).insertCheckboxes();
          SpreadsheetApp.flush();
          totalWritten += rowsForTerm.length;
        }
        log_('runBackfillSearch',
          `Term "${rule.term}": ${items.length} fetched, ${added} new, ${dup} dup, ${invalid} filtered.`);
      } catch (err) {
        log_('runBackfillSearch', `Error for "${rule.term}": ${getErrorMessage_(err)}`);
      }
    }

    const ui = SpreadsheetApp.getUi();
    log_('runBackfillSearch', totalWritten
      ? `${totalWritten} backfill row(s) written across ${rules.length} term(s).`
      : 'No new rows (all duplicates).');
    if (totalWritten) {
      ui.alert(`Backfill complete.\n\n${totalWritten} new row(s) added to search_results (FilterStatus="Skipped").`);
    } else {
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

  // An empty RSS response almost always means "no news for this term in
  // this window", not "the source failed" — so the GNews fallback mostly
  // spends a limited third-party quota to confirm a zero. Off by default;
  // flip gnews_fallback_enabled in report_settings to bring it back.
  if (!items.length && isSettingTrue_('gnews_fallback_enabled', false)) {
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

/* ---------- Thematic gate ----------
 * Runs AFTER the fetch and BEFORE the row is written. Search terms stay
 * broad on purpose ("Uruguay", "freeport", "SEZ"); this gate is what stops
 * the general news those terms drag in — local sport, obituaries, weather,
 * traffic accidents — from consuming a Gemini classification.
 *
 * Two vocabularies, both in the topic_keywords sheet:
 *   block   — matching any of these parks the article. Measured on 721 real
 *             fetched articles: parks 31 percent of what the AI rejected and
 *             none of what it kept. This is the one that ships enabled.
 *   require — if any are enabled, an article must match one of them. Much
 *             sharper and measurably too sharp for broad country terms (it
 *             parked 45 percent of the articles the AI kept), so it ships
 *             disabled and is meant to be switched on per experiment.
 *
 * An empty sheet, or one with everything disabled, turns the gate off.
 */
function getTopicKeywords_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('TOPIC_KEYWORDS_V2');
  if (hit) { try { return JSON.parse(hit); } catch (e) { /* fall through */ } }

  const empty = { block: [], require: [] };
  const sheet = sheet_(APP.SHEETS.TOPIC_KEYWORDS);
  if (!sheet) return empty;
  const last = getLastDataRowInCols_(sheet, 1, APP.HEADERS.TOPIC_KEYWORDS.length);
  if (last < 2) return empty;

  const vocab = { block: [], require: [] };
  sheet.getRange(2, 1, last - 1, 3).getValues().forEach(r => {
    const keyword = normalizeForGate_(r[0]);
    if (!keyword) return;
    if (!toBoolean_(r[2], true)) return;
    const mode = String(r[1] || 'block').trim().toLowerCase();
    if (mode === 'require') vocab.require.push(keyword);
    else vocab.block.push(keyword);
  });
  cache.put('TOPIC_KEYWORDS_V2', JSON.stringify(vocab), 600);   // re-read every 10 min
  return vocab;
}

// Accent-insensitive so "zona economica especial" in the sheet matches
// "zona econômica especial" in a Brazilian headline, and vice versa.
function normalizeForGate_(text) {
  return String(text || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ').trim();
}

// Returns '' when the article passes, or the keyword that parked it.
function topicGateVerdict_(item, vocab) {
  if (!vocab || (!vocab.block.length && !vocab.require.length)) return '';
  const hay = normalizeForGate_([item.title, item.description, item.source].join(' '));
  if (!hay) return '';

  for (let i = 0; i < vocab.block.length; i++) {
    if (hay.indexOf(vocab.block[i]) >= 0) return 'blocked: ' + vocab.block[i];
  }
  if (!vocab.require.length) return '';
  for (let i = 0; i < vocab.require.length; i++) {
    if (hay.indexOf(vocab.require[i]) >= 0) return '';
  }
  return 'no required topic keyword';
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
