// The workflow-file gate: every workflow in this repository parses, every key
// it uses is a key GitHub accepts, and its dispatch inputs are read through the
// `github` context (BUG-067).
//
//   node scripts/ci/check-workflows.mjs [workflow-directory]
//
// Why it exists: `.github/workflows/map-pack.yml` failed in 0 seconds on every
// run it ever had - 65 of them, from PR #43's first push to the day this was
// fixed - with GitHub's "This run likely failed because of a workflow file
// issue", no jobs and no steps. BUG-064's guard took the blame for it (a §16
// note even recorded the failure as outside my diff), and the guard was never
// reached: no job was ever created.
//
// The cause, found by bisecting the file on real runs, was one line:
//
//       - name: Upload the pack
//         uses: actions/upload-artifact@<sha>    # v4
//         with:
//           ...
//         if-no-files-found: error
//
// `if-no-files-found` is an *input* of the upload action, so it belongs inside
// `with:`. Written at the step's own level it is a key GitHub does not accept
// for a step, and GitHub refuses the whole workflow - on every event, before any
// job, with no report of which line. A job-level `if:` guard cannot help a
// workflow that cannot start.
//
// The rules, then, are the three that make a workflow file unstartable:
//
//   1. no unknown key at a step or a job (the BUG-067 root cause);
//   2. no bare `inputs` context - it exists for a `workflow_dispatch` or a
//      `workflow_call` only, so `github.event.inputs` is the form that reads for
//      every event (the same file carried this defect at the same time);
//   3. a YAML anchor or an alias in a place this gate cannot read FAILS rather
//      than passes: a gate that waves through what it cannot see is not a gate.
//
// The parser is deliberately small, like check-emulator-gpu.mjs's: the workflow
// files in this repository are flat, hand-written and pinned.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BUG_ID = 'BUG-067';

// The script lives at scripts/ci/, so the repository root is two directories up.
const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const WORKFLOW_DIR = path.join(REPO_ROOT, '.github', 'workflows');

/** The keys a step may carry (GitHub's workflow syntax). */
export const STEP_KEYS = new Set([
  'continue-on-error',
  'defaults',
  'env',
  'id',
  'if',
  'name',
  'run',
  'shell',
  'timeout-minutes',
  'uses',
  'with',
  'working-directory',
]);

/** The keys a job may carry (GitHub's workflow syntax). */
export const JOB_KEYS = new Set([
  'concurrency',
  'container',
  'continue-on-error',
  'defaults',
  'env',
  'environment',
  'if',
  'name',
  'needs',
  'outputs',
  'permissions',
  'runs-on',
  'secrets',
  'services',
  'snapshot',
  'steps',
  'strategy',
  'timeout-minutes',
  'uses',
  'with',
]);

/** The invalid form: `${{ inputs.foo }}`, with or without spaces. */
const BARE_INPUTS = /\$\{\{\s*inputs\s*\./;

/** The valid form, which the gate must not flag. */
const EVENT_INPUTS = /\$\{\{\s*github\.event\.inputs\s*\./;

const LIST_ITEM = /^(\s*)-\s/;

const indentOf = (line) => line.length - line.replace(/^\s+/, '').length;

/**
 * The violations of one workflow's lines: an unknown key at a job or a step, a
 * bare `inputs` context, or an `inputs` expression the gate cannot read.
 *
 * The mapping is read by indentation, the way these files are written: the
 * `jobs:` block at column 0 opens the jobs mapping, a job id sits at two
 * columns, its keys at four, `steps:` at four and a step's keys at eight.
 *
 * @param {string[]} lines
 * @returns {Array<{ line: number, text: string, problem: string }>}
 */
export function violationsOf(lines) {
  const found = [];
  let inJobs = false;
  let inSteps = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === '') continue;
    if (line.trim().startsWith('#')) continue;
    const indent = indentOf(line);

    const key = /^(\s*)([A-Za-z_][A-Za-z0-9_-]*):/.exec(line);

    // BUG-100: a `secrets.*` reference at six spaces is a JOB-level env, and a
    // job-level env is present in every step's environment - so every
    // third-party action the job runs can read the credential. It belongs at
    // the step that reads it. Eight spaces is a step-level env, which is right.
    if (inJobs && inSteps === false && indent === 6 && /\$\{\{\s*secrets\./.test(line)) {
      found.push({
        line: index + 1,
        text: line.trim(),
        problem:
          'a job-level `env:` carries a secret, so every step (and every third-party action) can read it - move it to the step that reads it (BUG-100)',
      });
      continue;
    }

    // The two context rules first, on every line at all: an `inputs`
    // expression is wrong wherever it is written, and a key line may carry it.
    if (!EVENT_INPUTS.test(line) && BARE_INPUTS.test(line)) {
      found.push({
        line: index + 1,
        text: line.trim(),
        problem:
          'a bare `inputs` context is dispatch-and-call only; read it through `github.event.inputs` instead',
      });
      continue;
    }
    for (const expression of line.match(/\$\{\{[^}]*\}\}/g) ?? []) {
      if (/[*&!]/.test(expression) && /\binputs\b/.test(expression)) {
        found.push({
          line: index + 1,
          text: line.trim(),
          problem:
            'an `inputs` expression this gate cannot read (an anchor or an alias): write it out so the check can see it',
        });
      }
    }

    if (!key) continue;
    const keyName = key[2];

    if (indent === 0) {
      // A workflow-level key: name, on, permissions, concurrency, jobs. Its
      // whole subtree is not a job or a step.
      inJobs = keyName === 'jobs';
      inSteps = false;
      continue;
    }
    if (!inJobs) continue;

    if (indent === 2) {
      // A job id, or a key of one of the jobs mapping's own children.
      inSteps = false;
      continue;
    }
    if (indent === 4) {
      if (keyName === 'steps') {
        inSteps = true;
        continue;
      }
      inSteps = false;
      if (!JOB_KEYS.has(keyName)) {
        found.push({
          line: index + 1,
          text: line.trim(),
          problem: `${keyName} is not a key a job may carry (expected one of ${[...JOB_KEYS].sort().join(', ')})`,
        });
      }
      continue;
    }
    if (inSteps && indent >= 6) {
      // A step's own key at eight columns. Everything deeper is inside a step's
      // `with:`, `env:`, `strategy:` or a `run:` block scalar, where
      // `KEY: value` is not YAML.
      if (indent === 8 && !STEP_KEYS.has(keyName)) {
        found.push({
          line: index + 1,
          text: line.trim(),
          problem: `${keyName} is not a key a step may carry (expected one of ${[...STEP_KEYS].sort().join(', ')})`,
        });
      }
    }
  }
  return found;
}

/**
 * The check of one workflow's text.
 *
 * @param {string[]} lines
 * @returns {{ ok: boolean, violations: Array<{ line: number, text: string, problem: string }> }}
 */
/**
 * A secret in a job-level `env:` is a secret in every step's environment.
 *
 * BUG-100: `store-ready.yml` carried the App Store Connect key as a job-level
 * env, so every third-party action the job ran could read it. A credential a
 * job cannot keep from its steps is a credential any of them can take, and the
 * fix is one the gate should enforce rather than remember: a `secrets.*`
 * reference belongs at the STEP that reads it, never at the job's own level.
 *
 * The shape that matters is the indentation, which is how this repository
 * writes its workflows: a job's `env:` at four spaces with its keys at six,
 * against a step's `env:` at six spaces with its keys at eight. A `secrets.*`
 * reference at six spaces is therefore a job-level one.
 */
export function jobLevelSecretFindings(lines) {
  const findings = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!/^ {6}[A-Za-z0-9_-]+:\s*\$\{\{\s*secrets\./.test(line)) continue;
    findings.push(
      `line ${String(i + 1)}: ${line.trim().split(':')[0]} is read from secrets at a JOB level - it is then present in every step's environment. Move it to the step that reads it (BUG-100)`,
    );
  }
  return findings;
}

export function checkWorkflow(lines) {
  const violations = violationsOf(lines);
  return { ok: violations.length === 0, violations };
}

/**
 * The check of every workflow in a directory.
 *
 * @param {string} [directory]
 * @returns {{ ok: boolean, checked: string[], violations: Array<{ file: string } & { line: number, text: string, problem: string }> }}
 */
export function checkWorkflowDir(directory = WORKFLOW_DIR) {
  const checked = [];
  const violations = [];
  if (!existsSync(directory)) {
    return {
      ok: false,
      checked,
      violations: [
        { file: directory, line: 0, text: '', problem: 'the workflow directory does not exist' },
      ],
    };
  }
  for (const entry of readdirSync(directory).sort()) {
    if (!entry.endsWith('.yml') && !entry.endsWith('.yaml')) continue;
    const file = path.join(directory, entry);
    checked.push(entry);
    for (const violation of violationsOf(readFileSync(file, 'utf8').split(/\r?\n/))) {
      violations.push({ file: entry, ...violation });
    }
  }
  return { ok: violations.length === 0, checked, violations };
}

export function defaultWorkflowDir() {
  return WORKFLOW_DIR;
}

/**
 * What runs in CI.
 *
 * @param {string[]} argv
 */
function main(argv) {
  const directory = argv[0] ?? defaultWorkflowDir();
  const result = checkWorkflowDir(directory);
  if (!result.ok) {
    console.error(`check-workflows (${BUG_ID}): ${result.violations.length} violation(s):`);
    for (const violation of result.violations) {
      console.error(`  ${violation.file}:${violation.line}: ${violation.problem}`);
      console.error(`      ${violation.text}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(
    `check-workflows: ${result.checked.length} workflows read their inputs through the github context and carry only keys GitHub accepts`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main(process.argv.slice(2));
}
