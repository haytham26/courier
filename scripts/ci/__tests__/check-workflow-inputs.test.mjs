// The test for the workflow-inputs gate (BUG-067).
//
//   node --test scripts/ci/__tests__/check-workflow-inputs.test.mjs
//
// The gate reads workflow files as text, so the tests drive the shapes the real
// workflows use and the shapes that would fool a weaker parser:
//   - the invalid form itself, which is what map-pack.yml shipped for 65 runs;
//   - the valid `github.event.inputs` form, which must not be flagged;
//   - an `inputs` mention in a comment, which is documentation, not an expression;
//   - an expression whose spacing differs (`${{inputs.x}}`), which GitHub reads
//     the same way;
//   - a dispatch-only workflow, which the gate still flags: the form is invalid
//     the moment another event is added, and the cost of the strictness is zero;
//   - a directory that does not exist, which fails rather than scanning zero
//     files;
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
} from '../check-workflow-inputs.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const script = path.join(repoRoot, 'scripts', 'ci', 'check-workflow-inputs.mjs');

test('the bare inputs context is a violation', () => {
  const result = checkWorkflow(['      SOURCE_ID: ${{ inputs.source_id }}']);
  assert.equal(result.ok, false);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].line, 1);
});

test('the github context form is not', () => {
  const result = checkWorkflow(["      SOURCE_ID: ${{ github.event.inputs.source_id || '' }}"]);
  assert.equal(result.ok, true);
  assert.equal(result.violations.length, 0);
});

test('a comment naming inputs is documentation, not an expression', () => {
  const result = checkWorkflow(['  # the gate reads `inputs` the wrong way (BUG-067)']);
  assert.equal(result.ok, true);
});

test('spacing is not a difference: ${{inputs.x}} is the same context', () => {
  const result = checkWorkflow(['      APP_ID: ${{inputs.app_id}}']);
  assert.equal(result.ok, false);
  assert.match(result.violations[0].problem, /github\.event\.inputs/);
});

test('a dispatch-only workflow is flagged too: the form is never the right one', () => {
  const result = checkWorkflow([
    'on:',
    '  workflow_dispatch:',
    'jobs:',
    '  build:',
    '    steps:',
    '      - run: echo ok',
    '        env:',
    '          SOURCE_ID: ${{ inputs.source_id }}',
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
    ['on:', '  push:', 'jobs:', '  build:', "    env: { A: '${{ inputs.a }}' }"].join('\n'),
  );
  assert.throws(() => execFileSync(process.execPath, [script, dirty], { stdio: 'pipe' }));
  rmSync(dirty, { recursive: true, force: true });
});

test('the bug it exists for is named', () => {
  assert.equal(BUG_ID, 'BUG-067');
});
