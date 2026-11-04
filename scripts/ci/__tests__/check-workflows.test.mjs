// The test for the workflow-file gate (BUG-067).
//
//   node --test scripts/ci/__tests__/check-workflows.test.mjs
//
// The gate reads workflow files as text, so the tests drive the shapes the real
// workflows use and the shapes that would fool a weaker parser:
//   - the BUG-067 root cause itself: `if-no-files-found` written at a step's own
//     level, where it is not a step key and GitHub refuses the whole workflow;
//   - the same name inside `with:`, which is where the action reads it;
//   - the invalid `inputs` form, the valid `github.event.inputs` form, and an
//     `inputs` mention in a comment, which is documentation;
//   - a key inside a step's `with:` or inside a `run: |` block scalar, which is
//     not YAML and must not be read as one;
//   - a dispatch-only workflow, which the gate still flags;
//   - a directory that does not exist, which fails rather than scanning nothing;
//   - the repo's own tree, so the gate cannot go vacuous while the unit tests
//     pass.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BUG_ID,
  checkWorkflow,
  checkWorkflowDir,
  defaultWorkflowDir,
} from '../check-workflows.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const script = path.join(repoRoot, 'scripts', 'ci', 'check-workflows.mjs');

test('the BUG-067 root cause: an input of the action written as a step key', () => {
  const result = checkWorkflow([
    'on:',
    '  push:',
    'jobs:',
    '  build:',
    '    steps:',
    '      - name: Upload the pack',
    '        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
    '        with:',
    '          name: canterbury-pack',
    '        if-no-files-found: error',
  ]);
  assert.equal(result.ok, false);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].line, 10);
  assert.match(result.violations[0].problem, /not a key a step may carry/);
});

test('the same name inside with: is where the action reads it', () => {
  const result = checkWorkflow([
    'jobs:',
    '  build:',
    '    steps:',
    '      - name: Upload the pack',
    '        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
    '        with:',
    '          name: canterbury-pack',
    '          if-no-files-found: error',
  ]);
  assert.equal(result.ok, true);
});

test('a key inside a run: block scalar is not YAML and is not read as one', () => {
  const result = checkWorkflow([
    'jobs:',
    '  build:',
    '    steps:',
    '      - name: The shim',
    '        run: |',
    '          printf \'%s\\n\' "here: $(pwd)"',
    '          KEY: value',
    '          echo done',
  ]);
  assert.equal(result.ok, true);
});

test('a key inside a step with: is an input, not a step key', () => {
  const result = checkWorkflow([
    'jobs:',
    '  build:',
    '    steps:',
    '      - uses: pnpm/action-setup@b906affcce14559ad1aafd4ab0e942779e9f58b1',
    '        with:',
    '          version: 12.14.0',
    '          run_install: false',
  ]);
  assert.equal(result.ok, true);
});

test('the workflow-level mapping is not a job', () => {
  const result = checkWorkflow([
    'name: Store readiness',
    'on:',
    '  push:',
    '    branches:',
    "      - 'v*'",
    '  workflow_dispatch:',
    'jobs:',
    '  build:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - run: echo ok',
  ]);
  assert.equal(result.ok, true);
});

test('an unknown key at a job level fails, and a known one passes', () => {
  const bad = checkWorkflow([
    'jobs:',
    '  build:',
    '    run-on: ubuntu-latest',
    '    steps:',
    '      - run: echo ok',
  ]);
  assert.equal(bad.ok, false);
  assert.match(bad.violations[0].problem, /not a key a job may carry/);

  const good = checkWorkflow([
    'jobs:',
    '  build:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - run: echo ok',
  ]);
  assert.equal(good.ok, true);
});

test('the bare inputs context is a violation, the github context is not', () => {
  const bare = checkWorkflow([
    'jobs:',
    '  build:',
    '    steps:',
    '      - env:',
    '          A: ${{ inputs.a }}',
    '        run: echo ok',
  ]);
  assert.equal(bare.ok, false);
  assert.match(bare.violations[0].problem, /github\.event\.inputs/);

  const event = checkWorkflow([
    'jobs:',
    '  build:',
    '    steps:',
    '      - env:',
    "          A: ${{ github.event.inputs.a || '' }}",
    '        run: echo ok',
  ]);
  assert.equal(event.ok, true);
});

test('a comment naming inputs is documentation, not an expression', () => {
  const result = checkWorkflow(['  # the gate reads `inputs` the wrong way (BUG-067)']);
  assert.equal(result.ok, true);
});

test('spacing is not a difference: ${{inputs.x}} is the same context', () => {
  const result = checkWorkflow([
    'jobs:',
    '  build:',
    '    steps:',
    '      - env:',
    '          A: ${{inputs.a}}',
    '        run: echo ok',
  ]);
  assert.equal(result.ok, false);
});

test('a directory that does not exist fails rather than scanning nothing', () => {
  const result = checkWorkflowDir(path.join(tmpdir(), 'no', 'such', 'workflows'));
  assert.equal(result.ok, false);
  assert.match(result.violations[0].problem, /does not exist/);
});

test("the repo's own workflows pass, which is the bug fixed", () => {
  const result = checkWorkflowDir(defaultWorkflowDir());
  assert.equal(result.ok, true, `violations: ${JSON.stringify(result.violations)}`);
  assert.ok(
    result.checked.length >= 8,
    `expected the repo's workflows, checked ${result.checked.length}`,
  );
});

test("the script's exit code is what CI sees", () => {
  const clean = mkdtempSync(path.join(tmpdir(), 'wf-clean-'));
  writeFileSync(
    path.join(clean, 'ok.yml'),
    ['on:', '  push:', 'jobs:', '  build:', '    steps:', '      - run: echo ok'].join('\n'),
  );
  execFileSync(process.execPath, [script, clean], { stdio: 'pipe' });
  rmSync(clean, { recursive: true, force: true });

  const dirty = mkdtempSync(path.join(tmpdir(), 'wf-dirty-'));
  writeFileSync(
    path.join(dirty, 'bad.yml'),
    ['jobs:', '  build:', '    steps:', '        if-no-files-found: error'].join('\n'),
  );
  assert.throws(() => execFileSync(process.execPath, [script, dirty], { stdio: 'pipe' }));
  rmSync(dirty, { recursive: true, force: true });
});

test('the bug it exists for is named', () => {
  assert.equal(BUG_ID, 'BUG-067');
});

// BUG-100: a `secrets.*` reference in a JOB-level `env:` is a secret every step
// (and every third-party action) can read, so the gate enforces where the
// credential lives. This is the test that was red before the rule: the shape
// `store-ready.yml` carried, with no finding written by hand.
test('a secret at a job level is a violation, at a step level it is not', () => {
  const atJobLevel = checkWorkflow([
    'jobs:',
    '  store-ready:',
    '    runs-on: ubuntu-latest',
    '    env:',
    '      APP_STORE_CONNECT_KEY_ID: ${{ secrets.APP_STORE_CONNECT_KEY_ID }}',
    '    steps:',
    '      - run: echo the check',
  ]);
  assert.equal(atJobLevel.ok, false);
  assert.match(atJobLevel.violations[0].problem, /job-level/);

  const atStepLevel = checkWorkflow([
    'jobs:',
    '  store-ready:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - name: the one step that reads it',
    '        env:',
    '          APP_STORE_CONNECT_KEY_ID: ${{ secrets.APP_STORE_CONNECT_KEY_ID }}',
    '        run: echo the check',
  ]);
  assert.equal(atStepLevel.ok, true);
});

// BUG-162: the rule is what found the second instance, on the repo's own
// workflows, while it was being added - which is the proof it is a gate and not
// a note. The repo's workflows are clean now, and this keeps them that way.
test("the repo's own workflows carry no job-level secret", () => {
  const result = checkWorkflowDir();
  assert.equal(result.ok, true, result.violations.map((v) => `${v.file}:${v.line}`).join(', '));
});

// BUG-108: the parser used to read the indentation itself, so a workflow
// written in any other valid YAML style was not parsed and was reported clean -
// a gate that waves through what it cannot see. The structure is read now, and
// these are the two shapes that fooled the indent reader:
//   - a wider indent, where the job-level secret sits at twelve columns instead
//     of the six the old rule recognised;
//   - a sequence at its parent key's own column, where a step's keys sit where
//     the old reader expected a job's.
test('a wider indent carries the same job-level secret (BUG-108)', () => {
  const result = checkWorkflow([
    'jobs:',
    '    store-ready:',
    '        runs-on: ubuntu-latest',
    '        env:',
    '            APP_STORE_CONNECT_KEY_ID: ${{ secrets.APP_STORE_CONNECT_KEY_ID }}',
    '        steps:',
    '            - run: echo the check',
  ]);
  assert.equal(result.ok, false);
  assert.match(result.violations[0].problem, /job-level/);
});

test('a sequence at its parent key\'s column is read too (BUG-108)', () => {
  const clean = checkWorkflow([
    'jobs:',
    '  build:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '    - name: Upload',
    '      uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262',
    '    - run: echo ok',
  ]);
  assert.equal(clean.ok, true, clean.violations.map((v) => v.problem).join('; '));

  const dirty = checkWorkflow([
    'jobs:',
    '  build:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '    - name: Upload',
    '      uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02',
    '      with:',
    '        name: canterbury-pack',
    '      if-no-files-found: error',
  ]);
  assert.equal(dirty.ok, false);
  assert.match(dirty.violations[0].problem, /not a key a step may carry/);
});
