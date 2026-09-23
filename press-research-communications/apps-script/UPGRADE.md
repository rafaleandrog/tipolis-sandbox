# Upgrading the Apps Script backend

Two things live in two places: the code, in this repo, and the spreadsheet it
runs against. Shipping a backend change means doing both, in order. This file
is the procedure; the dated sections below record what each release also needed
on the sheet side.

## Every time the backend changes

1. **Rebuild the single-file build.**

   ```bash
   cd press-research-communications/apps-script
   ./build_consolidated.sh
   ```

   `Tipolis_Press_Monitor.consolidated.gs` is generated from the 11 `.gs` files
   here. Editing it by hand is how the repo and the deployed code drift apart.

2. **Paste it into the Apps Script editor**, replacing everything in the file.

3. **Deploy → Manage deployments → ✏️ (pencil) → Version: *New version* →
   Deploy.** This step is the one people skip. Saving the editor does not
   change what the Web App serves; only a new version does. The Web App URL
   stays the same, so the frontend needs no change.

4. **Tipolis → Create / repair project sheets.** Idempotent and safe to re-run:
   it repairs headers, creates sheets added since the spreadsheet was first set
   up, and backfills `report_settings` keys added since — without touching data
   rows.

5. **Read the `logs` sheet.** Every step of every run writes there; it is the
   only window into a time-driven trigger.

### Order matters when the frontend changed too

The frontend is served from `main`, so merging publishes it immediately, while
the Apps Script only changes when you do step 3. Whenever a release moves
behavior across that line, deploy the backend **first** — or right after the
merge, not later in the day.

A backend newer than the frontend is safe by design: routes keep accepting
parameters they no longer need, and the frontend tolerates routes that do not
exist yet. The opposite is not safe, and the 2026-09-17 release is a concrete
example (see below).

---

## Release 2026-09-23 — GNews primary again, stricter AI filter

Between 16 and 23 Sep 2026 Google News RSS was the primary source. Its links
are `news.google.com` redirects with only the headline as description, so
Gemini classified blind and daily volume went from ~45 to 250–530 rows, while
the Gemini free tier for `gemini-2.5-flash` turned out to be ~20 requests/day
(429 after 19–24 calls). This release:

- makes the **GNews API the primary source** again (`search_source = gnews`),
  with Google News RSS only when GNews returns nothing for a term;
- caps every term at **10 results** (`max_results_cap`);
- sets the **Gemini budget to 20/day**, keeping **6** for summaries
  (`gemini_summary_reserve`);
- tightens the **classification prompt** (concrete new facts only, homonyms
  and same-story duplicates rejected) and sends the GNews content snippet;
- extends the **prefilter** with homonyms (Freeport-McMoRan, gun-free zones…)
  and a whole-source blocklist (the "Zona Franca" outlet, obituary and sports
  feeds).

No frontend dependency: the backend can be deployed at any time.

| # | Do this | Expect |
|---|---|---|
| 1 | Paste the consolidated build, then **new version** of the deployment | Web App URL unchanged |
| 2 | `Tipolis → Create / repair project sheets` | Four keys appended to `report_settings`: `gemini_summary_reserve` (6), `search_source` (gnews), `max_results_cap` (10), `rss_fallback_enabled` (true) |
| 3 | **Edit `gemini_daily_request_budget` by hand: 200 → 20** | The repair step only adds *missing* keys, so the old 200 stays until you change it — and with 200 the filter keeps running into 429s |
| 4 | Check `gnews_api_key` is filled in `report_settings` | GNews is the primary source now; with an empty key every term falls back to RSS |
| 5 | `Tipolis → Run daily search now` (or wait for 06:00) | `logs` shows GNews fetches; `GNews empty for "…". Trying Google News RSS fallback.` only for terms with no GNews news |
| 6 | `Tipolis → Run AI classification now` | Stops at 14 requests (20 − 6 reserve); `Generate pending summaries` still works the same day |

`max_results` values above 10 in `search_terms` do not need editing — the cap
clamps them at read time. To go back to RSS-first without a redeploy, set
`search_source = rss`.

### Rollback

```bash
git show 2cbb05a:press-research-communications/Tipolis_Press_Monitor.consolidated.gs
```

Paste that, deploy a new version, and set `gemini_daily_request_budget` back
if you want the old number. The new settings keys can stay — the older code
ignores them.

---

## Release 2026-09-17 — Gemini quota fix

Backend: quota-aware AI filter, thematic gate, triage without a date window.
Full rationale in `README.md` (“Cost control”) and in the PR.

> **Deploy the backend before or right after merging.** This release removes the
> “All dates” button from the triage screen, because the backend stopped
> filtering the queue by date. With the new frontend live against the old
> backend, the previous-week window is still applied and the button that used to
> work around it is gone — the queue looks empty with no way out.

| # | Do this | Expect |
|---|---|---|
| 1 | Paste the consolidated build, then **new version** of the deployment | Web App URL unchanged |
| 2 | `Tipolis → Create / repair project sheets` | Confirmation alert mentions `topic_keywords`; the new sheet appears with ~174 rows |
| 3 | Open `topic_keywords` | ~123 rows with `mode=block` and the checkbox **ticked**; ~51 rows with `mode=require` and the checkbox **unticked** |
| 4 | Open `report_settings` | Five new keys appended: `daily_filter_auto_run`, `gemini_daily_request_budget` (200), `max_rows_per_search_run` (250), `topic_gate_mode` (skip), `gnews_fallback_enabled` (false) |
| 5 | `Tipolis → Install all triggers` | Alert lists three: search ~06:00, classification ~07:00, catch-up ~13:00 |
| 6 | `Tipolis → Run AI classification now` | Drains the rows left `Pending`. `logs` ends with `Completed. … Gemini requests used today: N/200` |
| 7 | Open the Triage screen | Everything classified and not rejected is listed, with no toggle needed; the banner at the top shows the backlog and today's quota use |

Step 3 is worth a minute of attention. `mode=require` is the aggressive half of
the gate and ships disabled deliberately: measured against 721 real fetched
articles it parks 45% of the news the classifier kept, because a priority
country doing something relevant rarely uses free-zone vocabulary. `mode=block`
parks 31% of what the classifier rejected and none of what it kept. If you
enable `require` rows, re-run `test/topic_gate.test.js` before trusting the
result.

### Nothing to do about `logs`

Log rotation is automatic now — `rotateLogs_` keeps the most recent 4,000 rows
at the end of each search — so an oversized log trims itself on the first run.

### Optional tuning in `search_terms`

None of these are required; each is a measurement from the 2026-09-17 run.

- **Delete the duplicate `zona franca` row.** There are two (one `es`, one
  `pt`) producing near-identical queries and 46 rows between them.
- **`max_results` 100 → 30** on the seven terms currently at 100.
- **`freeport`: 40 → 15.** It returned 37 rows that day and 32 were rejected
  (Freeport PA obituaries, Freeport-McMoRan stock notes, Bahamas weather). The
  block vocabulary now catches most of them, but there is no reason to pay for
  the fetch.
- **Fill in `match_type`** for `Paraguay`, `STP`, `Nevis`, `Brunei` and
  `Autris` — currently blank, so they fall through to `broad` by accident
  rather than by choice.

`Página3` and `Página4` are old header-less copies of `search_results` and
`approved_news`. Nothing reads them; deleting them is housekeeping.

### Rollback

```bash
git show 06b961a:press-research-communications/Tipolis_Press_Monitor.consolidated.gs
```

Paste that, deploy a new version. The new sheets and settings keys can stay —
the older code simply ignores them.
