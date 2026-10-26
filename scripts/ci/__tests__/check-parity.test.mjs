// The test for the register gate (audit item B1).
//
//   node --test scripts/ci/__tests__/check-parity.test.mjs
//
// The gate reads markdown tables as text, so the tests drive the shapes the real
// registers use and the shapes that would fool a weaker parser:
//   - a `Have` row carrying a PR number, and one carrying a CI run link;
//   - a `Have` row carrying no evidence at all, and one whose evidence column is
//     empty while a PR number sits in another column;
//   - a row whose status word is not one of the four of the status key (`Parity`
//     was really in the file, and a bare `Planned` beside `Planned (task)`);
//   - a BUGS row with prose in its status column, and one with `todo`;
//   - a cell that holds a pipe inside inline code (BUG-064's `||` guard), which
//     must not split the row and lose the status;
//   - a table with no `Status` column, which must fail rather than pass.
// The last tests drive the gate over the repository's own tree, so the gate
// cannot go vacuous (scan zero rows, or read the wrong file), and they run the
// CLI exactly as CI does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BUGS_STATUSES,
  PARITY_STATUSES,
  checkBugs,
  checkParity,
  checkTree,
  countLine,
  defaultBugsFile,
  defaultParityFile,
  splitRow,
  tablesOf,
} from '../check-parity.mjs';

const GATE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'check-parity.mjs');
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const PARITY_HEADER = `# Parity

| # | Family | Feature | Status | Spoke (2026-10-20) | Our edge | Task | Evidence (merged PR / run) |
|---|---|---|---|---|---|---|---|
`;

const PARITY_HEADER_NO_EVIDENCE = `# Parity

| # | Family | Feature | Status | Spoke (2026-10-20) | Our edge | Task |
|---|---|---|---|---|---|---|
`;

const BUGS_HEADER = `# Bugs

| ID | Description | Root Cause | Fix (PR) | Prevention Test | Status |
|---|---|---|---|---|---|
`;

/** A minimal PARITY.md: the four words of the key, each row counted. */
const CLEAN_PARITY =
  PARITY_HEADER +
  `| 1 | POD | Photo POD (geo + timestamp) | Have | match - photo POD | included in the base tier, never paywalled | T7.9 | PR #21, PR #31 |
| 2 | Sync | Cloud sync | Have | match - cloud sync | the event log | T7.1 | PR #35 |
| 3 | POD | Signature | Planned (task) | match - signature | offline-safe | T7.9 |  |
| 4 | Driver tools | Door memory | Better | beat - sticky notes only | keyed to the address | T7.3 | PR #33 |
| 5 | Navigation | In-app turn-by-turn | Skip (reason) | skip - no turn-by-turn | hand-off instead | — |  |
`;

/** A minimal BUGS.md: the tracker's words, each row counted. */
const CLEAN_BUGS =
  BUGS_HEADER +
  `| BUG-001 | the parser read "42B" as a unit | legacy code | \`ParsedAddress.suffix\` added | the suffix suite | fixed |
| BUG-046 | the deep link does not navigate | the scheme was never registered | - | the deep-link flow | open |
| BUG-051 | the app dies at cold launch | gwp_asan in the sphere | on PR #13 | the relaunch guard | doing |
| BUG-060 | the gate dies at launchApp | no -gpu flag | PR #22 | the emulator-GL gate | testing |
`;

test('the four words of the status key are the vocabulary', () => {
  assert.deepEqual(PARITY_STATUSES, ['Have', 'Better', 'Planned (task)', 'Skip (reason)']);
  assert.deepEqual(BUGS_STATUSES, ['open', 'doing', 'testing', 'fixed', 'closed', 'moved to PARITY']);
});

test('a clean register is counted and has no findings', () => {
  const parity = checkParity(CLEAN_PARITY);
  assert.deepEqual(parity.findings, []);
  assert.equal(parity.rows, 5);
  assert.deepEqual(parity.counts, { Have: 2, Better: 1, 'Planned (task)': 1, 'Skip (reason)': 1 });
  const bugs = checkBugs(CLEAN_BUGS);
  assert.deepEqual(bugs.findings, []);
  assert.equal(bugs.rows, 4);
  assert.equal(bugs.counts.open, 1);
  assert.equal(bugs.counts.fixed, 1);
  assert.equal(bugs.counts.doing, 1);
  assert.equal(bugs.counts.testing, 1);
});

test('a Have row whose only citation is a hex colour fails: a colour is not a PR number', () => {
  const withColour =
    PARITY_HEADER +
      "| 1 | Driving at night | the night theme | Have | beat - no night mood | #121212 on #1C1C1E | T7.9 | #121212 |" +
      '\n';
  const { findings } = checkParity(withColour);
  assert.ok(
    findings.some((finding) => finding.problem.includes("no merged PR number")),
    findings.join("|"),
  );
});

test('a Have row whose only citation is a bare number fails: the PR must be named', () => {
  const withBare =
    PARITY_HEADER +
      "| 1 | Driving at night | the night theme | Have | beat - no night mood | #121212 | T7.9 | #31 |" +
      '\n';
  const { findings } = checkParity(withBare);
  assert.ok(
    findings.some((finding) => finding.problem.includes("no merged PR number")),
    findings.join("|"),
  );
});

test('a Have row with a PR number passes, and a CI run link counts as evidence too', () => {
  const withRun = PARITY_HEADER + '| 1 | POD | Photo POD | Have | match | edge | T7.9 | CI run 40185490916 |\n';
  assert.deepEqual(checkParity(withRun).findings, []);
  const withLink = PARITY_HEADER + '| 1 | POD | Photo POD | Have | match | edge | T7.9 | https://github.com/x/y/actions/runs/40185490916 |\n';
  assert.deepEqual(checkParity(withLink).findings, []);
});

test('a Have row with no PR number and no run link fails', () => {
  const unevidenced = PARITY_HEADER + '| 1 | POD | Photo POD | Have | match - photo POD | edge | T7.9 |  |\n';
  const { findings } = checkParity(unevidenced);
  assert.equal(findings.length, 1);
  assert.match(findings[0].problem, /no merged PR number or CI run link/i);
});

test('a Have row whose evidence column is empty fails even when another cell quotes a PR', () => {
  // The task column is not evidence: T7.9 is a task id, not a merge.
  const mislabelled = PARITY_HEADER + '| 1 | POD | Photo POD | Have | match | edge (built on PR #21) | T7.9 |  |\n';
  const { findings } = checkParity(mislabelled);
  assert.equal(findings.length, 1);
  assert.match(findings[0].problem, /no merged PR number or CI run link/i);
});

test('a table with no evidence column still demands a link in the row', () => {
  // The link may live anywhere in the row; what may not exist is a `Have` that
  // quotes nothing a reader could check.
  const linked = PARITY_HEADER_NO_EVIDENCE + '| 1 | POD | Photo POD | Have | match | edge (PR #21) | T7.9 |\n';
  assert.deepEqual(checkParity(linked).findings, []);
  const silent = PARITY_HEADER_NO_EVIDENCE + '| 1 | POD | Photo POD | Have | match | edge | T7.9 |\n| 2 | POD | Signature | Have | match | edge | T7.9 |\n';
  const { findings } = checkParity(silent);
  assert.equal(findings.length, 2);
  assert.match(findings[0].problem, /no merged PR number or CI run link/i);
});

test('a hex colour is not read as a PR citation', () => {
  // PARITY row 60 records `#121212` in a sentence that ends with it: six hex digits
  // must never satisfy the evidence rule, or the gate waves through a `Have` that
  // quotes nothing.
  const hexOnly = PARITY_HEADER + '| 60 | Design system | the night background is #121212, never pure black | Have |  | low-blue night palette | T6 |  |\n';
  const { findings } = checkParity(hexOnly);
  assert.equal(findings.length, 1);
  assert.match(findings[0].problem, /no merged PR number or CI run link/i);
});

test('an unknown status word fails the gate', () => {
  // `Parity` was really in PARITY.md on 2026-10-25; a bare `Planned` sits beside
  // `Planned (task)` in the same file.
  const drifted = PARITY_HEADER + '| 1 | POD | Photo POD | Parity | match | edge | T7.9 | PR #21 |\n';
  const { findings } = checkParity(drifted);
  assert.equal(findings.length, 1);
  assert.match(findings[0].problem, /not one of the four words/i);
  assert.ok(findings[0].problem.includes('Parity'));

  const shortened = PARITY_HEADER + '| 1 | Optimisation | Time windows | Planned | match | edge | T7.2 | PR #19 |\n';
  assert.equal(checkParity(shortened).findings.length, 1);
  assert.match(checkParity(shortened).findings[0].problem, /`Planned`/);

  const invented = PARITY_HEADER + '| 1 | POD | Voice POD | Better (mostly) | match | edge | T7.9 | PR #34 |\n';
  assert.equal(checkParity(invented).findings.length, 1);
});

test('an empty status cell fails the gate', () => {
  const blank = PARITY_HEADER + '| 1 | POD | Photo POD |  | match | edge | T7.9 | PR #21 |\n';
  const { findings } = checkParity(blank);
  assert.equal(findings.length, 1);
  assert.match(findings[0].problem, /\(empty\)/);
});

test('a BUGS row with prose in the status column fails', () => {
  const prose =
    BUGS_HEADER +
    '| BUG-058 | the password policy had no maximum | built-in knobs | wired on `feat/auth-asvs` | the suite asserts the bounds | the email lane is the founder\'s provider decision (FOUNDER_TODO); the password rows are closed |\n';
  const { findings, counts } = checkBugs(prose);
  assert.equal(findings.length, 1);
  assert.match(findings[0].problem, /not one of the tracker\'s words/i);
  assert.equal(Object.values(counts).reduce((sum, count) => sum + count, 0), 0, 'a bogus row is not counted');
});

test('a BUGS row with a non-tracker status word fails', () => {
  const todo = BUGS_HEADER + '| BUG-012 | No sync engine (op-sqlite, event sourcing) | Phase B.6 not started | @op-engineering/op-sqlite installed | - | todo |\n';
  const { findings } = checkBugs(todo);
  assert.equal(findings.length, 1);
  assert.match(findings[0].problem, /`todo`/);
});

test('a pipe inside inline code does not split the row and lose the status', () => {
  // BUG-064's fix column really holds `github.event_name != 'push' || github.ref ==
  // 'refs/heads/main'`: a naive split reads that as two extra cells and the status
  // moves out from under the gate.
  const guarded =
    BUGS_HEADER +
    "| BUG-064 | `.github/workflows/map-pack.yml` ran on a feature push | the branches filter was the only intent | the build now carries `if: github.event_name != 'push' || github.ref == 'refs/heads/main'` | the truth table is verified locally | fixed |\n";
  const { findings, rows, counts } = checkBugs(guarded);
  assert.deepEqual(findings, []);
  assert.equal(rows, 1);
  assert.equal(counts.fixed, 1);
  assert.equal(counts.open, 0);
});

test('an escaped pipe is kept inside its cell', () => {
  assert.deepEqual(splitRow('| a \\| b | c |'), ['a | b', 'c']);
});

test('a table with no Status column fails rather than passing silently', () => {
  // The orphaned tail of a corrupted file must not read as zero findings.
  const orphan = `| # | Family | Feature | Our edge | Task |\n|---|---|---|---|---|\n| 1 | POD | Photo POD | edge | T7.9 |\n`;
  const { findings } = checkParity(orphan);
  assert.equal(findings.length, 1);
  assert.match(findings[0].problem, /no `Status` column/i);
});

test('the rows of every table in the file are counted, not only the first table\'s', () => {
  const two = CLEAN_PARITY + '\n## The gaps\n\n| # | Family | Feature | Status | Spoke (2026-10-20) | Our edge | Task | Evidence (merged PR / run) |\n|---|---|---|---|---|---|---|---|\n| 50 | Design system | Spring motion tokens | Have |  | one source | T6 | PR #3 |\n| 51 | Design system | Figtree everywhere | Planned (task) |  | one font set | T6 |  |\n';
  const { findings, rows, counts } = checkParity(two);
  assert.deepEqual(findings, []);
  assert.equal(rows, 7);
  assert.equal(counts.Have, 3);
});

test('the findings quote the file and the line of the row', () => {
  const drifted = PARITY_HEADER + '| 1 | POD | Photo POD | Parity | match | edge | T7.9 | PR #21 |\n';
  const { findings } = checkParity(drifted, 'docs/status/PARITY.md');
  assert.equal(findings[0].file, 'docs/status/PARITY.md');
  assert.equal(findings[0].line, 5);
});

test('the count line is what a merge copies into PROGRESS.md', () => {
  const parityPath = writeTemp('PARITY.md', CLEAN_PARITY);
  const bugsPath = writeTemp('BUGS.md', CLEAN_BUGS);
  try {
    const line = countLine(checkTree(parityPath, bugsPath));
    assert.match(line, /^5 parity rows \(Have 2 · Better 1 · Planned \(task\) 1 · Skip \(reason\) 1\); 4 bug rows \(open 1 · doing 1 · testing 1 · fixed 1 · closed 0 · moved to PARITY 0\)$/);
  } finally {
    rmSync(parityPath, { force: true });
    rmSync(bugsPath, { force: true });
  }
});

test('tablesOf reads the header and skips the separator', () => {
  const tables = tablesOf(`intro\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\ntail\n`);
  assert.equal(tables.length, 1);
  assert.deepEqual(tables[0].header, ['a', 'b']);
  assert.deepEqual(tables[0].rows, [{ line: 5, cells: ['1', '2'] }]);
});

test('the gate over the repository\'s own tree is not vacuous', () => {
  // This is what CI runs. The floor is a real register, not an empty file: the
  // counts must come from hundreds of rows, and the default paths must resolve to
  // the repository's own registers.
  const { parity, bugs } = checkTree();
  assert.ok(parity.rows > 200, `the parity rows were read (${parity.rows})`);
  assert.ok(bugs.rows > 40, `the bug rows were read (${bugs.rows})`);
  assert.match(defaultParityFile(), /docs[\\/]status[\\/]PARITY\.md$/);
  assert.match(defaultBugsFile(), /docs[\\/]status[\\/]BUGS\.md$/);
});

test('the CLI prints the counts and exits zero on the reconciled tree', () => {
  // The gate is run as `node scripts/ci/check-parity.mjs` from the repo root; its
  // default paths are resolved from the module, so the cwd must not matter.
  const output = execFileSync(process.execPath, [GATE], { encoding: 'utf8', cwd: REPO_ROOT });
  assert.match(output, /^\d+ parity rows \(Have \d+ · Better \d+ · Planned \(task\) \d+ · Skip \(reason\) \d+\); \d+ bug rows/m);
});

test('the CLI exits 1 and names the file, the line and the problem on a bad register', () => {
  // A failing tree must be red for the right reason, findable from the log.
  const dir = mkdtempSync(path.join(tmpdir(), 'parity-'));
  try {
    const parityPath = path.join(dir, 'PARITY.md');
    const bugsPath = path.join(dir, 'BUGS.md');
    writeFileSync(parityPath, PARITY_HEADER + '| 1 | POD | Photo POD | Have | match | edge | T7.9 |  |\n', 'utf8');
    writeFileSync(bugsPath, CLEAN_BUGS, 'utf8');
    let failed;
    try {
      execFileSync(process.execPath, [GATE, parityPath, bugsPath], { encoding: 'utf8' });
    } catch (error) {
      failed = error;
    }
    assert.ok(failed, 'the gate exits non-zero on a Have row with no link');
    assert.equal(failed.status, 1);
    const stderr = String(failed.stderr);
    assert.match(stderr, /PARITY\.md:5/);
    assert.match(stderr, /no merged PR number or CI run link/i);
    assert.match(String(failed.stdout), /1 parity rows/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a missing register file is one clean line, not a stack trace', () => {
  let failed;
  try {
    execFileSync(process.execPath, [GATE, path.join('no', 'such', 'PARITY.md')], { encoding: 'utf8' });
  } catch (error) {
    failed = error;
  }
  assert.ok(failed, 'the gate exits non-zero on a missing file');
  assert.equal(failed.status, 2);
  const stderr = String(failed.stderr ?? '');
  assert.match(stderr, /could not read the registers/);
  assert.ok(!stderr.includes('\n    at '), 'no stack trace: one clean line');
});

/** A fixture file in the OS temp folder. */
function writeTemp(name, content) {
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'parity-fixture-')), name);
  writeFileSync(file, content, 'utf8');
  return file;
}
