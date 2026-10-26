// The workflow-inputs gate: a workflow may read its dispatch inputs through the
// `github` context, never through a bare `inputs` context (BUG-067).
//
//   node scripts/ci/check-workflow-inputs.mjs [workflow-directory]
//
// Why it exists: `.github/workflows/map-pack.yml` failed in 0 seconds on every
// run it ever had - 65 of them, from PR #43's first push to the day this was
// fixed - with GitHub's "This run likely failed because of a workflow file
// issue" and zero jobs. The BUG-064 guard was blamed for it (a §16 note even
// recorded the failure as outside my diff), and the guard was never reached: the
// cause was `EXTRACT_URL: ${{ inputs.extract_url }}`. `inputs` is a
// dispatch-and-call-only context, so a push - and the schedule - failed while the
// workflow was being built, before a single job existed. A workflow that cannot
// start does not report a job's failure, which is why this read as infrastructure
// noise for two days.
//
// The rule: an expression of the form `${{ inputs.<name> }}` anywhere in a
// workflow that also names another event (a push, a schedule, a pull_request)
// is invalid for that event, and invalid for every event is not worth arguing
// about. `${{ github.event.inputs.<name> }}` is the form that exists for every
// event: a dispatch answers its input, and anything else answers nothing.
//
// The parser is deliberately small, like check-emulator-gpu.mjs's: a line that is
// not a comment is scanned, and a match is reported with its file and line. A
// value the gate cannot see (a YAML anchor or an alias holding the expression)
// fails rather than passes, for the same reason the emulator gate states.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BUG_ID = 'BUG-067';

// The script lives at scripts/ci/, so the repository root is two directories up.
const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const WORKFLOW_DIR = path.join(REPO_ROOT, '.github', 'workflows');

/** The invalid form: `${{ inputs.foo }}`, with or without spaces. */
const BARE_INPUTS = /\$\{\{\s*inputs\s*\./;

/** The valid form, which the gate must not flag. */
const EVENT_INPUTS = /\$\{\{\s*github\.event\.inputs\s*\./;

/** The events a workflow that reads `inputs` must not also name. */
const TRIGGER_KEY = /^(\s*)([a-z_]+):\s*$/;

/**
 * The violations of one workflow's text: bare `inputs` expressions outside a
 * comment, and any `inputs` expression the gate cannot read (an anchor, an
 * alias, a tag).
 *
 * @param {string[]} lines
 * @returns {Array<{ line: number, text: string, problem: string }>}
 */
export function violationsOf(lines) {
  const found = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim().startsWith('#')) continue;
    if (EVENT_INPUTS.test(line)) continue;
    if (BARE_INPUTS.test(line)) {
      found.push({
        line: index + 1,
        text: line.trim(),
        problem:
          'a bare `inputs` context is dispatch-and-call only; read it through `github.event.inputs` instead',
      });
      continue;
    }
    // An expression this gate cannot read is reported: a gate that waves through
    // what it cannot see is not a gate.
    const expressions = line.match(/\$\{\{[^}]*\}\}/g) ?? [];
    for (const expression of expressions) {
      if (/[*&!]/.test(expression) && /\binputs\b/.test(expression)) {
        found.push({
          line: index + 1,
          text: line.trim(),
          problem:
            'an `inputs` expression this gate cannot read (an anchor or an alias): write it out so the check can see it',
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
    console.error(`check-workflow-inputs (${BUG_ID}): ${result.violations.length} violation(s):`);
    for (const violation of result.violations) {
      console.error(`  ${violation.file}:${violation.line}: ${violation.problem}`);
      console.error(`      ${violation.text}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log(
    `check-workflow-inputs: ${result.checked.length} workflows read their inputs through the github context`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main(process.argv.slice(2));
}
