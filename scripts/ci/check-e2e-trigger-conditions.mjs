// The emulator workflow's job-level filter (the 2026-11-05 audit's item 3g).
//
// The pull_request trigger used to carry a `paths:` filter, which kept the
// WHOLE WORKFLOW from existing for a change it did not match. That is worse
// than a job that skips: the check names this workflow reports (`Build the
// release APK`, `Run the Maestro flows on the emulator (api 34)`, `A1: the
// app against the real API (no mock)`) are then never reported at all, and a
// required check that is not reported is a PR that can never be merged.
//
// The filter moved to a JOB: a `changes` job that diffs the paths with a plain
// `git diff --name-only` step (no new action: nothing to SHA-pin, nothing to add
// to the licence inventory), and an `if:` on build/e2e/a1 so they report
// `skipped` instead of not existing.
//
//   node scripts/ci/check-e2e-trigger-conditions.mjs
import { readFileSync } from 'node:fs';

const WORKFLOW = '.github/workflows/android-e2e.yml';
const CHECKOUT_PIN = /actions\/checkout@[0-9a-f]{40}/;

const problems = [];
const workflow = readFileSync(WORKFLOW, 'utf8');
const lines = workflow.split('\n').map((line) => line.replace(/\r$/, ''));

/** The block that starts at the given line, to the next line at its own level. */
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

const pullRequest = blockAt(lines.findIndex((line) => line.trim() === 'pull_request:'));
if (/^\s*paths:/m.test(pullRequest)) {
  problems.push(
    'the pull_request trigger still carries a paths: filter: the workflow then does not exist for a ' +
      'documentation-only change, so its check names are never reported and a required check set blocks ' +
      'every PR that does not touch the app',
  );
}

// --- the changes job ------------------------------------------------------
const changes = blockAt(lines.findIndex((line) => /^  changes:/.test(line)));
if (changes === '') {
  problems.push('there is no changes job: the paths filter has nowhere to live at the job level');
} else {
  if (!/git diff --name-only/.test(changes)) {
    problems.push(
      'the changes job does not diff the paths with a plain `git diff --name-only` step: the audit asked for ' +
        'no new action (dorny/paths-filter would need a SHA pin and a licence-inventory row)',
    );
  }
  for (const name of ['build', 'e2e', 'a1']) {
    if (!new RegExp(`\\b${name}:`).test(changes.split('steps:')[0] ?? '')) {
      problems.push(`the changes job does not declare a ${name} output, and the jobs gate on it`);
    }
  }
  if (!CHECKOUT_PIN.test(changes)) {
    problems.push('the changes job does not pin actions/checkout by commit sha');
  }
  if (!/fetch-depth: 0/.test(changes)) {
    problems.push(
      'the changes job does not fetch the whole history: a shallow clone answers "unknown revision" for the ' +
        'base sha and the diff then reads as "nothing changed", which silently skips every job below',
    );
  }
}

// --- the jobs carry their own `if:` ---------------------------------------
for (const [job, output] of [
  ['build', 'build'],
  ['e2e', 'e2e'],
  ['a1', 'a1'],
]) {
  const block = blockAt(lines.findIndex((line) => new RegExp(`^  ${job}:`).test(line)));
  const jobIf = (/^\s*if:\s*(.+)$/m.exec(block) ?? [])[1] ?? '';
  if (jobIf === '') {
    problems.push(`the ${job} job has no if: it runs (or vanishes) without naming the paths it needs`);
  } else if (!/needs\.changes\.outputs/.test(jobIf)) {
    problems.push(`the ${job} job's if: does not read the changes job's outputs`);
  }
  if (!new RegExp(`^\\s*needs:.*changes`, 'm').test(block)) {
    problems.push(`the ${job} job does not need the changes job`);
  }
}

// The e2e legs and a1 cannot run without the APK, so their condition must not
// let them past a build that did not produce one.
for (const job of ['e2e', 'a1']) {
  const block = blockAt(lines.findIndex((line) => new RegExp(`^  ${job}:`).test(line)));
  if (!/needs\.build\.result == 'success'/.test(block)) {
    problems.push(`the ${job} job does not gate on the build job's success: it would run without an APK`);
  }
}

// And the build job has to run whenever a job below needs its APK: a flow-only
// change does not change the APK's bytes, but the legs download the artifact
// this job uploads. The APK's content-hash cache makes that a restore, not a
// rebuild.
const buildBlock = blockAt(lines.findIndex((line) => /^  build:/.test(line)));
if (!/needs\.changes\.outputs\.e2e == 'true'/.test(buildBlock)) {
  problems.push(
    'the build job does not run for a flow-only change, so the legs below have no APK artifact to download',
  );
}

if (problems.length > 0) {
  console.error(`the e2e workflow's job-level filter is broken (${problems.length}):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(
  'check-e2e-trigger-conditions: the pull_request trigger carries no paths filter, the changes job diffs ' +
    'with git itself, and build/e2e/a1 name the paths they need so they report skipped instead of not existing',
);
