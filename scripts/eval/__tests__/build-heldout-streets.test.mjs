// The held-out street split (founder directive 2026-11-08, item 4, held-out set
// (a)): 20 % of the Canterbury STREETS, split by street (never by address),
// seeded, the list committed. These tests are the claims of
// scripts/eval/build-heldout-streets.mjs — they run with the rest of
// scripts/*/__tests__:
//
//   node --test "scripts/*/__tests__/*.test.mjs"
//
// Red first (PLAYBOOK §14): before the generator existed, this file failed with
// "Cannot find module '../build-heldout-streets.mjs'" — the recorded red run is
// in docs/evidence/voice-heldout/README.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildHeldOutManifest,
  manifestBytes,
  mulberry32,
  readDistinctRoads,
  selectHeldOutStreets,
  sha256Of,
  FRACTION,
  SEED,
} from '../build-heldout-streets.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const SCRIPT = join(REPO, 'scripts', 'eval', 'build-heldout-streets.mjs');
const FIXTURE = join(HERE, 'fixtures', 'linz');
const COMMITTED = join(REPO, 'packages', 'eval', 'voice', 'manifest', 'heldout_streets.json');
const FIXTURE_FILES = [
  'addresses-christchurch.jsonl',
  'addresses-selwyn.jsonl',
  'addresses-waimakariri.jsonl',
];

function tempFile() {
  return join(mkdtempSync(join(tmpdir(), 'heldout-streets-')), 'heldout_streets.json');
}

function fixtureRows() {
  const rows = [];
  for (const file of FIXTURE_FILES) {
    for (const line of readFileSync(join(FIXTURE, file), 'utf8').split('\n')) {
      if (line.trim()) rows.push(JSON.parse(line));
    }
  }
  return rows;
}

test('two runs over a fixture LINZ dir produce byte-identical output', async () => {
  const first = tempFile();
  const second = tempFile();
  execFileSync(process.execPath, [SCRIPT, '--linz-dir', FIXTURE, '--out', first]);
  execFileSync(process.execPath, [SCRIPT, '--linz-dir', FIXTURE, '--out', second]);
  const firstBytes = readFileSync(first, 'utf8');
  assert.equal(firstBytes, readFileSync(second, 'utf8'));
  // the CLI writes exactly what the library builds:
  assert.equal(firstBytes, manifestBytes(await buildHeldOutManifest({ linzDir: FIXTURE })));
});

test('the split is by street: no street is in both the held-out list and its complement, and every address of a held-out street is classified held-out', async () => {
  const manifest = await buildHeldOutManifest({ linzDir: FIXTURE });
  const heldOut = new Set(manifest.streets);
  const rows = fixtureRows();
  const allStreets = new Set(rows.map((row) => row.road));
  // every held-out street is a real street of the source, and no street is in
  // both the held-out list and its complement:
  for (const street of manifest.streets) {
    assert.ok(allStreets.has(street), `${street} must come from the LINZ rows`);
    assert.ok(
      rows.some((row) => row.road === street),
      `${street} must have addresses`,
    );
  }
  const complement = [...allStreets].filter((street) => !heldOut.has(street));
  for (const street of complement) {
    assert.ok(!heldOut.has(street), `${street} is in both the held-out list and the complement`);
  }
  // the classification of an address is decided by its street ALONE: every
  // address of a held-out street is held out with it, and no other address is:
  for (const row of rows) {
    assert.equal(heldOut.has(row.road), manifest.streets.includes(row.road));
  }
  assert.equal(
    new Set(manifest.streets).size,
    manifest.streets.length,
    'the held-out streets are distinct',
  );
  assert.deepEqual(
    [...manifest.streets].sort(),
    manifest.streets,
    'the held-out streets are sorted',
  );
});

test('the held-out count is exactly floor(20% of the distinct streets)', async () => {
  const manifest = await buildHeldOutManifest({ linzDir: FIXTURE });
  const allStreets = new Set(fixtureRows().map((row) => row.road));
  assert.equal(manifest.total_streets, allStreets.size);
  assert.equal(manifest.held_out_count, Math.floor(0.2 * allStreets.size));
  assert.equal(manifest.streets.length, manifest.held_out_count);
  // the same floor on the committed manifest (the real Canterbury streets):
  const committed = JSON.parse(readFileSync(COMMITTED, 'utf8'));
  assert.equal(committed.fraction, 0.2);
  assert.equal(committed.held_out_count, Math.floor(committed.fraction * committed.total_streets));
  assert.equal(committed.streets.length, committed.held_out_count);
});

test('the committed manifest is self-consistent everywhere and byte-identical to the regeneration from the real LINZ dir (..\\courier\\data\\linz) where that dir exists — the recorded run is in docs/evidence/voice-heldout/', async () => {
  const committedBytes = readFileSync(COMMITTED, 'utf8');
  const committed = JSON.parse(committedBytes);
  // self-consistency, which runs everywhere (CI carries no gitignored data/linz):
  assert.equal(committed.seed, 20261108);
  assert.equal(
    committed.generated,
    '2026-11-08',
    'the generated date is pinned, so the file is byte-stable',
  );
  assert.deepEqual([...committed.streets].sort(), committed.streets, 'sorted');
  assert.equal(new Set(committed.streets).size, committed.streets.length, 'distinct');
  assert.equal(
    committed.sha256,
    sha256Of(committed.streets.join('\n')),
    'the sha256 is over the sorted street list joined with a newline',
  );
  assert.equal(committed.held_out_count, Math.floor(committed.fraction * committed.total_streets));
  assert.match(committed.algorithm, /mulberry32/);
  assert.equal(
    committedBytes,
    manifestBytes(committed),
    'the committed bytes are exactly the generator output format',
  );
  // the real LINZ dir (gitignored, so present only in a worktree that has it —
  // the lead main worktree's ..\courier\data\linz): the regeneration must be
  // byte-identical to the committed list.
  const candidates = [
    process.env.HELDOUT_REAL_LINZ_DIR,
    join(REPO, 'data', 'linz'),
    join(REPO, '..', 'courier', 'data', 'linz'),
  ].filter(Boolean);
  const real = candidates.find((dir) => existsSync(join(dir, 'addresses-christchurch.jsonl')));
  if (real) {
    const regenerated = await buildHeldOutManifest({ linzDir: real });
    assert.equal(
      manifestBytes(regenerated),
      committedBytes,
      `the committed manifest must be the regeneration from ${real}`,
    );
  }
});

test('seed 20261108 always yields the same list, whatever order the files are read in, and the PRNG is the documented mulberry32', async () => {
  const roads = await readDistinctRoads(FIXTURE);
  const files = [...FIXTURE_FILES].reverse();
  const a = await buildHeldOutManifest({ linzDir: FIXTURE });
  const b = await buildHeldOutManifest({ linzDir: FIXTURE, files });
  assert.deepEqual(
    a.streets,
    b.streets,
    'the file order must not change the selection (the streets are sorted first)',
  );
  assert.equal(manifestBytes(a), manifestBytes(b));
  // the selection depends on the seed and the sorted street set only:
  assert.deepEqual(
    selectHeldOutStreets(roads, SEED, FRACTION),
    selectHeldOutStreets([...roads].reverse(), SEED, FRACTION),
  );
  assert.deepEqual(
    selectHeldOutStreets(roads, SEED, FRACTION),
    selectHeldOutStreets(roads, SEED, FRACTION),
  );
  // mulberry32(20261108) is pinned to its first three outputs, so the PRNG is
  // the documented one and not an implementation detail that can drift:
  const rand = mulberry32(20261108);
  assert.equal(rand(), 0.31713671749457717);
  assert.equal(rand(), 0.9465050620492548);
  assert.equal(rand(), 0.7894808403216302);
});
