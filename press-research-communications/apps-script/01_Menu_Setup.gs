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
  ensureSheet_(ss, APP.SHEETS.TOPIC_KEYWORDS, APP.HEADERS.TOPIC_KEYWORDS);

  formatTermsSheet_(ss.getSheetByName(APP.SHEETS.TERMS));
  formatResultsSheet_(ss.getSheetByName(APP.SHEETS.RESULTS));
  formatApprovedSheet_(ss.getSheetByName(APP.SHEETS.APPROVED));

  formatTopicKeywordsSheet_(ss.getSheetByName(APP.SHEETS.TOPIC_KEYWORDS));

  seedCountriesIfEmpty_(ss.getSheetByName(APP.SHEETS.COUNTRIES));
  seedSettingsIfEmpty_(ss.getSheetByName(APP.SHEETS.SETTINGS));
  ensureSettingsKeys_(ss.getSheetByName(APP.SHEETS.SETTINGS));
  seedTopicKeywordsIfEmpty_(ss.getSheetByName(APP.SHEETS.TOPIC_KEYWORDS));

  log_('createProjectSheets', 'Project sheets created/repaired.');
  SpreadsheetApp.getUi().alert(
    'Project sheets are ready.\n\n' +
    'Next: open report_settings and paste your gemini_api_key, ' +
    'report_drive_folder_id, report_template_doc_id, and frontend_bearer_token.\n\n' +
    'New: the topic_keywords sheet is the thematic gate. Rows with ' +
    'mode="block" park local sport, obituaries, weather and accidents before ' +
    'they can cost a Gemini call — those ship enabled. Rows with ' +
    'mode="require" are much sharper and ship DISABLED on purpose: enabling ' +
    'them also drops real news from priority countries. See the README.'
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

/**
 * Adds report_settings keys introduced after the sheet was first created.
 * seedSettingsIfEmpty_ only fires on a blank sheet, so without this an
 * existing spreadsheet never picks up a new key and the code silently
 * falls back to its hardcoded default.
 */
function ensureSettingsKeys_(sheet) {
  const last = getLastDataRowInCols_(sheet, 1, APP.HEADERS.SETTINGS.length);
  const existing = {};
  if (last >= 2) {
    sheet.getRange(2, 1, last - 1, 1).getValues()
      .forEach(r => { existing[String(r[0] || '').trim()] = true; });
  }
  const missing = SETTINGS_SEED.filter(row => !existing[row[0]]);
  if (!missing.length) return;
  sheet.getRange(last + 1, 1, missing.length, APP.HEADERS.SETTINGS.length).setValues(missing);
  log_('ensureSettingsKeys', `Added ${missing.length} missing setting(s): ${missing.map(m => m[0]).join(', ')}.`);
}

function seedTopicKeywordsIfEmpty_(sheet) {
  if (getLastDataRowInCols_(sheet, 1, APP.HEADERS.TOPIC_KEYWORDS.length) >= 2) return;
  const rows = TOPIC_KEYWORDS_SEED.map(r => [r[0], r[1], r[2] === true, r[3] || '']);
  sheet.getRange(2, 1, rows.length, APP.HEADERS.TOPIC_KEYWORDS.length).setValues(rows);
  const blocks = rows.filter(r => r[1] === 'block').length;
  log_('seedTopicKeywords',
    `Seeded ${rows.length} keyword(s): ${blocks} block (enabled), ${rows.length - blocks} require (disabled).`);
}

function formatTopicKeywordsSheet_(sheet) {
  const rows = Math.max(sheet.getMaxRows(), 500);
  const modeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['block', 'require'], true).build();
  sheet.getRange(2, 2, rows - 1, 1).setDataValidation(modeRule);
  sheet.getRange(2, 3, rows - 1, 1).insertCheckboxes();
  sheet.setColumnWidth(1, 260);
  sheet.setColumnWidth(4, 320);
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
