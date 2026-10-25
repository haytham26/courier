// The tests of the E2E pins gate (BUG-064). Each one proves the gate catches a
// way the E2E can go non-deterministic again, and the last one proves it cannot
// go vacuous over this repository's own tree.
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checkWorkflowDir, readWorkflow, PINS } from '../check-e2e-pins.mjs';

const PINNED = `env:
  MAESTRO_VERSION: cli-2.11.0
  MAESTRO_SHA256: 5384593cb4e7a106489e75a821d157dd43f4e438df6bc308b72e82c685e1283a
  EMULATOR_BUILD: '16632760'
`;

const boot = (extra = '', withPins = true) => `name: A workflow
on: [push]
jobs:
  e2e:
    steps:
      - uses: actions/checkout@v4
      - uses: reactivecircus/android-emulator-runner@a421e43855164a8197daf9d8d40fe71c6996bb0d
        with:
          api-level: 35
${extra}`;

const treeWith = (files) => {
  const directory = mkdtempSync(path.join(tmpdir(), 'e2e-pins-'));
  mkdirSync(directory, { recursive: true });
  for (const [name, body] of Object.entries(files)) writeFileSync(path.join(directory, name), body, 'utf8');
  return directory;
};

test('a boot that declares no pins at all fails', () => {
  const problems = checkWorkflowDir(treeWith({ 'a.yml': boot() }));
  assert.ok(problems.some((line) => line.includes('MAESTRO_VERSION')), problems.join('|'));
  assert.ok(problems.some((line) => line.includes('MAESTRO_SHA256')), problems.join('|'));
  assert.ok(problems.some((line) => line.includes('EMULATOR_BUILD')), problems.join('|'));
});

test('a boot that does not pass emulator-build fails even with the pins', () => {
  const problems = checkWorkflowDir(treeWith({ 'a.yml': `${PINNED}${boot()}` }));
  assert.ok(problems.some((line) => line.includes('emulator-build')), problems.join('|'));
  assert.equal(problems.filter((line) => line.includes('MAESTRO_')).length, 0, problems.join('|'));
});

test('two workflows with different Maestro versions fail', () => {
  const other = PINNED.replace('cli-2.11.0', 'cli-2.10.0');
  const problems = checkWorkflowDir(
    treeWith({ 'a.yml': `${PINNED}${boot('          emulator-build: 16632760\n')}`, 'b.yml': `${other}${boot('          emulator-build: 16632760\n')}` }),
  );
  assert.ok(problems.some((line) => line.includes('differs across')), problems.join('|'));
});

test('a pin with the wrong shape fails, not passes', () => {
  const problems = checkWorkflowDir(
    treeWith({ 'a.yml': PINNED.replace('cli-2.11.0', 'latest').replace('16632760', 'abc') + boot('          emulator-build: 16632760\n') }),
  );
  assert.ok(problems.some((line) => line.includes('MAESTRO_VERSION=latest')), problems.join('|'));
  assert.ok(problems.some((line) => line.includes('EMULATOR_BUILD=abc')), problems.join('|'));
});

test('the fully pinned boot passes', () => {
  const problems = checkWorkflowDir(treeWith({ 'a.yml': `${PINNED}${boot('          emulator-build: 16632760\n')}` }));
  assert.deepEqual(problems, []);
});

test('a workflow that does not boot an emulator is not asked for pins', () => {
  const problems = checkWorkflowDir(
    treeWith({
      'a.yml': `name: plain\non: [push]\njobs:\n  go:\n    steps:\n      - run: echo hi\n`,
      'b.yml': `${PINNED}${boot('          emulator-build: 16632760\n')}`,
    }),
  );
  assert.deepEqual(problems, []);
});

test('a directory with no emulator boot fails: it would pass by seeing nothing', () => {
  const problems = checkWorkflowDir(treeWith({ 'a.yml': `name: plain\non: [push]\njobs:\n  go:\n    steps:\n      - run: echo hi\n`, 'b.yml': `name: plain2\non: [push]\n` }));
  assert.ok(problems.some((line) => line.includes('cannot see them')), problems.join('|'));
});

test('the env reader reads the real block and ignores a nested env:', () => {
  const workflow = readWorkflow(['on: [push]', 'env:', '  MAESTRO_VERSION: cli-2.11.0', 'jobs:', '  go:', '    env:', '      NOT_A_PIN: x'].concat(boot().split('\n')));
  assert.equal(workflow.env.MAESTRO_VERSION, 'cli-2.11.0');
  assert.equal(workflow.env.NOT_A_PIN, undefined);
  assert.equal(workflow.bootsEmulator, true);
});

test('the gate over this repository tree is not vacuous', () => {
  const workflows = fileURLToPath(new URL('../../../.github/workflows/', import.meta.url));
  const problems = checkWorkflowDir(workflows);
  assert.deepEqual(problems, [], problems.join('|'));
  assert.deepEqual(PINS, ['MAESTRO_VERSION', 'MAESTRO_SHA256', 'EMULATOR_BUILD']);
});
