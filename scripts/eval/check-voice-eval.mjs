// Checks the voice evaluation set: the counts, the gold intents and the tags.
//
//   node scripts/eval/check-voice-eval.mjs            # the main manifest + the held-out one
//   node scripts/eval/check-voice-eval.mjs --heldout  # the held-out manifest only
//
// The set is the measurement of the voice (V4 section 10.1): 500 utterances is
// the floor, every script has a gold intent from the product's catalogue, and
// every address comes from the real LINZ data.
//
// The held-out street split (founder directive 2026-11-08, item 4a): the
// committed list is packages/eval/voice/manifest/heldout_streets.json. This
// check REFUSES a main manifest containing a held-out street (the default
// build excludes them, so nothing is ever tuned on held-out streets) and
// REFUSES a held-out manifest containing a non-held-out street — both fail
// loudly, naming the row. The count floors (500 scripts, 100 addresses, the
// slice minimums, the 500 built utterances) belong to the main set and are
// checked there only; the held-out manifest is checked for structure and
// purity, because its own audio floor comes when its audio is built.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const MAIN_MANIFEST = 'packages/eval/voice/manifest';
const HELDOUT_MANIFEST = join(MAIN_MANIFEST, 'heldout');
const HELDOUT_STREETS_FILE = join(MAIN_MANIFEST, 'heldout_streets.json');

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

/** The committed held-out street split, as a set. Null when the file is
 *  missing — the caller decides whether that is a problem (the CLI refuses
 *  it loudly). */
export function loadHeldOutStreets(file = HELDOUT_STREETS_FILE) {
  if (!existsSync(file)) return null;
  const document = JSON.parse(readFileSync(file, 'utf8'));
  return new Set(Array.isArray(document.streets) ? document.streets : []);
}

function readJsonlFrom(dir, name, problems) {
  const file = join(dir, name);
  if (!existsSync(file)) {
    problems.push(`missing file: ${file}`);
    return [];
  }
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

/**
 * Every problem of one manifest dir. `heldOutOnly` selects the held-out
 * manifest's rules (purity: only held-out streets, tagged held_out); the main
 * manifest's rules add the refusal of held-out streets and the count floors.
 * Returns the problems; the counts ride on the returned object for the log.
 */
export function collectProblems({ manifestDir, heldOutStreets, heldOutOnly = false }) {
  const problems = [];
  const scripts = readJsonlFrom(manifestDir, 'scripts.jsonl', problems);
  const utterances = readJsonlFrom(manifestDir, 'utterances.jsonl', problems);
  const addresses = readJsonlFrom(manifestDir, 'addresses.jsonl', problems);

  const addressIds = new Set(addresses.map((address) => address.id));
  const streetOfAddress = new Map(addresses.map((address) => [address.id, address.street]));

  if (!heldOutOnly) {
    if (scripts.length < 500) {
      problems.push(`the set needs 500 scripts at least, it has ${scripts.length}`);
    }
    if (addresses.length < 100) {
      problems.push(`the address bank needs 100 addresses at least, it has ${addresses.length}`);
    }
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

  if (!heldOutOnly) {
    for (const slice of SLICES) {
      const count = scripts.filter((script) => script.slice === slice.id).length;
      if (count < slice.min) {
        problems.push(`the slice ${slice.id} needs ${slice.min} scripts, it has ${count}`);
      }
    }
  }

  const scriptIds = new Set(scripts.map((script) => script.id));
  for (const utterance of utterances) {
    if (!scriptIds.has(utterance.script_id)) {
      problems.push(`${utterance.id}: the script ${utterance.script_id} is not in the bank`);
    }
  }

  // The held-out street split, both directions, naming the row:
  if (heldOutStreets) {
    for (const address of addresses) {
      const isHeldOutStreet = heldOutStreets.has(address.street);
      if (heldOutOnly) {
        if (!isHeldOutStreet) {
          problems.push(
            `${address.id}: the address is on "${address.street}", which is NOT a held-out street, ` +
              'but it is in the held-out manifest — the held-out manifest may contain only held-out streets',
          );
        }
        if (address.held_out !== true) {
          problems.push(
            `${address.id}: a held-out address must carry held_out: true (street "${address.street}")`,
          );
        }
      } else {
        if (isHeldOutStreet) {
          problems.push(
            `${address.id}: the address is on the held-out street "${address.street}" but is in the MAIN manifest — ` +
              'the default build excludes held-out streets (scripts/eval/build-voice-eval.mjs)',
          );
        }
        if (address.held_out === true) {
          problems.push(
            `${address.id}: held_out: true in the MAIN manifest — held-out rows belong to manifest/heldout/`,
          );
        }
      }
    }
    for (const script of scripts) {
      const street = streetOfAddress.get(script.address_id);
      const isHeldOutStreet = street !== undefined && heldOutStreets.has(street);
      if (heldOutOnly) {
        if (script.held_out !== true) {
          problems.push(`${script.id}: a held-out script must carry held_out: true`);
        }
        if (street !== undefined && !isHeldOutStreet) {
          problems.push(
            `${script.id}: its address ${script.address_id} is on "${street}", which is NOT a held-out street, ` +
              'but the script is in the held-out manifest',
          );
        }
      } else {
        if (script.held_out === true) {
          problems.push(
            `${script.id}: held_out: true in the MAIN manifest — held-out rows belong to manifest/heldout/`,
          );
        }
        if (isHeldOutStreet) {
          problems.push(
            `${script.id}: its address ${script.address_id} is on the held-out street "${street}" but the script is in the MAIN manifest`,
          );
        }
      }
    }
  }

  // The shift simulations: the scripted full shifts, with the voice and the noise.
  // They live in the main manifest (the held-out manifest has none).
  if (!heldOutOnly) {
    const SIMULATIONS = 'shift_sims.json';
    const simulations = [];
    if (!existsSync(join(manifestDir, SIMULATIONS))) {
      problems.push(`missing file: ${join(manifestDir, SIMULATIONS)}`);
    } else {
      const document = JSON.parse(readFileSync(join(manifestDir, SIMULATIONS), 'utf8'));
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
            problems.push(
              `${simulation.id}: the simulation needs 5 turns at least, it has ${turns.length}`,
            );
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

  if (!heldOutOnly) {
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
        problems.push(
          `${slice.id}: ${planned - (built.get(slice.id) ?? 0)} utterances are not built yet`,
        );
      }
    }
  }

  return {
    problems,
    scripts: scripts.length,
    utterances: utterances.length,
    built: utterances.filter((utterance) => utterance.status === 'built').length,
    addresses: addresses.length,
  };
}

export function main(argv = process.argv.slice(2)) {
  const heldOutOnly = argv.includes('--heldout');
  const heldOutStreets = loadHeldOutStreets();
  const problems = [];

  if (!heldOutStreets) {
    problems.push(
      `missing file: ${HELDOUT_STREETS_FILE} (the held-out street split; build it with scripts/eval/build-heldout-streets.mjs)`,
    );
  }

  let report;
  if (heldOutOnly) {
    report = collectProblems({ manifestDir: HELDOUT_MANIFEST, heldOutStreets, heldOutOnly: true });
    problems.push(...report.problems);
  } else {
    if (!existsSync(MAIN_MANIFEST)) {
      console.error(`the manifest is missing: ${MAIN_MANIFEST}`);
      process.exit(1);
    }
    report = collectProblems({ manifestDir: MAIN_MANIFEST, heldOutStreets, heldOutOnly: false });
    problems.push(...report.problems);
    // The held-out manifest, when it is committed: it must contain ONLY
    // held-out streets, tagged held_out (checked above, both directions).
    if (existsSync(join(HELDOUT_MANIFEST, 'addresses.jsonl'))) {
      const heldOutReport = collectProblems({
        manifestDir: HELDOUT_MANIFEST,
        heldOutStreets,
        heldOutOnly: true,
      });
      problems.push(...heldOutReport.problems);
      report = {
        ...report,
        heldOut: heldOutReport,
      };
    }
  }

  if (problems.length > 0) {
    console.error(`the voice evaluation set is broken (${problems.length} problems):`);
    for (const problem of problems.slice(0, 20)) {
      console.error(`- ${problem}`);
    }
    process.exit(1);
  }

  const heldOutNote = report.heldOut
    ? `, the held-out manifest is sound too (${report.heldOut.scripts} scripts on held-out streets only)`
    : '';
  console.log(
    `the voice evaluation set is sound: ${report.scripts} scripts, ${report.utterances} planned files (${report.built} built from open data), ${report.addresses} addresses${heldOutNote}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
