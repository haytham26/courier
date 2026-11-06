// The human-dispatch gate for android-e2e.yml (BUG-198, audit 2026-11-05
// item 5: the trial-server proof must be runnable by a human).
//
// The workflow's `changes` job computes which jobs may run. On a
// pull_request or a push it diffs the paths; on any other event (a
// workflow_dispatch, a schedule) a human asked for the run, and the point of
// the filter is to save the minutes nobody asked for - so the human branch
// echoes every output true and exits. That branch once echoed only
// build/flows/scripts/pipeline and never e2e/a1, so a manual dispatch
// reported the emulator legs and the A1 proof as `skipped` (runs
// 42166994398 and 42167332868) while the pull_request runs of the same heads
// executed them: manual dispatches were not E2E evidence, and the founder
// could not run the trial's own proof by hand.
//
// This gate holds the rule:
//   1. the human branch exists and echoes e2e=true AND a1=true (with the
//      other four outputs);
//   2. the A1 job gates on needs.changes.outputs.a1 == 'true' and the e2e
//      legs on e2e == 'true', so the outputs the human branch sets are the
//      ones the jobs read.
//
//   node scripts/ci/check-e2e-dispatch.mjs [repo-root]
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BUG_ID = 'BUG-198';

const root = process.argv[2] ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const workflowPath = path.join(root, '.github', 'workflows', 'android-e2e.yml');
const problems = [];

if (!existsSync(workflowPath)) {
  problems.push('.github/workflows/android-e2e.yml does not exist');
} else {
  const text = readFileSync(workflowPath, 'utf8');
  const lines = text.split('\n').map((line) => line.replace(/\r$/, ''));

  // The human branch: the `if` line that excludes pull_request and push,
  // up to its `fi`. Its output echo is the line(s) writing $GITHUB_OUTPUT
  // before the exit 0.
  const humanIf = lines.findIndex(
    (l) => l.includes('github.event_name') && l.includes('pull_request') && l.includes('!'),
  );
  if (humanIf === -1) {
    problems.push('android-e2e.yml has no human-dispatch branch (the if that excludes pull_request and push) - a human must always be able to ask for the whole set');
  } else {
    let branch = '';
    for (let i = humanIf; i < lines.length && i < humanIf + 12; i += 1) {
      branch += `${lines[i]}\n`;
      if (/^\s*fi\s*$/.test(lines[i])) break;
    }
    const echoLines = branch.split('\n').filter((l) => l.includes('GITHUB_OUTPUT'));
    const echoed = echoLines.join('\n');
    for (const output of ['build', 'flows', 'scripts', 'pipeline', 'e2e', 'a1']) {
      if (!echoed.includes(`${output}=true`)) {
        problems.push(`the human-dispatch branch does not echo ${output}=true (BUG-198: a manual run that skips the ${output} jobs proves nothing - observed skipped on runs 42166994398 and 42167332868)`);
      }
    }
  }

  // The jobs read those outputs: the A1 job gates on a1, the legs on e2e.
  if (!/needs\.changes\.outputs\.a1\s*==\s*'true'/.test(text)) {
    problems.push("the A1 job no longer gates on needs.changes.outputs.a1 == 'true'");
  }
  if (!/needs\.changes\.outputs\.e2e\s*==\s*'true'/.test(text)) {
    problems.push("the emulator legs no longer gate on needs.changes.outputs.e2e == 'true'");
  }
}

if (problems.length > 0) {
  console.error(`${BUG_ID}: the e2e human-dispatch gate fails (${problems.length}):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`${BUG_ID}: a human dispatch of android-e2e.yml runs the whole set - build, legs, and the A1 proof (the human branch echoes e2e=true and a1=true, and the jobs gate on exactly those outputs)`);
