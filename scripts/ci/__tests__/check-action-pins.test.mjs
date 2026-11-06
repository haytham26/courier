// The test for the every-action pin gate (the 2026-11-05 audit's item 3i, C10).
//
//   node --test scripts/ci/__tests__/check-action-pins.test.mjs
//
// Every case is a property of the gate, run against fabricated workflow
// directories in a temp tree: the real tree passes, a tag ref fails and names
// the file, a branch ref fails, a short sha fails, a docker image without a
// digest fails, a local ./ action passes, and an empty tree fails (the gate
// cannot go vacuous).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CHECK = path.join(ROOT, 'scripts', 'ci', 'check-action-pins.mjs');

const SHA = 'a'.repeat(40);

function tree(files) {
  const dir = mkdtempSync(path.join(tmpdir(), 'action-pins-test-'));
  try {
    for (const [name, text] of Object.entries(files)) {
      writeFileSync(path.join(dir, name), text, 'utf8');
    }
    const answer = spawnSync(process.execPath, [CHECK, dir], { encoding: 'utf8' });
    return { code: answer.status, out: answer.stdout + answer.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('the real tree passes', () => {
  const answer = spawnSync(process.execPath, [CHECK], { encoding: 'utf8' });
  assert.equal(answer.status, 0, answer.stdout + answer.stderr);
  assert.match(answer.stdout, /all \d+ uses: ref\(s\).*pinned to a commit sha/);
});

test('a tag ref fails and names the file', () => {
  const answer = tree({
    'a.yml': `      - uses: actions/checkout@v4\n      - uses: actions/setup-node@${SHA} # v4\n`,
  });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /a\.yml:1: "actions\/checkout@v4" is not pinned to a full 40-hex commit sha/);
});

test('a branch ref fails', () => {
  const answer = tree({ 'a.yml': '      - uses: actions/checkout@main\n' });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /not pinned to a full 40-hex commit sha/);
});

test('a short sha fails', () => {
  const answer = tree({ 'a.yml': '      - uses: actions/checkout@11d5960\n' });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /not pinned to a full 40-hex commit sha/);
});

test('a docker image without a digest fails, with a digest passes', () => {
  const bad = tree({ 'a.yml': '      - uses: docker://alpine:3.20\n' });
  assert.notEqual(bad.code, 0);
  assert.match(bad.out, /no @sha256: digest/);
  const good = tree({
    'a.yml': `      - uses: docker://alpine@sha256:${'c'.repeat(64)}\n`,
  });
  assert.equal(good.code, 0, good.out);
});

test('a local ./ action passes', () => {
  const answer = tree({
    'a.yml': `      - uses: ./.github/actions/mine\n      - uses: actions/checkout@${SHA} # v4\n`,
  });
  assert.equal(answer.code, 0, answer.out);
});

test('the two-line step spelling is read', () => {
  const answer = tree({
    'a.yml': `      - name: Checkout\n        uses: actions/checkout@v4\n`,
  });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /a\.yml:2: "actions\/checkout@v4"/);
});

test('an empty tree fails rather than passing vacuously', () => {
  const answer = tree({ 'a.yml': 'name: x\njobs:\n  j:\n    steps:\n      - run: echo hi\n' });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /no uses: reference found/);
});
