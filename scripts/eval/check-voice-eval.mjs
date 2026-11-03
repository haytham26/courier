// Checks the voice evaluation set: the counts, the gold intents and the tags.
//
//   node scripts/eval/check-voice-eval.mjs
//
// The set is the measurement of the voice (V4 section 10.1): 500 utterances is
// the floor, every script has a gold intent from the product's catalogue, and
// every address comes from the real LINZ data.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MANIFEST = 'packages/eval/voice/manifest';

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
  { id: 'en_mix', min: 120 },
  { id: 'mi_places', min: 60 },
  { id: 'ar', min: 40 },
  { id: 'hi_pa', min: 40 },
  { id: 'zh', min: 40 },
  { id: 'sm_to', min: 40 },
  { id: 'numbers_corrections', min: 40 },
  { id: 'code_switch', min: 60 },
  { id: 'chatter', min: 40 },
];

// A3: the open-data slices, whose audio comes from Common Voice (CC0) speakers
// and the MUSAN noise beds. The audio itself lives outside git (data/voice/),
// so what the checkers pin here is the manifest's integrity: the counts, the
// files named and the checksums.
const OPEN_SLICES = ['en_nz_quiet', 'en_nz_van', 'en_mix'];
const MIN_BUILT = 500;

// The commands of the app (`apps/mobile/src/voice/VoiceService.ts`). The shift
// simulations are scored against the service, so their intents are the names
// the app understands.
const APP_COMMANDS = new Set([
  'mark_delivered',
  'mark_skipped',
  'mark_failed',
  'add_stop',
  'start_break',
  'end_break',
  'add_location_note',
  'navigate_next',
  'navigate_previous',
  'repeat_instruction',
  'where_am_i',
  'how_many_left',
  'start_shift',
  'end_shift',
  'emergency',
  'set_map_mode',
  'zoom_to_next_stop',
  'tilt_map',
  'follow_me',
  'look_back',
  'reset_camera',
  'set_quiet_mode',
  'set_verbosity',
]);

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

// The shift simulations: the scripted full shifts, with the voice and the noise.
const SIMULATIONS = 'shift_sims.json';
const simulations = [];
if (!existsSync(join(MANIFEST, SIMULATIONS))) {
  problems.push(`missing file: ${join(MANIFEST, SIMULATIONS)}`);
} else {
  const document = JSON.parse(readFileSync(join(MANIFEST, SIMULATIONS), 'utf8'));
  const slices = Array.isArray(document.slices) ? document.slices : [];
  const shiftSlice = slices.find((slice) => slice.id === 'shift_sim');
  if (!shiftSlice) {
    problems.push('the shift_sim slice is not in the manifest of the simulations');
  } else {
    const shifts = Array.isArray(shiftSlice.simulations) ? shiftSlice.simulations : [];
    simulations.push(...shifts);
    if (shifts.length < 3) {
      problems.push(`the shift simulations need 3 shifts at least, it has ${shifts.length}`);
    }
    for (const simulation of shifts) {
      if (!simulation.id || !simulation.name) {
        problems.push('a simulation has no id or no name');
      }
      if (!simulation.noise || !simulation.noise.bed) {
        problems.push(`${simulation.id}: the simulation has no noise bed`);
      }
      const turns = Array.isArray(simulation.turns) ? simulation.turns : [];
      if (turns.length < 5) {
        problems.push(`${simulation.id}: the simulation needs 5 turns at least, it has ${turns.length}`);
      }
      for (const turn of turns) {
        if (!turn.transcript || turn.transcript.trim().length === 0) {
          problems.push(`${simulation.id}: a turn has no words`);
        }
        if (!turn.expect_intent) {
          problems.push(`${simulation.id}: a turn has no expected intent`);
        }
        if (turn.expect_intent !== 'chat' && turn.expect_intent !== 'question') {
          if (!INTENTS.has(turn.expect_intent) && !APP_COMMANDS.has(turn.expect_intent)) {
            problems.push(
              `${simulation.id}: the intent "${turn.expect_intent}" is not one of the product's commands`,
            );
          }
        }
      }
    }
  }
}

// A3: the built utterances carry their file and their checksum, and the open
// slices are complete. The audio files live outside git (data/voice/, like
// data/linz/), so the file itself is not opened here - the checksum is the
// pin: a clip that changed is a different utterance.
for (const utterance of utterances) {
  if (utterance.status !== 'built') continue;
  if (!utterance.file || typeof utterance.file !== 'string') {
    problems.push(`${utterance.id}: a built utterance names no file`);
  }
  if (!utterance.sha256 || !/^[0-9a-f]{64}$/.test(utterance.sha256)) {
    problems.push(`${utterance.id}: a built utterance carries no sha256`);
  }
  if (utterance.snr_db != null && !Number.isFinite(utterance.snr_db)) {
    problems.push(`${utterance.id}: a mixed utterance has no snr_db number`);
  }
}

const built = new Map();
for (const utterance of utterances) {
  built.set(utterance.slice, (built.get(utterance.slice) ?? 0) + 1);
}
const builtTotal = utterances.filter((utterance) => utterance.status === 'built').length;
if (builtTotal < MIN_BUILT) {
  problems.push(`A3 needs ${MIN_BUILT} utterances built from open data, it has ${builtTotal}`);
}
for (const slice of OPEN_SLICES) {
  const planned = utterances.filter((utterance) => utterance.slice === slice.id).length;
  if (planned > 0 && (built.get(slice.id) ?? 0) < planned) {
    problems.push(`${slice.id}: ${planned - (built.get(slice.id) ?? 0)} utterances are not built yet`);
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
  `the voice evaluation set is sound: ${scripts.length} scripts, ${utterances.length} planned files (${builtTotal} built from open data), ${addresses.length} addresses, ${simulations.length} shift simulations`,
);
