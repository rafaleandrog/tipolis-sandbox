# Tipolis Press Monitor

Weekly news pipeline for special economic zones, free zones, charter cities,
and Tipolis priority countries. The Google Sheet is the backend; the Apps
Script Web App is the API; this folder is the only interface the editor uses.

## Folder layout

```
press-research-communications/
├── press-monitor/          ← this folder (the frontend)
│   ├── index.html          sign-in gate + hub (gate when no session token,
│   │                       cards for the 5 screens once authenticated)
│   ├── triage.html         per-card approve / reject queue
│   ├── summary.html        one-article-at-a-time bullet editor (wizard)
│   ├── report.html         drag-to-reorder preview, generate Doc, archive week
│   ├── history.html        archived items grouped by country
│   ├── config.html         search_terms manager + report settings
│   ├── js/
│   │   └── api.js          fetch wrapper, login gate, nav, markdown renderer
│   │                       (Web App URL hard-coded — bearer comes from login)
│   └── assets/
│       └── css/main.css    page-specific overrides on top of the design system
├── apps-script/            backend — 11 .gs files + manifest + clasp template
├── docs/                   editorial spec + manual setup guide
└── template/               branded .docx report template
```

The frontend is plain HTML/CSS/JS — no build step, no framework. It inherits
the canonical Tipolis design system (`docs/ui/TIPOLIS_UI_SPEC.md`) and uses
the `press-research-communications` page accent (gold / `--accent-digital`).

## Owner setup

Follow `../docs/tipolis_build_guide.md` for the full step-by-step including
the Google Sheet, the AI Studio key, and the Drive folder. The short version:

1. **Create the Sheet** and open Apps Script bound to it.
2. **Paste the 11 `.gs` files** from `../apps-script/` and `appsscript.json`.
   (Easier path: install `clasp` and use the workflow below.)
3. Run the menu item **Tipolis → Create / repair project sheets** once.
4. Open the `report_settings` sheet and fill the empty values:
   - `gemini_api_key`
   - `gnews_api_key` (optional — fallback only)
   - `report_drive_folder_id`
   - `report_template_doc_id`
   - `frontend_bearer_token` (any random 32+ char string)
5. Run **Install all triggers** from the menu (06:00 daily search, 07:00
   daily AI filter).
6. **Deploy → New deployment → Web app** (execute as you, anyone access).
   Copy the `/exec` URL.
7. Open `js/api.js` and set the `WEB_APP_URL` constant to the deployed
   `/exec` URL. The bearer token is **not** stored in any file — the editor
   pastes it once into the sign-in gate on `index.html`; it is held in
   `sessionStorage` for the duration of the session and cleared on Logout.
8. **GitHub Pages**: serve from the `main` branch root (the existing setting).
   The frontend lives at:
   `https://<user>.github.io/tipolis-sandbox/press-research-communications/press-monitor/`

The five screens are now wired. No further frontend configuration is needed.

## Backend sync (repo → Apps Script)

The `.gs` files in this repo do not execute by themselves — Apps Script
runs from its own project. Sync the two with `clasp push` from Google
Cloud Shell (browser-based, no local install required); see
[`../apps-script/README.md`](../apps-script/README.md) for the exact
commands.

## Weekly Monday workflow

1. **Triage** — `triage.html`. Approve the items that go into the report.
   Each approval auto-triggers the AI bullet summary in the background.
2. **Summary** — `summary.html`. Walk through the approved items one by one.
   Trim each set of bullets to 3–5. Save & next persists per item.
3. **Report** — `report.html`. Drag-to-reorder inside the two sections,
   then **Generate report** to produce the Doc, then **Archive & reset week**
   when the Doc is ready.
4. **History** — `history.html`. Browse the archive at any time.

## What is NOT in this version

- No fully-manual article entry (deferred).
- No localStorage anywhere. The bearer token sits in `sessionStorage` only
  for the session (cleared on Logout or tab close); every other secret stays
  server-side in the `report_settings` sheet.
- No historical migration of past reports — that is a separate later task.
