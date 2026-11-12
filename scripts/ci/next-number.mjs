#!/usr/bin/env node
/**
 * The next free BUG and D number, read across origin/main AND every branch on
 * origin (PLAYBOOK §13.5).
 *
 * On 2026-11-03 two collisions came from a check that read main only: the
 * lead's branch had BUG-168..170 while main had given those numbers to the
 * backend, and the backend then took BUG-171, which the lead's branch already
 * held. A number is taken the moment any branch on origin carries it.
 *
 *   git fetch origin --prune
 *   node scripts/ci/next-number.mjs
 *
 * It prints the next BUG and D numbers and the ref that holds the current
 * highest. It reads origin only: push your branch first, and a number you
 * hold in an unpushed commit is not visible to the other session either.
 */
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const BUGS = 'docs/status/BUGS.md';
const DECISIONS = 'docs/decisions/DECISIONS.md';

/** The highest BUG row number and D heading number in the two files' text. */
export function highestIn(bugsText, decisionsText) {
  let bug = 0;
  for (const m of bugsText.matchAll(/^\| BUG-(\d+) \|/gm)) bug = Math.max(bug, Number(m[1]));
  let d = 0;
  for (const m of decisionsText.matchAll(/^#{2,3} D(\d+)\b/gm)) d = Math.max(d, Number(m[1]));
  return { bug, d };
}

/** refs: { ref: { bugs, decisions } } -> the next numbers and where the highest lives. */
export function nextNumbers(refs) {
  let bug = 0, d = 0, bugFrom = null, dFrom = null;
  for (const [ref, files] of Object.entries(refs)) {
    const h = highestIn(files.bugs ?? '', files.decisions ?? '');
    if (h.bug > bug) { bug = h.bug; bugFrom = ref; }
    if (h.d > d) { d = h.d; dFrom = ref; }
  }
  return { nextBug: bug + 1, nextD: d + 1, bugFrom, dFrom };
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function show(ref, path) {
  try { return git(['show', `${ref}:${path}`]); } catch { return ''; }
}

function main() {
  const refs = git(['for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin'])
    .split('\n').map((s) => s.trim()).filter((r) => r && r !== 'origin/HEAD' && r !== 'origin');
  const files = {};
  for (const ref of refs) files[ref] = { bugs: show(ref, BUGS), decisions: show(ref, DECISIONS) };
  const r = nextNumbers(files);
  console.log(`next BUG: BUG-${r.nextBug} (highest BUG-${r.nextBug - 1} on ${r.bugFrom})`);
  console.log(`next D:   D${r.nextD} (highest D${r.nextD - 1} on ${r.dFrom})`);
  console.log(`read ${refs.length} refs on origin; run "git fetch origin --prune" first.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
