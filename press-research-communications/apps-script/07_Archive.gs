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
