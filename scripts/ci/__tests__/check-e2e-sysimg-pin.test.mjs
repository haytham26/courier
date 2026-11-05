// The test for the system-image pin gate (the 2026-11-05 audit's item 3f).
//
//   node --test scripts/ci/__tests__/check-e2e-sysimg-pin.test.mjs
//
// Every case is a property of the gate, run against fabricated workflows in a
// temp tree: the real workflow passes, an unpinned tree fails on every leg, a
// matrix api without its pin fails, a fingerprint that ignores the pin fails,
// an install step without the wipe or the assertion fails, an install step
// that calls a bare sdkmanager (no cmdline-tools PATH resolution, BUG-225)
// fails, and a record step that only records fails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CHECK = path.join(ROOT, 'scripts', 'ci', 'check-e2e-sysimg-pin.mjs');

const READY = `
name: Android E2E
env:
  MAESTRO_VERSION: cli-2.11.0
  SYSIMG_REV_34: '14'
  SYSIMG_REV_35: '9'
jobs:
  e2e:
    strategy:
      matrix:
        api: [34, 35]
    steps:
      - name: The pins' fingerprint
        id: pins
        run: |
          set -euo pipefail
          rev_var="SYSIMG_REV_34"
          fingerprint="x/\${!rev_var}"
          echo "revision=\${!rev_var}" >> "$GITHUB_OUTPUT"
      - name: Cache the pinned system image
        uses: actions/cache@0057852bfaa89a56745cba8c7296529d2fc39830
        with:
          path: /sdk/system-images
          key: sysimg-rev\${{ steps.pins.outputs.revision }}
      - name: Install the pinned system image, and assert its revision
        run: |
          set -euo pipefail
          tools_bin="$(ls -d "$sdk"/cmdline-tools/*/bin 2>/dev/null | sort -V | tail -n 1 || true)"
          if [ -z "$tools_bin" ] || [ ! -x "$tools_bin/sdkmanager" ]; then echo "::error::no sdkmanager under $sdk"; exit 1; fi
          echo "$tools_bin" >> "$GITHUB_PATH"
          export PATH="$tools_bin:$PATH"
          until yes | sdkmanager "$image"; do
            if [ "$attempt" -ge 3 ]; then echo "::error::no install in 3 attempts"; exit 1; fi
            rm -rf "$dir"
          done
          if [ "$got" != "$want" ]; then echo "Pkg.Revision"; exit 1; fi
      - name: Record the pins this run actually used
        run: |
          echo "system_image_revision=\${rev:-unknown}"
          echo "::error::Bump the pin in its own PR"
`;

function run(text) {
  const dir = mkdtempSync(path.join(tmpdir(), 'sysimg-pin-test-'));
  try {
    mkdirSync(path.join(dir, '.github', 'workflows'), { recursive: true });
    writeFileSync(path.join(dir, '.github', 'workflows', 'android-e2e.yml'), text, 'utf8');
    const answer = spawnSync(process.execPath, [CHECK], { cwd: dir, encoding: 'utf8' });
    return { code: answer.status, out: answer.stdout + answer.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('the real workflow passes', () => {
  const answer = run(readFileSync(path.join(ROOT, '.github/workflows/android-e2e.yml'), 'utf8'));
  assert.equal(answer.code, 0, answer.out);
  assert.match(answer.out, /the system image is pinned/);
});

test('a workflow with no pin at all fails on every leg', () => {
  const answer = run('name: E2E\njobs:\n  e2e:\n    steps:\n      - run: echo hi\n');
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /no SYSIMG_REV_<api> pin/);
});

test('a matrix api without its own pin fails', () => {
  const answer = run(READY.replace("  SYSIMG_REV_35: '9'\n", ''));
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /SYSIMG_REV_35 pin: that leg's image floats/);
});

test('a fingerprint that ignores the pin fails', () => {
  const answer = run(READY.replace('rev_var="SYSIMG_REV_34"', 'rev_var=""'));
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /does not read SYSIMG_REV_<api> through a variable/);
});

test('an install step that does not wipe between attempts fails', () => {
  const answer = run(READY.replace('            rm -rf "$dir"\n', ''));
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /does not wipe the image directory/);
});

test('a record step that only records fails', () => {
  const answer = run(READY.replace('          echo "::error::Bump the pin in its own PR"\n', ''));
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /only records the revision/);
});

test('an install step that calls sdkmanager without resolving cmdline-tools onto PATH fails (BUG-225)', () => {
  const without = READY.replace(
    '          tools_bin="$(ls -d "$sdk"/cmdline-tools/*/bin 2>/dev/null | sort -V | tail -n 1 || true)"\n' +
      '          if [ -z "$tools_bin" ] || [ ! -x "$tools_bin/sdkmanager" ]; then echo "::error::no sdkmanager under $sdk"; exit 1; fi\n' +
      '          echo "$tools_bin" >> "$GITHUB_PATH"\n' +
      '          export PATH="$tools_bin:$PATH"\n',
    '',
  );
  assert.notEqual(without, READY, 'the fixture mutation did not apply');
  const answer = run(without);
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /cmdline-tools\/\*\/bin/);
  assert.match(answer.out, /BUG-225/);
});

test('an install step with no failing existence check for sdkmanager fails (BUG-225)', () => {
  const answer = run(READY.replace(' || [ ! -x "$tools_bin/sdkmanager" ]', ''));
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /existence check/);
});
