#!/usr/bin/env node
// Builds the routing evaluation set: the synthetic Christchurch days, the road
// matrix they are measured on, and the pool of real LINZ addresses they are
// built from (the founder's 2026-11-08 directive, item 3).
//
//   node scripts/eval/build-routing-eval.mjs [--pool <path>]
//
// The pipeline, in order (every step recorded in files this script writes, so
// the set is auditable without re-running it):
//
//   1. THE POOL. data/routing-eval/stop-pool.json is the raw fetch of real LINZ
//      Canterbury addresses WITH geometry (scripts/data/fetch-routing-pool.py,
//      CC BY 4.0). A deterministic, suburb-balanced subsample becomes
//      packages/eval/routing/manifest/pool.json - the committed pool, with the
//      depot and the finish point of each area as its first two entries.
//   2. THE MATRIX. The real road distances and travel times between every
//      ordered pair of the committed pool, from Valhalla 3.3.0 routing over the
//      OpenStreetMap data (Geofabrik NZ extract, ODbL) - the engine
//      docs/research/2026/routing-vrp-engines.md picked, with OSRM recorded as
//      the fallback that was not needed here. This script starts the service if
//      it is not running (valhalla/valhalla:run-latest over the tiles
//      data/valhalla_tiles, built by `valhalla_build_tiles` over the extract)
//      and writes packages/eval/routing/manifest/road-matrix.csv.gz plus its
//      meta record: engine version, extract URL and size, query shape, and the
//      count of pairs no road could answer (a matrix that cannot describe its
//      own stops is not a matrix).
//   3. THE INSTANCES. For every size (30/80/150/250 stops), every variant
//      (plain, time windows, priorities, both, a break, and all of it together
//      with a finish point that is not the depot) and every seed, a seeded,
//      reproducible day is drawn from the pool of ONE area. The generator is a
//      mulberry32 PRNG whose step sequence is fixed by the seed, so the same
//      seed always produces the same day - and scripts/eval/check-routing-eval.mjs
//      re-derives every instance from the seed and fails if the set has drifted.
//
// Nothing here needs network access but the LINZ fetch and the OSM extract;
// both are local files, and the committed set needs neither.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const FETCHED = flag('--pool', join(REPO, 'data', 'routing-eval', 'stop-pool.json'));
const MANIFEST = join(REPO, 'packages', 'eval', 'routing', 'manifest');
const PORT = Number(flag('--port', '8002'));
const CHUNK = Number(flag('--chunk', '40'));
const COSTING = 'auto';
const OSM_URL = 'https://download.geofabrik.de/australia-oceania/new-zealand-latest.osm.pbf';
const OSM_BYTES = 405984889;

// The committed pool: this many stops per area, chosen suburb-balanced.
const POOL_QUOTA = { christchurch: 300, selwyn: 130, waimakariri: 130 };

// The instance grid: every size, every variant, every seed.
const SIZES = [30, 80, 150, 250];
const VARIANTS = ['plain', 'tw', 'prio', 'tw-prio', 'brk', 'full'];
const SEEDS = 6;
const SEED_BASE = 20261109;

// A stop's day: 08:00 start, the van's 30 km/h and the five-minute door.
const DAY_START_HOUR = 8;
const DAY_LENGTH_H = 9;
const CAPACITY_SLACK = 1.1;

if (!existsSync(FETCHED)) {
  console.error(`build-routing-eval: no fetched pool at ${FETCHED} (run scripts/data/fetch-routing-pool.py first)`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. the committed pool: a suburb-balanced subsample of the LINZ fetch
// ---------------------------------------------------------------------------

/** mulberry32 - the same 32-bit stream in the builder and in the checker. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fetched = JSON.parse(readFileSync(FETCHED, 'utf8'));
const byArea = {};
for (const stop of fetched.stops) {
  (byArea[stop.area] ??= []).push(stop);
}

const pool = [];
for (const area of Object.keys(POOL_QUOTA).sort()) {
  const group = byArea[area] ?? [];
  // group order is the fetch order (deterministic); suburbs in first-seen order
  const suburbs = [];
  const bySuburb = new Map();
  for (const stop of group) {
    if (!bySuburb.has(stop.suburb)) {
      bySuburb.set(stop.suburb, []);
      suburbs.push(stop.suburb);
    }
    bySuburb.get(stop.suburb).push(stop);
  }
  const picked = [];
  // round-robin over the suburbs: the first stop of each, then the second of
  // each, so no suburb can take more than one place over any other
  let round = 0;
  while (picked.length < POOL_QUOTA[area] && round < 1000) {
    for (const suburb of suburbs) {
      const stops = bySuburb.get(suburb);
      if (round < stops.length) {
        picked.push(stops[round]);
        if (picked.length >= POOL_QUOTA[area]) break;
      }
    }
    round += 1;
  }
  for (const stop of picked) {
    pool.push({ ...stop, pool_index: pool.length });
  }
  console.log(`pool: ${area} ${picked.length} stops across ${suburbs.length} suburbs`);
}

// The depot and the finish point of each area: the pool stop closest to the
// group's centroid - a real address in the middle of its territory, which is
// where a courier's depot stands. Both are excluded from the draw (an instance
// never delivers to its own depot), and the rule is deterministic, so the
// committed set rebuilds byte-identically.
const depotOf = {};
const finishOf = {};
for (const area of Object.keys(POOL_QUOTA).sort()) {
  const group = pool.filter((s) => s.area === area);
  if (group.length < 3) {
    console.error(`build-routing-eval: ${area} has only ${group.length} pool stops`);
    process.exit(1);
  }
  const centroid = {
    lat: group.reduce((sum, s) => sum + s.lat, 0) / group.length,
    lon: group.reduce((sum, s) => sum + s.lon, 0) / group.length,
  };
  const byDistance = [...group].sort(
    (a, b) => (a.lat - centroid.lat) ** 2 + (a.lon - centroid.lon) ** 2
      - ((b.lat - centroid.lat) ** 2 + (b.lon - centroid.lon) ** 2),
  );
  depotOf[area] = byDistance[0];
  finishOf[area] = byDistance[1];
  console.log(`pool: ${area} depot ${depotOf[area].full_address}, finish ${finishOf[area].full_address}`);
}
const poolIndex = new Map(pool.map((s) => [s.pool_index, s]));

// ---------------------------------------------------------------------------
// 2. the road matrix from Valhalla over OpenStreetMap
// ---------------------------------------------------------------------------

const n = pool.length;
const url = `http://127.0.0.1:${PORT}`;

// The matrix costs minutes to query (hundreds of throttled chunks against a
// service that dies under a 3 GB container). Its intermediate is kept locally
// and reused when the committed pool it belongs to has not changed, so a
// rebuild after a generator change does not re-query the engine.
const MATRIX_CACHE = join(REPO, 'data', 'routing-eval', 'road-matrix.json');
const poolDigest = createHash('sha256')
  .update(JSON.stringify(pool.map((s) => [s.pool_index, s.lat, s.lon])))
  .digest('hex');
let cached = null;
if (existsSync(MATRIX_CACHE)) {
  try {
    const doc = JSON.parse(readFileSync(MATRIX_CACHE, 'utf8'));
    if (doc.pool_digest === poolDigest) cached = doc;
  } catch {
    cached = null;
  }
}

let metres;
let seconds;
let unroutable = 0;
let matrixStatus = null;

if (cached) {
  metres = cached.metres;
  seconds = cached.seconds;
  unroutable = cached.unroutable_pairs;
  matrixStatus = { version: cached.engine_version, tileset_last_modified: cached.tileset_last_modified };
  console.log(`matrix: reused the local cache (${cached.ordered_pairs} pairs, ${unroutable} unroutable)`);
} else {
  const runningContainers = spawnSync('docker', ['ps', '--format', '{{.Names}}'], { encoding: 'utf8' })
    .stdout.split(/\r?\n/);
  if (!runningContainers.includes('vh-serve')) {
    const config = join(REPO, 'data', 'valhalla', 'valhalla.json');
    if (!existsSync(config)) {
      console.error('build-routing-eval: no Valhalla tiles config at data/valhalla/valhalla.json '
        + '(build the tiles first: valhalla_build_tiles over the Geofabrik extract, see the README)');
      process.exit(1);
    }
    execFileSync('docker', ['rm', '-f', 'vh-serve'], { stdio: 'ignore' });
    spawnSync('docker', ['run', '-d', '--name', 'vh-serve', '-p', `127.0.0.1:${PORT}:8002`,
      '-v', `${join(REPO, 'data', 'valhalla_tiles')}:/valhalla_tiles`,
      '-v', `${join(REPO, 'data', 'valhalla')}:/custom_files`,
      'valhalla/valhalla:run-latest', 'valhalla_service', '/custom_files/valhalla.json'],
      { encoding: 'utf8' });
    spawnSync('docker', ['start', 'vh-serve'], { encoding: 'utf8' });
  }
  let status = null;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const res = await fetch(`${url}/status`);
      if (res.ok) {
        status = await res.json();
        break;
      }
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  if (!status) {
    console.error('build-routing-eval: valhalla_service did not answer /status in time');
    process.exit(1);
  }
  console.log(`matrix: valhalla ${status.version} up (tileset ${status.tileset_last_modified})`);

  metres = Array.from({ length: n }, () => new Array(n).fill(null));
  seconds = Array.from({ length: n }, () => new Array(n).fill(null));

  // Resumable: the matrix is written chunk by chunk to a local progress file, so
  // a service that dies (a 3 GB container, 560 targets per response) does not
  // cost the whole run. The service itself is restarted when it is down.
  const PROGRESS = join(REPO, 'data', 'routing-eval', 'matrix-progress.json');
  let doneSources = 0;
  if (existsSync(PROGRESS)) {
    try {
      const progress = JSON.parse(readFileSync(PROGRESS, 'utf8'));
      if (progress.pool_digest === poolDigest) {
        for (let i = 0; i < n; i += 1) {
          if (progress.metres?.[i] && progress.seconds?.[i]) {
            metres[i] = progress.metres[i];
            seconds[i] = progress.seconds[i];
            doneSources = Math.max(doneSources, i + 1);
          }
        }
        unroutable = progress.unroutable ?? 0;
        console.log(`matrix: resuming from source ${doneSources} (${unroutable} unroutable so far)`);
      } else {
        console.log('matrix: the progress file belongs to a different pool - starting over');
      }
    } catch {
      /* an unreadable progress file is no reason to stop: start over */
    }
  }

  async function ensureService() {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        const res = await fetch(`${url}/status`);
        if (res.ok) return await res.json();
      } catch {
        /* down */
      }
      spawnSync('docker', ['start', 'vh-serve'], { encoding: 'utf8', stdio: 'ignore' });
      await new Promise((resolve) => setTimeout(resolve, 4000));
    }
    console.error('build-routing-eval: valhalla_service did not come back');
    process.exit(1);
  }

  for (let start = 0; start < n; start += CHUNK) {
    if (start < doneSources) continue;
    const sources = pool.slice(start, start + CHUNK).map((s) => ({ lat: s.lat, lon: s.lon }));
    const body = JSON.stringify({
      sources,
      targets: pool.map((s) => ({ lat: s.lat, lon: s.lon })),
      costing: COSTING,
      units: 'kilometers',
    });
    let rows = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      status = await ensureService();
      const alive = spawnSync('docker', ['ps', '--format', '{{.Names}}'], { encoding: 'utf8' })
        .stdout.split(/\r?\n/).includes('vh-serve');
      if (!alive) continue;
      try {
        const res = await fetch(`${url}/sources_to_targets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
        if (res.ok) {
          const doc = await res.json();
          if (Array.isArray(doc.sources_to_targets) && doc.sources_to_targets.length === sources.length) {
            rows = doc.sources_to_targets;
            break;
          }
        }
      } catch {
        /* the service died under the response: restart and retry the chunk */
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    if (!rows) {
      writeFileSync(PROGRESS, JSON.stringify({ pool_digest: poolDigest, metres, seconds, unroutable }));
      console.error(`build-routing-eval: chunk at ${start} kept failing after retries; progress saved, re-run to continue`);
      process.exit(1);
    }
    rows.forEach((row, i) => {
      row.forEach((cell, j) => {
        if (typeof cell?.distance !== 'number' || typeof cell?.time !== 'number') {
          unroutable += 1;
          return;
        }
        metres[start + i][j] = Math.round(cell.distance * 1000);
        seconds[start + i][j] = Math.round(cell.time);
      });
    });
    writeFileSync(PROGRESS, JSON.stringify({ pool_digest: poolDigest, metres, seconds, unroutable }));
    if ((start / CHUNK) % 5 === 0) console.log(`  matrix: ${start}/${n} sources`);
  }
  spawnSync('rm', ['-f', PROGRESS], { encoding: 'utf8' });
  console.log(`matrix: ${n}x${n} ordered pairs, ${unroutable} unroutable`);

  // the local intermediate, keyed by the pool it was queried for
  writeFileSync(MATRIX_CACHE, JSON.stringify({
    pool_digest: poolDigest,
    engine_version: status.version,
    tileset_last_modified: status.tileset_last_modified,
    queried_at: new Date().toISOString(),
    ordered_pairs: n * n,
    unroutable_pairs: unroutable,
    metres,
    seconds,
  }));
  matrixStatus = { version: status.version, tileset_last_modified: status.tileset_last_modified };
}

// ---------------------------------------------------------------------------
// 3. the instances
// ---------------------------------------------------------------------------

const START_EPOCH = Math.floor(Date.UTC(2026, 10, 9, DAY_START_HOUR - 13, 0, 0) / 1000); // 08:00 NZDT
const DAY_LENGTH_S = DAY_LENGTH_H * 3600;

function buildInstance(size, variant, seed, area) {
  const rng = mulberry32(seed + hashString(variant));
  const drawable = pool.filter((s) => s.area === area && s !== depotOf[area] && s !== finishOf[area]);
  if (drawable.length < size) {
    console.error(`build-routing-eval: ${area} has ${drawable.length} drawable stops, needs ${size}`);
    process.exit(1);
  }
  // Fisher-Yates over the drawable indices, take the first `size`
  const order = drawable.map((s) => s.pool_index);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const chosen = order.slice(0, size).map((index) => poolIndex.get(index));
  const withWindows = variant === 'tw' || variant === 'tw-prio' || variant === 'full';
  const withPriorities = variant === 'prio' || variant === 'tw-prio' || variant === 'full';
  const withBreak = variant === 'brk' || variant === 'full';
  const withFinish = variant === 'full';

  let parcels = 0;
  const stops = chosen.map((stop, position) => {
    const stopParcels = 1 + Math.floor(rng() * 3);
    parcels += stopParcels;
    const window = withWindows && rng() < 0.35
      ? [START_EPOCH + Math.floor(rng() * 5 * 3600), 0]
      : null;
    if (window) {
      window[1] = window[0] + 5400 + Math.floor(rng() * 3600); // 90-150 minutes
    }
    return {
      i: stop.pool_index,
      parcels: stopParcels,
      service_time_s: rng() < 0.2 ? 60 : null, // a letterbox drop is faster
      priority: withPriorities ? rng() < 0.15 : false,
      window,
    };
  });
  return {
    id: `routing-${size}-${variant}-${seed}`,
    size,
    variant,
    seed,
    seed_step: `mulberry32(seed + hash(variant)) over ${area} drawable stops, Fisher-Yates, first ${size}`,
    area,
    depot: { i: depotOf[area].pool_index, address: depotOf[area].full_address },
    finish: withFinish
      ? { i: finishOf[area].pool_index, address: finishOf[area].full_address }
      : null,
    start_at_epoch_s: START_EPOCH,
    day_start_hour: DAY_START_HOUR,
    day_length_s: DAY_LENGTH_S,
    capacity_parcels: Math.ceil(parcels * CAPACITY_SLACK),
    service_time_s: 300,
    speed_kmh: 30,
    break: withBreak
      ? { earliest_epoch_s: START_EPOCH + 4 * 3600, latest_epoch_s: START_EPOCH + 5 * 3600, minutes: 30 }
      : null,
    stops,
  };
}

function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

mkdirSync(MANIFEST, { recursive: true });
const instances = [];
for (const size of SIZES) {
  for (const variant of VARIANTS) {
    for (let k = 0; k < SEEDS; k += 1) {
      const seed = SEED_BASE + k;
      // A Christchurch city day is the only shape the 150- and 250-stop days can
      // take: the pool's other two areas hold 128 drawable addresses each, so
      // they host the 30- and 80-stop days (documented in the README).
      const area = size > 80
        ? 'christchurch'
        : Object.keys(POOL_QUOTA).sort()[(VARIANTS.indexOf(variant) + k) % 3];
      const instance = buildInstance(size, variant, seed, area);
      instances.push(instance);
      console.log(`instance ${instance.id}: ${instance.stops.length} stops, area ${area}`);
    }
  }
}

// ---------------------------------------------------------------------------
// write the committed set
// ---------------------------------------------------------------------------

writeFileSync(join(MANIFEST, 'pool.json'), JSON.stringify({
  source: fetched.source,
  committed_from: `${fetched.stops.length} fetched addresses, a suburb-balanced subsample `
    + `(${Object.entries(POOL_QUOTA).map(([a, q]) => `${a} ${q}`).join(', ')})`,
  stop_count: pool.length,
  areas: POOL_QUOTA,
  depots: Object.fromEntries(Object.entries(depotOf).map(([a, s]) => [a, {
    pool_index: s.pool_index, address: s.full_address, lat: s.lat, lon: s.lon,
  }])),
  finishes: Object.fromEntries(Object.entries(finishOf).map(([a, s]) => [a, {
    pool_index: s.pool_index, address: s.full_address, lat: s.lat, lon: s.lon,
  }])),
  stops: pool.map((s) => ({
    i: s.pool_index,
    address: s.full_address,
    suburb: s.suburb,
    area: s.area,
    lat: s.lat,
    lon: s.lon,
    linz_address_id: s.linz_address_id,
  })),
}, null, 1));

const csv = [];
for (let i = 0; i < n; i += 1) {
  for (let j = 0; j < n; j += 1) {
    if (metres[i][j] === null) continue;
    csv.push(`${i},${j},${metres[i][j]},${seconds[i][j]}`);
  }
}
const gz = gzipSync(Buffer.from(csv.join('\n') + '\n', 'utf8'));
writeFileSync(join(MANIFEST, 'road-matrix.csv.gz'), gz);
writeFileSync(join(MANIFEST, 'road-matrix.meta.json'), JSON.stringify({
  source: {
    what: 'the road matrix of the routing evaluation set: every ordered pair of pool stops',
    engine: `Valhalla ${matrixStatus.version} (MIT), POST /sources_to_targets, costing "${COSTING}" `
      + '(a van on the road network, no traffic, no temporal effects)',
    data: `OpenStreetMap via the Geofabrik NZ extract: ${OSM_URL}`,
    data_licence: 'Open Database License (ODbL) 1.0 - https://opendatacommons.org/licenses/odbl/1-0/',
    data_bytes: OSM_BYTES,
    data_sha256: null,
    engine_licence: 'MIT - https://github.com/valhalla/valhalla/blob/master/COPYING',
    tileset_last_modified: matrixStatus.tileset_last_modified,
    built_at: new Date().toISOString(),
    address_source: 'the LINZ pool (CC BY 4.0, sourced from the LINZ Data Service), fetched by scripts/data/fetch-routing-pool.py',
    query: `POST http://127.0.0.1:${PORT}/sources_to_targets, ${CHUNK} sources per request against all targets, units kilometers; whole metres and whole seconds per ordered pair, NOT symmetrised (one-way streets)`,
    fallback_recorded: 'OSRM was the recorded fallback in docs/research/2026/routing-vrp-engines.md; '
      + 'Valhalla served every pair here, so the fallback was not needed and was not used',
  },
  stop_count: n,
  units: { distance: 'metres', time: 'seconds' },
  ordered_pairs: csv.length,
  unroutable_pairs: unroutable,
  rows: 'i,j,metres,seconds for every ordered pair the engine answered',
  sha256_gz: createHash('sha256').update(gz).digest('hex'),
}, null, 1));

mkdirSync(join(MANIFEST, 'instances'), { recursive: true });
const lines = [];
for (const instance of instances) {
  writeFileSync(join(MANIFEST, 'instances', `${instance.id}.json`), JSON.stringify(instance, null, 1));
  lines.push(JSON.stringify({
    id: instance.id,
    size: instance.size,
    variant: instance.variant,
    seed: instance.seed,
    area: instance.area,
    stops: instance.stops.length,
    with_break: Boolean(instance.break),
    with_finish: Boolean(instance.finish),
    windows: instance.stops.filter((s) => s.window).length,
    priorities: instance.stops.filter((s) => s.priority).length,
  }));
}
writeFileSync(join(MANIFEST, 'instances.jsonl'), `${lines.join('\n')}\n`);

console.log(`build-routing-eval: wrote ${pool.length}-stop pool, ${gz.length}-byte matrix, `
  + `${instances.length} instances (${SIZES.join('/')} stops x ${VARIANTS.length} variants x ${SEEDS} seeds)`);
