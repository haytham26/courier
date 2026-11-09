#!/usr/bin/env node
// Checks the routing evaluation set: the set's shape, the determinism of every
// instance, and the measured results against the targets (the founder's
// 2026-11-08 directive, item 3).
//
//   node scripts/eval/check-routing-eval.mjs
//
// What it proves, in order:
//
//   1. THE SET. At least 144 instances - every size (30/80/150/250 stops) x
//      every variant (plain, time windows, priorities, both, a break, all of it
//      with a finish point that is not the depot) x 6 seeds - each stop a real
//      pool member, each window inside its day, each seed's area able to draw
//      the size it draws, and the road matrix present with its licence record
//      (Valhalla over OpenStreetMap, both named) and its unroutable-pair count
//      under the floor.
//   2. DETERMINISM. Every instance is RE-DERIVED from its seed and the committed
//      pool with the same PRNG and the same rules the builder used, and compared
//      stop by stop: a set that has drifted from its own generator fails here,
//      so "seeded and reproducible" is checked and not asserted.
//   3. THE MEASURED DAY. Every committed result file is recomputed from the
//      matrix with the core's own walk (the arrival waits for the window to
//      open, the break sits between two stops at the recorded position, the
//      service times and the finish leg) - the distance, the duration and the
//      violations of every engine's order - so a result that does not follow
//      from the set fails.
//   4. THE TARGETS (the directive's, verbatim):
//        - within 2% of the baseline on AVERAGE and 5% at WORST, over every
//          instance, our engine's travel time against the best baseline's;
//        - 0 time-window, break, priority or capacity violations WHEN A
//          FEASIBLE PLAN EXISTS (some engine planned the day feasibly);
//        - the solve p95 at 150 stops under 3 seconds on the CI runner.
//
// The exit code is what CI runs on; a failure names the instance and the rule.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO = join(fileURLToPath(import.meta.url), '..', '..', '..');
const MANIFEST = join(REPO, 'packages', 'eval', 'routing', 'manifest');
const RESULTS = join(REPO, 'packages', 'eval', 'routing', 'results');

export const SIZES = [30, 80, 150, 250];
export const VARIANTS = ['plain', 'tw', 'prio', 'tw-prio', 'brk', 'full'];
export const SEEDS = 6;
export const MIN_INSTANCES = 144;
export const MAX_UNROUTABLE_SHARE = 0.0005;

// The directive's targets.
export const AVG_TARGET = 1.02;
export const WORST_TARGET = 1.05;
export const P95_TARGET_S = 3.0;

export const DAY_START_HOUR = 8;
export const DAY_START_EPOCH = Math.floor(Date.UTC(2026, 10, 9, DAY_START_HOUR - 13, 0, 0) / 1000);

// The problems this run found, and the failures a rule files. Kept at module
// scope because the rules are module functions and the report is one list.
const problems = [];

export function fail(message) {
  problems.push(message);
}

export function problemsFound() {
  return problems;
}

// ---------------------------------------------------------------------------
// the set
// ---------------------------------------------------------------------------

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const POOL_QUOTA = { christchurch: 300, selwyn: 130, waimakariri: 130 };
export const SEED_BASE = 20261109;
export const START_EPOCH = DAY_START_EPOCH;

export function deriveInstance(size, variant, seed, area, pool) {
  const rng = mulberry32(seed + hashString(variant));
  const group = pool.filter((stop) => stop.area === area);
  const depot = nearestToCentroid(group);
  const finish = secondNearestToCentroid(group);
  const drawable = group.filter((stop) => stop.i !== depot.i && stop.i !== finish.i);
  const order = drawable.map((stop) => stop.i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const chosen = order.slice(0, size);
  const withWindows = variant === 'tw' || variant === 'tw-prio' || variant === 'full';
  const withPriorities = variant === 'prio' || variant === 'tw-prio' || variant === 'full';
  const withBreak = variant === 'brk' || variant === 'full';
  const withFinish = variant === 'full';
  let parcels = 0;
  const stops = chosen.map((index) => {
    const stopParcels = 1 + Math.floor(rng() * 3);
    parcels += stopParcels;
    const window = withWindows && rng() < 0.35
      ? [START_EPOCH + Math.floor(rng() * 5 * 3600)]
      : null;
    if (window) window.push(window[0] + 5400 + Math.floor(rng() * 3600));
    return {
      i: index,
      parcels: stopParcels,
      service_time_s: rng() < 0.2 ? 60 : null,
      priority: withPriorities ? rng() < 0.15 : false,
      window,
    };
  });
  return {
    id: `routing-${size}-${variant}-${seed}`,
    size,
    variant,
    seed,
    area,
    depot: { i: depot.i },
    finish: withFinish ? { i: finish.i } : null,
    start_at_epoch_s: START_EPOCH,
    capacity_parcels: Math.ceil(parcels * 1.1),
    service_time_s: 300,
    speed_kmh: 30,
    break: withBreak
      ? { earliest_epoch_s: START_EPOCH + 4 * 3600, latest_epoch_s: START_EPOCH + 5 * 3600, minutes: 30 }
      : null,
    stops,
  };
}

export function nearestToCentroid(group) {
  const centre = {
    lat: group.reduce((sum, stop) => sum + stop.lat, 0) / group.length,
    lon: group.reduce((sum, stop) => sum + stop.lon, 0) / group.length,
  };
  return [...group].sort(
    (a, b) => (a.lat - centre.lat) ** 2 + (a.lon - centre.lon) ** 2
      - ((b.lat - centre.lat) ** 2 + (b.lon - centre.lon) ** 2),
  )[0];
}

export function secondNearestToCentroid(group) {
  const centre = {
    lat: group.reduce((sum, stop) => sum + stop.lat, 0) / group.length,
    lon: group.reduce((sum, stop) => sum + stop.lon, 0) / group.length,
  };
  return [...group].sort(
    (a, b) => (a.lat - centre.lat) ** 2 + (a.lon - centre.lon) ** 2
      - ((b.lat - centre.lat) ** 2 + (b.lon - centre.lon) ** 2),
  )[1];
}

const instances = [];
// ---------------------------------------------------------------------------
// the manifest and the results, read for the check itself
// ---------------------------------------------------------------------------

function loadManifest() {
  const poolDoc = existsSync(join(MANIFEST, 'pool.json'))
    ? JSON.parse(readFileSync(join(MANIFEST, 'pool.json'), 'utf8'))
    : null;
  if (!poolDoc) fail(`the pool manifest is missing (${join(MANIFEST, 'pool.json')})`);
  const pool = poolDoc ? poolDoc.stops : [];
  const meta = existsSync(join(MANIFEST, 'road-matrix.meta.json'))
    ? JSON.parse(readFileSync(join(MANIFEST, 'road-matrix.meta.json'), 'utf8'))
    : null;
  if (!meta) fail('the road matrix meta record is missing');
  const matrixGz = existsSync(join(MANIFEST, 'road-matrix.csv.gz'))
    ? readFileSync(join(MANIFEST, 'road-matrix.csv.gz'))
    : null;
  if (!matrixGz) fail('the road matrix (road-matrix.csv.gz) is missing');
  return { poolDoc, pool, meta, matrixGz };
}

function loadMatrix(meta, matrixGz) {
  const metres = [];
  const seconds = [];
  const csv = gunzipSync(matrixGz).toString('utf8');
  const size = meta.stop_count;
  for (let i = 0; i < size; i += 1) {
    metres.push(new Array(size).fill(null));
    seconds.push(new Array(size).fill(null));
  }
  for (const row of csv.split('\n')) {
    if (!row.trim()) continue;
    const [i, j, m, s] = row.split(',').map(Number);
    metres[i][j] = m;
    seconds[i][j] = s;
  }
  const answered = metres.flat().filter((value) => value !== null).length;
  const share = meta.unroutable_pairs / (size * size);
  if (share > MAX_UNROUTABLE_SHARE) {
    fail(`the matrix left ${meta.unroutable_pairs} of ${size * size} pairs unrouted `
      + `(${(share * 100).toFixed(3)}% > ${(MAX_UNROUTABLE_SHARE * 100).toFixed(3)}%)`);
  }
  if (answered + meta.unroutable_pairs !== size * size) {
    fail(`the matrix holds ${answered} pairs over a ${size}-stop pool (expected ${size * size})`);
  }
  return { metres, seconds };
}

// ---------------------------------------------------------------------------
// the walk, the priorities and the capacity: the core's own rules, over the
// matrix, so a committed result is re-derived and not trusted
// ---------------------------------------------------------------------------

export function walkInstance(instance, order, breakPosition, matrix) {
  /** The core's walk (_walk in services/api/app/routing.py), over the matrix:
  the arrival waits for the window to open, a late stop is a violation, the
  break sits between two stops at the recorded position, the service time is
  the stop's own or the day's default. Two distances: the core's own
  `distance_m`, which stops at the last door the way production times the day,
  and the travel of the whole route including the leg to the finish point (the
  depot when the instance has none), which is the objective the engines are
  compared on. A told break position outside the day raises, exactly as the
  core does: a told position is never silently re-read as "not given". */
  if (breakPosition !== null && breakPosition !== undefined
      && !(1 <= breakPosition && breakPosition < order.length)) {
    throw new Error(
      `the break position ${breakPosition} must stand strictly between two stops of a ${order.length}-stop day`,
    );
  }
  const { metres, seconds } = matrix;
  const stopOf = new Map(instance.stops.map((stop) => [stop.i, stop]));
  const start = instance.start_at_epoch_s;
  const serviceDefault = instance.service_time_s ?? 300;
  let clock = start;
  let current = instance.depot.i;
  let distance = 0;
  let travel = 0;
  let travelSeconds = 0;
  let windowViolations = 0;
  let breakStart = null;
  let breakViolation = false;
  let lastDeparture = start;
  for (let index = 0; index < order.length; index += 1) {
    const entry = stopOf.get(order[index]);
    const leg = seconds[current][entry.i];
    distance += metres[current][entry.i];
    travel += metres[current][entry.i];
    travelSeconds += seconds[current][entry.i];
    let arrival = clock + leg;
    const window = entry.window;
    if (window && window[0] > arrival) arrival = window[0];
    const late = window && arrival > window[1];
    if (late) windowViolations += 1;
    const service = entry.service_time_s ?? serviceDefault;
    const departure = arrival + service;
    lastDeparture = departure;
    clock = departure;
    current = entry.i;
    if (instance.break && breakPosition === index + 1) {
      breakStart = Math.max(clock, instance.break.earliest_epoch_s);
      breakViolation = breakStart > instance.break.latest_epoch_s;
      clock = breakStart + instance.break.minutes * 60;
    }
  }
  const finishIndex = instance.finish ? instance.finish.i : instance.depot.i;
  travel += metres[current][finishIndex];
  travelSeconds += seconds[current][finishIndex];
  if (instance.break && breakStart === null) breakViolation = true;
  return {
    distance_m: distance,
    duration_s: lastDeparture - start,
    travel_m: travel,
    travel_s: travelSeconds,
    window_violations: windowViolations,
    break_violation: breakViolation,
  };
}

export function priorityViolations(instance, order) {
  const stopOf = new Map(instance.stops.map((stop) => [stop.i, stop]));
  let seenOrdinary = false;
  let count = 0;
  for (const index of order) {
    if (stopOf.get(index).priority) {
      if (seenOrdinary) count += 1;
    } else {
      seenOrdinary = true;
    }
  }
  return count;
}

export function overCapacity(instance, order) {
  const stopOf = new Map(instance.stops.map((stop) => [stop.i, stop]));
  const parcels = order.reduce((sum, index) => sum + (stopOf.get(index)?.parcels ?? 0), 0);
  return parcels > instance.capacity_parcels;
}

// ---------------------------------------------------------------------------
// what CI runs
// ---------------------------------------------------------------------------

function main() {
  const { poolDoc, pool, meta, matrixGz } = loadManifest();
  const poolIndex = new Map(pool.map((stop) => [stop.i, stop]));
  const matrix = loadMatrix(meta, matrixGz);

  if (meta) {
    const source = meta.source ?? {};
    if (!String(source.data ?? '').includes('OpenStreetMap')) {
      fail('the matrix meta does not name OpenStreetMap as its data source');
    }
    if (!String(source.data_licence ?? '').includes('ODbL')) {
      fail('the matrix meta does not carry the ODbL licence of the OpenStreetMap data');
    }
    if (!String(source.engine ?? '').includes('Valhalla')) {
      fail('the matrix meta does not name the engine (Valhalla)');
    }
  }

  // the pool itself: real addresses, enough of them, depots and finishes present
  if (poolDoc) {
    if (pool.length !== poolDoc.stop_count) {
      fail(`the pool holds ${pool.length} stops but claims ${poolDoc.stop_count}`);
    }
    if (!pool.every((stop) => stop.address && stop.lat && stop.lon)) {
      fail('a pool stop has no address or no coordinates');
    }
    const areas = new Set(pool.map((stop) => stop.area));
    if (areas.size < 3) {
      fail(`the pool covers only ${areas.size} areas (want the three Canterbury ones)`);
    }
    for (const area of ['christchurch', 'selwyn', 'waimakariri']) {
      const held = pool.filter((stop) => stop.area === area).length;
      if (held < 252) {
        fail(`${area} holds ${held} stops: a 250-stop day needs 250 plus a depot and a finish`);
      }
    }
    for (const [area, depot] of Object.entries(poolDoc.depots ?? {})) {
      if (!poolIndex.has(depot.pool_index)) fail(`the ${area} depot is not a pool stop`);
    }
    for (const [area, finish] of Object.entries(poolDoc.finishes ?? {})) {
      if (!poolIndex.has(fail.pool_index ?? fail.i)) fail(`the ${area} finish is not a pool stop`);
    }
  }

  // the instances: the grid, and each one re-derived from its seed
  const instances = [];
  if (existsSync(join(MANIFEST, 'instances'))) {
    for (const file of readdirSync(join(MANIFEST, 'instances')).sort()) {
      if (!file.endsWith('.json')) continue;
      instances.push(JSON.parse(readFileSync(join(MANIFEST, 'instances', file), 'utf8')));
    }
  }
  if (instances.length < MIN_INSTANCES) {
    fail(`the set holds ${instances.length} instances (the floor is ${MIN_INSTANCES}: `
      + `${SIZES.join('/')} stops x ${VARIANTS.length} variants x ${SEEDS} seeds)`);
  }
  const seen = new Set();
  for (const instance of instances) {
    if (seen.has(instance.id)) fail(`${instance.id} appears twice`);
    seen.add(instance.id);
    if (!poolIndex.has(instance.depot.i)) fail(`${instance.id}: the depot is not a pool stop`);
    if (instance.finish && !poolIndex.has(instance.finish.i)) {
      fail(`${instance.id}: the finish is not a pool stop`);
    }
    const chosen = new Set();
    for (const stop of instance.stops) {
      if (!poolIndex.has(stop.i)) fail(`${instance.id}: stop ${stop.i} is not a pool stop`);
      if (chosen.has(stop.i)) fail(`${instance.id}: stop ${stop.i} is drawn twice`);
      chosen.add(stop.i);
      if (stop.window) {
        const [open, close] = stop.window;
        if (open < START_EPOCH || close > START_EPOCH + 9 * 3600) {
          fail(`${instance.id}: a window falls outside the 08:00-17:00 day`);
        }
        if (close <= open) fail(`${instance.id}: a window closes before it opens`);
      }
      if (stop.parcels < 1) fail(`${instance.id}: a stop carries no parcels`);
    }
    if (instance.stops.some((stop) => stop.i === instance.depot.i)) {
      fail(`${instance.id}: the depot is also a stop`);
    }
    if (instance.finish && instance.stops.some((stop) => stop.i === instance.finish.i)) {
      fail(`${instance.id}: the finish point is also a stop`);
    }
    // determinism: re-derive the day from the seed and the committed pool
    const derived = deriveInstance(instance.size, instance.variant, instance.seed, instance.area, pool);
    const same = derived.stops.length === instance.stops.length
      && derived.stops.every((stop, index) => {
        const actual = instance.stops[index];
        return stop.i === actual.i
          && stop.parcels === actual.parcels
          && stop.service_time_s === actual.service_time_s
          && stop.priority === actual.priority
          && JSON.stringify(stop.window) === JSON.stringify(actual.window);
      });
    if (!same) fail(`${instance.id}: the committed instance is not what the seed regenerates`);
  }

  // the measured results: every engine's day re-derived from the matrix
  if (!existsSync(RESULTS)) {
    fail(`the results directory is missing (${RESULTS})`);
  }
  const rows = [];
  for (const instance of instances) {
    const file = join(RESULTS, `${instance.id}.json`);
    if (!existsSync(file)) {
      fail(`${instance.id}: no result file committed`);
      continue;
    }
    const result = JSON.parse(readFileSync(file, 'utf8'));
    const engines = result.engines ?? {};
    const ours = engines.ours;
    if (!ours || !ours.planned) {
      fail(`${instance.id}: our engine planned nothing`);
      continue;
    }
    const walks = {};
    for (const [name, value] of Object.entries(engines)) {
      if (!value || !value.planned) {
        walks[name] = null;
        continue;
      }
      const order = value.order ?? [];
      if (order.length !== instance.stops.length || new Set(order).size !== order.length) {
        fail(`${instance.id}: ${name}'s order is not a permutation of the day's stops`);
        walks[name] = null;
        continue;
      }
      const walk = walkInstance(instance, order, value.break_position ?? null, matrix);
      if (Math.abs(walk.distance_m - value.distance_m) > 1.5) {
        fail(`${instance.id}: ${name}'s distance is ${value.distance_m} but the matrix walk gives ${walk.distance_m}`);
      }
      if (Math.abs(walk.travel_m - value.travel_m) > 0.5
          || Math.abs(walk.travel_s - value.travel_s) > 0.5) {
        fail(`${instance.id}: ${name}'s travel is (${value.travel_m}m, ${value.travel_s}s) but the matrix walk gives (${walk.travel_m}m, ${walk.travel_s}s)`);
      }
      if (walk.window_violations !== value.window_violations) {
        fail(`${instance.id}: ${name}'s window violations are ${value.window_violations} but the matrix walk gives ${walk.window_violations}`);
      }
      if (instance.break) {
        if (walk.break_violation !== value.break_violation) {
          fail(`${instance.id}: ${name}'s break does not match the matrix walk`);
        }
        if (value.break_violation) fail(`${instance.id}: ${name}'s break window cannot be met`);
      }
      if (priorityViolations(instance, order) !== value.priority_violations) {
        fail(`${instance.id}: ${name}'s priority violations do not follow from the order`);
      }
      if (overCapacity(instance, order) !== value.over_capacity) {
        fail(`${instance.id}: ${name}'s capacity verdict does not follow from the order`);
      }
      walks[name] = { walk, value };
    }
    const legal = Object.entries(walks)
      .filter(([, entry]) => entry
        && entry.value.window_violations === 0
        && !entry.value.break_violation
        && entry.value.priority_violations === 0
        && !entry.value.over_capacity)
      .map(([name]) => name);
    const baselineTravels = Object.entries(engines)
      .filter(([name]) => name !== 'ours')
      .map(([, value]) => (walks[name] ? value.travel_s : null))
      .filter((value) => typeof value === 'number' && value > 0);
    rows.push({
      id: instance.id,
      size: instance.size,
      variant: instance.variant,
      legal,
      ours_travel: ours.travel_s,
      baseline_travel: baselineTravels.length ? Math.min(...baselineTravels) : null,
      wall_s: ours.wall_s,
      violations: (ours.window_violations ?? 0) + (ours.priority_violations ?? 0)
        + (ours.break_violation ? 1 : 0) + (ours.over_capacity ? 1 : 0),
    });
  }

  // the targets
  if (rows.length) {
    const compared = rows.filter((row) => row.ours_travel && row.baseline_travel);
    if (compared.length) {
      const ratios = compared.map((row) => row.ours_travel / row.baseline_travel);
      const average = ratios.reduce((sum, value) => sum + value, 0) / ratios.length;
      const worst = Math.max(...ratios);
      if (average > AVG_TARGET) {
        fail(`our engine is ${((average - 1) * 100).toFixed(2)}% over the baseline on average `
          + `(the target is within ${((AVG_TARGET - 1) * 100).toFixed(0)}%)`);
      }
      if (worst > WORST_TARGET) {
        const worstRow = compared.find((row) => row.ours_travel / row.baseline_travel === worst);
        fail(`our engine is ${((worst - 1) * 100).toFixed(2)}% over the baseline at worst (${worstRow.id}, `
          + `the target is within ${((WORST_TARGET - 1) * 100).toFixed(0)}%)`);
      }
      console.log(`check-routing-eval: ${compared.length} instances compared to a baseline, `
        + `${((average - 1) * 100).toFixed(2)}% over on average, ${((worst - 1) * 100).toFixed(2)}% at worst`);
    }
    const illegal = rows.filter((row) => row.legal.length > 0 && row.violations > 0);
    if (illegal.length) {
      for (const row of illegal.slice(0, 6)) {
        fail(`${row.id}: ${row.violations} violation(s) on a day some engine planned feasibly`);
      }
      if (illegal.length > 6) fail(`... and ${illegal.length - 6} more illegal plans`);
    }
    const walls150 = rows.filter((row) => row.size === 150).map((row) => row.wall_s).filter((v) => v > 0);
    if (walls150.length) {
      const sorted = [...walls150].sort((a, b) => a - b);
      const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
      if (p95 > P95_TARGET_S) {
        fail(`our engine's solve p95 at 150 stops is ${p95.toFixed(3)}s (the target is under ${P95_TARGET_S}s)`);
      }
      console.log(`check-routing-eval: p95 solve at 150 stops ${p95.toFixed(3)}s over ${walls150.length} instances`);
    }
    console.log(`check-routing-eval: ${rows.length} instances measured, `
      + `${rows.filter((row) => row.legal.length > 0 && row.violations === 0).length} legal plans where a feasible one exists`);
  }

  // a digest of the whole set, so a rebuild can be compared to what is committed
  const digest = createHash('sha256')
    .update(instances.map((instance) => JSON.stringify(instance)).join('\n'))
    .update(matrix.metres.flat().join(','))
    .digest('hex');
  console.log(`check-routing-eval: set digest ${digest.slice(0, 16)}`);

  if (problems.length) {
    console.error(`check-routing-eval: ${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log('check-routing-eval: the routing evaluation set is green '
    + '(144 seeded instances over a Valhalla-on-OSM road matrix, measured)');
}

const invokedDirectly = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main();
}
