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
| `03_Gemini.gs` | Gemini REST wrapper + quota accounting |
| `04_AIFilter.gs` | Relevance + category classifier (quota-aware, resumable) |
| `05_AISummary.gs` | Per-article bullet generation |
| `06_Report.gs` | Doc template copy + markdown injection |
| `07_Archive.gs` | Move approved_news → approved_history, reset |
| `08_Triggers.gs` | Time-driven triggers (daily search, daily AI filter) |
| `09_WebApp.gs` | `doGet`/`doPost` routing for the frontend |
| `10_Helpers.gs` | Settings, dates, sheet utilities, logging |
| `appsscript.json` | Apps Script manifest (timezone, webapp config) |
| `.clasp.json` | Maps this folder to a specific Apps Script project |
| `build_consolidated.sh` | Regenerates `../Tipolis_Press_Monitor.consolidated.gs` |
| `test/topic_gate.test.js` | Measures the thematic gate against real fetched articles |

> `Tipolis_Press_Monitor.consolidated.gs` is generated. After changing any
> `.gs` file here, run `./build_consolidated.sh` — that file is what gets
> pasted into the Apps Script editor, so a stale copy means the deployed
> code and the repo disagree.

## Cost control: how a day's articles reach the classifier

The Gemini free tier is limited by **requests**, so everything below exists
to keep the number of classification calls proportional to the number of
articles actually worth reading.

1. **Search terms stay broad** (`search_terms`): `Uruguay`, `freeport`,
   `SEZ`. Narrowing them at the query would cost recall.
2. **Thematic gate** (`topic_keywords`, `topicGateVerdict_` in `02_Search.gs`):
   runs after the fetch and before the row is written. Two vocabularies in
   one sheet, chosen by the `mode` column:
   - `block` — matching any enabled block keyword parks the article. This is
     the sport, obituary, weather, accident and analyst-note vocabulary, and
     it ships **enabled**.
   - `require` — if any are enabled, an article must match one of them. Much
     sharper, and ships **disabled** on purpose (see the measurement below).

   `topic_gate_mode` decides what "parked" means: `skip` (default) writes the
   row with `FilterStatus="Skipped"` — no AI cost, not in triage, but still
   auditable, and the `ai_reason` column names the exact keyword that parked
   it; `drop` does not write it at all. An empty sheet disables the gate.

   **Why `require` ships off.** Both modes were measured against 721 real
   fetched articles, using Gemini's own verdict as ground truth
   (`test/topic_gate.test.js`):

   | vocabulary | articles parked | of those the AI **rejected** | of those the AI **kept** |
   |---|---|---|---|
   | `block` only (shipped) | 16% | 31% | **0%** |
   | `require` on | 74% | 89% | **45%** |

   `require` looks like the bigger win until the last column: it parks nearly
   half the news that should have reached triage. A priority country doing
   something genuinely relevant — "Ecuador central bank raises growth
   forecast", "Cabo Verde industrial production up 11.7%", "Paraguay ranks
   second in relocation index" — rarely speaks free-zone vocabulary. The
   country is already the qualifier there, so requiring more only loses
   coverage. Enable `require` rows for one specific ambiguous term if you
   like, and re-run the test before trusting it.

   Run the test after any edit to the vocabulary:

   ```bash
   node press-research-communications/apps-script/test/topic_gate.test.js
   ```

   It fails if the gate parks even one article the classifier kept, or if it
   stops catching at least a quarter of the ones it rejected.
3. **Row cap** (`max_rows_per_search_run`): a single search writes at most
   this many AI-bound rows. Terms that did not fit start the next run, so the
   cap rotates instead of always starving the tail of the list.
4. **Blocklist** (`prefilterReject_`): literal noise strings, rejected
   without an AI call.
5. **Title dedup**: the same wire story across outlets costs one call, not five.
6. **Batching**: `FILTER_AI_BATCH_SIZE` articles per Gemini call, with
   `thinkingBudget: 0` — classification is labelling, not reasoning.
7. **Request budget** (`gemini_daily_request_budget`): the filter stops
   cleanly at this number rather than discovering the real ceiling by taking
   a 429 mid-batch.

### When a 429 does happen

`parseGeminiQuotaError_` separates a per-minute cap from a per-day one and
keeps the API's own response text in the `logs` sheet:

- **per minute** — wait the `retryDelay` the API asked for and retry the
  same batch (up to three times, then continue in five minutes);
- **per day** — re-arm the continuation trigger for just after the quota
  resets (midnight Pacific) and leave the remaining rows `Pending`.

The continuation trigger is never deleted on a quota error. Deleting it is
what turns one bad morning into a permanent backlog, because the next day's
fresh search lands on top of the rows nobody came back for.
