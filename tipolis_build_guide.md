# Tipolis Press Monitor — Build & Setup Guide

This guide tells you exactly what to do, in order, to get the system running. It covers the Google Sheet backend, the Apps Script code, Google Drive layout, the Google AI Studio key, and the GitHub Pages frontend connection.

---

## Part A — Google AI Studio (get the Gemini key)

You are already signed in at aistudio.google.com as raafaleandro@gmail.com.

1. In the left sidebar, click **Get API key**.
2. Click **Create API key**. If asked to pick a Google Cloud project, accept the default one it offers (a free project is created automatically).
3. Copy the key (looks like `AIza...`). Keep it for Part C.
4. Model choice: the code defaults to `gemini-2.5-flash` (stable, generous free tier). Your account also shows `gemini-3-flash-preview`; you can switch later by editing the `gemini_model` value in the settings sheet. Start with `gemini-2.5-flash`.

There is nothing else to configure in AI Studio. The key alone is what the Apps Script uses.

---

## Part B — Google Drive layout

Create this structure in your Drive (any location you like):

```
Tipolis Press Monitor/
├── Tipolis Press Summary Search        (the Google Sheet — your existing backend)
├── Report Template/
│   └── Tipolis Press Summary - TEMPLATE   (Google Doc, converted from the .docx)
└── Generated Reports/                  (empty; weekly reports land here)
```

### B1. Convert the template .docx into a Google Doc

1. Upload `tipolis_press_summary_template.docx` (provided) into the `Report Template` folder.
2. Right-click it → **Open with → Google Docs**.
3. Confirm the letterhead (logo, blue stripe, watermark) and placeholders are intact.
4. **File → Save as Google Docs** is automatic on open; you now have a Google Doc named "Tipolis Press Summary - TEMPLATE".
5. Open that Google Doc. Its URL looks like `https://docs.google.com/document/d/DOC_ID/edit`. Copy the `DOC_ID` — that is `report_template_doc_id`.

### B2. Get the Generated Reports folder ID

1. Open the `Generated Reports` folder.
2. Its URL looks like `https://drive.google.com/drive/folders/FOLDER_ID`. Copy `FOLDER_ID` — that is `report_drive_folder_id`.

---

## Part C — Apps Script

The code is split into 11 files under `apps-script/`. They share one global scope, so the file split is only for organization.

### C1. Install the code

1. Open the Google Sheet → **Extensions → Apps Script**.
2. Delete the existing default `Code.gs`.
3. For each file in `apps-script/` (00 through 10), create a new script file with the same name (the `.gs` is added automatically) and paste its contents.
4. Save all.

### C2. First run — create the sheets

1. In the Apps Script editor, select the function `createProjectSheets` and click **Run**.
2. Authorize the script when prompted (it needs Sheets, Drive, Docs, and external request permissions).
3. Back in the Sheet, you now have: `search_terms`, `tipolis_countries`, `search_results`, `approved_news`, `approved_history`, `report_settings`, `logs`. The countries and settings sheets are pre-seeded.

### C3. Fill the settings

Open the `report_settings` sheet and paste values into the `value` column:

| key | what to paste |
|---|---|
| `gemini_api_key` | the AI Studio key from Part A |
| `report_drive_folder_id` | the Generated Reports folder ID (B2) |
| `report_template_doc_id` | the template Google Doc ID (B1) |
| `frontend_bearer_token` | a random string you invent, 32+ characters (e.g. from a password generator) |
| `last_report_week_number` | the last week you published (e.g. `20`) |
| `last_report_date` | that report's date in `yyyy-mm-dd` (e.g. `2026-05-18`) |

`gnews_api_key`, `author_name`, `gemini_model`, and the auto-run toggles are pre-filled.

### C4. Migrate search_terms

Your existing `search_terms` rows can stay. Change every term's `days` value to `1` (daily search window). New default is already 1 for new rows.

### C5. Install triggers

Run `installAllTriggers` once (or use the Tipolis menu in the Sheet). This creates:
- Daily search at ~06:00 every day.
- Weekly AI filter on Mondays at ~07:00.

### C6. Deploy the Web App (for the frontend)

1. In Apps Script: **Deploy → New deployment**.
2. Type: **Web app**.
3. Description: "Tipolis frontend API".
4. Execute as: **Me**.
5. Who has access: **Anyone**.
6. Deploy, authorize, and copy the **Web app URL** (ends in `/exec`). This is the URL the frontend calls.

Whenever you change the Web App code, do **Deploy → Manage deployments → Edit → New version** to publish the change.

---

## Part D — Test the backend before the frontend exists

You can exercise the whole pipeline from the Sheet menu, no frontend needed:

1. **Tipolis → Run daily search now.** Rows appear in `search_results`.
2. **Tipolis → Run weekly AI filter now.** The `ai_*` columns and `FilterStatus` fill in. (Out-of-window rows are tagged `OutOfWindow` and skipped.)
3. In `search_results`, tick the `Approved` checkbox on a few rows, then **Tipolis → (run) approveCheckedResultsNow** from the Apps Script editor. Rows move to `approved_news` and get AI bullets.
4. **Tipolis → Generate weekly report now.** A Doc appears in Generated Reports. Open it and verify formatting.
5. **Tipolis → Archive & reset week.** `approved_news` empties into `approved_history`; `search_results` clears; the week counter bumps.

If all five steps work, the backend is correct and the frontend is just a nicer face over the same endpoints.

---

## Part E — GitHub Pages frontend

### E1. Create the repo

1. Create a GitHub account if you do not have one.
2. New repository → name it `tipolis-press-monitor` → **Public** → create.
3. Settings → Pages → Source: **Deploy from a branch** → Branch: `main`, folder `/ (root)` → Save.
4. Your site will be at `https://<username>.github.io/tipolis-press-monitor/`.

### E2. Repo structure (frontend, built in the next step of the project)

```
tipolis-press-monitor/
├── index.html               navigation hub
├── terms.html               Search Terms Manager
├── triage.html              Triage & Approve
├── summary.html             Summary Editor (wizard)
├── report.html              Report Preview & Generate
├── history.html             History Browser
└── assets/
    ├── css/main.css
    └── js/
        ├── config.js         holds WEB_APP_URL + bearer token
        └── api.js            fetch wrapper around the Web App
```

### E3. How the connection works

- `assets/js/config.js` stores two values: the Web App `/exec` URL and the `frontend_bearer_token`.
- `assets/js/api.js` sends every request as `WEB_APP_URL?path=/triage&token=TOKEN`, POST bodies as `text/plain` JSON (this avoids the CORS preflight problem with Apps Script).
- The Apps Script `doGet`/`doPost` validates the token, routes by `path`, reads/writes the Sheet, and returns JSON.

Because GitHub Pages is public, the token in `config.js` is visible to anyone who views source. That is acceptable for a personal tool; use a long random token and rotate it (change it in `report_settings` and in `config.js`) if it ever leaks.

### E4. Publishing

Upload the files through the GitHub web UI (Add file → Upload files) or via git. Pages redeploys automatically within a minute of each push.

---

## Pipeline at a glance

```
Daily 06:00   → runDailySearch        → search_results (accumulates, URL-deduped)
Monday 07:00  → runWeeklyAIFilter      → tags rows in the Mon-Sun window
You (Monday)  → triage.html            → approve → approved_news + AI bullets
You           → summary.html (wizard)  → edit bullets, Save & Next
You           → report.html            → Generate Report → Doc in Drive
You           → Archive & Reset        → approved_history; clears week
Anytime       → history.html           → browse archived news by country
```

---

## Operating notes

- **Week window:** a report dated on a Monday covers the previous Monday 00:00 to the previous Sunday 23:59. News from Monday morning (before the filter runs) lands in next week's report, never the current one.
- **Year boundary:** at year change, edit `last_report_week_number` manually (e.g. set to `0` so the next report is Week 1).
- **Backfill a missed day:** if a daily search failed, just run "Run daily search now" — the 24h window plus URL-dedup makes it safe to re-run.
- **Gemini limits:** if the AI filter ever hits rate limits, it logs HTTP 429 and retries; for very large weeks it processes in batches and re-arms itself automatically.
- **Changing report styling:** edit the template Google Doc once; all future reports inherit the change. Never edit styling in code.
