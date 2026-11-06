// The emulator workflow's retry budget (the 2026-11-05 audit's item 3h).
//
// PLAYBOOK 17.1: a re-run is not a way to get green, and a red is a root cause.
// The recurring case in this workflow is the harness rather than the code - the
// same APK green on api-35 and red on api-34 with the code byte-identical
// (BUG-065) - so a single re-run is allowed to catch that. The budget is one:
// a second re-run is allowed only if the reason is written into the job summary,
// and a third fails before it spends a minute of the emulator.
//
// This gate holds the budget in `android-e2e.yml`, in every job that boots an
// emulator:
//   node scripts/ci/check-e2e-retry-budget.mjs
import { readFileSync } from 'node:fs';

const WORKFLOW = '.github/workflows/android-e2e.yml';
const JOBS = ['e2e', 'a1'];

const problems = [];
const workflow = readFileSync(WORKFLOW, 'utf8');
const lines = workflow.split('\n').map((line) => line.replace(/\r$/, ''));

/** The block that starts at the given line. */
function blockAt(startIndex) {
  if (startIndex === -1) return '';
  const indent = /^(\s*)/.exec(lines[startIndex])[1].length;
  const end = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() !== '' && /^\s*/.exec(line)[0].length <= indent) break;
    end.push(line);
  }
  return end.join('\n');
}

for (const job of JOBS) {
  const block = blockAt(lines.findIndex((line) => new RegExp(`^  ${job}:`).test(line)));
  if (block === '') {
    problems.push(`the ${job} job is missing from ${WORKFLOW}`);
    continue;
  }
  // NB: `$`, not `\Z` - JavaScript has no `\Z`, and `\Z` is the literal letter
  // Z, which is why a budget step that is the job's LAST step never matched.
  const budget = /name: The retry budget\n([\s\S]*?)(?=\n      - name:|\n      - uses:|$)/.exec(block)?.[1] ?? '';
  if (budget === '') {
    problems.push(`the ${job} job has no retry budget step: a re-run of it is silent`);
    continue;
  }
  // The budget must be the job's FIRST step: a third attempt that boots an
  // emulator before failing has spent the minutes the budget exists to save.
  const steps = [...block.matchAll(/^\s{6}- name: (.+)$/gm)].map((m) => m[1]);
  if (steps[0] !== 'The retry budget') {
    problems.push(`the ${job} job's retry budget is not its first step: a third attempt boots before it fails`);
  }
  if (!/github\.run_attempt/.test(budget)) {
    problems.push(`the ${job} job's budget does not read github.run_attempt`);
  }
  if (!/-gt\s*2/.test(budget) || !/exit\s*1/.test(budget)) {
    problems.push(`the ${job} job's budget does not fail past the second attempt`);
  }
  if (!/-eq\s*2/.test(budget)) {
    problems.push(`the ${job} job's budget does not treat the second attempt specially`);
  }
  if (!/\$GITHUB_STEP_SUMMARY/.test(budget)) {
    problems.push(`the ${job} job's budget does not write the job summary on the second attempt`);
  }
  if (!/justification|WHY/.test(budget)) {
    problems.push(`the ${job} job's second-attempt summary does not ask for the justification`);
  }
}

if (problems.length > 0) {
  console.error(`the retry budget is broken (${problems.length}):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(
  `check-e2e-retry-budget: the ${JOBS.join(' and ')} jobs fail past their second attempt, and the second ` +
    'attempt asks for the justification in the job summary',
);
