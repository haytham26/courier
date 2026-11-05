// The test for the parser-eval circularity check (BUG-210).
//
//   node --test scripts/ci/__tests__/check-parser-circularity.test.mjs
//
// Every case is a property of the gate: the standing overlaps pass, a parser
// newly learned from the templates fails, a stale baseline fails, and a tree
// with no overlap at all passes with the count at zero.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CHECK = path.join(ROOT, 'scripts', 'ci', 'check-parser-circularity.mjs');

/** The parse's shape: a pattern, plus the pipeline the check greps. */
const BRAIN_MIN = (pattern) => `
COMMANDS: tuple = (
    (
        pattern=re.compile(r"${pattern}"),
    ),
)
`;

/** A temp tree with the brain, the builder and the baseline given. */
function over(brainPattern, template, baselineOverlaps) {
  const dir = mkdtempSync(path.join(tmpdir(), 'circularity-'));
  mkdirSync(path.join(dir, 'services', 'courier-voice', 'app'), { recursive: true });
  mkdirSync(path.join(dir, 'scripts', 'eval'), { recursive: true });
  mkdirSync(path.join(dir, 'packages', 'eval', 'voice', 'manifest'), { recursive: true });
  writeFileSync(path.join(dir, 'services', 'courier-voice', 'app', 'offline_brain.py'),
    BRAIN_MIN(brainPattern), 'utf8');
  writeFileSync(path.join(dir, 'scripts', 'eval', 'build-voice-eval.mjs'),
    'const templates = { x: [ (a) => [`' + template + '`, "mark_delivered"] ] };\n', 'utf8');
  writeFileSync(path.join(dir, 'packages', 'eval', 'voice', 'manifest', 'circularity-baseline.json'),
    JSON.stringify({ overlaps: baselineOverlaps }), 'utf8');
  return dir;
}

function check(dir) {
  return spawnSync(process.execPath, [CHECK], { cwd: dir, encoding: 'utf8' });
}

test('a standing overlap passes and is named as a ceiling', () => {
  const dir = over('^watch the dog\\s+at\\s+(?P<address>.+)$', 'watch the dog at ${place}',
                   [{ words: 'watch the dog' }]);
  try {
    const answer = check(dir);
    assert.equal(answer.status, 0, answer.stderr);
    assert.match(answer.stdout, /1 standing overlap/);
    assert.match(answer.stdout, /ceiling on its own templates/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a parser newly learned from the templates fails and names the words', () => {
  const dir = over('^a brand new phrase\\s+at\\s+(?P<address>.+)$', 'a brand new phrase at ${place}',
                   [{ words: 'watch the dog' }]);
  try {
    const answer = check(dir);
    assert.equal(answer.status, 1);
    assert.match(answer.stderr, /NEW overlap/);
    assert.match(answer.stderr, /a brand new phrase/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a stale baseline fails', () => {
  const dir = over('^watch the dog\\s+at\\s+(?P<address>.+)$', 'watch the dog at ${place}',
                   [{ words: 'a fragment that no longer exists' }]);
  try {
    const answer = check(dir);
    assert.equal(answer.status, 1);
    assert.match(answer.stderr, /stale/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a tree with no overlap passes at zero', () => {
  const dir = over('^delivered\.?$', 'something entirely different', []);
  try {
    const answer = check(dir);
    assert.equal(answer.status, 0, answer.stderr);
    assert.match(answer.stdout, /0 standing overlaps/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
