#!/usr/bin/env node
// Builds the scale set: >=100 seeded, simulated full shifts, one JSON object per
// line, in the shape the app's own run store reads a day in (the contract's
// `RunResponse` and `StopResponse`, the courier's own words for the reasons and
// the notes). The founder directive 2026-11-10 item 5 asks for the shifts to be
// DETERMINISTIC: the seed is in the manifest, the same seed rebuilds the same
// bytes, and the harness (apps/mobile/src/run/__tests__/scaleShifts.test.ts)
// drives every one of them through the app's own store and service path.
//
//   node scripts/eval/build-scale-shifts.mjs [--shifts 120] [--out <dir>]
//
// The generator is a mulberry32 PRNG whose step sequence is fixed by the seed,
// the way the routing set's instances are (scripts/eval/build-routing-eval.mjs),
// so a rebuild of the same seed is byte-identical. What each simulated shift
// carries, and why each part is there:
//
//   the run      - one depot, one round trip (the finish is the depot, ADR-022),
//                  the run's own break window (queue 4d).
//   the stops    - real Canterbury addresses drawn from the committed routing
//                  pool (LINZ layer 123113, CC BY 4.0), one area per shift, in
//                  the seeded drive order.
//   the plan     - ONE outcome per stop: delivered, failed (with the reason the
//                  server refuses to be without, and the courier's own words),
//                  skipped, or left pending. A stop with no outcome or two of
//                  them is a shift that cannot be driven, so the generator
//                  refuses to write one.
//   the pods     - which delivered stops carry a proof photo (ADR-010): every
//                  shift carries at least one.
//   the notes    - the courier's own note words, the shape the voice command
//                  `add_location_note` carries.
//   the commands - the spoken break and finish of the shift
//                  (`start_break` / `end_break` / `end_shift`), the words the
//                  app's own parser is asserted against.
//
// Nothing here needs the network or the git-ignored data/ folder: the address
// pool is the committed routing pool, and the committed set needs nothing else.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

/** The seed of the whole set: one number, recorded in the manifest. */
const SEED = 20261111;

/** The directory the set is written to, and the one it is read from. */
const OUT = flag('--out', join(REPO, 'packages', 'eval', 'scale'));

/** How many full shifts the set carries (the directive's floor is 100). */
const SHIFTS = Number(flag('--shifts', '120'));

/** The committed routing pool: real Canterbury addresses with their geometry. */
const POOL = flag('--pool', join(REPO, 'packages', 'eval', 'routing', 'manifest', 'pool.json'));

/**
 * mulberry32: the same PRNG the routing set and the voice set use, so the seed
 * means the same thing in every set this repo commits.
 */
function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** The reasons the server refuses a `failed` event without (ADR-023's own). */
const FAILURE_REASONS = [
  'no one home',
  'not at address',
  'refused',
  'damaged',
  'wrong address',
  'access denied',
  'customer cancelled',
];

/** The courier's own words for the same reasons: the utterance rides the event. */
const FAILURE_UTTERANCES = [
  'no one home at the door',
  'nobody here',
  'they refused the parcel',
  'the box is crushed',
  'that is the wrong address',
  'the gate is locked',
  'they cancelled it this morning',
];

/** The notes a courier speaks at a stop (ADR-023's note shape). */
const NOTES = [
  'side gate',
  'gate code 4412',
  'leave with the neighbour',
  'beware of the dog',
  'the parcel goes in the shed',
  'knock twice, they are hard of hearing',
];

/** The words the app's own parser has to hear for a break and for the finish. */
const BREAK_WORDS = ['ten', 'fifteen', 'twenty', 'thirty', 'fortyfive'];
const BACK_WORDS = ['back on the road', 'back on my run'];
/** The words a courier ends a shift in (the app's own `end (my) shift`). */
const FINISH_WORDS = ['end shift', 'end my shift'];

/** The names a seeded day is given: one word per shift, deterministic. */
const RUN_NAMES = [
  'Northwood AM',
  'Riccarton midday',
  'Hornby loop',
  'Linwood run',
  'Rolleston split',
  'Kaiapoi round',
  'Bishopdale sweep',
  'Selwyn long haul',
];

/** One stop of a seeded shift, in the contract's own shape. */
function aStop(random, index, address, at) {
  const type = random() < 0.08 ? 'pickup' : 'delivery';
  const windowed = random() < 0.2;
  return {
    id: `scale-${String(at).padStart(3, '0')}-s${String(index).padStart(3, '0')}`,
    location_id: `scale-loc-${String(at).padStart(3, '0')}-${String(index).padStart(3, '0')}`,
    type,
    address: address.address,
    seq: index + 1,
    status: 'pending',
    lat: address.lat,
    lon: address.lon,
    priority: random() < 0.15,
    parcels: 1 + Math.floor(random() * 4),
    ...(windowed
      ? {
          window_start: '2026-11-11T09:00:00.000Z',
          window_end: '2026-11-11T17:00:00.000Z',
        }
      : {}),
    linz_address_id: address.linz_address_id,
  };
}

/** The one outcome the courier works towards at one stop. */
function anOutcome(random) {
  const draw = random();
  if (draw < 0.62) {
    return { outcome: 'delivered', pod: false };
  }
  if (draw < 0.82) {
    const reason = Math.floor(random() * FAILURE_REASONS.length);
    return {
      outcome: 'failed',
      reason: FAILURE_REASONS[reason],
      utterance: FAILURE_UTTERANCES[reason],
    };
  }
  if (draw < 0.92) {
    return { outcome: 'skipped' };
  }
  return { outcome: 'pending' };
}

/**
 * One seeded full shift: the day, the plan, the pods, the notes and the spoken
 * break and finish, all drawn from the one PRNG's fixed sequence.
 */
function aShift(random, at, pool, area) {
  const stopCount = 8 + Math.floor(random() * 33); // 8..40 stops, a real day
  const areaStops = pool.filter((stop) => stop.area === area);
  const chosen = new Map();
  while (chosen.size < stopCount) {
    const pick = areaStops[Math.floor(random() * areaStops.length)];
    if (pick !== undefined && !chosen.has(pick.i)) {
      chosen.set(pick.i, pick);
    }
  }
  const addresses = [...chosen.values()];
  const stops = addresses.map((address, index) => aStop(random, index, address, at));
  const outcomes = stops.map((stop, index) => ({
    stop_id: stop.id,
    seq: stop.seq,
    outcome: anOutcome(random),
  }));

  // The proof photo: most deliveries carry one, and every shift carries at
  // least one, because a shift with no POD photo is a shift the delivery path
  // never walked.
  const deliveries = outcomes.filter((entry) => entry.outcome.outcome === 'delivered');
  const photoIndexes = new Set(
    deliveries.map((entry, index) => (random() < 0.55 ? index : -1)).filter((index) => index >= 0),
  );
  if (photoIndexes.size === 0 && deliveries.length > 0) {
    photoIndexes.add(Math.floor(random() * deliveries.length));
  }
  let photo = 0;
  for (const entry of deliveries) {
    entry.outcome.pod = photoIndexes.has(photo);
    photo += 1;
  }

  const notes = stops
    .filter(() => random() < 0.25)
    .slice(0, 4)
    .map((stop) => ({
      stop_id: stop.id,
      note: NOTES[Math.floor(random() * NOTES.length)],
    }));

  const breakMinutes = [10, 15, 20, 30, 45][Math.floor(random() * 5)];
  const depot = poolDepot(pool, area);
  const breakStart = `2026-11-11T1${Math.floor(random() * 2)}:${String(
    10 + Math.floor(random() * 40),
  ).padStart(2, '0')}:00.000Z`;

  return {
    shift_id: `scale-shift-${String(at).padStart(3, '0')}`,
    run_id: `scale-run-${String(at).padStart(3, '0')}`,
    name: RUN_NAMES[at % RUN_NAMES.length],
    area,
    depot,
    start_at: '2026-11-11T06:00:00.000Z',
    break_window: {
      start: breakStart,
      end: '2026-11-11T13:00:00.000Z',
      minutes: breakMinutes,
    },
    finish: { lat: depot.lat, lon: depot.lon },
    stops,
    plan: outcomes,
    notes,
    commands: [
      {
        text: `taking a ${BREAK_WORDS[Math.floor(random() * BREAK_WORDS.length)]} minute break`,
        kind: 'start_break',
      },
      { text: BACK_WORDS[Math.floor(random() * BACK_WORDS.length)], kind: 'end_break' },
      { text: FINISH_WORDS[Math.floor(random() * FINISH_WORDS.length)], kind: 'end_shift' },
    ],
  };
}

/** The depot of one area, the way the routing pool records it. */
function poolDepot(pool, area) {
  const found = pool.find((stop) => stop.i === depotIndexOf(pool, area));
  if (found === undefined) {
    throw new Error(`the pool carries no depot for the area ${area}`);
  }
  return { lat: found.lat, lon: found.lon, address: found.address };
}

/** The pool index of one area's depot: the first stop of that area. */
function depotIndexOf(pool, area) {
  const first = pool.find((stop) => stop.area === area);
  if (first === undefined) {
    throw new Error(`the pool carries no address for the area ${area}`);
  }
  return first.i;
}

/** The whole set, and the counts its manifest records. */
export function theSet() {
  const raw = JSON.parse(readFileSync(POOL, 'utf8'));
  const pool = raw.stops.map((stop) => ({ ...stop }));
  const areas = [...new Set(pool.map((stop) => stop.area))].sort();
  const random = mulberry32(SEED);
  const shifts = [];
  for (let at = 1; at <= SHIFTS; at += 1) {
    const area = areas[at % areas.length];
    shifts.push(aShift(random, at, pool, area));
  }
  return { pool, shifts, areas };
}

export { SEED, SHIFTS, POOL, OUT };

/** Every rule a seeded shift has to satisfy, as the reason it is refused. */
export function checkShift(shift, index) {
  const problems = [];
  if (!shift.stops.every((stop, position) => stop.seq === position + 1)) {
    problems.push('the sequences are not the drive order');
  }
  if (new Set(shift.stops.map((stop) => stop.id)).size !== shift.stops.length) {
    problems.push('two stops share one id');
  }
  if (shift.plan.length !== shift.stops.length) {
    problems.push('the plan does not cover the day stop for stop');
  }
  for (const stop of shift.stops) {
    const entries = shift.plan.filter((entry) => entry.stop_id === stop.id);
    if (entries.length !== 1) {
      problems.push(`stop ${stop.id} has ${String(entries.length)} outcomes`);
      continue;
    }
    const outcome = entries[0].outcome;
    if (outcome.outcome === 'failed' && !outcome.reason) {
      problems.push(`stop ${stop.id} failed with no reason`);
    }
  }
  if (
    !shift.stops.some((stop) =>
      shift.plan.some(
        (entry) =>
          entry.stop_id === stop.id && entry.outcome.outcome === 'delivered' && entry.outcome.pod,
      ),
    )
  ) {
    problems.push('the shift carries no proof photo');
  }
  for (const note of shift.notes) {
    if (!shift.stops.some((stop) => stop.id === note.stop_id)) {
      problems.push(`note ${note.note} is about a stop the run does not have`);
    }
  }
  if (shift.commands.filter((command) => command.kind === 'start_break').length !== 1) {
    problems.push('the shift does not start its break exactly once');
  }
  if (shift.commands.filter((command) => command.kind === 'end_shift').length !== 1) {
    problems.push('the shift does not finish exactly once');
  }
  return problems.map((problem) => `shift ${String(index + 1)} (${shift.shift_id}): ${problem}`);
}

function main() {
  const { pool, shifts, areas } = theSet();
  const problems = shifts.flatMap((shift, index) => checkShift(shift, index));
  if (problems.length > 0) {
    for (const problem of problems) {
      process.stderr.write(`the set is refused: ${problem}\n`);
    }
    return 2;
  }

  mkdirSync(OUT, { recursive: true });
  const lines = shifts.map((shift) => JSON.stringify(shift)).join('\n');
  writeFileSync(join(OUT, 'shifts.jsonl'), `${lines}\n`, 'utf8');

  const counts = {
    shifts: shifts.length,
    stops: shifts.reduce((total, shift) => total + shift.stops.length, 0),
    delivered: shifts.reduce(
      (total, shift) =>
        total + shift.plan.filter((entry) => entry.outcome.outcome === 'delivered').length,
      0,
    ),
    failed: shifts.reduce(
      (total, shift) =>
        total + shift.plan.filter((entry) => entry.outcome.outcome === 'failed').length,
      0,
    ),
    skipped: shifts.reduce(
      (total, shift) =>
        total + shift.plan.filter((entry) => entry.outcome.outcome === 'skipped').length,
      0,
    ),
    pending: shifts.reduce(
      (total, shift) =>
        total + shift.plan.filter((entry) => entry.outcome.outcome === 'pending').length,
      0,
    ),
    pods: shifts.reduce(
      (total, shift) =>
        total +
        shift.plan.filter((entry) => entry.outcome.outcome === 'delivered' && entry.outcome.pod)
          .length,
      0,
    ),
    notes: shifts.reduce((total, shift) => total + shift.notes.length, 0),
    commands: shifts.reduce((total, shift) => total + shift.commands.length, 0),
  };
  const manifest = {
    generated_by: 'scripts/eval/build-scale-shifts.mjs',
    seed: SEED,
    generator: 'mulberry32, the same PRNG the routing and voice sets use',
    shifts: counts.shifts,
    counts,
    areas: Object.fromEntries(
      areas.map((area) => [area, shifts.filter((shift) => shift.area === area).length]),
    ),
    pool: {
      file: 'packages/eval/routing/manifest/pool.json',
      sha256: createHash('sha256').update(readFileSync(POOL)).digest('hex'),
      stops: pool.length,
      source: rawSource(POOL),
    },
    licence:
      'the addresses are LINZ Data Service layer 123113 (NZ Addresses), CC BY 4.0, ' +
      'sourced through the committed routing pool; the reasons, the notes and the ' +
      "words are this repository's own",
    harness: 'apps/mobile/src/run/__tests__/scaleShifts.test.ts',
    evidence: 'docs/evidence/scale-tests/README.md',
  };
  writeFileSync(join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 1)}\n`, 'utf8');

  process.stdout.write(
    `the scale set: ${String(counts.shifts)} shifts, ${String(counts.stops)} stops ` +
      `(${String(counts.delivered)} delivered, ${String(counts.failed)} failed, ` +
      `${String(counts.skipped)} skipped, ${String(counts.pending)} left pending, ` +
      `${String(counts.pods)} proof photos, ${String(counts.notes)} notes, ` +
      `${String(counts.commands)} spoken commands), seed ${String(SEED)}\n`,
  );
  return 0;
}

/** The pool's own record of where its addresses came from. */
function rawSource(poolPath) {
  const raw = JSON.parse(readFileSync(poolPath, 'utf8'));
  return raw.source ?? 'unknown';
}

// The library runs only when this file IS the entry point, so a test can import
// the generator's own functions without building a set as a side effect.
const invoked = process.argv[1];
if (invoked !== undefined && resolve(invoked) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
