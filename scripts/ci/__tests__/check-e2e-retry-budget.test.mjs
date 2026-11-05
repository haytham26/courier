// The test for the retry-budget gate (the 2026-11-05 audit's item 3h).
//
//   node --test scripts/ci/__tests__/check-e2e-retry-budget.test.mjs
//
// Every case is a property of the gate, run against fabricated workflows in a
// temp tree: the real workflow passes, a job with no budget fails and is named,
// a budget that is not the job's first step fails, one that does not read the
// run attempt fails, one that does not fail past the second attempt fails, and
// one that does not write the job summary fails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CHECK = path.join(ROOT, 'scripts', 'ci', 'check-e2e-retry-budget.mjs');

const READY = (job) => `
  ${job}:
    name: ${job === 'e2e' ? 'Run the Maestro flows' : 'A1: the app against the real API (no mock)'}
    runs-on: ubuntu-latest
    steps:
      - name: The retry budget
        run: |
          attempt="\${{ github.run_attempt }}"
          if [ "$attempt" -gt 2 ]; then
            echo "::error::the flake budget is spent"
            exit 1
          fi
          if [ "$attempt" -eq 2 ]; then
            echo "write the justification here" >> "$GITHUB_STEP_SUMMARY"
          fi
      - name: Do the work
        run: echo worked
`;

const NO_BUDGET = (job) => `
  ${job}:
    name: A job
    runs-on: ubuntu-latest
    steps:
      - name: Do the work
        run: echo worked
`;

const LATE_BUDGET = (job) => `
  ${job}:
    name: A job
    runs-on: ubuntu-latest
    steps:
      - name: Do the work
        run: echo worked
      - name: The retry budget
        run: |
          attempt="\${{ github.run_attempt }}"
          if [ "$attempt" -gt 2 ]; then exit 1; fi
          if [ "$attempt" -eq 2 ]; then echo "justification" >> "$GITHUB_STEP_SUMMARY"; fi
`;

function workflow(blocks) {
  return `name: Android E2E\njobs:\n${blocks.join('\n')}\n`;
}

function run(text) {
  const dir = mkdtempSync(path.join(tmpdir(), 'retry-budget-test-'));
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
  assert.match(answer.out, /fail past their second attempt/);
});

test('a job with no budget fails and is named', () => {
  const answer = run(workflow([NO_BUDGET('e2e'), NO_BUDGET('a1')]));
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /the e2e job has no retry budget step/);
  assert.match(answer.out, /the a1 job has no retry budget step/);
});

test('a budget that is not the first step of the job fails', () => {
  const answer = run(workflow([READY('e2e'), LATE_BUDGET('a1')]));
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /the a1 job's retry budget is not its first step/);
});

test('a budget that does not read the run attempt fails', () => {
  const answer = run(
    workflow([
      READY('e2e').replace('\${{ github.run_attempt }}', '1'),
      READY('a1'),
    ]),
  );
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /does not read github.run_attempt/);
});

test('a budget that never fails fails the gate', () => {
  const answer = run(
    workflow([
      READY('e2e').replace('if [ "$attempt" -gt 2 ]; then\n            echo "::error::the flake budget is spent"\n            exit 1\n          fi', 'if false; then exit 1; fi'),
      READY('a1'),
    ]),
  );
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /does not fail past the second attempt/);
});

test('a budget that does not write the job summary fails', () => {
  const answer = run(
    workflow([
      READY('e2e').replace('>> "$GITHUB_STEP_SUMMARY"', '>> /dev/null'),
      READY('a1'),
    ]),
  );
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /does not write the job summary/);
});
