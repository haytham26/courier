// The merge-completeness guard's tests (the founder directive 2026-11-10, item 0):
// PR #278's merge dropped the BUG-270/300 change set and nothing caught it, so
// the invariant "the merged tree carries the whole PR diff" is pinned here,
// red-first: a merge that loses a hunk must be NAMED, and a human resolution of
// a path main also touched must be ON THE RECORD (scripts/ci/merge-resolutions.json).
//
//   node --test "scripts/*/__tests__/*.test.mjs"
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { mergeCompleteness } from '../check-merge-completeness.mjs';

/** git in a scratch repo, returning trimmed stdout. */
function g(dir, args) {
  return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
}

/** Builds a scratch repo whose merge drops the PR's hunk (main's side wins). */
function repoWithDroppedMerge() {
  const dir = mkdtempSync(join(tmpdir(), 'merge-completeness-'));
  g(dir, ['init', '-q', '--initial-branch=main']);
  g(dir, ['config', 'user.email', 't@example.co.nz']);
  g(dir, ['config', 'user.name', 'T']);
  g(dir, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(dir, 'a.txt'), 'one\n');
  g(dir, ['add', '.']); g(dir, ['commit', '-qm', 'base']);
  g(dir, ['checkout', '-q', '-b', 'pr']);
  writeFileSync(join(dir, 'a.txt'), 'one\nPR-CHANGE\n');
  g(dir, ['add', '.']); g(dir, ['commit', '-qm', 'pr change']);
  g(dir, ['checkout', '-q', 'main']);
  writeFileSync(join(dir, 'b.txt'), 'main\n');
  g(dir, ['add', '.']); g(dir, ['commit', '-qm', 'main move']);
  g(dir, ['merge', '--no-commit', '--no-ff', 'pr']);
  writeFileSync(join(dir, 'a.txt'), 'one\n'); // the drop
  g(dir, ['add', '.']); g(dir, ['commit', '-qm', 'merge that lost it']);
  return dir;
}

/** Builds a scratch repo whose merge carries the PR's whole diff. */
function repoWithCleanMerge() {
  const dir = mkdtempSync(join(tmpdir(), 'merge-completeness-'));
  g(dir, ['init', '-q', '--initial-branch=main']);
  g(dir, ['config', 'user.email', 't@example.co.nz']);
  g(dir, ['config', 'user.name', 'T']);
  g(dir, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(dir, 'a.txt'), 'one\n');
  g(dir, ['add', '.']); g(dir, ['commit', '-qm', 'base']);
  g(dir, ['checkout', '-q', '-b', 'pr']);
  writeFileSync(join(dir, 'a.txt'), 'one\nPR-CHANGE\n');
  writeFileSync(join(dir, 'new.ts'), 'export const x = 1;\n');
  g(dir, ['add', '.']); g(dir, ['commit', '-qm', 'pr change']);
  g(dir, ['checkout', '-q', 'main']);
  writeFileSync(join(dir, 'b.txt'), 'main\n');
  g(dir, ['add', '.']); g(dir, ['commit', '-qm', 'main move']);
  g(dir, ['merge', '--no-ff', '-qm', 'real merge', 'pr']);
  return dir;
}

/** Builds a scratch repo whose merge deliberately resolves a shared path. */
function repoWithResolvedMerge() {
  const dir = mkdtempSync(join(tmpdir(), 'merge-completeness-'));
  g(dir, ['init', '-q', '--initial-branch=main']);
  g(dir, ['config', 'user.email', 't@example.co.nz']);
  g(dir, ['config', 'user.name', 'T']);
  g(dir, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(join(dir, 'a.txt'), 'one\n');
  g(dir, ['add', '.']); g(dir, ['commit', '-qm', 'base']);
  g(dir, ['checkout', '-q', '-b', 'pr']);
  writeFileSync(join(dir, 'a.txt'), 'one\nPR-CHANGE\n');
  g(dir, ['add', '.']); g(dir, ['commit', '-qm', 'pr change']);
  g(dir, ['checkout', '-q', 'main']);
  writeFileSync(join(dir, 'a.txt'), 'one\nMAIN-CHANGE\n');
  g(dir, ['add', '.']); g(dir, ['commit', '-qm', 'main move']);
  try { g(dir, ['merge', '--no-commit', '--no-ff', 'pr']); } catch { /* the conflict is the point */ }
  writeFileSync(join(dir, 'a.txt'), 'one\nMAIN-CHANGE\nPR-CHANGE\n'); // the human's resolution
  g(dir, ['add', '.']); g(dir, ['commit', '-qm', 'resolved merge']);
  return dir;
}

test('a merge that loses the PR hunk is named, path by path', () => {
  const dir = repoWithDroppedMerge();
  try {
    const merge = g(dir, ['rev-parse', 'HEAD']);
    const problems = mergeCompleteness(merge, [], (args) => g(dir, args));
    assert.equal(problems.length, 1, JSON.stringify(problems));
    assert.match(problems[0], /DROPPED/);
    assert.match(problems[0], /a\.txt/);
    assert.match(problems[0], /main never touched this path/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a merge that carries the whole PR diff passes', () => {
  const dir = repoWithCleanMerge();
  try {
    const merge = g(dir, ['rev-parse', 'HEAD']);
    assert.deepEqual(mergeCompleteness(merge, [], (args) => g(dir, args)), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a deliberate resolution on a path main also touched passes only when it is recorded', () => {
  const dir = repoWithResolvedMerge();
  try {
    const merge = g(dir, ['rev-parse', 'HEAD']);
    const unrecorded = mergeCompleteness(merge, [], (args) => g(dir, args));
    assert.equal(unrecorded.length, 1);
    assert.match(unrecorded[0], /RESOLVED-WITHOUT-RECORD/);
    assert.deepEqual(mergeCompleteness(merge, ['a.txt'], (args) => g(dir, args)), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the CLI exits 1 on a dropped merge and 0 on a clean one', () => {
  const bad = repoWithDroppedMerge();
  const good = repoWithCleanMerge();
  try {
    const CHECK = join(process.cwd(), 'scripts', 'ci', 'check-merge-completeness.mjs');
    const badMerge = g(bad, ['rev-parse', 'HEAD']);
    let code = 0;
    try {
      execFileSync(process.execPath, [CHECK, badMerge], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], cwd: bad });
    } catch (e) { code = e.status; }
    assert.equal(code, 1, 'a dropped merge must exit 1');
    const out = execFileSync(process.execPath, [CHECK, g(good, ['rev-parse', 'HEAD'])], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], cwd: good }).toString();
    assert.match(out, /carries the whole PR diff/);
  } finally {
    rmSync(bad, { recursive: true, force: true });
    rmSync(good, { recursive: true, force: true });
  }
});

test('a non-merge commit is refused, not silently passed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'merge-completeness-'));
  try {
    g(dir, ['init', '-q', '--initial-branch=main']);
    g(dir, ['config', 'user.email', 't@example.co.nz']);
    g(dir, ['config', 'user.name', 'T']);
    writeFileSync(join(dir, 'a.txt'), 'one\n');
    g(dir, ['add', '.']); g(dir, ['commit', '-qm', 'base']);
    const problems = mergeCompleteness(g(dir, ['rev-parse', 'HEAD']), [], (args) => g(dir, args));
    assert.equal(problems.length, 1);
    assert.match(problems[0], /not a merge commit/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the repo's own recent merges carry their diffs, and every resolution is recorded", (t) => {
  const runner = (args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).toString();
  // A shallow clone (CI's actions/checkout) carries no merge history: the check is
  // a local one, and the skip is recorded with its reason rather than let fail.
  let merges = [];
  try {
    merges = runner(['log', '--merges', '--format=%H', 'origin/main', '-40']).trim().split('\n').filter(Boolean);
  } catch { t.skip('a shallow clone carries no merge history — this check runs locally'); return; }
  if (merges.length === 0) {
    t.skip('origin/main is not fetched here — this check runs where the full history is');
    return;
  }
  assert.ok(merges.length > 5, 'the repo has merges to check');
  const record = JSON.parse(readFileSync(join(process.cwd(), 'scripts', 'ci', 'merge-resolutions.json'), 'utf8'));
  const recorded = new Map(record.resolutions.map((r) => [r.merge, r]));
  const broken = [];
  const stale = [];
  for (const m of merges) {
    const entry = recorded.get(m.slice(0, 8)) ?? recorded.get(m);
    const withRecord = mergeCompleteness(m, entry ? entry.paths : [], runner);
    if (withRecord.length > 0) broken.push(m.slice(0, 8) + ': ' + withRecord[0].slice(0, 110));
    // a record entry must resolve something: a merge that is clean even WITHOUT
    // the record is an entry that lies.
    if (entry && mergeCompleteness(m, [], runner).length === 0) stale.push(entry.merge);
  }
  // Nothing may be dropped in the range: a DROPPED path is a lost change, and the
  // one the guard first found (ffa82b19, BUGS.md) turned out to be the PR side's
  // STALE footer superseded by the newer count in the merge base — verified by
  // reading both footers, then recorded.
  assert.deepEqual(broken, [], 'every merge on origin/main must carry its diff (or a recorded resolution):' + String.fromCharCode(10) + broken.join(String.fromCharCode(10)));
  assert.deepEqual(stale, [], 'a recorded resolution must belong to a flagged merge:\n' + stale.join('\n'));
});
