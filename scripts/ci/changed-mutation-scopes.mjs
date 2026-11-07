// The B4 mutation floor's PR-time "what changed" job (BUG-245, audit item 7).
//
// The nightly lane (mutation.yml) proves the floor on a schedule; this script
// decides, for a pull request or a push, WHICH services' floors the change can
// move, so quality-gates.yml can run `check-mutation-floor.mjs run <service>`
// as a merge-blocking job exactly when it can regress.
//
//   node scripts/ci/changed-mutation-scopes.mjs
//
// The event and the base sha come through the `github` context, passed as env
// by the workflow step (the same shape android-e2e.yml's `changes` job uses):
//
//   EVENT_NAME: ${{ github.event_name }}
//   BASE_SHA:   ${{ github.event.pull_request.base.sha || github.event.before || '' }}
//
// A human dispatch (anything but pull_request/push) gets EVERY scope: the
// point of the filter is to save minutes nobody asked for.
//
// Why the FULL configured scope runs and not just the changed files: mutmut
// 3.8.1's `run` takes only mutant NAMES (`mutmut run app.repo.x__mutmut_3 …`),
// reads its config from the cwd pyproject only, and has no generate-only
// command (its commands are run / results / show / apply / browse /
// export-cicd-stats / print-time-estimates / tests-for-mutant). So a PR that
// touches one file of a service runs that service's whole `[tool.mutmut]
// source_paths` scope - a superset of "the changed files", strictly stronger,
// and identical to what the nightly lane measures.
//
// A change counts as touching a service's scope when it lands under the
// service directory AND is one of:
//   - a path in the service's `source_paths` (the mutated code), or a file
//     under one (for directory entries),
//   - the service's `tests/` (the tests are what kill mutants: a PR that
//     deletes a killing test moves the score exactly as much as source does),
//   - the service's `pyproject.toml` / `uv.lock` (the mutmut config and the
//     suite's dependencies).
// A change to the mutation pipeline itself (this script, the floor script, the
// survivor exporter, mutation.yml, quality-gates.yml) touches BOTH scopes.
//
// The outputs are written to $GITHUB_OUTPUT as `api=` / `voice=` so the jobs
// below gate on `if: needs.mutation-scopes.outputs.api == 'true'` and report
// `skipped` (never absent) for everything else - the audit's item 3g rule: a
// required check that is not reported blocks every PR forever.

import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const thisFile = fileURLToPath(import.meta.url);
export const repoRoot = path.resolve(path.dirname(thisFile), '..', '..');

export const BUG_ID = 'BUG-245';

/** The two services the B4 floor is scoped over, keyed by output name. */
export const SERVICES = {
  api: 'services/api',
  voice: 'services/courier-voice',
};

/**
 * The mutation pipeline's own files: a change to any of them can change what
 * the floor measures or enforces, so it touches BOTH scopes.
 */
export const PIPELINE_PATHS = [
  'scripts/ci/changed-mutation-scopes.mjs',
  'scripts/ci/check-mutation-floor.mjs',
  'scripts/ci/mutmut-survivors.py',
  '.github/workflows/mutation.yml',
  '.github/workflows/quality-gates.yml',
];

/**
 * The `source_paths` list of a `[tool.mutmut]` section, parsed from a
 * pyproject's text. Pure, so the suite pins it against both services' real
 * files as well as literals.
 * @param {string} pyprojectText
 * @returns {string[]} the quoted paths, in order; [] when there is no section
 */
export function parseSourcePaths(pyprojectText) {
  // The section runs until the next header (a `[` at a line start) - NOT
  // until the first `[` anywhere, which is the `[` of `source_paths = [`,
  // and not line-by-line either: a lazy `*?(?=^\[|$)` stops at the first
  // line end because `$` matches before every newline. Scan the headers.
  const lines = pyprojectText.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === '[tool.mutmut]');
  if (start === -1) return [];
  const end = lines.findIndex((line, i) => i > start && /^\[/.test(line.trim()));
  const section = lines.slice(start, end === -1 ? undefined : end).join('\n');
  const list = /source_paths\s*=\s*\[([\s\S]*?)\]/.exec(section);
  if (!list) return [];
  return [...list[1].matchAll(/"([^"]*)"|'([^']*)'/g)].map((m) => m[1] ?? m[2]);
}

/**
 * Whether one of the changed paths touches a service's mutation scope.
 * @param {string[]} changedPaths paths from `git diff --name-only` (either separator)
 * @param {string} serviceDir e.g. 'services/api'
 * @param {string[]} sourcePaths the service's parsed source_paths
 * @returns {boolean}
 */
export function touchesScope(changedPaths, serviceDir, sourcePaths) {
  const prefix = `${serviceDir.replaceAll('\\', '/')}/`;
  for (const raw of changedPaths) {
    const changed = String(raw).replaceAll('\\', '/');
    if (!changed.startsWith(prefix)) continue;
    const rest = changed.slice(prefix.length);
    // The suite, the lockfile and the mutmut config move the score as much as
    // the source does: a PR that deletes a killing test is a score change.
    if (rest === 'pyproject.toml' || rest === 'uv.lock' || rest.startsWith('tests/')) return true;
    for (const sourcePath of sourcePaths) {
      if (rest === sourcePath || rest.startsWith(`${sourcePath}/`)) return true;
    }
  }
  return false;
}

/**
 * Whether a change touches the mutation pipeline itself (both scopes).
 * @param {string[]} changedPaths
 * @returns {boolean}
 */
export function pipelineTouched(changedPaths) {
  return changedPaths.some((raw) => PIPELINE_PATHS.includes(String(raw).replaceAll('\\', '/')));
}

/**
 * The scopes a change touches, given each service's directory and its parsed
 * source_paths. Pure: the caller reads the pyprojects.
 * @param {string[]} changedPaths
 * @param {Object<string, { dir: string, sourcePaths: string[] }>} scopes
 * @returns {Object<string, boolean>}
 */
export function computeScopes(changedPaths, scopes) {
  const pipeline = pipelineTouched(changedPaths);
  const result = {};
  for (const [name, scope] of Object.entries(scopes)) {
    result[name] = pipeline || touchesScope(changedPaths, scope.dir, scope.sourcePaths);
  }
  return result;
}

/**
 * Read both services' scopes from the repository's real pyprojects.
 * @param {string} root the repository root
 * @returns {Object<string, { dir: string, sourcePaths: string[] }>}
 */
export function loadScopes(root = repoRoot) {
  const scopes = {};
  for (const [name, dir] of Object.entries(SERVICES)) {
    const text = readFileSync(path.join(root, dir, 'pyproject.toml'), 'utf8');
    scopes[name] = { dir, sourcePaths: parseSourcePaths(text) };
  }
  return scopes;
}

/**
 * The base sha for the diff: a usable 40-hex commit, else the fallback. Pure -
 * the "does this sha still exist" half (a force-push makes it vanish) is
 * main()'s `git rev-parse`.
 * @param {string} candidate
 * @param {string} fallback
 * @returns {string}
 */
export function resolveBaseSha(candidate, fallback) {
  if (typeof candidate !== 'string') return fallback;
  const trimmed = candidate.trim();
  if (!/^[0-9a-f]{40}$/i.test(trimmed)) return fallback;
  if (/^0+$/i.test(trimmed)) return fallback; // a new branch's `before`
  return trimmed;
}

/**
 * The $GITHUB_OUTPUT lines for a scopes object.
 * @param {Object<string, boolean>} scopes
 * @returns {string}
 */
export function renderOutputs(scopes) {
  return Object.entries(scopes)
    .map(([name, value]) => `${name}=${value ? 'true' : 'false'}\n`)
    .join('');
}

const main = () => {
  const eventName = process.env.EVENT_NAME ?? '';
  let scopes = Object.fromEntries(Object.keys(SERVICES).map((name) => [name, true]));

  if (eventName === 'pull_request' || eventName === 'push') {
    let base = resolveBaseSha(process.env.BASE_SHA ?? '', 'HEAD~1');
    try {
      execFileSync('git', ['rev-parse', '-q', '--verify', `${base}^{commit}`], {
        cwd: repoRoot,
        stdio: 'ignore',
      });
    } catch {
      // A new branch's `before` is forty zeroes and a force-push's makes the
      // sha vanish; neither is a diff, and a diff against nothing reads as
      // "nothing changed", which silently skips every job below.
      base = 'HEAD~1';
      console.log('::notice::the base sha is unusable (a new branch or a force-push), so the diff is against HEAD~1');
    }
    const out = execFileSync('git', ['diff', '--name-only', base, 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    const changed = out.split('\n').map((line) => line.trim()).filter(Boolean);
    console.log(`the base: ${base}`);
    console.log('the changed paths:');
    console.log(changed.join('\n'));
    scopes = computeScopes(changed, loadScopes(repoRoot));
  } else {
    console.log(`the run was asked for by a human (${eventName || 'no event'}): every scope runs`);
  }

  const rendered = renderOutputs(scopes);
  console.log(rendered.trimEnd());
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, rendered);
  } else {
    process.stdout.write(rendered);
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  main();
}
