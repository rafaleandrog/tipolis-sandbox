#!/usr/bin/env bash
# Regenerates ../Tipolis_Press_Monitor.consolidated.gs from the 11 .gs
# sources in this folder. The consolidated file is what gets pasted into the
# Apps Script editor, so it MUST be rebuilt after every change here — run
# this script instead of editing it by hand.
set -euo pipefail
cd "$(dirname "$0")"
OUT="../Tipolis_Press_Monitor.consolidated.gs"

{
  cat <<'HEADER'
/**************************************************************************
 * TIPOLIS PRESS MONITOR — Consolidated single-file build
 * --------------------------------------------------------------------------
 * GENERATED FILE — do not edit by hand.
 * Rebuild with: press-research-communications/apps-script/build_consolidated.sh
 *
 * Generated from press-research-communications/apps-script/*.gs (11 files).
 * Paste this entire file into one .gs file in the Apps Script editor (e.g.
 * `Code.gs`) as a manual alternative to `clasp push`.
 *
 * All 11 source files run in a single shared global scope in Apps Script;
 * the numerical prefixes (00_, 01_, …) only control display order in the
 * editor. Concatenation preserves the same runtime behavior.
 *
 * If you later switch to clasp, delete this single file from the Apps
 * Script project so it does not conflict with the 11 individual files.
 *
 * Source of truth: the 11 files under apps-script/. Edits made directly in
 * Apps Script should be backported to that folder (or this file will drift).
 **************************************************************************/

HEADER

  for f in [0-9][0-9]_*.gs; do
    printf '\n\n/* ========================================================================\n'
    printf ' * SECTION: %s\n' "$f"
    printf ' * ====================================================================== */\n\n'
    cat "$f"
  done
} > "$OUT"

echo "Wrote $OUT ($(wc -l < "$OUT") lines) from $(ls [0-9][0-9]_*.gs | wc -l) source files."
