// The B4 mutation-testing floor (docs/plan/AUDIT_2026-10-25.md §B4, PLAYBOOK §14.5).
//
// mutmut runs the suites against mutated copies of the source; a mutant that
// survives is a test the suite does not have. The audit's done-when: mutmut runs
// scoped in CI at the >= 70 % floor over `services/api` (sync, runs, auth) and
// `services/courier-voice` (the turn machine).
//
// The score is **mutmut's own**, read from its installed source
// (`mutmut/__main__.py`, the `badge` command):
//
//   tested = total - skipped
//   score  = ((killed + timeout) / tested) * 100
//
// Two modes, because a mutation run is minutes and a check is seconds:
//
//   node scripts/ci/check-mutation-floor.mjs run services/api        # run + check
//   node scripts/ci/check-mutation-floor.mjs check services/api      # check an existing
//                                                                     # mutants/mutmut-cicd-stats.json
//
// The `check` mode is what a fast gate uses: the workflow runs the mutation
// run, exports the stats, and checks them in the same job - so a slow suite
// never blocks a PR, and the floor still blocks the merge when it drops.
//
// mutmut refuses to start on Windows (`platform.system() == "Windows"` exits
// 1, boxed/mutmut#397), so the local run is WSL's; CI's ubuntu runner is the
// harness for this gate, exactly as the restore drill's is Postgres.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BUG_ID = 'BUG-112';
export const DEFAULT_FLOOR = 70;

// The script's own path, as `fileURLToPath` gives it. The earlier
// `new URL(import.meta.url).pathname.slice(1)` form **resolved against the working
// directory**, so the entry guard below never matched and the CLI was a silent
// no-op: the mutation lane ran for 0.25 s, wrote no stats, and still reported
// success (run 41190752114). A floor that cannot run is not a floor.
const thisFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(thisFile), '..', '..');
const STATS_RELATIVE = path.join('mutants', 'mutmut-cicd-stats.json');

/**
 * The mutation score, in mutmut's own arithmetic (see the header).
 * @param {{killed?: number, timeout?: number, total?: number, skipped?: number}} stats
 * @returns {number} the score in percent, 0 when there is nothing to check
 */
export function scoreOf(stats) {
  const values = normaliseStats(stats);
  const tested = values.total - values.skipped;
  if (tested <= 0) return 0;
  return ((values.killed + values.timeout) / tested) * 100;
}

function asCount(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

/**
 * The stats normalised to non-negative integers, so a truncated or hand-written
 * JSON cannot quietly turn a failing lane green (a NaN score, for example).
 */
export function normaliseStats(stats) {
  if (stats === null || typeof stats !== 'object') {
    throw new Error('the mutation stats must be an object');
  }
  return {
    total: asCount(stats.total),
    skipped: asCount(stats.skipped),
    killed: asCount(stats.killed),
    timeout: asCount(stats.timeout),
  };
}

/**
 * The reasons the lane is not green.
 * @param {{killed?: number, timeout?: number, total?: number, skipped?: number}} stats
 * @param {{floor?: number, label?: string}} options
 * @returns {string[]} empty when the floor holds
 */
export function checkStats(stats, options = {}) {
  const floor = options.floor ?? DEFAULT_FLOOR;
  const label = options.label ?? 'the mutation suite';
  const values = normaliseStats(stats);
  const failures = [];
  if (values.total === 0) {
    failures.push(`${label}: no mutants were generated at all (total is 0) - the run is vacuous, not passing`);
  }
  const score = scoreOf(values);
  const tested = values.total - values.skipped;
  if (tested > 0 && score < floor) {
    failures.push(
      `${label}: the mutation score is ${score.toFixed(1)}%, under the ${floor}% floor `
        + `(${values.killed + values.timeout} killed of ${tested} tested; ${values.total - values.skipped - values.killed - values.timeout} survived)`,
    );
  }
  return failures;
}

/**
 * Read the exported stats JSON. The `mutmut export-cicd-stats` command writes it
 * after a run; a missing file is a missing run, never a passing one.
 */
export function readStats(serviceDir) {
  const file = path.join(serviceDir, STATS_RELATIVE);
  if (!existsSync(file)) {
    throw new Error(`no mutation stats at ${file}: run "mutmut run" then "mutmut export-cicd-stats" first`);
  }
  return JSON.parse(readFileSync(file, 'utf8'));
}

/**
 * Run mutmut inside the service's own environment.
 *
 * Three defects in this one function, each found by dispatching the lane:
 *
 * 1. `execFileSync('mutmut', …)` - `uv sync` installs the CLI into
 *    `<service>/.venv/bin`, which is not on the runner's PATH:
 *    `spawnSync mutmut ENOENT` (run 41229140404, both jobs).
 * 2. `uv run --directory <service>` alone syncs the **default** dependencies, so
 *    it built a fresh `.venv` and `Failed to spawn: mutmut` again (run
 *    41236313956): mutmut is a `dev` extra. `--extra dev` is what puts it back.
 * 3. The suite needs the API's `s3test` extra, exactly as `ci.yml` installs it —
 *    without it `tests/test_pod_store.py` raises at import
 *    (`RuntimeError: the s3test extra (boto3 + moto) must be installed in CI`)
 *    and mutmut's first mutant dies for the runner's reason, not the code's (run
 *    41240006171).
 * 4. `--directory` is also what makes the service directory the working
 *    directory, so mutmut writes its `mutants/` where `readStats` looks for it.
 */
/**
 * The extras each service's suite needs, mirroring the workflow's own
 * `uv sync --extra …`. The API's `tests/test_pod_store.py` raises at import
 * without `s3test` (run 41240006171); the voice service has **no** `s3test`
 * extra, so naming it there fails with
 * `Extra s3test is not defined in the optional-dependencies table for courier-voice`
 * (run 41241517747). A shared flag list for both services was wrong in both
 * directions - one missing, one impossible - so each service names its own.
 */
const EXTRAS_BY_SERVICE = {
  'services/api': ['dev', 's3test'],
  'services/courier-voice': ['dev'],
};

function runMutmut(serviceDir, args) {
  const absolute = path.resolve(repoRoot, serviceDir);
  const relative = path.relative(repoRoot, absolute) || '.';
  const extras = EXTRAS_BY_SERVICE[relative] ?? ['dev'];
  const command = ['run'];
  for (const extra of extras) command.push('--extra', extra);
  command.push('--directory', relative, 'mutmut', ...args);
  execFileSync('uv', command, { cwd: repoRoot, stdio: 'inherit' });
}

export { repoRoot as mutationRepoRoot };

const main = () => {
  const args = process.argv.slice(2);
  const mode = args[0] ?? 'check';
  const serviceDir = args[1] ?? 'services/api';
  if (!['run', 'check'].includes(mode)) {
    console.error(`check-mutation-floor: unknown mode "${mode}" (run or check)`);
    process.exit(1);
  }
  if (mode === 'run') {
    runMutmut(serviceDir, ['run']);
    runMutmut(serviceDir, ['export-cicd-stats']);
  }
  const stats = readStats(path.resolve(repoRoot, serviceDir));
  const failures = checkStats(stats, { label: `${BUG_ID} (${serviceDir})` });
  const values = normaliseStats(stats);
  if (failures.length > 0) {
    for (const failure of failures) console.error(failure);
    process.exit(1);
  }
  console.log(
    `check-mutation-floor: ${scoreOf(values).toFixed(1)}% (${values.killed + values.timeout} of `
      + `${values.total - values.skipped} tested) at the ${DEFAULT_FLOOR}% floor - ${BUG_ID} (${serviceDir})`,
  );
};

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  main();
}
