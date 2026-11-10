// The merge-completeness guard (the founder directive 2026-11-10, item 0):
// before a merge ritual is called complete, prove that the merged tree carries
// the WHOLE PR diff. PR #278's merge silently dropped the BUG-270/300 change
// set (a dirty-tree merge took main's side for every path the branch had
// changed), and nothing in the ritual caught it — the register even said
// "fixed" for a change that was not on main.
//
//   node scripts/ci/check-merge-completeness.mjs <merge-commit> [<base-commit>]
//
// The invariant: for every path the PR changed (its head against the merge
// base of the two parents), the merge result's blob must be the PR head's
// blob. A path that differs is either DROPPED (main did not touch it — a hard
// failure, the merge lost the change) or RESOLVED (main touched it too — the
// human resolution must be replayed here with --resolved <path> so the
// exception is a decision on the record, not an oversight).
//
// The check reads git, never the working tree, so it runs on any checkout of
// the repo's object database — including a shallow CI one.
import { execFileSync } from 'node:child_process';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).toString();
}

export function mergeCompleteness(merge, resolved = [], gitRunner = git) {
  const problems = [];
  const parents = gitRunner(['rev-list', '--parents', '-n', '1', merge]).toString().trim().split(' ');
  if (parents.length < 3) {
    return [`${merge} is not a merge commit (parents: ${parents.length - 1})`];
  }
  const base = parents[1];
  const pr = parents[2];
  const mergeBase = gitRunner(['merge-base', base, pr]).toString().trim();
  // the PR's own diff: name-status of what the branch changed against the base
  const diff = gitRunner(['diff', '--name-status', mergeBase, pr]).toString().trim();
  if (diff === '') {
    return [`the PR head ${pr.slice(0, 8)} changes nothing against the merge base ${mergeBase.slice(0, 8)}`];
  }
  const paths = diff.split('\n').map((line) => line.split('\t').slice(1).join('\t'));
  for (const path of paths) {
    const prBlob = revParse(pr, path, gitRunner);
    const mergeBlob = revParse(merge, path, gitRunner);
    if (prBlob === mergeBlob) continue;
    const baseBlob = revParse(base, path, gitRunner);
    const mainMoved = baseBlob !== revParse(mergeBase, path, gitRunner);
    const decision = resolved.includes(path);
    if (mainMoved && decision) continue; // a recorded human resolution
    if (mainMoved) {
      problems.push(
        `RESOLVED-WITHOUT-RECORD: ${path} — main also changed it, and the merge result differs ` +
          `from the PR head (${prBlob ?? 'absent'} -> ${mergeBlob ?? 'absent'}); ` +
          're-run the resolution locally and record it with --resolved ' + path,
      );
    } else {
      problems.push(
        `DROPPED: ${path} — the PR head has ${prBlob ?? 'absent'} and the merge has ` +
          `${mergeBlob ?? 'absent'}, and main never touched this path: the merge lost the change`,
      );
    }
  }
  return problems;
}

function revParse(ref, path, gitRunner) {
  try {
    return gitRunner(['rev-parse', '--verify', '--quiet', `${ref}:${path}`]).toString().trim() || null;
  } catch {
    return null;
  }
}

export function main(argv = process.argv.slice(2)) {
  const resolved = [];
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--resolved') { resolved.push(argv[i + 1]); i++; continue; }
    positional.push(argv[i]);
  }
  const merge = positional[0] ?? 'HEAD';
  const problems = mergeCompleteness(merge, resolved);
  if (problems.length > 0) {
    console.error(`check-merge-completeness: ${merge} does NOT carry the whole PR diff (${problems.length}):`);
    for (const p of problems) console.error('- ' + p);
    process.exit(1);
  }
  console.log(`check-merge-completeness: ${merge} carries the whole PR diff`);
}

if (process.argv[1] && /check-merge-completeness\.mjs$/.test(process.argv[1].replace(/\\/g, '/'))) {
  main();
}
