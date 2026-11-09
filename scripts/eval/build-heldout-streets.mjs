// Builds the synthetic held-out set of the voice evaluation: 20 % of the
// Canterbury STREETS, split by street (NEVER by address), seeded, the list
// committed (founder directive 2026-11-08, item 4, held-out set (a)).
//
//   node scripts/eval/build-heldout-streets.mjs [--linz-dir data/linz] [--out <file>]
//
// The street source is the LINZ address index (layer 123113, the three
// Canterbury districts) in <linz-dir>/addresses-{christchurch,selwyn,waimakariri}.jsonl,
// field `road`. The distinct road names are collected, sorted (code-unit
// order) and a DOCUMENTED seeded PRNG selects exactly floor(0.20 * N) of them:
// a partial Fisher-Yates shuffle (the first `count` draws of a full mulberry32
// shuffle) over the sorted list. The selected streets are re-sorted, so the
// manifest is stable.
//
// The output is packages/eval/voice/manifest/heldout_streets.json and it is
// IDEMPOTENT: two runs produce byte-identical output. No clock is read — the
// `generated` field is the pinned directive date, 2026-11-08.
//
// Nothing is ever tuned on the held-out streets:
//   - scripts/eval/build-voice-eval.mjs excludes their addresses from the
//     DEFAULT manifest and emits them only under --heldout (tagged
//     held_out: true) into packages/eval/voice/manifest/heldout/;
//   - scripts/eval/check-voice-eval.mjs refuses a main manifest containing a
//     held-out street and a held-out manifest containing a non-held-out street;
//   - scripts/ci/check-parser-circularity.mjs proves the gold templates and the
//     parser regexes carry no held-out-street text.
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

// The seed and the fraction are pinned by the directive, not arguments of the
// committed list.
export const SEED = 20261108;
export const FRACTION = 0.2;
// The directive date, pinned so the output is byte-stable (idempotent).
export const GENERATED = '2026-11-08';
export const LINZ_FILES = [
  'addresses-christchurch.jsonl',
  'addresses-selwyn.jsonl',
  'addresses-waimakariri.jsonl',
];
export const DEFAULT_LINZ_DIR = 'data/linz';
export const DEFAULT_OUT = 'packages/eval/voice/manifest/heldout_streets.json';

/**
 * mulberry32 — the documented seedable 32-bit PRNG (public-domain reference
 * implementation, bryc's mulberry32). Returns floats in [0, 1). The first
 * three outputs for seed 20261108 are pinned by the test suite:
 * 0.31713671749457717, 0.9465050620492548, 0.7894808403216302.
 */
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

/** The distinct `road` values of the LINZ files, sorted (code-unit order). */
export async function readDistinctRoads(linzDir, files = LINZ_FILES) {
  const roads = new Set();
  for (const file of files) {
    const path = join(linzDir, file);
    if (!existsSync(path)) {
      throw new Error(
        `the LINZ address file is missing: ${path} (the held-out split needs all three Canterbury districts)`,
      );
    }
    const reader = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
    for await (const line of reader) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line);
        if (typeof row.road === 'string' && row.road.trim() !== '') roads.add(row.road);
      } catch {
        continue;
      }
    }
  }
  // Default sort = UTF-16 code-unit order, documented: the same order on every
  // platform, so the seeded selection is reproducible everywhere.
  return [...roads].sort();
}

/**
 * The seeded selection: exactly floor(fraction * N) streets, chosen by a
 * partial Fisher-Yates shuffle — the first `count` draws of a full mulberry32
 * shuffle over the sorted list — then re-sorted for a stable manifest.
 */
export function selectHeldOutStreets(streets, seed = SEED, fraction = FRACTION) {
  const sorted = [...streets].sort();
  const n = sorted.length;
  const count = Math.floor(fraction * n);
  const indices = sorted.map((_, index) => index);
  const rand = mulberry32(seed);
  for (let i = 0; i < count; i += 1) {
    const j = i + Math.floor(rand() * (n - i));
    const swap = indices[i];
    indices[i] = indices[j];
    indices[j] = swap;
  }
  return indices
    .slice(0, count)
    .map((index) => sorted[index])
    .sort();
}

export function sha256Of(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function algorithmNote(seed, fraction) {
  return (
    `mulberry32(seed=${seed}) partial Fisher-Yates over the code-unit-sorted distinct road values of ${LINZ_FILES.join(', ')}; ` +
    `the first floor(${fraction}*N) shuffled indices are held out; the selected streets are re-sorted (code-unit order); ` +
    'sha256 is over the sorted held-out street list joined with "\\n" (utf-8)'
  );
}

/** The manifest object for a LINZ dir. Deterministic: no clock is read. */
export async function buildHeldOutManifest({
  linzDir,
  seed = SEED,
  fraction = FRACTION,
  generated = GENERATED,
  files = LINZ_FILES,
}) {
  const roads = await readDistinctRoads(linzDir, files);
  const streets = selectHeldOutStreets(roads, seed, fraction);
  return {
    seed,
    fraction,
    total_streets: roads.length,
    held_out_count: streets.length,
    algorithm: algorithmNote(seed, fraction),
    sha256: sha256Of(streets.join('\n')),
    generated,
    streets,
  };
}

/** The exact bytes written to disk: stable key order, 2-space indent, one final newline. */
export function manifestBytes(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function argValue(args, name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] !== undefined ? args[index + 1] : fallback;
}

export async function main(argv = process.argv.slice(2)) {
  const linzDir = argValue(argv, '--linz-dir', DEFAULT_LINZ_DIR);
  const out = argValue(argv, '--out', DEFAULT_OUT);
  const manifest = await buildHeldOutManifest({ linzDir });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, manifestBytes(manifest));
  console.log(
    `held-out streets: ${manifest.held_out_count} of ${manifest.total_streets} streets ` +
      `(seed ${manifest.seed}, fraction ${manifest.fraction}) -> ${out} (sha256 ${manifest.sha256})`,
  );
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
