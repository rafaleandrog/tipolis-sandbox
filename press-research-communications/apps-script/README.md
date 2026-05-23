# Apps Script — Tipolis Press Monitor backend

The 11 `.gs` files in this folder are the source of truth for the Apps Script
project bound to the Google Sheet. They do not execute from GitHub — Apps
Script runs on Google's servers and reads from its own project. To bring the
two in sync you upload the local files into the Apps Script project with
[`clasp`](https://github.com/google/clasp) (Google's official CLI).

You can run `clasp` either in **Google Cloud Shell** (browser-based, no local
install — recommended) or on your own machine. The mechanics are the same.

## First-time push (Cloud Shell, no local install)

Open https://shell.cloud.google.com and run, in order:

```bash
# 1. Install clasp in the ephemeral Cloud Shell VM.
npm install -g @google/clasp

# 2. Sign in with the Google account that owns the Sheet.
clasp login --no-localhost
# Open the URL it prints, allow access, paste the code back into the shell.

# 3. Clone this repo into the shell.
git clone https://github.com/rafaleandrog/tipolis-sandbox.git
cd tipolis-sandbox/press-research-communications/apps-script

# 4. Make sure .clasp.json carries the real Script ID.
#    (If you already committed the Script ID from the GitHub UI, skip this.)
nano .clasp.json
# Replace PASTE_YOUR_SCRIPT_ID_HERE with the Script ID from Apps Script
# → Project Settings, save (Ctrl+O, Enter, Ctrl+X).

# 5. Push all 11 files at once. This overwrites the legacy file(s) in the
#    project. Confirm "y" if it asks before deleting remote files.
clasp push --force
```

Reload the Apps Script editor: the 11 `.gs` files plus `appsscript.json`
should be there, and the legacy single file should be gone.

## Re-deploying the Web App

`clasp push` updates the script files, but the public Web App URL still
serves the previously deployed version. To make new code live:

- Apps Script editor → **Deploy → Manage deployments → pencil icon →
  Version: New version → Deploy**.
- The `/exec` URL stays the same.

## Future updates

Two reasonable workflows once the first push is done:

**A. Edit in the repo, push from Cloud Shell when you want to sync.**

```bash
# In a fresh Cloud Shell session:
cd ~/tipolis-sandbox && git pull
cd press-research-communications/apps-script
clasp push --force
```

**B. Edit directly in the Apps Script editor, pull back into the repo
periodically** (keeps the repo as a historical mirror).

```bash
cd ~/tipolis-sandbox/press-research-communications/apps-script
clasp pull
cd ~/tipolis-sandbox
git add -A && git commit -m "sync: pull Apps Script edits" && git push
```

Pick one direction and stay with it — flipping between the two on the
same file risks overwriting work.

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
| `08_Triggers.gs` | Time-driven triggers (daily search, daily AI filter) |
| `09_WebApp.gs` | `doGet`/`doPost` routing for the frontend |
| `10_Helpers.gs` | Settings, dates, sheet utilities, logging |
| `appsscript.json` | Apps Script manifest (timezone, webapp config) |
| `.clasp.json` | Maps this folder to a specific Apps Script project |
