/**
 * Regression test for the thematic gate in 02_Search.gs.
 *
 * Run: node press-research-communications/apps-script/test/topic_gate.test.js
 *
 * The gate is the one place where a tuning mistake is silent: too loose and
 * it saves nothing, too tight and it quietly parks news that should have
 * reached triage, with no error anywhere. So it is measured rather than
 * argued about.
 *
 * The fixture is 721 real articles fetched on 2026-09-17, each carrying the
 * verdict Gemini gave it. That verdict is the ground truth here: an article
 * the classifier kept ('tipolis' or 'industry') must never be parked by the
 * gate. Articles it rejected are the ones the gate is supposed to catch
 * before they cost a request.
 *
 * The functions under test are read straight out of 02_Search.gs and
 * 00_Config.gs, so this exercises the shipped source, not a copy of it.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..');
const FIXTURE = path.join(__dirname, 'fixture_2026-09-17.json');

// The gate must never park an article the classifier kept.
const MAX_FALSE_NEGATIVES = 0;
// It must still earn its keep on the ones the classifier rejected.
const MIN_REJECT_PARK_RATE = 0.25;

function extractFunction(src, name) {
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('function not found in source: ' + name);
  let depth = 0;
  for (let i = src.indexOf('{', start); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (!depth) return src.slice(start, i + 1); }
  }
  throw new Error('unbalanced braces reading ' + name);
}

function loadSource() {
  const config = fs.readFileSync(path.join(SRC, '00_Config.gs'), 'utf8');
  const search = fs.readFileSync(path.join(SRC, '02_Search.gs'), 'utf8');
  const seedStart = config.indexOf('const TOPIC_KEYWORDS_SEED');
  const seed = config.slice(seedStart, config.indexOf('];', seedStart) + 2);
  return new Function(
    seed + '\n' +
    extractFunction(search, 'normalizeForGate_') + '\n' +
    extractFunction(search, 'topicGateVerdict_') + '\n' +
    'return { TOPIC_KEYWORDS_SEED, normalizeForGate_, topicGateVerdict_ };'
  )();
}

// Mirrors how getTopicKeywords_ reads the seeded sheet back: enabled rows
// only, split by mode.
function buildVocabulary(api) {
  const vocab = { block: [], require: [] };
  api.TOPIC_KEYWORDS_SEED.forEach(row => {
    const [keyword, mode, enabled] = row;
    if (enabled !== true) return;
    (mode === 'require' ? vocab.require : vocab.block).push(api.normalizeForGate_(keyword));
  });
  return vocab;
}

function main() {
  const api = loadSource();
  const vocab = buildVocabulary(api);
  const rows = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));

  const seen = { kept: 0, keptParked: 0, rejected: 0, rejectedParked: 0, total: 0, parked: 0 };
  const falseNegatives = [];

  rows.forEach(r => {
    const verdict = api.topicGateVerdict_(
      { title: r.title, description: r.description, source: r.source }, vocab);
    seen.total++;
    if (verdict) seen.parked++;

    if (r.ai_category === 'tipolis' || r.ai_category === 'industry') {
      seen.kept++;
      if (verdict) {
        seen.keptParked++;
        falseNegatives.push(`[${verdict}] ${r.term} | ${String(r.title).slice(0, 70)}`);
      }
    } else if (r.ai_category === 'reject') {
      seen.rejected++;
      if (verdict) seen.rejectedParked++;
    }
  });

  const rejectParkRate = seen.rejected ? seen.rejectedParked / seen.rejected : 0;
  const pct = n => (100 * n).toFixed(1) + '%';

  console.log(`vocabulary: ${vocab.block.length} block, ${vocab.require.length} require (enabled rows only)`);
  console.log(`articles:   ${seen.total}, parked ${seen.parked} (${pct(seen.parked / seen.total)})`);
  console.log(`kept by AI: ${seen.kept}, parked by gate ${seen.keptParked}  <- must be ${MAX_FALSE_NEGATIVES}`);
  console.log(`rejected:   ${seen.rejected}, parked by gate ${seen.rejectedParked} (${pct(rejectParkRate)})  <- must be >= ${pct(MIN_REJECT_PARK_RATE)}`);

  const failures = [];
  if (seen.keptParked > MAX_FALSE_NEGATIVES) {
    failures.push(`gate parked ${seen.keptParked} article(s) the classifier kept:\n  - ` +
      falseNegatives.join('\n  - '));
  }
  if (rejectParkRate < MIN_REJECT_PARK_RATE) {
    failures.push(`gate only parked ${pct(rejectParkRate)} of rejected articles; ` +
      `below the ${pct(MIN_REJECT_PARK_RATE)} floor it is meant to clear.`);
  }

  if (failures.length) {
    console.error('\nFAIL\n' + failures.join('\n\n'));
    process.exit(1);
  }
  console.log('\nPASS');
}

main();
