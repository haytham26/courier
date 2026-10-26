// The E2E pins gate (BUG-065): every workflow that boots an Android emulator
// must declare the SAME pins, and a workflow that boots one must pin the
// emulator build.
//
//   node scripts/ci/check-e2e-pins.mjs [workflow-directory]
//
// Why it exists (PLAYBOOK 17.1): the E2E used to take three inputs that change
// without a commit - Maestro from `releases/latest`, the emulator binary and the
// system image from whatever the runner carried that day - and the AVD cache
// key ignored all of them and the emulator options. The same APK was green on
// api-35 one hour and red on four PRs the next, with the app, the flows and the
// workflow byte-identical (BUG-065 in docs/status/BUGS.md).
//
// The rule, enforced here so a new emulator workflow cannot float:
//  1. every workflow that runs android-emulator-runner declares the three pins
//     (MAESTRO_VERSION, MAESTRO_SHA256, EMULATOR_BUILD) in a top-level `env:`;
//  2. every such workflow passes `emulator-build:` to the action;
//  3. the pins agree across the workflows, because a tool upgrade is one PR
//     that moves all of them, not one file's worth;
//  4. the pin values have the shape they claim (a cli-X.Y.Z tag, a 64-char
//     sha256, digits), because a typo'd pin fails here rather than in a run.
//
// The parser is deliberately small, like check-emulator-gpu.mjs: this repo's
// YAML style is flat, hand-written and pinned. A value it cannot read FAILS.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BUG_ID = 'BUG-065';
export const PINS = ['MAESTRO_VERSION', 'MAESTRO_SHA256', 'EMULATOR_BUILD'];
export const SHAPES = {
  MAESTRO_VERSION: /^cli-\d+\.\d+\.\d+$/,
  MAESTRO_SHA256: /^[0-9a-f]{64}$/,
  EMULATOR_BUILD: /^\d+$/,
};
const RUNNER_USES = /uses:\s*reactivecircus\/android-emulator-runner@/;

/**
 * Reads a workflow file's top-level `env:` block (the pins' home) and its
 * per-step keys. The block is the shallow mapping directly under a line that is
 * exactly `env:` at column 0.
 *
 * @param {string[]} lines
 * @returns {{ env: Record<string,string>, lines: string[], bootsEmulator: boolean, hasEmulatorBuild: boolean }}
 */
export function readWorkflow(lines) {
  const env = {};
  let bootsEmulator = false;
  let hasEmulatorBuild = false;
  let sawTopEnv = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (RUNNER_USES.test(line)) bootsEmulator = true;
    if (/^\s*emulator-build:/.test(line)) hasEmulatorBuild = true;
    // Only the TOP-LEVEL env block holds the pins. A step's own `env:` block
    // references them (`MAESTRO_VERSION: ${{ env.MAESTRO_VERSION }}`) and must
    // not be mistaken for their value, or the gate would read a placeholder as
    // a pin. The first top-level block wins; a later one is not a pin source.
    if (line !== 'env:') continue;
    if (sawTopEnv) continue;
    sawTopEnv = true;
    // The block's own mapping: every deeper line, until a sibling key of `env:`.
    // The scan does NOT end the outer loop: the step that boots the emulator
    // comes after this block and is exactly what the rest of the gate needs.
    for (let scan = index + 1; scan < lines.length; scan += 1) {
      const inner = lines[scan];
      if (inner.trim() === '') continue;
      const indent = inner.length - inner.replace(/^\s+/, '').length;
      if (indent === 0) break;
      const pair = /^\s+([A-Z0-9_]+):\s*'?([^'#\r\n]+?)'?\s*$/.exec(inner);
      if (pair) env[pair[1]] = pair[2];
    }
  }
  return { env, lines, bootsEmulator, hasEmulatorBuild };
}

/**
 * The gate over one workflow directory. Returns the findings; a non-empty list
 * is a failure with a reason for each entry.
 *
 * @param {string} directory
 * @returns {string[]}
 */
export function checkWorkflowDir(directory) {
  const problems = [];
  const files = readdirSync(directory).filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'));
  const declared = new Map();
  let scanned = 0;

  for (const file of files.sort()) {
    const text = readFileSync(path.join(directory, file), 'utf8');
    const workflow = readWorkflow(text.split(/\r?\n/));
    if (!workflow.bootsEmulator) continue;
    scanned += 1;
    for (const pin of PINS) {
      const value = workflow.env[pin];
      if (value === undefined) {
        problems.push(`${file}: boots an emulator but declares no ${pin} pin`);
        continue;
      }
      if (!SHAPES[pin].test(value)) {
        problems.push(`${file}: ${pin}=${value} does not look like ${SHAPES[pin]}`);
      }
      declared.set(pin, (declared.get(pin) ?? new Set()).add(value));
    }
    if (!workflow.hasEmulatorBuild) {
      problems.push(`${file}: boots an emulator but does not pass emulator-build`);
    }
  }

  for (const [pin, values] of declared) {
    if (values.size > 1) {
      problems.push(`${pin} differs across the emulator workflows: ${[...values].sort().join(' vs ')}`);
    }
  }

  if (scanned === 0) {
    problems.push('no workflow boots the emulator, so the gate cannot see them: it would pass by seeing nothing');
  }
  return problems;
}

const defaultDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.github', 'workflows');

const invokedDirectly = process.argv[1] !== undefined
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const directory = process.argv[2] ?? defaultDirectory;
  const problems = checkWorkflowDir(directory);
  if (problems.length > 0) {
    for (const problem of problems) console.error(`${BUG_ID}: ${problem}`);
    console.error(`${BUG_ID}: the E2E pins gate fails over ${directory}`);
    process.exit(1);
  }
  const boots = readdirSync(directory).filter((name) => /\.ya?ml$/.test(name))
    .filter((name) => readWorkflow(readFileSync(path.join(directory, name), 'utf8').split(/\r?\n/)).bootsEmulator);
  console.log(`${BUG_ID}: ${boots.length} emulator boot(s) in ${directory} all carry the same pins`);
}
