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
