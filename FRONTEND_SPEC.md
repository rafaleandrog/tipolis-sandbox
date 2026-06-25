# Tipolis Press Monitor — Frontend Specification

GitHub Pages interface that drives the existing Apps Script Web App backend.
Desktop-only. Plain HTML + CSS + JavaScript (no build step, no framework).

> **UI source of truth (READ THESE FIRST — they are authoritative):**
> The visual design (layout, colors, typography, component styling, page
> structure) MUST follow the existing UI assets and design docs already in the
> repository. This spec defines *behavior, data flow, and API wiring only*.
> Before writing ANY HTML/CSS, read and obey, in this order:
>
> 1. `assets/css/tipolis-design-system.css` — the canonical design tokens
>    (colors, typography, spacing, component primitives). USE these tokens /
>    classes; do not invent new colors, fonts, or spacings.
> 2. `assets/css/style.css` — shared applied styles. Reuse before adding new CSS.
> 3. The `general/` section — treated as the **canonical reference layout** per
>    the repo's own commit ("…to match General as canonical"). Match its page
>    shell, header, navigation, and component patterns.
> 4. Any UI spec/docs under `docs/` — follow them where present.
>
> The press-monitor frontend lives in
> `press-research-communications/press-monitor/` and MUST link to the shared
> `assets/css/` files (relative path up to repo root) rather than ship its own
> stylesheet. Only add page-specific CSS for things the design system genuinely
> does not cover, and even then use its tokens. Where this spec and the repo's
> UI assets differ on appearance, **the repo wins**. This spec never overrides
> the repo's visual rules.

---

## 1. Where it lives

- Repo: `rafaleandrog.github.io/tipolis-sandbox`
- Path: `press-research-communications/press-monitor/`
- Served as static GitHub Pages. No backend code here — the backend is the
  Apps Script Web App already deployed.

## 2. Backend contract (already implemented in 09_WebApp.gs)

Base call shape:

```
{WEB_APP_URL}?path=/<route>&token=<TOKEN>
```

- GET routes pass params in the query string.
- POST routes send a JSON body as `text/plain` (avoids CORS preflight).
- Every response is `{ ok: true, data: ... }` or `{ ok: false, error: ... }`.

Routes used by the frontend:

| Screen | Method + route | Purpose |
|---|---|---|
| Config | `GET /terms`, `POST /terms` | list / save search terms |
| Config | `GET /countries`, `POST /countries` | list / save priority countries |
| Triage | `GET /triage?showRejected=&allDates=` | list classified, in-window items |
| Triage | `POST /triage/approve {row}` | approve → copies to approved_news + builds summary |
| Triage | `POST /triage/reject {row}` | mark rejected |
| Summary | `GET /summary` | list approved_news items + bullets |
| Summary | `POST /summary/save {row, headline_line, bullets, country?, region?, category?}` | save edited bullets |
| Summary | `POST /summary/reorder {order:[row,...]}` | reorder by Display_Order |
| Report | `GET /report/preview` | preview items as they'll appear in the Doc |
| Report | `POST /report/generate` | create the Google Doc, returns {docId,url,...} |
| Report | `POST /report/archive {docId,docUrl}` | archive to history + reset week |
| History| `GET /history?country=&category=&region=` | list archived items |
| History| `GET /history/countries` | country rollup for the browser |
| Actions| `POST /search/run` | trigger a manual search (SLOW) |
| Actions| `POST /filter/run` | trigger AI classification (SLOW) |

## 3. Authentication (Option 2 — token at login, not in source)

Because GitHub Pages is public, the token must NOT be hardcoded in any file.

- On first load, a **login gate** asks for the bearer token.
- The token is held **only in memory** (a JS variable) for the session, and
  optionally in `sessionStorage` (cleared when the tab closes). Never in
  `localStorage`, never committed to the repo.
- Every API call appends `&token=<token>`.
- If any call returns `{ok:false, error:"Unauthorized"}`, the app drops the
  token and returns to the login gate.
- A "Log out" control clears the token and reloads the gate.

This keeps the secret out of the public source while staying simple. It is not
strong security (anyone with the token can drive the backend), which matches the
agreed posture.

## 4. The "no delay" reality (important UX constraint)

Apps Script Web Apps cannot stream progress and can run for minutes. So:

- **Fast actions** (approve one item, reject, save a summary, reorder, load a
  list) feel instant — they touch one row or read a sheet.
- **Slow actions** (`/search/run`, `/filter/run`, `/report/generate`) can take
  from many seconds to minutes. The UI does NOT pretend these are instant.
  Pattern for slow actions:
  1. Button shows a spinner + "Running… this can take a few minutes."
  2. The call is fired; the button is disabled to prevent double-runs.
  3. On return, show a result toast and auto-refresh the relevant list.
  4. If the browser times out before the script finishes, show "Still running
     in the background — refresh in a minute to see results," because the Apps
     Script side keeps going even if the HTTP response is lost.

This is the honest model: the frontend is a remote control, not a live mirror.
"Connected, no delay" is true for the light actions; the heavy ones are
fire-and-refresh.

## 5. Screens (build order: 3 core first, then 2)

### Build phase 1 — the report-producing core

**Screen A — Triage** (`triage.html`)
- Loads `GET /triage`. Two toggles at top: "Show rejected" and "All dates"
  (off = current Mon–Sun report window only), each re-fetches.
- Each item card shows: source, published date, title (link out), AI category
  (tipolis/industry) + country/region, relevance, AI reason, description.
- Per item: **Approve** and **Reject** buttons.
  - Approve → `POST /triage/approve {row}`; on success remove the card and show
    "Approved — summary building." (Note: approve also triggers a Gemini
    summary on the backend, so it's a few seconds, not instant.)
  - Reject → `POST /triage/reject {row}`; remove the card.
- Empty state: "No items in this window. Try 'All dates' or run a search."

**Screen B — Summaries** (`summary.html`)
- Loads `GET /summary`, sorted by Display_Order.
- Each item: editable **headline_line** field + editable **bullets** (one
  textarea per bullet, add/remove bullet, the AI gives 6–10, you trim to 3–5).
- Show AI_Status (Done / Error) and the source/country/category (country,
  region, category editable via the save payload).
- **Save** → `POST /summary/save`. **Reorder** by drag → `POST /summary/reorder`
  with the new row order.
- Markdown note: bullets use `**bold**`, `*italic*`, `[text](url)` — the same
  markdown the Doc generator parses. Show a tiny legend so edits stay valid.

**Screen C — Report** (`report.html`)
- **Preview**: `GET /report/preview` renders the two sections (Tipolis /
  Industry) exactly as they'll be grouped in the Doc, in Display_Order.
- **Generate report** → `POST /report/generate` (SLOW). On success show the Doc
  link (open in new tab) and keep it on screen.
- **Archive & reset** → `POST /report/archive {docId,docUrl}` using the just-
  generated Doc's ids. Strong confirm dialog first, because this empties
  approved_news AND search_results and advances the week counter. After
  success, show "Week archived. approved_news and search_results are now clear."
- Guardrail: disable "Archive" until a report has been generated in this
  session, so you never archive before generating (which would lose the week).

### Build phase 2 — configuration & memory

**Screen D — Config** (`config.html`)
- **Terms table**: `GET /terms` → editable rows (term, enabled, days,
  match_type, case_sensitive, language, country, max_results). Save all →
  `POST /terms {terms:[...]}`.
- **Countries table**: `GET /countries` → editable rows (country_name, region,
  priority_level, project_names, notes). Save all → `POST /countries`.
- Also surface the two SLOW action buttons here: **Run search now**
  (`/search/run`) and **Run AI classification now** (`/filter/run`), with the
  slow-action UX from §4.

**Screen E — History** (`history.html`)
- **Country browser**: `GET /history/countries` → list/grid of countries with
  counts and latest date (Notion-style index).
- Selecting a country (or using category/region filters) → `GET /history?...`
  renders the archived items with their final bullets and the report Doc link.
- Read-only.

## 6. Shared front-end structure

All new files live under `press-research-communications/press-monitor/`.

- `index.html` — login gate + nav shell; routes to the 5 screens (or a single
  shell with tab nav if the `general/` reference layout prefers that). The page
  shell, header, and nav must mirror the `general/` section's pattern.
- `triage.html`, `summary.html`, `report.html`, `config.html`, `history.html` —
  the 5 screens (or sections within one shell, following the canonical layout).
- `js/api.js` — one module with `setToken`, `clearToken`, `apiGet(path,params)`,
  `apiPost(path,body)`; all calls route through here so auth + error handling +
  the `{ok,data,error}` unwrap live in one place. Surfaces Unauthorized → logout.
- `js/app.js` (or per-screen scripts) — screen logic: fetch, render, wire events.
- **CSS:** link the shared `assets/css/tipolis-design-system.css` and
  `assets/css/style.css` via relative paths to repo root (e.g.
  `../../assets/css/...`). Do NOT create a standalone stylesheet for the
  press-monitor. Only a tiny `press-monitor.css` for genuinely missing
  page-specific needs, built entirely from design-system tokens.
- No browser storage except optional `sessionStorage` for the token. No
  `localStorage`.

## 7. Config values the frontend needs

- `WEB_APP_URL` — the deployed Web App `/exec` URL (NOT a secret, just an
  endpoint; lives as a constant in `js/api.js`). **Validated, working value:**
  `https://script.google.com/macros/s/AKfycbzmgzIONpheRejnEWztwCxTjNFlw3W_ZeusK85LeGzKU8CoAt7rA0rmqD2P3xBktuS1/exec`
  (note the capital `I` in `…gzI…`). A `GET /triage` against it returns
  `{"ok":true,"data":[]}` when there's nothing pending — confirmed reachable.
- The **token** is the secret; it is entered at the login gate, kept only in
  memory/`sessionStorage`, and NEVER committed.
- Reminder: editing the Apps Script does NOT update the live deployment.
  Re-deploy via Manage deployments → edit → New version → Deploy.

## 8. Error handling rules

- Every call wrapped in try/catch; network failure → toast "Couldn't reach the
  backend. Check your connection and that the Web App is deployed."
- `{ok:false}` → show `error` text in a toast; if "Unauthorized" → logout.
- Slow actions that exceed browser timeout → the "still running, refresh soon"
  message, never a hard error, because the backend keeps working.

## 9. Out of scope (for now)

- No editing of report_settings from the UI (done in the sheet).
- No multi-user / roles.
- No real-time push (Apps Script can't); refresh is manual or after an action.

---

## Build sequence summary

1. Read the repo's UI assets/docs and lock visual rules (see top of this file):
   `assets/css/tipolis-design-system.css`, `assets/css/style.css`, the
   `general/` canonical layout, and any `docs/` UI spec.
2. `js/api.js` + login gate (validate token against `GET /triage`).
3. Screen A (Triage) → B (Summaries) → C (Report) — the core loop.
4. Screen D (Config) + E (History).
5. Wire slow-action UX everywhere it applies.
6. Deploy test (Web App URL already validated — see §7).

---

## Kickoff prompt for the code agent (Claude Code / Cowork)

Paste something like this when starting the build, from the repo root:

> Read `press-research-communications/press-monitor/FRONTEND_SPEC.md` for
> behavior and API wiring. For ALL visual design, first read and obey
> `assets/css/tipolis-design-system.css`, `assets/css/style.css`, the `general/`
> section as the canonical layout reference, and any UI spec under `docs/`.
> Build the Tipolis Press Monitor frontend under
> `press-research-communications/press-monitor/`, linking the shared
> `assets/css/` files instead of writing a new stylesheet. Start with
> `js/api.js` and the login gate, then Triage, Summaries, and Report. Use the
> validated `WEB_APP_URL` from §7; the token is entered at login, never
> hardcoded. Honor the slow-action UX (§4) for search/filter/report-generate.
> Test each screen against the live Web App before moving to the next.

---

## 10. Feedback widget (bug / suggestion capture)

A lightweight feedback channel embedded in every screen. Lets the user open a
small form, pick which press-summary page it concerns, choose bug vs suggestion,
and add a title + detailed description. Submissions land in the `feedback` sheet
via the backend.

### Backend contract (already added to Apps Script)

- Route: `POST /feedback`
- Body: `{ page, type, title, description }`
  - `page`: one of "Triage", "Summaries", "Report", "Config", "History",
    "General" (the screen it's about; default to the current screen, but let the
    user change it).
  - `type`: "bug" or "suggestion" (required, validated server-side).
  - `title`: required short text.
  - `description`: optional long text.
- Response: `{ ok: true, data: { saved: true, row } }` or
  `{ ok: false, error }`. Server validates: title required, type must be
  bug/suggestion. The sheet is auto-created on first submit.

### UI behavior

- A persistent **"Feedback" / "Report a bug" trigger** is always reachable —
  a small fixed button (bottom-right corner is conventional) or an item in the
  shared header/nav. Follow the design system's button + modal patterns; do not
  invent a new visual style.
- Clicking it opens a **modal form** (use the design-system modal/dialog
  component if one exists in `general/` or the design tokens) with:
  1. **Page** — a select, pre-filled with the screen the user is currently on,
     but changeable (options: the five screens + "General").
  2. **Type** — a two-option toggle or radio: **Bug** / **Suggestion**.
  3. **Title** — single-line text input (required).
  4. **Description** — multi-line textarea (optional).
  5. **Submit** and **Cancel** buttons.
- On Submit → `apiPost('/feedback', { page, type, title, description })`.
  - Success → close modal, show a small confirmation toast ("Thanks — logged.").
    Reset the form for next time.
  - Validation error from server (e.g. missing title) → show the error inline,
    keep the modal open.
  - Network/Unauthorized → same handling as every other call (toast / logout).
- The widget reuses `js/api.js` (same token + error handling). No new auth path.
- Keep it out of the way: it must not block or overlap the main content; it's a
  small floating affordance, consistent across all screens (define it once,
  include it on every page — e.g. a shared `feedback.js` + a small markup
  snippet, or part of the nav shell).

### Where it lives

- One shared module `js/feedback.js` that injects the trigger + modal into any
  page that includes it, calling through `js/api.js`. Include it on all five
  screens so the channel is omnipresent without duplicated code.

### Kickoff note for the code agent

> Also implement the feedback widget from §10: a shared `js/feedback.js` that
> adds an always-available "Feedback" button + a modal (page select prefilled to
> current screen, bug/suggestion toggle, required title, optional description),
> POSTing to `/feedback` through `js/api.js`. Use the design system's button,
> modal, form-field, and toast components — no new visual style. Include it on
> every screen.

---

## 11. Approve / summary decoupling (fixes the "action took too long" timeout)

**Why:** Previously `POST /triage/approve` generated the AI summary inline
(fetch article + Gemini, 10–40s), which exceeded the browser fetch timeout and
showed "action took too long / canceled" even though the backend often finished.
The backend now SEPARATES the two:

- `POST /triage/approve` is now **fast**: it only copies the item into
  `approved_news` with `AI_Status = Pending`. No article fetch, no Gemini. Returns
  in ~1s. **No more timeout.**
- A new route `POST /summary/build` generates pending summaries in **small
  batches** (default 2 per call) and returns `{ built, remaining }`. The frontend
  calls it in a loop until `remaining === 0`.

### Frontend changes required

**A) Triage screen — Approve button**
- Keep calling `POST /triage/approve { row }`. It's fast now.
- On success, change the confirmation text from anything implying a summary was
  generated to: **"Approved — summary pending."**
- The approved card is removed from the triage list as before.
- (Reject is unchanged: `POST /triage/reject { row }` just hides the item;
  toggle "Show rejected" to see/undo. It was never the slow path.)

**B) Summaries screen — new "Generate pending summaries" button**
- Add a button labeled e.g. **"Generate pending summaries"**.
- When clicked, it loops:
  1. `POST /summary/build { max: 2 }`.
  2. Read `{ built, remaining }` from the response.
  3. Show progress, e.g. "Generated 2 — 5 remaining…".
  4. If `remaining > 0`, call again; repeat until `remaining === 0`.
  5. When done, refresh the summaries list (`GET /summary`) so the new bullets
     and `AI_Status = Done` appear.
- Each call is short (2 articles) so it stays under the timeout. The loop is what
  drains the backlog, not a single long call.
- Disable the button while the loop runs; re-enable when finished. Handle a
  failed call mid-loop gracefully (stop, show the error, let the user retry —
  already-built rows are saved, so retry resumes from where it stopped because
  done rows are skipped by status).
- Rows whose `AI_Status` starts with "Error" are retried by `/summary/build`
  too, so this button doubles as a "retry failed summaries" control.

**C) Status display**
- In the Summaries list, show each item's `aiStatus` (Pending / Done / Error…)
  so the user knows which still need building. A small badge is enough.

### Flow after this change

1. Triage → **Approve** (instant) → item lands in approved_news as *Pending*.
2. Summaries screen → **Generate pending summaries** → loops `/summary/build`
   until all are *Done*.
3. Edit bullets → **Save**.
4. Report → Preview → Generate → Archive.

This removes the long synchronous wait from the click that was timing out, and
moves the heavy work into a controlled, batched, resumable loop.

### Kickoff note for the code agent

> Implement §11: make the Triage Approve button treat approve as a fast action
> (success message "Approved — summary pending"), and add a "Generate pending
> summaries" button on the Summaries screen that calls `POST /summary/build
> { max: 2 }` in a loop until `remaining === 0`, showing progress and refreshing
> the list when done. Show each summary's `aiStatus` as a badge. All calls go
> through `js/api.js`.
