# tipolis-sandbox

Modular multi-project workspace designed for GitHub Pages deployment.

## Repository layout

- `index.html`: Root navigation portal.
- `assets/`: Shared styles, scripts, and media.
- Project directories:
  - `general/`
  - `strc-treasury/`
  - `digital-money/`
  - `city-bonds/`
  - `real-estate/`
  - `infrastructure-development/`
  - `business-development/`
  - `press-research-communications/`

Each project contains isolated `pages/`, `apps/`, `dashboards/`, `research/`, and asset directories.

### Tipolis Press Monitor

A weekly news pipeline (Google Sheet backend + Apps Script Web App + GitHub
Pages frontend) lives under
[`press-research-communications/press-monitor/`](./press-research-communications/press-monitor/).
Setup steps and the editor workflow are documented in that folder's
[`README.md`](./press-research-communications/press-monitor/README.md). The
backend `.gs` files sit in `press-research-communications/apps-script/` and
can be synced with `clasp`.

## GitHub Pages

Repository root and each project can be served independently with relative links.
