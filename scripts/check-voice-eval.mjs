// Checks the voice evaluation set: the counts, the gold intents and the tags.
//
//   node scripts/check-voice-eval.mjs
//
// The set is the measurement of the voice (V4 section 10.1): 500 utterances is
// the floor, every script has a gold intent from the product's catalogue, and
// every address comes from the real LINZ data.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MANIFEST = 'docs/squads/voice/eval/manifest';

const INTENTS = new Set([
  'mark_delivered',
  'mark_failed',
  'skip_stop',
  'add_stop',
  'start_break',
  'end_break',
  'add_location_note',
  'repeat_or_detail',
  'noop',
]);

const SLICES = [
  { id: 'en_nz_quiet', min: 120 },
  { id: 'en_nz_van', min: 120 },
  { id: 'mi_places', min: 60 },
  { id: 'ar', min: 40 },
  { id: 'hi_pa', min: 40 },
  { id: 'zh', min: 40 },
  { id: 'sm_to', min: 40 },
  { id: 'numbers_corrections', min: 40 },
  { id: 'code_switch', min: 60 },
  { id: 'chatter', min: 40 },
];

const problems = [];

if (!existsSync(MANIFEST)) {
  console.error(`the manifest is missing: ${MANIFEST}`);
  process.exit(1);
}

function readJsonl(name) {
  const file = join(MANIFEST, name);
  if (!existsSync(file)) {
    problems.push(`missing file: ${file}`);
    return [];
  }
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

const scripts = readJsonl('scripts.jsonl');
const utterances = readJsonl('utterances.jsonl');
const addresses = readJsonl('addresses.jsonl');

if (scripts.length < 500) {
  problems.push(`the set needs 500 scripts at least, it has ${scripts.length}`);
}

const addressIds = new Set(addresses.map((address) => address.id));
if (addresses.length < 100) {
  problems.push(`the address bank needs 100 addresses at least, it has ${addresses.length}`);
}

const seen = new Set();
for (const script of scripts) {
  if (seen.has(script.id)) {
    problems.push(`duplicate script id: ${script.id}`);
  }
  seen.add(script.id);
  if (!INTENTS.has(script.gold_intent)) {
    problems.push(`${script.id}: unknown gold intent "${script.gold_intent}"`);
  }
  if (!script.text || script.text.length < 3) {
    problems.push(`${script.id}: the text is empty`);
  }
  if (!Array.isArray(script.tags) || script.tags.length === 0) {
    problems.push(`${script.id}: no tags`);
  }
  if (script.address_id && !addressIds.has(script.address_id)) {
    problems.push(`${script.id}: the address ${script.address_id} is not in the bank`);
  }
}

for (const slice of SLICES) {
  const count = scripts.filter((script) => script.slice === slice.id).length;
  if (count < slice.min) {
    problems.push(`the slice ${slice.id} needs ${slice.min} scripts, it has ${count}`);
  }
}

const scriptIds = new Set(scripts.map((script) => script.id));
for (const utterance of utterances) {
  if (!scriptIds.has(utterance.script_id)) {
    problems.push(`${utterance.id}: the script ${utterance.script_id} is not in the bank`);
  }
}

if (problems.length > 0) {
  console.error(`the voice evaluation set is broken (${problems.length} problems):`);
  for (const problem of problems.slice(0, 20)) {
    console.error(`- ${problem}`);
  }
  process.exit(1);
}

console.log(
  `the voice evaluation set is sound: ${scripts.length} scripts, ${utterances.length} planned files, ${addresses.length} addresses`,
);
