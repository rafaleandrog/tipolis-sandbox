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
  removePlaceholderParagraph_(body, placeholderPara);
  return;
}

  // Hanging indent (like the good W23 report): the bullet marker sits at firstLine,
// and the text wraps aligned at "start". HEAD ~0.63cm, BULLET ~1.25cm.
const HEAD_START = 18;    // 0.63 cm — where headline text aligns
const HEAD_FIRST = 0;     // marker position for headline
const BULLET_START = 35;  // 1.25 cm — where bullet text aligns
const BULLET_FIRST = 18;  // marker position for sub-bullets

items.forEach(item => {
  const headItem = body.insertListItem(index++, '');
  headItem.setGlyphType(DocumentApp.GlyphType.BULLET).setNestingLevel(0);
  headItem.setIndentStart(HEAD_START).setIndentFirstLine(HEAD_FIRST);
  headItem.setLineSpacing(1.15).setSpacingBefore(0).setSpacingAfter(4);
  applyMarkdownToListItem_(headItem, item.headline);

  item.bullets.forEach(b => {
  const li = body.insertListItem(index++, '');
  li.setGlyphType(DocumentApp.GlyphType.HOLLOW_BULLET).setNestingLevel(1);
  li.setIndentStart(BULLET_START).setIndentFirstLine(BULLET_FIRST);
  li.setLineSpacing(1.15).setSpacingBefore(0).setSpacingAfter(2);
  applyMarkdownToListItem_(li, b);
});
});

removePlaceholderParagraph_(body, placeholderPara);
}

// Removes the placeholder paragraph. If it's the last paragraph in the document
// (which Docs forbids removing), clears its text instead so {{...}} doesn't show.
function removePlaceholderParagraph_(body, placeholderPara) {
try {
  placeholderPara.removeFromParent();
} catch (e) {
  // Last paragraph of the section can't be removed; blank it out instead.
  placeholderPara.asParagraph().clear();
}
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
  t.setBold(pos, end, seg.bold === true);
  t.setItalic(pos, end, seg.italic === true);
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
