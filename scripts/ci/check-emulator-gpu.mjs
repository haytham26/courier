// The emulator-GL gate: every workflow that boots an Android emulator must ask
// for software rendering explicitly (BUG-053 — the founder's session 4 brief and
// this branch name call it BUG-052, which the tracker had already given to the
// solver's break-scan cost; see D37).
//
//   node scripts/ci/check-emulator-gpu.mjs [workflow-directory]
//
// Why it exists: android-e2e.yml started the emulator with no -gpu flag, so the
// emulator chose its own host GL mode. On the headless GitHub runner that took
// the E2E gate down (`no first screen appeared in 90s` on the api-35 leg and
// `today-screen` asserts going false on api-34) while the GL noise lines still
// appear in a green run. Software rendering (swiftshader_indirect) is the
// standard headless setting and is what design-videos.yml and PR #12's
// screen-recordings.yml already use. A regression here costs a red E2E gate that
// looks like an app bug, so the setting is asserted, not hoped for.
//
// The rule: a step that runs reactivecircus/android-emulator-runner must set
// `-gpu swiftshader_indirect` in its emulator-options. A boot that sets no
// emulator-options at all also fails: that silence is what let the runner pick
// the unstable mode in the first place. A second -gpu fails too: the emulator
// takes the last one, so `-gpu swiftshader_indirect -gpu host` boots on host GL.
//
// The parser is deliberately small (this repo's YAML style is flat, hand-written
// and pinned): it reads a step's own mapping and its block scalars. A value it
// cannot read (a YAML anchor or an alias) FAILS rather than passes: a gate that
// waves through what it cannot see is not a gate.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BUG_ID = 'BUG-053';
export const REQUIRED_GPU_FLAG = '-gpu swiftshader_indirect';
const RUNNER_USES = /^\s*(?:-\s+)?uses:\s*reactivecircus\/android-emulator-runner@/;
const LIST_ITEM = /^(\s*)-\s/;

const indentOf = (line) => line.length - line.replace(/^\s+/, '').length;

/**
 * Splits a workflow file into its steps: a list item (`- name:` or `- uses:`
 * at the step's indent) together with every line indented deeper than it, which
 * is the step's own mapping. A line at or below the item's indent ends it.
 *
 * Anchoring on the list item rather than on the action's name line is what makes
 * the two legal forms read the same: `- name:` first with `uses:` as a sibling
 * key, and `- uses:` first. Both of GitHub's examples are in the wild.
 *
 * @param {string[]} lines
 * @returns {Array<{ line: number, text: string[] }>}
 */
export function stepsOf(lines) {
  const steps = [];
  let current = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === '') continue;
    const item = LIST_ITEM.exec(line);
    if (item) {
      current = { line: index + 1, indent: item[1].length, text: [line] };
      steps.push(current);
      continue;
    }
    if (current === null) continue;
    if (indentOf(line) <= current.indent) {
      current = null; // a sibling of `steps:` or a job key: the step is over
      continue;
    }
    current.text.push(line);
  }
  return steps;
}

/**
 * The emulator-options value of a step, or null when the step sets none.
 * An inline value is read directly; a block scalar (`|`, `|-`, `>`, `>-`) joins
 * its indented continuation lines. A YAML anchor or an alias is returned as the
 * special string 'unreadable' so the caller fails loudly instead of passing.
 *
 * @param {{ text: string[] }} step
 * @returns {string | null | 'unreadable'}
 */
export function emulatorOptionsOf(step) {
  for (let index = 0; index < step.text.length; index += 1) {
    const match = /^(\s*)emulator-options:\s*(.*)$/.exec(step.text[index]);
    if (!match) continue;
    const inline = match[2].trim();
    if (inline === '' || inline === '|' || inline === '|-' || inline === '>' || inline === '>-') {
      const keyIndent = match[1].length;
      const values = [];
      for (let scan = index + 1; scan < step.text.length; scan += 1) {
        const continuation = step.text[scan];
        if (continuation.trim() === '') break;
        if (indentOf(continuation) <= keyIndent) break;
        values.push(continuation.trim());
      }
      return values.join(' ');
    }
    // An anchor, an alias or a tag: the gate refuses to guess.
    if (/^[*&!]/.test(inline)) return 'unreadable';
    return inline;
  }
  return null;
}

/**
 * Whether the options carry exactly one -gpu flag and it is swiftshader_indirect.
 *
 * @param {string} options
 * @returns {{ ok: boolean, problem?: string }}
 */
export function gpuVerdict(options) {
  const tokens = options.split(/\s+/).filter(Boolean);
  const flags = [];
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index] === '-gpu') {
      flags.push(tokens[index + 1] ?? '(missing value)');
    }
  }
  if (flags.length === 0) {
    return { ok: false, problem: `emulator-options must include ${REQUIRED_GPU_FLAG}` };
  }
  if (flags.length > 1) {
    // The emulator takes the last -gpu it is given, so the earlier one is a lie.
    return { ok: false, problem: `emulator-options sets -gpu more than once (${flags.join(', ')}): the last one wins, and the gate cannot know which one boots` };
  }
  if (flags[0] !== 'swiftshader_indirect') {
    return { ok: false, problem: `emulator-options sets -gpu ${flags[0]}: ${REQUIRED_GPU_FLAG} is the headless setting` };
  }
  return { ok: true };
}

/**
 * Checks one workflow file's content.
 *
 * @param {string} content the file's text
 * @param {string} [name] the file name, for the findings
 * @returns {{ findings: Array<{ file: string, line: number, problem: string }>, emulators: number }}
 */
export function checkWorkflow(content, name = 'workflow.yml') {
  const lines = content.split(/\r?\n/);
  const findings = [];
  let emulators = 0;

  for (const step of stepsOf(lines)) {
    // Only a real `uses:` line counts: a comment or a run body that mentions the
    // action is not a boot.
    const usesLine = step.text.find((line) => RUNNER_USES.test(line));
    if (!usesLine) continue;
    emulators += 1;

    const options = emulatorOptionsOf(step);
    if (options === null) {
      findings.push({
        file: name,
        line: step.line,
        problem: `boots an emulator with no emulator-options: the runner picks the host GL mode (${BUG_ID})`,
      });
      continue;
    }
    if (options === 'unreadable') {
      findings.push({
        file: name,
        line: step.line,
        problem: `emulator-options is a YAML anchor, alias or tag, which this gate cannot read: pin ${REQUIRED_GPU_FLAG} inline so the gate can see it (${BUG_ID})`,
      });
      continue;
    }
    const verdict = gpuVerdict(options);
    if (!verdict.ok) {
      findings.push({ file: name, line: step.line, problem: verdict.problem });
    }
  }
  return { findings, emulators };
}

/** The default workflow directory: the repo's own, resolved from this module. */
export function defaultWorkflowDir() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.github', 'workflows');
}

/** Checks every workflow file of a directory (the repo's own by default). */
export function checkWorkflowDir(dir = defaultWorkflowDir()) {
  if (!existsSync(dir)) {
    throw new Error(`No workflow directory at ${dir}`);
  }
  const files = readdirSync(dir)
    .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
    .sort();
  const findings = [];
  let emulators = 0;
  for (const file of files) {
    const result = checkWorkflow(readFileSync(path.join(dir, file), 'utf8'), file);
    emulators += result.emulators;
    findings.push(...result.findings);
  }
  return { findings, emulators, files };
}

function main(argv) {
  const dir = argv[0] ? path.resolve(argv[0]) : defaultWorkflowDir();
  let result;
  try {
    result = checkWorkflowDir(dir);
  } catch (error) {
    console.error(`The emulator-GL gate could not read the workflow directory: ${error.message}`);
    process.exit(2);
  }
  if (result.findings.length > 0) {
    console.error(`An emulator boot does not ask for software rendering (${BUG_ID}):`);
    for (const finding of result.findings) {
      console.error(`  ${finding.file}:${finding.line}  ${finding.problem}`);
    }
    console.error(`Every workflow that boots an emulator must set ${REQUIRED_GPU_FLAG} in its emulator-options.`);
    process.exit(1);
  }
  console.log(
    `${result.emulators} emulator boot(s) across ${result.files.length} workflow files, every one with ${REQUIRED_GPU_FLAG}.`,
  );
}

const invokedDirectly = process.argv[1] != null && import.meta.url.endsWith(path.basename(process.argv[1]));
if (invokedDirectly) {
  main(process.argv.slice(2));
}
