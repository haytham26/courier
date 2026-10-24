// The emulator-GL gate: every workflow that boots an Android emulator must ask
// for software rendering explicitly (BUG-052).
//
//   node scripts/ci/check-emulator-gpu.mjs
//
// Why it exists: android-e2e.yml started the emulator with no -gpu flag, so the
// emulator chose its own host GL mode. On the headless GitHub runner that
// produced ColorBuffer errors, "DisplaySurfaceGlContextHelper context was
// preempted by others" and Maestro's launchApp dying on the first flows of a run
// while the later ones passed. Software rendering (swiftshader_indirect) is the
// standard headless setting and is what design-videos.yml and
// screen-recings.yml already use. A regression here costs a red E2E gate that
// looks like an app bug, so the setting is asserted, not hoped for.
//
// The rule: a step that runs reactivecircus/android-emulator-runner must set
// `-gpu swiftshader_indirect` in its emulator-options. A boot that sets no
// emulator-options at all also fails: that silence is what let the runner pick
// the unstable mode in the first place.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export const REQUIRED_GPU_FLAG = "-gpu swiftshader_indirect";
const RUNNER_ACTION = "reactivecircus/android-emulator-runner";

const indentOf = (line) => line.length - line.replace(/^\s+/, "").length;
const isListItem = (line) => /^\s*-\s/.test(line);

/**
 * The emulator options of the step whose `uses:` line starts at `fromIndex`.
 *
 * The scan walks the step's own inputs: it ends at the next step (a list item at
 * the anchor's indent or shallower), at a line that dedents out of the step, or
 * at the end of the file. A `script:` block scalar is skipped whole: its shell
 * body can contain list items such as `-no-window` that are not YAML structure.
 *
 * @param {string[]} lines
 * @param {number} fromIndex the line index of the runner's `uses:` line
 * @returns {string | null} the joined options, or null when the step sets none
 */
export function emulatorOptionsOfStep(lines, fromIndex) {
  const anchor = indentOf(lines[fromIndex]);
  for (let index = fromIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() !== "") {
      const indent = indentOf(line);
      if (indent < anchor) return null; // left the step
      if (isListItem(line) && indent <= anchor) return null; // the next step
    }
    if (/^\s*script:\s*\|/.test(line)) {
      // Skip the block body: its lines are indented deeper than the key.
      const keyIndent = indentOf(line);
      while (index + 1 < lines.length) {
        const next = lines[index + 1];
        if (next.trim() === "" || indentOf(next) > keyIndent) index += 1;
        else break;
      }
      continue;
    }
    const match = /^\s*emulator-options:\s*(.*)$/.exec(line);
    if (!match) continue;
    const inline = match[1].trim();
    if (inline !== "" && inline !== "|" && inline !== ">") return inline;
    // A block scalar: collect its indented continuation lines.
    const keyIndent = indentOf(line);
    const values = [];
    for (let scan = index + 1; scan < lines.length; scan += 1) {
      const continuation = lines[scan];
      if (continuation.trim() === "") break;
      if (indentOf(continuation) <= keyIndent) break;
      values.push(continuation.trim());
    }
    return values.join(" ");
  }
  return null;
}

/**
 * Checks one workflow file's content.
 *
 * @param {string} content the file's text
 * @param {string} [name] the file name, for the findings
 * @returns {{ findings: Array<{ file: string, line: number, problem: string }>, emulators: number }}
 */
export function checkWorkflow(content, name = "workflow.yml") {
  const lines = content.split(/\r?\n/);
  const findings = [];
  let emulators = 0;

  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].includes(RUNNER_ACTION)) continue;
    emulators += 1;
    const options = emulatorOptionsOfStep(lines, index);
    if (options === null) {
      findings.push({
        file: name,
        line: index + 1,
        problem: "boots an emulator with no emulator-options: the runner picks the host GL mode (BUG-052)",
      });
    } else if (!options.includes(REQUIRED_GPU_FLAG)) {
      findings.push({
        file: name,
        line: index + 1,
        problem: `emulator-options must include ${REQUIRED_GPU_FLAG}`,
      });
    }
  }
  return { findings, emulators };
}

/** Checks every workflow file of a directory (the repo's own by default). */
export function checkWorkflowDir(dir = path.join(".github", "workflows")) {
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
    .sort();
  const findings = [];
  let emulators = 0;
  for (const file of files) {
    const result = checkWorkflow(readFileSync(path.join(dir, file), "utf8"), file);
    emulators += result.emulators;
    findings.push(...result.findings);
  }
  return { findings, emulators, files };
}

function main() {
  const { findings, emulators, files } = checkWorkflowDir();
  if (findings.length > 0) {
    console.error("An emulator boot does not ask for software rendering (BUG-052):");
    for (const finding of findings) {
      console.error(`  ${finding.file}:${finding.line}  ${finding.problem}`);
    }
    console.error(`Every workflow that boots an emulator must set ${REQUIRED_GPU_FLAG} in its emulator-options.`);
    process.exit(1);
  }
  console.log(
    `${emulators} emulator boot(s) across ${files.length} workflow files, every one with ${REQUIRED_GPU_FLAG}.`,
  );
}

const invokedDirectly = process.argv[1] != null && import.meta.url.endsWith(path.basename(process.argv[1]));
if (invokedDirectly) {
  main();
}
