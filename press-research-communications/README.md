# press-research-communications

## Purpose
Project workspace for press research communications.

## Structure
- `index.html`: Entry page for GitHub Pages.
- `press-monitor/`: Tipolis Press Monitor — weekly news pipeline frontend
  (5 HTML screens calling the Apps Script Web App). See
  [`press-monitor/README.md`](./press-monitor/README.md).
- `apps-script/`: Backend (`.gs` files + `appsscript.json` + `.clasp.json`)
  for the Press Monitor.
- `docs/`: Editorial spec and the owner build guide for the Press Monitor.
- `template/`: Branded `.docx` template the report generator copies from.

## Deployment Notes
Use relative links and keep static hosting compatibility. The Press Monitor
frontend ships with the deployed Web App URL hard-coded in
`press-monitor/js/api.js`; the bearer token is supplied at runtime via the
login screen (`press-monitor/login.html`) and lives only in `sessionStorage`
for the duration of the editor's session.
