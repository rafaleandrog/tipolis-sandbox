# Press Monitor — Setup Checklist

Tracks every pending task between "the code is in the repo" and "the
weekly pipeline runs by itself". Update this file as steps complete.
The PR to `main` opens only when every box is checked.

> Working branch: `claude/review-repo-spec-A2hZI`. All commits happen
> there until the merge.

---

## Phase 0 — Code in the repo  ✅ done

- [x] Backend (`apps-script/`): 11 `.gs` files + `appsscript.json` + `.clasp.json` template
- [x] Frontend (`press-monitor/`): 5 screens + hub + shared CSS/JS
- [x] `config.js` wired with `WEB_APP_URL` + `BEARER_TOKEN`
- [x] GitHub Actions workflow (`.github/workflows/clasp-push.yml`)
- [x] Bug fix: GNews key removed from `SETTINGS_SEED`
- [x] Docs: root `README.md`, `press-research-communications/README.md`,
      `apps-script/README.md`, `press-monitor/README.md`

## Phase 1 — First sync of the 11 `.gs` to Apps Script  ⏳ next

Replaces the legacy `search news.gs` (OpenAI-based, single file) with the
11-file Gemini architecture. Done once, via Google Cloud Shell. The same
session generates the credential we reuse in Phase 4 for auto-deploys.

- [ ] Backup the current `search news.gs` content (copy the text somewhere
      safe — paste into a local file or a Drive doc)
- [ ] Get the **Script ID**: Apps Script editor → gear icon (Project
      Settings) → copy the "Script ID" value
- [ ] Edit `press-research-communications/apps-script/.clasp.json` in this
      repo and replace `PASTE_YOUR_SCRIPT_ID_HERE` with that Script ID
- [ ] Open https://shell.cloud.google.com (Google Cloud Shell)
- [ ] Run the Cloud Shell commands (see "Next-step playbook" below)
- [ ] Confirm in the Apps Script editor that the 11 files are there and
      `search news.gs` is gone
- [ ] **Save the credential as a GitHub Secret** (used in Phase 4):
      Settings → Secrets and variables → Actions → New repository secret
      → name `CLASPRC_JSON`, value = full contents of `~/.clasprc.json`
      printed in Cloud Shell

## Phase 2 — Sheet bootstrap

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
      search; Monday 07:00 AI filter)
- [ ] In the Apps Script editor: **Deploy → Manage deployments → pencil →
      Version: New version → Deploy**. The Web App URL stays the same;
      this just makes the new code live.
- [ ] Enable the Apps Script API:
      https://script.google.com/home/usersettings → toggle **Google Apps
      Script API** to **On**

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

## Phase 6 — Confirm GitHub Actions auto-deploy

- [ ] Make a trivial change to any file under `apps-script/` (e.g. a
      comment), commit and push to this branch
- [ ] Open the GitHub Actions tab, run "Push Apps Script to Google"
      manually (workflow_dispatch) since the trigger is on `main`. After
      the merge, future commits to `main` fire it automatically.
- [ ] Verify the change appears in the Apps Script editor

## Phase 7 — Merge

- [ ] All boxes above checked
- [ ] Open PR `claude/review-repo-spec-A2hZI` → `main`
- [ ] Merge

---

## Next-step playbook — Phase 1 in Cloud Shell

Open https://shell.cloud.google.com, then paste these one at a time.
Replace `<SCRIPT_ID>` first.

```bash
# 1. Install clasp on the Cloud Shell VM (free, ephemeral).
npm install -g @google/clasp

# 2. Authenticate with the Google account that owns the Sheet.
clasp login --no-localhost
# It prints a URL. Open it in a new tab, sign in, allow access,
# copy the code Google shows you, paste it back into the shell.

# 3. Clone the repo into the shell.
git clone https://github.com/rafaleandrog/tipolis-sandbox.git
cd tipolis-sandbox/press-research-communications/apps-script

# 4. Make sure .clasp.json has the real Script ID (you should have
#    edited and committed it before — if not, do it here):
nano .clasp.json
# Replace PASTE_YOUR_SCRIPT_ID_HERE with the actual Script ID, save (Ctrl+O, Enter, Ctrl+X).

# 5. Push all 11 files at once. This replaces the legacy "search news.gs".
clasp push --force
# Confirm "y" if it asks to overwrite remote files.

# 6. Print the credential for the GitHub Secret (Phase 1 last bullet).
cat ~/.clasprc.json
# Copy the entire JSON output.
```

After this, the Apps Script editor reloaded will show the 11 files,
the old single file is gone, and you have the JSON to paste as a GitHub
Secret. Move on to Phase 2.
