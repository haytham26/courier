// The test for the setup-uv pin gate (the 2026-11-05 audit's item 3i, C12).
//
//   node --test scripts/ci/__tests__/check-setup-uv-pin.test.mjs
//
// Every case is a property of the gate, run against fabricated workflow
// directories in a temp tree: the real tree passes, two different SHAs fail,
// a tag ref fails, an empty directory fails (the gate cannot go vacuous), and
// the two step spellings (`- uses:` and `- name:` / `uses:`) are both read.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CHECK = path.join(ROOT, 'scripts', 'ci', 'check-setup-uv-pin.mjs');

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

const STEP_ONELINE = `      - uses: astral-sh/setup-uv@${SHA_A} # v10.3.3\n`;
const STEP_TWOLINE = `      - name: Install uv\n        uses: astral-sh/setup-uv@${SHA_A} # v10.3.3\n`;

function tree(files) {
  const dir = mkdtempSync(path.join(tmpdir(), 'setup-uv-test-'));
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
  assert.match(answer.stdout, /one commit sha across all \d+ reference/);
});

test('two different SHAs fail and both are named', () => {
  const answer = tree({
    'a.yml': STEP_ONELINE,
    'b.yml': `      - uses: astral-sh/setup-uv@${SHA_B} # v5\n`,
  });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /2 different SHAs/);
  assert.match(answer.out, new RegExp(SHA_A.slice(0, 8)));
  assert.match(answer.out, new RegExp(SHA_B.slice(0, 8)));
});

test('a tag ref instead of a SHA fails', () => {
  const answer = tree({ 'a.yml': '      - uses: astral-sh/setup-uv@v10 # v10\n' });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /not a full 40-hex commit sha/);
});

test('an empty directory fails rather than passing vacuously', () => {
  const answer = tree({ 'a.yml': 'name: Nothing\njobs:\n  x:\n    steps:\n      - run: echo hi\n' });
  assert.notEqual(answer.code, 0);
  assert.match(answer.out, /no astral-sh\/setup-uv reference found/);
});

test('both step spellings are read', () => {
  const answer = tree({ 'a.yml': STEP_ONELINE, 'b.yml': STEP_TWOLINE });
  assert.equal(answer.code, 0, answer.out);
  assert.match(answer.out, /all 2 reference/);
});
