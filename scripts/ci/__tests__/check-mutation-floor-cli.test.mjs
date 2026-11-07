// The BUG-113 regression test: the floor's CLI must actually run.
//
// Run 41190752114 of `mutation.yml` passed in 0.25 seconds with no output and no
// stats artefact: the entry guard compared `new URL(import.meta.url).pathname
// .slice(1)` - which resolves against the WORKING DIRECTORY - against
// `process.argv[1]`, so it never matched and `main()` never ran. Node exited 0,
// the lane reported success, and the mutation floor was a no-op. That is the
// failure mode the tests in this file exist to make impossible.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildMutmutCommand,
  checkStats,
  normaliseStats,
  RESULTS_RELATIVE,
  scoreOf,
  writeResults,
} from '../check-mutation-floor.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const script = path.join(repoRoot, 'scripts', 'ci', 'check-mutation-floor.mjs');

/** A service directory carrying `mutants/mutmut-cicd-stats.json` (or none). */
function serviceWithStats(payload) {
  const dir = mkdtempSync(path.join(tmpdir(), 'mutation-floor-'));
  const stats = path.join(dir, 'mutants');
  mkdirSync(stats, { recursive: true });
  if (payload !== null) {
    writeFileSync(path.join(stats, 'mutmut-cicd-stats.json'), payload);
  }
  return dir;
}

/** Run the CLI as a real process, exactly as the workflow does. */
function runCli(args) {
  try {
    const stdout = execFileSync(process.execPath, [script, ...args], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stdout, stderr: '' };
  } catch (error) {
    return {
      code: typeof error.status === 'number' ? error.status : 1,
      stdout: String(error.stdout ?? ''),
      stderr: String(error.stderr ?? ''),
    };
  }
}

const stats = (over = {}) =>
  JSON.stringify({ killed: 70, timeout: 0, survived: 30, total: 100, skipped: 0, ...over });

test('the CLI runs: a missing stats file is a failure, not a silent pass', () => {
  const empty = serviceWithStats(null);
  try {
    const result = runCli(['check', empty]);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /no mutation stats/i);
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
});

test('the CLI fails a stats file below the floor, and names the score', () => {
  const dir = serviceWithStats(stats({ killed: 10, survived: 30, total: 40 }));
  try {
    const result = runCli(['check', dir]);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /25\.0%, under the 70% floor/);
    assert.match(result.stderr, /30 survived/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the CLI passes a stats file at the floor, and prints the score', () => {
  const dir = serviceWithStats(stats());
  try {
    const result = runCli(['check', dir]);
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /70\.0%/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a stats file with no mutants fails through the CLI itself', () => {
  const dir = serviceWithStats(JSON.stringify({ killed: 0, timeout: 0, survived: 0, total: 0, skipped: 0 }));
  try {
    const result = runCli(['check', dir]);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /no mutants were generated at all/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a truncated stats file fails rather than being scored', () => {
  const dir = serviceWithStats('{ not json');
  try {
    const result = runCli(['check', dir]);
    assert.notEqual(result.code, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the CLI refuses an unknown mode', () => {
  const result = runCli(['frobnicate', 'services/api']);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /unknown mode/);
});

test('the exported arithmetic stays mutmut own', () => {
  assert.equal(scoreOf({ killed: 70, timeout: 0, survived: 30, total: 100, skipped: 0 }), 70);
  assert.equal(checkStats({ killed: 68, timeout: 0, survived: 32, total: 100, skipped: 0 }).length, 1);
  assert.deepEqual(normaliseStats({ total: -1, killed: 'x' }), {
    total: 0,
    skipped: 0,
    killed: 0,
    timeout: 0,
  });
});

// --- BUG-241: the run mode must export the per-mutant survivor list ---------

test('the survivor list lands beside the stats as mutants/mutmut-results.txt', () => {
  assert.equal(RESULTS_RELATIVE, path.join('mutants', 'mutmut-results.txt'));
});

test('writeResults writes the list into the service mutants dir and returns the file', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mutation-results-'));
  try {
    const file = writeResults(dir, 'Survived app/main.py:12: x == y -> x != y\n');
    assert.equal(file, path.join(dir, 'mutants', 'mutmut-results.txt'));
    assert.equal(readFileSync(file, 'utf8'), 'Survived app/main.py:12: x == y -> x != y\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('writeResults creates the mutants dir when the run wrote nothing', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mutation-results-empty-'));
  try {
    const file = writeResults(dir, '');
    assert.equal(readFileSync(file, 'utf8'), '');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the mutmut command ends at the subcommand and carries each service own extras', () => {
  const api = buildMutmutCommand('services/api', ['results']);
  assert.deepEqual(api.slice(-2), ['mutmut', 'results']);
  // The API's suite needs s3test (tests/test_pod_store.py raises without it);
  // the path must be normalised so the lookup works on Windows too, where
  // path.relative returns `services\api` and the lookup would fall back.
  const extras = api.filter((_, i) => api[i - 1] === '--extra');
  assert.deepEqual(extras, ['dev', 's3test']);
  assert.ok(api.includes('--directory'));
  assert.ok(api.includes('services/api') || api.includes('services\\api'));

  const voice = buildMutmutCommand('services/courier-voice', ['results']);
  assert.deepEqual(voice.slice(-2), ['mutmut', 'results']);
  // s3test is not defined for courier-voice - naming it there failed (run 41241517747).
  assert.deepEqual(voice.filter((_, i) => voice[i - 1] === '--extra'), ['dev']);
});
