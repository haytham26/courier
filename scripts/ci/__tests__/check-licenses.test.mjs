// The test for the licence gate (BUG-103, the C1 audit's medium finding).
//
//   node --test scripts/ci/__tests__/check-licenses.test.mjs
//
// The defect: `pnpm view` failing (a registry outage, a timeout, a missing
// binary) answered `'unknown'`, and the gate read `'unknown'` as neither
// forbidden nor reviewable - so every package uncleared left the gate GREEN,
// "31 packages all unknown, exit 0". The gate now fails on a lookup that did
// not answer, and these tests pin both halves:
//   - a registry that does not answer fails the gate (RED first: the same
//     probe against the script as it was answered exit 0 with
//     "31 package(s) checked, no forbidden licence");
//   - a registry that answers a licence clears the gate, and one that answers
//     a forbidden licence still fails - the real check is not weakened to fix
//     the outage case.
//
// The answering tests run the gate against a `pnpm` shim on the PATH, which
// needs an executable file (Linux); on Windows `execFileSync` without a shell
// cannot run a `.cmd`, so those two are skipped here and the failing case -
// the defect itself - is platform-neutral.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const script = path.join(repoRoot, 'scripts', 'ci', 'check-licenses.mjs');
const CAN_SHIM = process.platform !== 'win32';

/** A working directory with the one file the gate reads before it looks up. */
function workdir() {
  const dir = mkdtempSync(path.join(tmpdir(), 'lic-'));
  writeFileSync(path.join(dir, 'pnpm-lock.yaml'), 'lockfileVersion: "9.0"\n', 'utf8');
  // The gate writes its inventory into docs/product/ when it is not there yet,
  // exactly as it does in the repo; the directory has to exist for that write.
  mkdirSync(path.join(dir, 'docs', 'product'), { recursive: true });
  return dir;
}

/** Runs the gate in the directory with the given PATH, and cleans up after. */
function runIn(dir, pathValue) {
  const result = spawnSync(process.execPath, [script], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, PATH: pathValue },
  });
  rmSync(dir, { recursive: true, force: true });
  return { status: result.status, out: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

/** A directory whose `pnpm` prints the given licence and answers nothing else. */
function shimDir(answer) {
  const dir = mkdtempSync(path.join(tmpdir(), 'lic-shim-'));
  const shim = path.join(dir, 'pnpm');
  writeFileSync(shim, `#!/bin/sh\necho '${answer}'\n`, 'utf8');
  chmodSync(shim, 0o755);
  return dir;
}

test('a registry that does not answer fails the gate (BUG-103)', () => {
  // RED first, platform-neutral: with no `pnpm` on the PATH the script as it
  // was answered "31 package(s) checked, no forbidden licence" and exit 0 -
  // the outage passing as a clean bill of health.
  const empty = mkdtempSync(path.join(tmpdir(), 'lic-nopath-'));
  const dir = workdir();
  const result = runIn(dir, empty);

  assert.equal(result.status, 1);
  assert.match(result.out, /the registry did not answer a licence/);
  assert.match(result.out, /BUG-103/);
  assert.doesNotMatch(result.out, /no forbidden licence/);
  rmSync(empty, { recursive: true, force: true });
});

test('a registry that answers a licence clears the gate', {
  skip: CAN_SHIM ? false : 'Windows cannot shim pnpm for execFileSync without a shell',
}, () => {
  const shim = shimDir('MIT');
  const dir = workdir();
  const result = runIn(dir, shim);

  assert.equal(result.status, 0, result.out);
  assert.match(result.out, /31 package\(s\) checked, no forbidden licence/);
  rmSync(shim, { recursive: true, force: true });
});

test('a forbidden licence still fails the gate', {
  skip: CAN_SHIM ? false : 'Windows cannot shim pnpm for execFileSync without a shell',
}, () => {
  const shim = shimDir('GPL-3.0');
  const dir = workdir();
  const result = runIn(dir, shim);

  assert.equal(result.status, 1);
  assert.match(result.out, /is forbidden in the shipped app/);
  rmSync(shim, { recursive: true, force: true });
});
