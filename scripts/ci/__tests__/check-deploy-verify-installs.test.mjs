// The test for the deploy-verify gate (BUG-070).
//
//   node --test scripts/ci/__tests__/check-deploy-verify-installs.test.mjs
//
// The gate reads a workflow as text, so the tests drive the shapes that matter:
// the ordering (the install before the deploy call), the mis-ordering (the
// install after it), the missing install, a step that installs something other
// than the workspace, and a workflow that is not a deploy workflow at all. The
// last test reads the repository's own file, so the gate cannot go vacuous
// while the unit tests pass — which is exactly what BUG-070 was: a green gate
// over a workflow that could only ever be red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BUG_ID,
  checkDeployWorkflow,
  defaultDeployWorkflow,
  readDeployWorkflow,
} from '../check-deploy-verify-installs.mjs';

const RIGHT = [
  'name: Deploy staging',
  'jobs:',
  '  verify:',
  '    steps:',
  '      - name: Set up pnpm',
  '        run: pnpm',
  '      - name: Install the workspace',
  '        run: pnpm install --frozen-lockfile',
  '      - name: Bring the staging stack up',
  '        run: bash infra/deploy.sh apply --from infra/ci-staging.env',
  '',
  '  deploy:',
  '    steps:',
  '      - run: echo "the OCI secrets are absent, so this leg is skipped"',
].join('\n');

test('the install step before the deploy call is right', () => {
  assert.deepEqual(checkDeployWorkflow(RIGHT), []);
});

test('the install step AFTER the deploy call fails: the migration still dies', () => {
  const wrong = [
    'jobs:',
    '  verify:',
    '    steps:',
    '      - name: Bring the staging stack up',
    '        run: bash infra/deploy.sh apply --from infra/ci-staging.env',
    '      - name: Install the workspace',
    '        run: pnpm install --frozen-lockfile',
  ].join('\n');
  const failures = checkDeployWorkflow(wrong);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /AFTER/);
});

test('a verify leg with no install step fails', () => {
  const wrong = [
    'jobs:',
    '  verify:',
    '    steps:',
    '      - name: Bring the staging stack up',
    '        run: bash infra/deploy.sh apply --from infra/ci-staging.env',
  ].join('\n');
  const failures = checkDeployWorkflow(wrong);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /dependencies are never installed/);
});

test('an install step that installs something else fails', () => {
  const wrong = [
    'jobs:',
    '  verify:',
    '    steps:',
    '      - name: Install the workspace',
    '        run: pnpm add zod',
    '      - name: Bring the staging stack up',
    '        run: bash infra/deploy.sh apply --from infra/ci-staging.env',
  ].join('\n');
  const failures = checkDeployWorkflow(wrong);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /pnpm install --frozen-lockfile/);
});

test('a workflow without a verify job fails rather than passing', () => {
  assert.deepEqual(checkDeployWorkflow('name: something else\njobs:\n'), [
    'this is not a workflow with a verify job',
  ]);
});

test("the repository's own deploy workflow passes", () => {
  const failures = checkDeployWorkflow(readDeployWorkflow(defaultDeployWorkflow));
  assert.deepEqual(failures, [], `the repo's deploy.yml is wrong: ${failures.join('; ')}`);
});

test('the gate carries the bug it fixes', () => {
  assert.equal(BUG_ID, 'BUG-070');
});
