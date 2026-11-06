// The test for the AVD restore gate (the 2026-11-05 audit's item 3e).
//
//   node --test scripts/ci/__tests__/check-e2e-avd-restore-keys.test.mjs
//
// Every case is a property of the gate, run against fabricated workflows in a
// temp tree: the real workflows pass, a workflow with a restore-keys prefix
// fails and names the file, one whose key drops the pins fingerprint fails,
// and a workflow that boots no emulator at all is not this gate's business.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CHECK = path.join(ROOT, 'scripts', 'ci', 'check-e2e-avd-restore-keys.mjs');

const CACHE_READY = `
jobs:
  e2e:
    steps:
      - name: The pins' fingerprint
        id: pins
      - name: Cache the AVD snapshot
        uses: actions/cache@0057852bfaa89a56745cba8c7296529d2fc39830
        with:
          path: ~/.android/avd
          key: avd-\${{ runner.os }}-\${{ matrix.api }}-google-apis-x86_64-\${{ steps.pins.outputs.hash }}
`;

const CACHE_WITH_RESTORE = CACHE_READY + `
          restore-keys: |
            avd-\${{ runner.os }}-\${{ matrix.api }}-google-apis-x86_64-
`;

const CACHE_NO_FINGERPRINT = `
jobs:
  e2e:
    steps:
      - name: The pins' fingerprint
        id: pins
      - name: Cache the AVD snapshot
        uses: actions/cache@0057852bfaa89a56745cba8c7296529d2fc39830
        with:
          path: ~/.android/avd
          key: avd-\${{ runner.os }}-\${{ matrix.api }}-google-apis-x86_64
`;

function tree(files) {
  const dir = mkdtempSync(path.join(tmpdir(), 'avd-restore-test-'));
  try {
    mkdirSync(path.join(dir, '.github', 'workflows'), { recursive: true });
    for (const [name, text] of Object.entries(files)) {
      writeFileSync(path.join(dir, '.github', 'workflows', name), text, 'utf8');
    }
    const answer = spawnSync(process.execPath, [CHECK], { cwd: dir, encoding: 'utf8' });
    return { code: answer.status, out: answer.stdout + answer.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('the real workflows pass', () => {
  const answer = tree({});
  assert.equal(answer.code, 0, answer.out);
  assert.match(answer.out, /only an EXACT key restores/);
});

test('a workflow with a restore-keys prefix fails and names the file', () => {
  const answer = tree({ 'android-e2e.yml': 'name: E2E\n' + CACHE_WITH_RESTORE });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /android-e2e\.yml: 1 restore-keys/);
  assert.match(answer.out, /Only an exact key restores/);
});

test('a workflow whose key drops the pins fingerprint fails', () => {
  const answer = tree({ 'android-e2e-health.yml': 'name: Health\n' + CACHE_NO_FINGERPRINT });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /android-e2e-health\.yml: the AVD cache key does not carry the pins fingerprint/);
});

test('a workflow that boots no emulator is not this gate\'s business', () => {
  const answer = tree({ 'android-e2e.yml': 'name: E2E\njobs:\n  build:\n    steps:\n      - run: echo hi\n' });
  assert.equal(answer.code, 0, answer.out);
});

test('a health workflow with a restore-keys fails even though the e2e one is clean', () => {
  const answer = tree({
    'android-e2e.yml': 'name: E2E\n' + CACHE_READY,
    'android-e2e-health.yml': 'name: Health\n' + CACHE_WITH_RESTORE,
  });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /android-e2e-health\.yml: 1 restore-keys/);
});
