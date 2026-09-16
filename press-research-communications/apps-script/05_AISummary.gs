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
