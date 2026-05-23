/**************************************************************
 * TIPOLIS PRESS MONITOR — 04_AIFilter.gs
 * Daily AI Filter. Classifies every search_results row whose
 * FilterStatus is not Done (relevance, category, country, region),
 * regardless of publish date. The Mon-Sun report window is applied
 * at triage time, not here. Spaces Gemini calls by GEMINI_SPACING_MS
 * to respect the free-tier RPM cap. Processes in batches to stay
 * within the 6-minute execution limit; re-arms itself with a
 * continuation trigger if work remains.
 **************************************************************/

// ~6.5s between Gemini calls keeps us comfortably under the
// free-tier rate limit (~10 RPM for gemini-2.5-flash).
const GEMINI_SPACING_MS = 6500;

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
      if (status === 'Done') continue;

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
        Utilities.sleep(GEMINI_SPACING_MS);
      } catch (err) {
        sheet.getRange(rowNumber, C.FILTER_STATUS).setValue('Error');
        sheet.getRange(rowNumber, C.AI_REASON).setValue(truncate_(getErrorMessage_(err), 200));
        log_('runAIFilter', `Row ${rowNumber} error: ${getErrorMessage_(err)}`);
      }
    }
    SpreadsheetApp.flush();
    removeTriggersByHandler_('runWeeklyAIFilter_continuation');
    log_('runAIFilter', `Completed. Classified ${processed} row(s).`);
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
