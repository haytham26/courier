// The test for the emulator workflow's job-level filter (the audit's item 3g).
//
//   node --test scripts/ci/__tests__/check-e2e-trigger-conditions.test.mjs
//
// Every case is a property of the gate, run against fabricated workflows in a
// temp tree: the real workflow passes, a trigger that still carries the paths
// filter fails, a workflow with no changes job fails, a job with no if: fails,
// a job whose if: does not read the changes job fails, and one that does not
// gate on the build's success fails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CHECK = path.join(ROOT, 'scripts', 'ci', 'check-e2e-trigger-conditions.mjs');

const READY_TRIGGER = `
on:
  pull_request:
    branches:
      - main
  push:
    branches:
      - main
    paths:
      - 'apps/**'
  workflow_dispatch:
`;

const READY_CHANGES = `
  changes:
    name: What changed
    outputs:
      build: \${{ steps.diff.outputs.build }}
      e2e: \${{ steps.diff.outputs.e2e }}
      a1: \${{ steps.diff.outputs.a1 }}
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          fetch-depth: 0
      - name: What this change touches
        id: diff
        run: |
          changed="$(git diff --name-only "$base" HEAD)"
          echo "build=\$app" >> "$GITHUB_OUTPUT"
          echo "e2e=\$e2e" >> "$GITHUB_OUTPUT"
          echo "a1=\$a1" >> "$GITHUB_OUTPUT"
`;

const READY_BUILD = `
  build:
    name: Build the release APK
    if: needs.changes.outputs.build == 'true' || needs.changes.outputs.e2e == 'true'
    needs: changes
    runs-on: ubuntu-latest
    steps:
      - run: echo built
`;

const READY_E2E = `
  e2e:
    name: Run the Maestro flows
    if: always() && needs.changes.outputs.e2e == 'true' && needs.build.result == 'success'
    needs: [changes, build]
    runs-on: ubuntu-latest
    steps:
      - run: echo flows
`;

const READY_A1 = `
  a1:
    name: 'A1: the app against the real API (no mock)'
    if: always() && needs.changes.outputs.a1 == 'true' && needs.build.result == 'success'
    needs: [changes, build]
    runs-on: ubuntu-latest
    steps:
      - run: echo a1
`;

function workflow(parts) {
  return `name: Android E2E\n${parts.join('\n')}\n`;
}

function run(text) {
  const dir = mkdtempSync(path.join(tmpdir(), 'e2e-trigger-test-'));
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
  assert.match(answer.out, /no paths filter, the changes job diffs/);
});

test('a trigger that still carries the paths filter fails', () => {
  const answer = run(
    workflow([
      'on:\n  pull_request:\n    branches:\n      - main\n    paths:\n      - \'apps/**\'',
      READY_CHANGES,
      READY_BUILD,
      READY_E2E,
      READY_A1,
    ]),
  );
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /still carries a paths: filter/);
});

test('a workflow with no changes job fails', () => {
  const answer = run(workflow([READY_TRIGGER, READY_BUILD, READY_E2E, READY_A1]));
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /no changes job/);
});

test('a changes job that uses a third-party action instead of git fails', () => {
  const answer = run(
    workflow([
      READY_TRIGGER,
      READY_CHANGES.replace('git diff --name-only', 'echo nothing'),
      READY_BUILD,
      READY_E2E,
      READY_A1,
    ]),
  );
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /does not diff the paths with a plain `git diff --name-only`/);
});

test('a changes job with a shallow clone fails', () => {
  const answer = run(
    workflow([
      READY_TRIGGER,
      READY_CHANGES.replace('      fetch-depth: 0\n', ''),
      READY_BUILD,
      READY_E2E,
      READY_A1,
    ]),
  );
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /does not fetch the whole history/);
});

test('a job with no if: fails and is named', () => {
  const answer = run(
    workflow([
      READY_TRIGGER,
      READY_CHANGES,
      READY_BUILD.replace("    if: needs.changes.outputs.build == 'true' || needs.changes.outputs.e2e == 'true'\n", ''),
      READY_E2E,
      READY_A1,
    ]),
  );
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /the build job has no if:/);
});

test('a build that does not cover the flow-only case fails', () => {
  const answer = run(
    workflow([
      READY_TRIGGER,
      READY_CHANGES,
      READY_BUILD.replace(" || needs.changes.outputs.e2e == 'true'", ''),
      READY_E2E,
      READY_A1,
    ]),
  );
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /does not run for a flow-only change/);
});

test('a leg that does not gate on the build job\'s success fails', () => {
  const answer = run(
    workflow([
      READY_TRIGGER,
      READY_CHANGES,
      READY_BUILD,
      READY_E2E.replace(" && needs.build.result == 'success'", ''),
      READY_A1,
    ]),
  );
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /the e2e job does not gate on the build job's success/);
});
