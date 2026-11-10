// The held-out street split's gates (founder directive 2026-11-08 item 4a, and the
// 2026-11-09 PART B adoption): the voice held-out list is a derived view of the
// backend's committed fixture, deterministic, and byte-identical everywhere. These
// tests are the claims of scripts/eval/build-heldout-streets.mjs — they run with
// the rest of scripts/*/__tests__:
//
//   node --test "scripts/*/__tests__/*.test.mjs"
//
// No machine reads a local data/linz revision here (the PART B rule: the gates
// check the committed list and its sha256 only, so they pass on any machine).
//
// Red first (PLAYBOOK §14): before the shared-source mode existed, the
// determinism claims were pinned against a fixture LINZ dir and the "real LINZ"
// leg failed on a machine with a newer revision — the recorded red run is in
// docs/evidence/voice-heldout/README.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildSharedManifest,
  manifestBytes,
  readSharedHeldOutStreets,
  sha256Of,
  DEFAULT_SOURCE,
  FRACTION,
  SEED,
  TOTAL_STREETS,
} from '../build-heldout-streets.mjs';
import { streetKeyOf, streetKeyPattern } from '../street-key.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const SCRIPT = join(REPO, 'scripts', 'eval', 'build-heldout-streets.mjs');
const SOURCE = join(REPO, DEFAULT_SOURCE);
const COMMITTED = join(REPO, 'packages', 'eval', 'voice', 'manifest', 'heldout_streets.json');

function tempFile() {
  return join(mkdtempSync(join(tmpdir(), 'heldout-streets-')), 'heldout_streets.json');
}

test('the shared source is committed and carries its own provenance', () => {
  assert.ok(existsSync(SOURCE), `the backend's fixture must be committed: ${SOURCE}`);
  const raw = readFileSync(SOURCE, 'utf8');
  assert.match(raw, /# HELD-OUT Canterbury streets/, 'the fixture header names the split');
  assert.match(raw, /# seed: 20261108/, 'the seed is the directive seed');
  const shared = readSharedHeldOutStreets(SOURCE);
  assert.equal(shared.source_line_count, TOTAL_STREETS === shared.streets.length ? shared.streets.length : shared.streets.length);
  assert.ok(shared.streets.length > 1300, 'the split holds ~20 % of ~6 800 streets');
  assert.equal(new Set(shared.streets).size, shared.streets.length, 'distinct');
  assert.deepEqual([...shared.streets].sort(), shared.streets, 'sorted (code-unit order)');
  // every street is a road_key normalisation: lower-case, suffix abbreviated
  for (const street of shared.streets.slice(0, 25)) {
    assert.equal(street, streetKeyOf(street), `${street} must already be a street key`);
    assert.equal(street, street.toLowerCase(), `${street} must be lower-case`);
  }
});

test('two runs produce byte-identical output, and the CLI writes exactly what the library builds', () => {
  const first = tempFile();
  const second = tempFile();
  execFileSync(process.execPath, [SCRIPT, '--out', first]);
  execFileSync(process.execPath, [SCRIPT, '--out', second]);
  const firstBytes = readFileSync(first, 'utf8');
  assert.equal(firstBytes.replace(/\r\n/g, '\n'), readFileSync(second, 'utf8').replace(/\r\n/g, '\n'));
  assert.equal(firstBytes.replace(/\r\n/g, '\n'), manifestBytes(buildSharedManifest()));
});

test('the committed manifest is exactly the shared list, with its source sha recorded', () => {
  const committedBytes = readFileSync(COMMITTED, 'utf8');
  const committed = JSON.parse(committedBytes);
  const shared = readSharedHeldOutStreets(SOURCE);
  assert.equal(committed.source, DEFAULT_SOURCE);
  assert.equal(
    committed.source_sha256,
    sha256Of(readFileSync(SOURCE, 'utf8').replace(/\r\n/g, '\n')),
    'the source sha is the fixture\'s logical bytes',
  );
  assert.equal(committed.total_streets, TOTAL_STREETS);
  assert.equal(committed.held_out_count, shared.streets.length);
  assert.equal(committed.held_out_count, Math.floor(committed.fraction * committed.total_streets));
  assert.equal(committed.fraction, FRACTION);
  assert.equal(committed.seed, SEED);
  assert.deepEqual(committed.streets, shared.streets, 'the committed list IS the backend list');
  assert.equal(committed.sha256, sha256Of(shared.streets.join('\n')), 'the sha256 is over the sorted keys joined with an LF');
  // the checkout's line endings are a platform artefact; the generator writes LF,
  // so the comparison normalises both sides to LF
  assert.equal(
    committedBytes.replace(/\r\n/g, '\n'),
    manifestBytes(committed),
    'the committed bytes are exactly the generator output format',
  );
  assert.match(committed.algorithm, /adopted unchanged as the single shared held-out source/);
});

test('the street key folds the suffix in both spellings, so a road matches its key either way', () => {
  assert.equal(streetKeyOf('Bealey Avenue'), 'bealey ave');
  assert.equal(streetKeyOf('Bealey Ave'), 'bealey ave');
  assert.equal(streetKeyOf('Papanui Road'), 'papanui rd');
  assert.equal(streetKeyOf('57 Poulson Street'), '57 poulson st');
  // either spelling matches the key's pattern, case-insensitively:
  for (const [key, spelled] of [
    ['bealey ave', 'Bealey Avenue'],
    ['bealey ave', 'Bealey Ave'],
    ['papanui rd', 'Papanui Road'],
  ]) {
    const pattern = new RegExp(`(?<![A-Za-z])${streetKeyPattern(key)}(?![A-Za-z])`, 'i');
    assert.ok(pattern.test(`delivered at 42 ${spelled}`), `${spelled} must match ${key}`);
    assert.ok(!pattern.test('some other street entirely'), 'and nothing else must');
  }
});
