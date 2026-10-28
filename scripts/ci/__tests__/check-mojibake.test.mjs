// The test for the mojibake gate.
//
//   node --test scripts/ci/__tests__/check-mojibake.test.mjs
//
// Every shape below is either one of the sequences that was actually on
// `origin/main` on 2026-10-28 (so the gate is proven against the real damage) or
// a near miss that must NOT be flagged (so the gate cannot go red on clean
// text). A gate that only ever sees clean input proves nothing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkText, findMojibake } from '../check-mojibake.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const script = path.join(repoRoot, 'scripts', 'ci', 'check-mojibake.mjs');

const cp1252 = (codes) => codes.map((code) => String.fromCharCode(code)).join('');

// The sequences that were on main, as they were read as Windows-1252 bytes.
const ON_MAIN = [
  { run: cp1252([0x00e2, 0x2020, 0x2019]), means: 'U+2192', name: 'arrow' },
  { run: cp1252([0x00e2, 0x20ac, 0x201d]), means: 'U+2014', name: 'em dash' },
  { run: cp1252([0x00c2, 0x00a7]), means: 'U+00A7', name: 'section sign' },
  { run: cp1252([0x00e2, 0x20ac, 0x00a6]), means: 'U+2026', name: 'ellipsis' },
  { run: cp1252([0x00c3, 0x2014]), means: 'U+00D7', name: 'multiplication sign' },
  { run: cp1252([0x00e2, 0x0153, 0x2026]), means: 'U+2705', name: 'check mark' },
  { run: cp1252([0x00c2, 0x00b7]), means: 'U+00B7', name: 'middle dot' },
  { run: cp1252([0x00e2, 0x20ac, 0x201c]), means: 'U+2013', name: 'en dash' },
];

test('every sequence that was on main is flagged, with the character it hides', () => {
  for (const shape of ON_MAIN) {
    const findings = findMojibake(`a ${shape.run} b`);
    assert.equal(findings.length, 1, `${shape.name} was not flagged`);
    assert.equal(findings[0].run, shape.run);
    assert.equal(findings[0].means, shape.means, `${shape.name} named the wrong character`);
    assert.equal(findings[0].line, 1);
  }
});

test('the OEM-only sequences are flagged: Windows-1252 cannot reverse them', () => {
  // Both were on docs/design/mockups/README.md: U+00D4 U+00C7 U+00F6 for the em
  // dash in its title, U+252C U+00BA for the section sign in SYSTEM.md 2.
  const emDash = findMojibake(`docs/design/mockups/README.md ${cp1252([0x00d4, 0x00c7, 0x00f6])} title`);
  assert.equal(emDash.length, 1);
  assert.equal(emDash[0].means, 'U+2014');
  assert.equal(emDash[0].rule, 'oem');

  const section = findMojibake(`SYSTEM.md ${cp1252([0x252c, 0x00ba])}3`);
  assert.equal(section.length, 1);
  assert.equal(section[0].means, 'U+00A7');
  assert.equal(section[0].rule, 'oem');
});

test('the line number names the line the sequence is on', () => {
  const findings = findMojibake(['clean', 'clean', `corrupt ${cp1252([0x00c2, 0x00a7])} here`].join('\n'));
  assert.equal(findings.length, 1);
  assert.equal(findings[0].line, 3);
});

test('two adjacent corrupted characters are two findings, each its own character', () => {
  // `Â§Â§` was two section signs on one line in docs/log/2026-W43.md.
  const findings = findMojibake(`${cp1252([0x00c2, 0x00a7])}${cp1252([0x00c2, 0x00a7])}`);
  assert.equal(findings.length, 2);
  assert.deepEqual(findings.map((finding) => finding.means), ['U+00A7', 'U+00A7']);
});

test('a sequence nobody has entered in a table is caught by the reversal rule', () => {
  // A curly double quotation mark, corrupted the same way, is not in any table:
  // the rule must catch it or the table would be the whole gate.
  const run = cp1252([0x00e2, 0x20ac, 0x0153]);
  const decoded = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from([0xe2, 0x80, 0x9c]));
  assert.equal([...decoded][0].codePointAt(0), 0x201c); // the left double quotation mark
  const findings = findMojibake(`a ${run} b`);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].means, 'U+201C');
});

test('legitimate text is never flagged', () => {
  // The characters this repository legitimately uses, including the ones whose
  // Windows-1252 bytes happen to decode to a single character (U+00CA U+00A5
  // reverses to U+02A5, which is not typographic, so it is not a finding).
  const clean = [
    'MASTER_EXECUTION §13 (Design Studio)',
    'the em dash — and the en dash – walk together',
    'the ellipsis … the arrow → the check ✅ the middle dot ·',
    'the sign × and ≤ and ≈ and the square ²',
    'a plain line with no non-ascii at all',
    cp1252([0x00ca, 0x00a5]), // U+02A5: reverses to one character, but not a typographic one
  ].join('\n');
  const findings = findMojibake(clean);
  assert.deepEqual(findings, []);
});

test('a lone em dash is not a finding: the character is already the character', () => {
  assert.deepEqual(findMojibake('just an em dash — alone'), []);
  assert.deepEqual(findMojibake('a section sign § alone'), []);
});

test('checkText reports the file and a human problem', () => {
  const findings = checkText('docs/status/BUGS.md', `x ${cp1252([0x00c2, 0x00a7])} y`);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].file, 'docs/status/BUGS.md');
  assert.match(findings[0].problem, /mojibake for a section sign/);
});

test('the gate exits 1 on a tree that carries the corruption (red first)', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'mojibake-'));
  try {
    const repo = path.join(directory, 'repo');
    mkdirSync(repo, { recursive: true });
    writeFileSync(
      path.join(repo, 'README.md'),
      `the em dash ${cp1252([0x00e2, 0x20ac, 0x201d])} here\n`,
      'utf8',
    );
    // The gate reads `git ls-files`, so the fixture has to be a tracked file in
    // a git tree: an untracked file would prove nothing about the gate's scan.
    execFileSync('git', ['init', '-q', repo], { stdio: 'ignore' });
    execFileSync('git', ['-C', repo, 'add', 'README.md'], { stdio: 'ignore' });
    const result = spawnWith(repo);
    assert.equal(result.status, 1, 'the gate passed over the corruption');
    assert.match(result.stderr, /mojibake for an em dash/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('the gate is clean over the repository\'s own tree, so it cannot go vacuous', () => {
  const result = execFileSync('node', [script], { cwd: repoRoot, encoding: 'utf8' });
  assert.match(result, /check-mojibake: clean over \d+ tracked text files/);
});

function spawnWith(cwd) {
  return spawnSync(process.execPath, [script], { cwd, encoding: 'utf8' });
}
