// The test for the emulator-GL gate (BUG-060).
//
//   node --test scripts/ci/__tests__/check-emulator-gpu.test.mjs
//
// The gate reads workflow files as text, so the tests drive the shapes the real
// workflows use and the shapes that would fool a weaker parser:
//   - the two legal step forms (`- name:` first, `- uses:` first);
//   - an inline emulator-options value and a block scalar;
//   - a step whose `script:` body holds lines that start with a dash;
//   - a comment naming the action (not a boot);
//   - a second -gpu flag, which the emulator would honour as an override;
//   - a YAML anchor the gate refuses to guess at;
//   - `with:` written before `uses:`, which GitHub accepts.
// The last test drives the gate the way CI does, over the repo's own tree, so
// the gate cannot go vacuous (scan zero files, or a wrong directory) while
// every unit test still passes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BUG_ID,
  checkWorkflow,
  checkWorkflowDir,
  defaultWorkflowDir,
  emulatorOptionsOf,
  gpuVerdict,
  stepsOf,
  REQUIRED_GPU_FLAG,
} from '../check-emulator-gpu.mjs';

const RUNNER = 'reactivecircus/android-emulator-runner@a421e43855164a8197daf9d8d40fe71c6996bb0d';
const CHECKOUT = 'actions/checkout@11d5960a326750d5838078e36cf38b85af677262';

// android-e2e.yml as it carried the bug: the step is `- name:` first, so `uses:`
// is a sibling key, and there is no -gpu flag.
const BOOT_WITHOUT_GPU = `
      - name: Run the Maestro flows on the emulator
        uses: ${RUNNER}
        with:
          api-level: 34
          emulator-options: -no-window -no-snapshot -noaudio -no-boot-anim -camera-back none -memory 2048
          script: bash .maestro/run-all.sh

      - name: Upload the evidence
        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02
`;

// The same step after the fix.
const BOOT_WITH_GPU = BOOT_WITHOUT_GPU.replace(
  '-no-window -no-snapshot',
  '-no-window -gpu swiftshader_indirect -no-snapshot',
);

test('the bug id is the tracker\'s BUG-060, renumbered past the audit\'s BUG-053', () => {
  assert.equal(BUG_ID, 'BUG-060');
});

test('a boot without a -gpu flag fails the gate', () => {
  const { findings, emulators } = checkWorkflow(BOOT_WITHOUT_GPU, 'android-e2e.yml');
  assert.equal(emulators, 1);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].file, 'android-e2e.yml');
  assert.ok(findings[0].problem.includes(REQUIRED_GPU_FLAG));
});

test('the same step with swiftshader_indirect passes the gate', () => {
  const { findings, emulators } = checkWorkflow(BOOT_WITH_GPU, 'android-e2e.yml');
  assert.equal(emulators, 1);
  assert.deepEqual(findings, []);
});

test('a boot with no emulator-options at all fails the gate', () => {
  // Silence is what let the runner pick the unstable host GL mode.
  const silent = `
      - name: Boot the emulator
        uses: ${RUNNER}
        with:
          api-level: 34
          script: echo booted
`;
  const { findings, emulators } = checkWorkflow(silent, 'boot.yml');
  assert.equal(emulators, 1);
  assert.equal(findings.length, 1);
  assert.match(findings[0].problem, /no emulator-options/i);
});

test('the list-item step form is read too', () => {
  const listForm = `
      - uses: ${RUNNER}
        with:
          emulator-options: -no-window -noaudio
      - uses: ${CHECKOUT}
`;
  const { findings, emulators } = checkWorkflow(listForm, 'list-form.yml');
  assert.equal(emulators, 1);
  assert.equal(findings.length, 1);
  assert.ok(findings[0].problem.includes(REQUIRED_GPU_FLAG));
});

test("a step whose inputs come before the uses line is still read", () => {
  // GitHub accepts the keys in any order, so `with:` before `uses:` is legal
  // YAML and must not read as "no options".
  const inverted = `
      - name: Boot the emulator
        with:
          api-level: 34
          emulator-options: -no-window -gpu swiftshader_indirect -noaudio
        uses: ${RUNNER}
`;
  const { findings, emulators } = checkWorkflow(inverted, 'inverted.yml');
  assert.equal(emulators, 1);
  assert.deepEqual(findings, [], 'the options above the uses line are the step\'s own');
});

test('the options of a neighbouring step are not read as the emulator\'s', () => {
  // Another action may carry a key called emulator-options; it must never
  // satisfy or break this gate.
  const neighbour = `
      - uses: some-other/action@11d5960a326750d5838078e36cf38b85af677262
        with:
          emulator-options: -no-window -gpu swiftshader_indirect
      - uses: ${RUNNER}
        with:
          emulator-options: -no-window
`;
  const { findings, emulators } = checkWorkflow(neighbour, 'neighbour.yml');
  assert.equal(emulators, 1);
  assert.equal(findings.length, 1, "the runner's own options are what the gate reads");
  assert.ok(findings[0].problem.includes(REQUIRED_GPU_FLAG));
});

test('a comment naming the action is not an emulator boot', () => {
  // This workflow annotates its actions, so the comment shape is real.
  const commented = `
      - name: Prepare
        run: echo hello
      # the boot uses ${RUNNER} v2.38.0, pinned
      - uses: ${CHECKOUT}
`;
  const { findings, emulators } = checkWorkflow(commented, 'commented.yml');
  assert.equal(emulators, 0);
  assert.deepEqual(findings, []);
});

test('a run body that mentions the action is not an emulator boot', () => {
  const mentioned = `
      - name: Report
        run: echo "pinned: ${RUNNER}"
        with:
          emulator-options: -no-window
`;
  const { findings, emulators } = checkWorkflow(mentioned, 'mentioned.yml');
  assert.equal(emulators, 0);
  assert.deepEqual(findings, []);
});

test('a block-scalar emulator-options value joins its lines', () => {
  const blocked = `
      - uses: ${RUNNER}
        with:
          emulator-options: |
            -no-window
            -gpu swiftshader_indirect
            -noaudio
`;
  const lines = blocked.split('\n');
  const anchor = lines.findIndex((line) => line.includes(RUNNER));
  assert.equal(emulatorOptionsOf(stepsOf(lines)[0]), '-no-window -gpu swiftshader_indirect -noaudio');
  assert.equal(anchor >= 0, true);
  assert.deepEqual(checkWorkflow(blocked, 'blocked.yml').findings, []);
});

test('a folded block scalar joins its lines too', () => {
  const folded = `
      - uses: ${RUNNER}
        with:
          emulator-options: >-
            -no-window
            -gpu swiftshader_indirect
`;
  assert.deepEqual(checkWorkflow(folded, 'folded.yml').findings, []);
});

test('a script body that holds -lines does not end the scan early', () => {
  // screen-recordings.yml keeps the boot inside a `script:` body whose lines
  // start with a dash: the step walk must read the step's own inputs regardless.
  const scripted = `
      - name: Boot the emulator
        uses: ${RUNNER}
        with:
          api-level: 34
          disable-animations: false
          script: |
            curl -Ls "https://get.maestro.mobile.dev" -o "$RUNNER_TEMP/maestro-install.sh"
            bash "$RUNNER_TEMP/maestro-install.sh"
            adb install -r app.apk
          emulator-options: -no-window -gpu swiftshader_indirect -no-snapshot -noaudio
`;
  const { findings, emulators } = checkWorkflow(scripted, 'scripted.yml');
  assert.equal(emulators, 1);
  assert.deepEqual(findings, [], "the options after the script body are still the step's own");
});

test('a second -gpu flag fails: the last one wins', () => {
  // The emulator honours the last -gpu it is given, so the earlier swiftshader
  // is a lie and the gate must not pass it.
  const override = `
      - uses: ${RUNNER}
        with:
          emulator-options: -no-window -gpu swiftshader_indirect -gpu host -noaudio
`;
  const { findings, emulators } = checkWorkflow(override, 'override.yml');
  assert.equal(emulators, 1);
  assert.equal(findings.length, 1);
  assert.match(findings[0].problem, /more than once/i);
});

test('gpuVerdict reads the flag pair, not a substring', () => {
  assert.deepEqual(gpuVerdict('-no-window -gpu swiftshader_indirect -noaudio').ok, true);
  assert.match(gpuVerdict('-gpu host').problem, /swiftshader_indirect/);
  assert.match(gpuVerdict('-gpu').problem, /missing value/);
  assert.match(gpuVerdict('-gpu swiftshader_indirect -gpu host').problem, /more than once/);
});

test('an anchor or an alias the gate cannot read fails loudly', () => {
  // A gate that waves through what it cannot see is not a gate.
  const anchored = `
      - uses: ${RUNNER}
        with:
          emulator-options: *shared_options
`;
  const { findings, emulators } = checkWorkflow(anchored, 'anchored.yml');
  assert.equal(emulators, 1);
  assert.equal(findings.length, 1);
  assert.match(findings[0].problem, /anchor/i);
});

test('a workflow that never boots an emulator has no findings', () => {
  const plain = `
jobs:
  build:
    steps:
      - uses: ${CHECKOUT}
      - run: pnpm install
`;
  const { findings, emulators } = checkWorkflow(plain, 'ci.yml');
  assert.equal(emulators, 0);
  assert.deepEqual(findings, []);
});

test('every boot in one file is checked, not only the first', () => {
  const matrix = BOOT_WITHOUT_GPU + `
      - uses: ${RUNNER}
        with:
          emulator-options: -no-window -noaudio -no-boot-anim
`;
  const { findings, emulators } = checkWorkflow(matrix, 'matrix.yml');
  assert.equal(emulators, 2);
  assert.equal(findings.length, 2, 'a second un-flagged boot is not hidden by the first');
});

test('the gate over the repo\'s own tree is not vacuous', () => {
  // This is what CI runs: it must find the emulator boots, and it must be clean
  // on the tree that carries the fix. A regression that scanned zero files, or
  // the wrong directory, would fail here instead of in production.
  const { findings, emulators, files } = checkWorkflowDir();
  assert.ok(files.length >= 6, `the workflow files were read (${files.length})`);
  assert.ok(emulators >= 2, `the emulator boots were found (${emulators})`);
  assert.deepEqual(findings, []);
});

test('the gate over the repo\'s own tree is not vacuous', () => {
  // This is what CI runs: it must find the emulator boots, and it must be clean
  // on the tree that carries the fix. A regression that scanned zero files, or
  // the wrong directory, would fail here instead of in production.
  const { findings, emulators, files } = checkWorkflowDir();
  assert.ok(files.length >= 6, `the workflow files were read (${files.length})`);
  assert.ok(emulators >= 2, `the emulator boots were found (${emulators})`);
  assert.deepEqual(findings, []);
});

test('the CLI exits zero on the fixed tree, from any directory', () => {
  // The gate is run as `node scripts/ci/check-emulator-gpu.mjs` from the repo
  // root; its default directory is resolved from the module, so the cwd must not
  // matter (the emulator-gpu contract CI depends on).
  const gate = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'check-emulator-gpu.mjs');
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const output = execFileSync(process.execPath, [gate], { encoding: 'utf8', cwd: repoRoot });
  assert.match(output, /emulator boot\(s\) across \d+ workflow files/);
});

const GATE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'check-emulator-gpu.mjs');

/** A workflow directory of one file, in the OS temp folder, cleaned up after. */
function withWorkflowDir(name, content) {
  const dir = mkdtempSync(path.join(tmpdir(), `emulator-gpu-${name}-`));
  writeFileSync(path.join(dir, 'workflow.yml'), content, 'utf8');
  return {
    dir,
    cleanup() {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

test('the CLI fails loudly on a tree that misses the flag', () => {
  // A failing tree must exit 1 and name the file and the problem, so the floor
  // job is red for the right reason and a developer can find it from the log.
  const runIn = withWorkflowDir('failing', `jobs:\n  e2e:\n    steps:\n      - uses: ${RUNNER}\n        with:\n          emulator-options: -no-window\n`);
  try {
    let failed;
    try {
      execFileSync(process.execPath, [GATE, runIn.dir], { encoding: 'utf8' });
    } catch (error) {
      failed = error;
    }
    assert.ok(failed, 'the gate exits non-zero on a boot without the flag');
    assert.equal(failed.status, 1);
    assert.match(String(failed.stderr), /workflow\.yml:.*must include -gpu swiftshader_indirect/);
  } finally {
    runIn.cleanup();
  }
});

test('the CLI passes a fixed tree and reports what it scanned', () => {
  const runIn = withWorkflowDir('passing', `jobs:\n  e2e:\n    steps:\n      - uses: ${RUNNER}\n        with:\n          emulator-options: -no-window -gpu swiftshader_indirect\n`);
  try {
    const output = execFileSync(process.execPath, [GATE, runIn.dir], { encoding: 'utf8' });
    assert.match(output, /^1 emulator boot\(s\) across 1 workflow files/);
  } finally {
    runIn.cleanup();
  }
});

test('the default workflow directory is the repo\'s own', () => {
  assert.match(defaultWorkflowDir(), /\.github[\\/]workflows$/);
});

test('a missing workflow directory is one clean line, not a stack trace', () => {
  let failed;
  try {
    execFileSync(process.execPath, [GATE, path.join('no', 'such', 'directory')], { encoding: 'utf8' });
  } catch (error) {
    failed = error;
  }
  assert.ok(failed, 'the gate exits non-zero on a missing directory');
  const stderr = String(failed.stderr ?? '');
  assert.match(stderr, /could not read the workflow directory/);
  assert.ok(!stderr.includes('\n    at '), 'no stack trace: one clean line');
});
