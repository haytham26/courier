// The test for BUG-198's gate (audit 2026-11-05 item 5: a manual dispatch of
// android-e2e.yml must run the emulator legs AND the A1 proof).
//
//   node --test scripts/ci/__tests__/check-e2e-dispatch.test.mjs
//
// Each case is the real workflow with one surgical edit in a temp tree: the
// damage the gate exists for (the human branch echoing only
// build/flows/scripts/pipeline - the exact shape that skipped the legs and A1
// on runs 42166994398 and 42167332868) and the near misses (e2e set but not
// a1, a job gating on the wrong output).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CHECK = path.join(ROOT, 'scripts', 'ci', 'check-e2e-dispatch.mjs');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'android-e2e.yml');

function fixtureDir() {
  const dir = mkdtempSync(path.join(tmpdir(), 'e2e-dispatch-'));
  mkdirSync(path.join(dir, '.github', 'workflows'), { recursive: true });
  return dir;
}

function runWith(source) {
  const dir = fixtureDir();
  writeFileSync(path.join(dir, '.github', 'workflows', 'android-e2e.yml'), source, 'utf8');
  const result = spawnSync(process.execPath, [CHECK, dir], { cwd: ROOT, encoding: 'utf8' });
  rmSync(dir, { recursive: true, force: true });
  return { code: result.status, out: result.stdout + result.stderr };
}

const REAL = readFileSync(WORKFLOW, 'utf8').replace(/\r\n/g, '\n');

test('the real workflow passes (BUG-198)', () => {
  const result = spawnSync(process.execPath, [CHECK], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /A1 proof/);
});

test('the human branch without e2e=true is refused', () => {
  // The exact pre-fix shape: only the four original outputs echoed.
  const broken = REAL.replace(
    '{ echo "build=true"; echo "flows=true"; echo "scripts=true"; echo "pipeline=true"; echo "e2e=true"; echo "a1=true"; }',
    '{ echo "build=true"; echo "flows=true"; echo "scripts=true"; echo "pipeline=true"; }',
  );
  assert.notEqual(broken, REAL, 'the fixture edit must change the workflow');
  const { code, out } = runWith(broken);
  assert.notEqual(code, 0);
  assert.match(out, /does not echo e2e=true/);
  assert.match(out, /does not echo a1=true/);
});

test('e2e set but a1 missing is refused', () => {
  const broken = REAL.replace('echo "a1=true"; ', '');
  assert.notEqual(broken, REAL);
  const { code, out } = runWith(broken);
  assert.notEqual(code, 0);
  assert.match(out, /does not echo a1=true/);
});

test('a job gating on the wrong output is refused', () => {
  const broken = REAL.replace("needs.changes.outputs.a1 == 'true'", "needs.changes.outputs.pipeline == 'true'");
  assert.notEqual(broken, REAL);
  const { code, out } = runWith(broken);
  assert.notEqual(code, 0);
  assert.match(out, /A1 job no longer gates/);
});

test('a missing human branch is refused', () => {
  const marker = 'if [ "${{ github.event_name }}" != "pull_request" ]';
  const start = REAL.indexOf(marker);
  assert.notEqual(start, -1, 'the fixture must find the human-branch line');
  const fi = REAL.indexOf('fi\n', start);
  assert.notEqual(fi, -1);
  const broken = REAL.slice(0, start) + REAL.slice(fi + 3);
  assert.notEqual(broken, REAL);
  const { code, out } = runWith(broken);
  assert.notEqual(code, 0);
  assert.match(out, /no human-dispatch branch/);
});
