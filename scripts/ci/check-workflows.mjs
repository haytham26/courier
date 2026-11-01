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
// The parser is deliberately small, like check-emulator-gpu.mjs's, but it reads
// the STRUCTURE - the mapping paths, whatever indentation a file is written in
// (BUG-108) - not this repository's two-space habit: a workflow written in any
// other valid YAML style used to be reported clean without being read at all.
// A line the structure cannot place is a violation, not a skip.
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

/** A key line: `key:` or `key: value`, with the key's name and its column. */
const KEY_LINE = /^(\s*)([A-Za-z_][A-Za-z0-9_-]*):(.*)$/;

/** A block scalar's opening: `|`, `>`, with the optional chomping indicators. */
const BLOCK_SCALAR = /^[|>][+-]?[0-9]*\s*$/;

/**
 * The structure of one workflow: the path of mapping keys every line sits
 * under, read as YAML rather than as this repository's indentation habit.
 *
 * BUG-108: the gate used to read the indentation itself ("six spaces is a
 * job-level env, eight is a step key"), so a file written in any other valid
 * YAML style - a different indent width, a sequence at its parent key's
 * column, a flow mapping - was not parsed at all and was reported clean. The
 * paths below are derived from the nesting, so the style cannot hide a defect.
 *
 * A line the parser cannot place (a tab in the indentation, a bare scalar
 * where a key belongs, an anchor or an alias in a value) is reported rather
 * than skipped: a gate that waves through what it cannot see is not a gate.
 *
 * @param {string[]} lines
 * @returns {Array<{ line: number, path: string[], key: string | null, value: string, problem?: string } | null>}
 */
export function structureOf(lines) {
  const entries = new Array(lines.length).fill(null);
  // The open mappings and sequences: one entry per column the file has opened.
  const stack = [];
  // While a block scalar is open, its content is not YAML.
  let blockIndent = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const indent = indentOf(line);

    // Inside a `run: |` or an `if: >` block: the content is data, not keys.
    if (blockIndent !== null && indent > blockIndent) continue;
    blockIndent = null;

    const problem = (text) => {
      entries[index] = { line: index + 1, path: [], key: null, value: '', problem: text };
    };

    if (/^[ \t]*\t/.test(line)) {
      problem('a tab is not YAML indentation: write the file with spaces');
      continue;
    }

    const dash = /^(\s*)-( *)()/.exec(line);
    const key = KEY_LINE.exec(line);
    const listContent = /^(\s*)-\s*(.*)$/.exec(line);

    if (!key && listContent) {
      // A sequence item. Its content may be a mapping (`- name: x`) or a
      // scalar (`- 'v*'`). The item belongs to the innermost mapping that owns
      // this column - which may be the key the sequence hangs from when a file
      // writes the sequence at its parent key's own indent.
      const itemIndent = indentOf(line);
      const dashMatch = /^(\s*)-(\s*)/.exec(line);
      const contentColumn = dashMatch[0].length;
      const content = line.slice(contentColumn);
      while (stack.length > 0 && stack[stack.length - 1].indent > itemIndent) stack.pop();
      let marker = stack[stack.length - 1];
      if (marker && marker.isSeq && marker.indent === itemIndent) {
        marker.count += 1;
        marker.path = [...marker.parentPath, marker.count];
      } else {
        const parentPath = marker && marker.indent <= itemIndent ? marker.path : [];
        const count = 0;
        marker = { indent: itemIndent, isSeq: true, parentPath, count, path: [...parentPath, count] };
        stack.push(marker);
      }
      const itemPath = [...marker.path];
      const contentKey = KEY_LINE.exec(content);
      if (contentKey) {
        const entry = {
          line: index + 1,
          path: itemPath,
          key: contentKey[2],
          value: contentKey[3],
        };
        entries[index] = entry;
        const block = BLOCK_SCALAR.test(contentKey[3].trim());
        if (contentKey[3].trim() === '' || block) {
          stack.push({ indent: contentColumn, path: [...itemPath, contentKey[2]] });
          if (block) blockIndent = contentColumn;
        }
        continue;
      }
      entries[index] = { line: index + 1, path: itemPath, key: null, value: content.trim() };
      if (/^[*&]/.test(content.trim())) {
        entries[index].problem = 'a YAML anchor or alias this gate cannot read: write the value out';
      }
      continue;
    }

    if (!key) {
      if (blockIndent === null) {
        problem('a line this gate cannot read: it is neither a key nor a sequence item');
      }
      continue;
    }

    const [, , keyName, rawValue] = key;
    const value = rawValue.trim();
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop();
    const parentPath = stack.length > 0 ? stack[stack.length - 1].path : [];
    const path = [...parentPath, keyName];
    entries[index] = { line: index + 1, path, key: keyName, value };
    if (value === '' || BLOCK_SCALAR.test(value)) {
      stack.push({ indent, path });
      if (BLOCK_SCALAR.test(value)) blockIndent = indent;
    }
  }
  return entries;
}

/**
 * The violations of one workflow's lines: an unknown key at a job or a step, a
 * bare `inputs` context, an `inputs` expression the gate cannot read, a line
 * the structure cannot place, and a secret read at a job level.
 *
 * The rules read the paths `structureOf` derives, so they hold for any YAML
 * style, not only this repository's two-space habit.
 *
 * @param {string[]} lines
 * @returns {Array<{ line: number, text: string, problem: string }>}
 */
export function violationsOf(lines) {
  const found = [];
  const entries = structureOf(lines);

  for (const entry of entries) {
    if (!entry) continue;
    const line = lines[entry.line - 1] ?? '';
    const push = (problem) => found.push({ line: entry.line, text: line.trim(), problem });

    if (entry.problem) {
      push(entry.problem);
      continue;
    }

    // The context rules, on every line at all: an `inputs` expression is wrong
    // wherever it is written, and a key line may carry it.
    if (!EVENT_INPUTS.test(line) && BARE_INPUTS.test(line)) {
      push(
        'a bare `inputs` context is dispatch-and-call only; read it through `github.event.inputs` instead',
      );
      continue;
    }
    for (const expression of line.match(/\$\{\{[^}]*\}\}/g) ?? []) {
      if (/[*&!]/.test(expression) && /\binputs\b/.test(expression)) {
        push('an `inputs` expression this gate cannot read (an anchor or an alias): write it out so the check can see it');
      }
    }

    // BUG-100: a `secrets.*` reference in a JOB-level `env:` (the path
    // `jobs.<job>.env`, with the credential either on its own line one deeper
    // or inline in a flow mapping) is a secret every step - and every
    // third-party action - can read. A step's own env is
    // `jobs.<job>.steps.<n>.env`, which is right.
    const jobLevelEnv =
      entry.path[0] === 'jobs' &&
      entry.path[2] === 'env' &&
      (entry.path.length === 3 || entry.path.length === 4);
    if (/\$\{\{\s*secrets\./.test(line) && jobLevelEnv) {
      push(
        'a job-level `env:` carries a secret, so every step (and every third-party action) can read it - move it to the step that reads it (BUG-100)',
      );
      continue;
    }

    if (entry.key === null || entry.path[0] !== 'jobs') continue;

    // A key directly under `steps:` (no item column) is a step key that lost
    // its `- `; a key one deeper is inside the item's own mapping.
    if (entry.path.length === 4 && entry.path[2] === 'steps') {
      // A key directly under `steps:` is a step key that lost its `- `.
      if (!STEP_KEYS.has(entry.key)) {
        push(`${entry.key} is not a key a step may carry (expected one of ${[...STEP_KEYS].sort().join(', ')})`);
      }
      continue;
    }
    if (entry.path.length === 5 && entry.path[2] === 'steps') {
      // A key inside the item's own mapping: a step key.
      if (!STEP_KEYS.has(entry.key)) {
        push(`${entry.key} is not a key a step may carry (expected one of ${[...STEP_KEYS].sort().join(', ')})`);
      }
      continue;
    }
    if (entry.path.length === 3 && entry.path[2] !== 'steps') {
      // A key of a job: depth 2 is the job's own id, depth 3 its keys.
      if (!JOB_KEYS.has(entry.key)) {
        push(`${entry.key} is not a key a job may carry (expected one of ${[...JOB_KEYS].sort().join(', ')})`);
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
 * This helper reports the same finding text-first, for a caller that has the
 * lines and not the parsed paths; the enforced rule is `violationsOf`'s, which
 * reads the paths and is style-independent (BUG-108).
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
