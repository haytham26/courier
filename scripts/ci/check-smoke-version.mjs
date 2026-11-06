// BUG-213 (the 2026-11-05 audit's item 3b): the deploy's version check never ran.
//
// The deploy step has always carried APP_VERSION (the commit sha) in its
// environment, but the remote smoke.sh invocation never forwarded it, so
// smoke.sh took its `APP_VERSION is not set: skipping the version check` branch
// and reported a green smoke test about a deployment it had not identified. The
// audit's fix has three halves, and this gate holds all three:
//
//   1. the deploy's remote smoke.sh invocation FORWARDS APP_VERSION;
//   2. smoke.sh DIES when APP_VERSION is missing (a check that silently does
//      not run is a check nobody reads) and only `--no-version` skips it,
//      for a local run;
//   3. the version fetch is not allowed to fail quietly (the `|| true` that
//      left an empty file and then reported the wrong cause is gone).
//
//   node scripts/ci/check-smoke-version.mjs
import { readFileSync } from 'node:fs';

const SMOKE = 'infra/smoke.sh';
const WORKFLOW = '.github/workflows/deploy.yml';

const problems = [];
const smoke = readFileSync(SMOKE, 'utf8');
const workflow = readFileSync(WORKFLOW, 'utf8');

// 1. The remote invocation forwards the version.
const smokeInvocation = workflow
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.includes('smoke.sh'))
  .join(' ');
if (smokeInvocation.length === 0) {
  problems.push(`${WORKFLOW} does not invoke smoke.sh at all: the deploy proves nothing after it applies`);
} else if (!/APP_VERSION=/.test(smokeInvocation)) {
  problems.push(
    'the deploy does not forward APP_VERSION to the remote smoke.sh: the version check cannot run, ' +
      'and smoke.sh now dies instead of skipping it',
  );
}

// 2. smoke.sh requires the version, with one documented escape.
if (!/--no-version/.test(smoke)) {
  problems.push(`smoke.sh has no --no-version flag: there is no documented way to run it locally`);
}
const guard = smoke
  .split('\n')
  .find((line) => line.includes('APP_VERSION') && /die/.test(line));
if (!guard) {
  problems.push(
    'smoke.sh does not die without APP_VERSION: a missing version means the smoke test reports green ' +
      'about a deployment it never identified',
  );
}
// A comment may quote the wording that was removed (the script explains why it
// changed), so the gate reads the log statement, not the prose.
if (smoke.split('\n').some((line) => /^\s*log\s+"[^"]*skipping the version check/.test(line))) {
  problems.push(
    'smoke.sh still logs a silent skip of the version check: that is the exact wording the audit removed',
  );
}

// 3. The version fetch cannot fail quietly.
for (const line of smoke.split('\n')) {
  if (line.includes('openapi.json') && line.includes('curl') && /\|\|\s*true/.test(line)) {
    problems.push(
      'smoke.sh fetches the openapi document with `|| true`: a failed fetch leaves an empty file and ' +
        'the failure message then names the wrong cause',
    );
  }
}

if (problems.length > 0) {
  console.error(`the smoke version check is broken (${problems.length}):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(
  'check-smoke-version: the deploy forwards APP_VERSION to the remote smoke.sh, and smoke.sh refuses to ' +
    'run without it (--no-version is the only skip)',
);
