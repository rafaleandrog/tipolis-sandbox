# Press Monitor — Setup Checklist

Tracks every pending task between "the code is in the repo" and "the
weekly pipeline runs by itself". Update this file as steps complete.
The PR to `main` opens only when every box is checked.

> Working branch: `claude/review-repo-spec-A2hZI`. All commits happen
> there until the merge.
>
> **Sync model:** manual paste-direct, no tooling. The owner copies the
> consolidated single-file build into one `.gs` file in the Apps Script
> editor. `clasp` and automation are deferred to later.

---

## Phase 0 — Code in the repo  ✅ done

- [x] Backend (`apps-script/`): 11 `.gs` files + `appsscript.json` + `.clasp.json` template
- [x] **Consolidated single-file build** at
      `press-research-communications/Tipolis_Press_Monitor.consolidated.gs`
      (1667 lines, all 11 files concatenated in order)
- [x] Frontend (`press-monitor/`): index (sign-in gate + hub) + 5 screens
      (triage, summary, report, config, history) + shared CSS/JS
- [x] `js/api.js` ships with the deployed `WEB_APP_URL` hard-coded; the
      bearer token is entered on the `index.html` sign-in gate and lives only in
      `sessionStorage` for the session
- [x] Bug fix: GNews key removed from `SETTINGS_SEED`
- [x] Docs: root `README.md`, `press-research-communications/README.md`,
      `apps-script/README.md`, `press-monitor/README.md`

## Phase 1 — Paste the consolidated build into Apps Script  ✅ done

Replaces the legacy `search news.gs` (OpenAI-based, single file) with the
11-file Gemini architecture, delivered as one giant `.gs` you paste in
the editor.

- [x] Backup the current `search news.gs` content (copy the text into a
      local file or a Drive doc — the paste will overwrite it)
- [x] Open the consolidated file on GitHub:
      `press-research-communications/Tipolis_Press_Monitor.consolidated.gs`
      → click **Raw** → Ctrl/Cmd+A to select all → Ctrl/Cmd+C to copy
- [x] In the Apps Script editor:
  - [x] Delete the existing `search news.gs` (or rename it to `Code` and
        clear its contents)
  - [x] Paste the consolidated content into one `.gs` file (Ctrl/Cmd+V)
  - [x] Save (Ctrl/Cmd+S)
- [ ] (Optional but recommended) Update the manifest so the Web App
      deployment settings match the spec:
  - [ ] Project Settings (gear icon) → enable
        **Show "appsscript.json" manifest file in editor**
  - [ ] Open `appsscript.json` and replace its content with the file at
        `press-research-communications/apps-script/appsscript.json`
        in this repo. Save.

## Phase 2 — Sheet bootstrap  ⏳ next

The 11 `.gs` files include a setup routine that creates every sheet, every
header, and seeds the priority-country list.

- [ ] Reload the Google Sheet so the new "Tipolis" menu appears
- [ ] Click **Tipolis → Create / repair project sheets**
- [ ] Verify the 7 tabs were created: `search_terms`, `tipolis_countries`,
      `search_results`, `approved_news`, `approved_history`,
      `report_settings`, `logs`

## Phase 3 — Drive + Gemini + secrets in `report_settings`

The backend needs five values in the `report_settings` sheet before it
can run end-to-end. Bearer token and GNews key are already known; three
others depend on Drive/AI Studio steps.

- [ ] Upload `press-research-communications/template/tipolis_press_summary_template.docx`
      to Drive → right-click → **Open with Google Docs** so it converts
      into a native Google Doc. Copy the new Doc's ID from its URL.
- [ ] Create a Drive folder named e.g. "Tipolis Press Reports". Copy its
      ID from the URL.
- [ ] Get a Gemini API key: https://aistudio.google.com/app/apikey →
      **Create API key**. Copy the key (`AIza…`).
- [ ] Open `report_settings` in the Sheet and fill the `value` column on
      each row:
  - [ ] `gemini_api_key` = the Gemini key from AI Studio
  - [ ] `gnews_api_key` = `a0d7f7dc4d8c8716db4e04cea39aa370`
  - [ ] `report_drive_folder_id` = the folder ID
  - [ ] `report_template_doc_id` = the Doc ID (the converted Google Doc, not the .docx)
  - [ ] `frontend_bearer_token` = `a9FvK7xP2mQ8rN4tZ1wL6cY3hJ9sD5eB7uR2kM8pX4nQ1vT6z`

## Phase 4 — Activate the pipeline

- [ ] In the Sheet menu: **Tipolis → Install all triggers** (daily 06:00
      search; daily 07:00 AI filter)
- [ ] In the Apps Script editor: **Deploy → Manage deployments → pencil →
      Version: New version → Deploy**. The Web App URL stays the same;
      this just makes the new code live.

## Phase 5 — Smoke test the frontend

GitHub Pages serves from the repo root. After Phase 1 the frontend
already has the right URL + token; this is just opening it and clicking.

- [ ] Open the hub on Pages
      (https://rafaleandrog.github.io/tipolis-sandbox/press-research-communications/press-monitor/
      — only works after merging to `main`; during testing use a local
      static server or push the branch with Pages preview)
- [ ] Click **Run daily search now**. The toast should show "Daily search
      started" and the `logs` sheet should record a `runSearchCore`
      entry within a minute.
- [ ] Add at least one row in `search_terms` (e.g. `"Próspera Honduras"`,
      enabled, broad, language `en`)
- [ ] Click **Run daily search now** again, then **Run AI filter now**.
      Open `triage.html`, items should appear.

## Phase 6 — Merge

- [ ] All boxes above checked
- [ ] Open PR `claude/review-repo-spec-A2hZI` → `main`
- [ ] Merge

---

## Deferred — clasp / GitHub Actions

When the manual paste flow starts to feel annoying (typically: after the
second or third backend edit), revisit
[`../apps-script/README.md`](../apps-script/README.md) for the `clasp
push` workflow via Google Cloud Shell. That removes the need to copy-paste
the consolidated file every time. GitHub Actions auto-deploy on top of
that is a further step we can add later.
