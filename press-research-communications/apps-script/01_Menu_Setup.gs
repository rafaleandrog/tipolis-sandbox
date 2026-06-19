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
    .addItem('Run AI filter now', 'runAIFilterNow')
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
