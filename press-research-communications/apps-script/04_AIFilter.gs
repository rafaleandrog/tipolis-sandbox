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
