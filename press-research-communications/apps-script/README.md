# Apps Script — Tipolis Press Monitor backend

The 11 `.gs` files in this folder are the source of truth for the Apps Script
project bound to the Google Sheet. They do not execute from GitHub — Apps
Script runs on Google's servers and reads from its own project. This folder
is kept in sync with that project via [`clasp`](https://github.com/google/clasp).

There are two ways to sync. **Option A (recommended)** uses GitHub Actions and
requires no local CLI; the workflow at `.github/workflows/clasp-push.yml`
pushes automatically on every commit to `main`. **Option B** is the manual
local workflow for when you want to push from your own machine.

## Option A — Auto-sync via GitHub Actions (no local install)

One-time setup, all done in a web browser:

### 1. Enable the Apps Script API
Open https://script.google.com/home/usersettings and switch **Google Apps
Script API** to **On**. This must be the same Google account that owns the
Apps Script project.

### 2. Get the Script ID
Open the Apps Script project (Sheet → Extensions → Apps Script) →
**Project Settings** (gear icon on the left) → copy the **Script ID**.

Edit `apps-script/.clasp.json` and replace `PASTE_YOUR_SCRIPT_ID_HERE` with
that value. Commit the change.

### 3. Generate clasp credentials in Google Cloud Shell

Open https://shell.cloud.google.com (browser-based Linux terminal, free, no
install). In the shell, run:

```bash
npm install -g @google/clasp
clasp login --no-localhost
```

It prints a long URL. Open it in a new tab, pick the same Google account
that owns the Sheet, allow access. Google shows a code — paste it back into
the Cloud Shell prompt. The shell writes `~/.clasprc.json`.

Print and copy the entire contents:

```bash
cat ~/.clasprc.json
```

Select all the output and copy it.

### 4. Save the credentials as a GitHub Secret

In this repository on GitHub: **Settings → Secrets and variables → Actions →
New repository secret**.
- Name: `CLASPRC_JSON`
- Value: paste the entire JSON from the previous step.

Save.

### 5. Trigger the first push

Either:
- Make any change to a `.gs` file and push to `main`, or
- Go to **Actions → Push Apps Script to Google → Run workflow**.

The job installs clasp on the GitHub runner, writes the credentials file,
verifies the Script ID is set, and runs `clasp push --force`. Takes ~30s.
After that, every push to `main` that touches `apps-script/**` auto-deploys.

GitHub Actions is free for this repository (public repos = unlimited minutes;
private repos = 2,000 minutes/month and this job uses well under a minute).

### Re-deploying the Web App

`clasp push` updates the script files, but the public Web App URL only sees
new code after you redeploy. Either:
- In the Apps Script editor: **Deploy → Manage deployments → pencil icon →
  Version: New version → Deploy**. The URL stays the same.
- Or accept that the existing deployment will keep running the previous
  version until you bump it.

(There is no automated redeploy in the workflow — Google does not allow
unattended Web App deployments without OAuth scopes the owner has to grant.
Bumping the deployment from the editor takes ~5 seconds.)

## Option B — Manual local push

Only needed if you prefer not to use the GitHub Actions route.

```bash
npm install -g @google/clasp
clasp login
# edit .clasp.json with your Script ID once
cd press-research-communications/apps-script
clasp push    # upload local files
clasp pull    # download remote state if it diverged
```

## Files

| File | Purpose |
|---|---|
| `00_Config.gs` | Sheet names, column maps, defaults, seeds |
| `01_Menu_Setup.gs` | Spreadsheet menu + project bootstrap |
| `02_Search.gs` | Daily Google News / GNews search |
| `03_Gemini.gs` | Gemini REST wrapper |
| `04_AIFilter.gs` | Weekly relevance + category classifier |
| `05_AISummary.gs` | Per-article bullet generation |
| `06_Report.gs` | Doc template copy + markdown injection |
| `07_Archive.gs` | Move approved_news → approved_history, reset |
| `08_Triggers.gs` | Time-driven triggers (daily search, weekly filter) |
| `09_WebApp.gs` | `doGet`/`doPost` routing for the frontend |
| `10_Helpers.gs` | Settings, dates, sheet utilities, logging |
| `appsscript.json` | Apps Script manifest (timezone, webapp config) |
| `.clasp.json` | Maps this folder to a specific Apps Script project |
