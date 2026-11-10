// The Canterbury street index: the destination names the address resolver matches.
//
//   node scripts/eval/build-street-index.mjs [--linz-dir data/linz] [--out <path>]
//
// The address resolver (services/courier-voice/app/address_resolve.py) has to
// turn what the recognizer heard - "fifty seven poulson street addington" -
// into a street that EXISTS, in the backend's own key, before a number and a
// suburb can be attached to it. That needs a list of the streets, and the list
// has to be the real one: LINZ layer 123113's distinct road names for the three
// Canterbury districts (Christchurch, Selwyn, Waimakariri), keyed exactly the
// way the backend's `road_key()` keys them (scripts/eval/street-key.mjs).
//
// What is committed is the ROADS, not the addresses:
//
//   6 799 distinct roads  ->  one JSON object each (key, display name, the
//                             suburbs the road runs through, nothing else)
//   656 044 address rows  ->  NOT committed: the three LINZ files are 90 MB,
//                             and a repo that carries them is a repo nobody
//                             clones. The index is ~0.5 MB and is regenerated
//                             from any LINZ revision with this one command.
//
// The index is the product's DATA, never a fitted vocabulary: the fuzzy
// matcher's thresholds, its phonetic fold and the abbreviation map are what
// get tuned, and those carry no street name at all. A held-out street is in
// the index because it is a street in Canterbury, exactly as it is in the
// backend's own tables - never because the resolver learned its spelling.
//
// Determinism: the rows are read in a fixed file order, the roads are sorted by
// key, the display spelling is chosen by a rule rather than by arrival order,
// and `sha256_of_keys` is taken over the sorted key list joined with \n (the
// same logical-bytes convention the held-out street list uses), so a rebuild
// from the same LINZ revision is provable rather than merely similar.

import { createHash } from 'node:crypto';
import { createReadStream, readdirSync } from 'node:fs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { STREET_TYPES, streetKeyOf } from './street-key.mjs';

/** The committed index, relative to the repository root. */
const OUT = 'packages/eval/voice/data/canterbury-streets.json';

/** The three Canterbury districts the index is built from, in reading order.
 *
 * A directory carrying only some of them (a fixture, or a worktree with one
 * district's rows) builds the index from what it has, so the reads never
 * assume a file that is not there.
 */
const LINZ_DISTRICTS = ['christchurch', 'selwyn', 'waimakariri'];

/** The layer the index was built from, recorded with it. */
const LINZ_LAYER = '123113';

/** The date the committed index was generated. */
const GENERATED = '2026-11-11';

/** The licence obligation the LINZ data carries, recorded on the index itself.
 *
 * The same attribution the backend's own LINZ export carries
 * (`scripts/data/export-linz-hotwords.py`): the LINZ Data Service publishes
 * under CC BY 4.0, so a derived file has to name its source.
 */
const ATTRIBUTION =
  'Sourced from the LINZ Data Service and licensed for reuse under the CC BY 4.0 licence (https://www.linz.govt.nz/data/linz-data-service)';

/** What the index is derived from, in one line. */
const DERIVED =
  'distinct road names with their road_key normalisation, the suburbs each road runs through and its address count - no address rows, no house numbers, no LINZ bulk';

function argValue(args, name, fallback) {
  const at = args.indexOf(name);
  return at >= 0 && at + 1 < args.length ? args[at + 1] : fallback;
}

/** The display spelling of a road, chosen by a rule and not by arrival order.
 *
 * The LINZ rows spell a road one way in layer 123113 (measured: 0 of 6 799
 * keys carry more than one spelling), but a revision that mixes "Alford Forest
 * Road" with "Alford Forest Rd" must still produce the same index: the spelling
 * whose street type is not already an abbreviation wins, then the shortest,
 * then the alphabetically first.
 */
function displaySpelling(spellings) {
  const lastTokenOf = (spelling) => spelling.split(' ').at(-1).toLowerCase();
  const isAlreadyShort = (spelling) => {
    const folded = STREET_TYPES[lastTokenOf(spelling)];
    return folded !== undefined && folded === lastTokenOf(spelling);
  };
  return [...spellings.keys()].sort((a, b) => {
    if (isAlreadyShort(a) !== isAlreadyShort(b)) return isAlreadyShort(a) ? 1 : -1;
    if (a.length !== b.length) return a.length - b.length;
    return a < b ? -1 : a > b ? 1 : 0;
  })[0];
}

/** The address files of the directory, the three districts first then the rest. */
export function linzFiles(linzDir) {
  const present = readdirSync(linzDir).filter((name) => /^addresses-.*\.jsonl$/.test(name));
  const known = LINZ_DISTRICTS.map((district) => `addresses-${district}.jsonl`).filter((name) =>
    present.includes(name),
  );
  const extra = present.filter((name) => !known.includes(name)).sort();
  return [...known, ...extra];
}

/**
 * Every distinct road of the LINZ directory, keyed the backend's way.
 *
 * A row with no number, no road or no suburb is not an address this index can
 * serve (the resolver has to return a street AND a number AND a suburb), so it
 * is counted and skipped rather than silently folded in.
 */
export async function readLinzRoads(linzDir) {
  const byKey = new Map();
  let rows = 0;
  let skipped = 0;
  for (const file of linzFiles(linzDir)) {
    const path = join(linzDir, file);
    const stream = createReadStream(path, { encoding: 'utf8' });
    for await (const line of createInterface({ input: stream, crlfDelay: Infinity })) {
      if (!line.trim()) continue;
      let row;
      try {
        row = JSON.parse(line);
      } catch {
        skipped += 1;
        continue;
      }
      rows += 1;
      if (!row.number || !row.road || !row.suburb) {
        skipped += 1;
        continue;
      }
      const key = streetKeyOf(String(row.road));
      let entry = byKey.get(key);
      if (entry === undefined) {
        entry = { key, spellings: new Map(), suburbs: new Set(), addresses: 0 };
        byKey.set(key, entry);
      }
      entry.spellings.set(String(row.road), (entry.spellings.get(String(row.road)) || 0) + 1);
      entry.suburbs.add(String(row.suburb));
      entry.addresses += 1;
    }
  }
  const roads = [...byKey.values()]
    .map((entry) => ({
      key: entry.key,
      road: displaySpelling(entry.spellings),
      suburbs: [...entry.suburbs].sort(),
      addresses: entry.addresses,
    }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return { roads, rows, skipped };
}

/** The sha of a file's bytes, streamed (the LINZ files are 30 MB each). */
async function sha256OfFile(path) {
  const hash = createHash('sha256');
  for await (const block of createReadStream(path)) hash.update(block);
  return hash.digest('hex');
}

/**
 * The index document: the roads, the abbreviation map and where they came from.
 *
 * `sha256_of_keys` is over the sorted key list joined with \n - the logical
 * bytes, not the file's - so the value is the same on Windows and on CI and
 * two builds from the same revision are provably identical.
 */
export function buildIndex(roads, counts, files) {
  const keys = roads.map((road) => road.key);
  return {
    version: 1,
    generated: GENERATED,
    generated_by: 'scripts/eval/build-street-index.mjs',
    attribution: ATTRIBUTION,
    licence: 'CC BY 4.0 (LINZ NZ Addresses, LDS layer 123113)',
    derived: DERIVED,
    source: {
      linz_layer: LINZ_LAYER,
      files,
      rows: counts.rows,
      rows_without_a_full_address: counts.skipped,
      distinct_roads: roads.length,
      sha256_of_keys: createHash('sha256').update(keys.join('\n')).digest('hex'),
    },
    abbreviations: { ...STREET_TYPES },
    roads,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const linzDir = argValue(args, '--linz-dir', 'data/linz');
  const out = argValue(args, '--out', OUT);
  const { roads, rows, skipped } = await readLinzRoads(linzDir);
  const files = await Promise.all(
    linzFiles(linzDir).map(async (file) => ({
      file,
      sha256: await sha256OfFile(join(linzDir, file)),
    })),
  );
  const index = buildIndex(roads, { rows, skipped }, files);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(index, null, 1) + '\n');  console.log(
    `canterbury street index: ${roads.length} distinct roads from ${rows} LINZ rows ` +
      `(${skipped} without a full address) -> ${out} ` +
      `(sha256_of_keys ${index.source.sha256_of_keys.slice(0, 16)}, ` +
      `${Buffer.byteLength(JSON.stringify(index))} bytes)`,
  );
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  await main();
}
