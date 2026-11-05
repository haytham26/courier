// The test for the Node pin gate (the 2026-11-05 audit's item 3i, C11).
//
//   node --test scripts/ci/__tests__/check-node-pin.test.mjs
//
// Every case is a property of the gate, run against fabricated workflow
// directories in a temp tree: the real tree passes, two different majors
// fail, a wrong major fails and names the file, a mismatched engines floor
// fails, and an empty tree fails (the gate cannot go vacuous).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CHECK = path.join(ROOT, 'scripts', 'ci', 'check-node-pin.mjs');
const PKG = path.join(ROOT, 'package.json');

function tree(files) {
  const dir = mkdtempSync(path.join(tmpdir(), 'node-pin-test-'));
  try {
    for (const [name, text] of Object.entries(files)) {
      writeFileSync(path.join(dir, name), text, 'utf8');
    }
    // The gate reads package.json from the repo root, so the fabricated
    // workflow tree runs against the REAL package.json - the engines floor is
    // asserted from the real file, the workflow majors from the fabricated one.
    const answer = spawnSync(process.execPath, [CHECK, dir], { encoding: 'utf8' });
    return { code: answer.status, out: answer.stdout + answer.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('the real tree passes', () => {
  const answer = spawnSync(process.execPath, [CHECK], { encoding: 'utf8' });
  assert.equal(answer.status, 0, answer.stdout + answer.stderr);
  assert.match(answer.stdout, /Node 24 is declared by all \d+ node-version line/);
});

test('two different majors fail and both are named', () => {
  const answer = tree({
    'a.yml': '          node-version: 24\n',
    'b.yml': '          node-version: 22\n',
  });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /2 different Node majors: 24 vs 22|22 vs 24/);
  assert.match(answer.out, /b\.yml:\d+: node-version: 22/);
});

test('a wrong major fails and names the file', () => {
  const answer = tree({ 'a.yml': '          node-version: 20\n' });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /a\.yml:\d+: node-version: 20 - the pinned major is 24/);
});

test('an empty tree fails rather than passing vacuously', () => {
  const answer = tree({ 'a.yml': 'name: x\njobs:\n  j:\n    steps:\n      - run: echo hi\n' });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /no node-version found/);
});

test('a quoted node-version is read', () => {
  const answer = tree({ 'a.yml': "          node-version: '24'\n" });
  assert.equal(answer.code, 0, answer.out);
});
