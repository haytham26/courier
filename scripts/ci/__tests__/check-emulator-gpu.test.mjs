// The test for the emulator-GL gate (BUG-052).
//
//   node --test scripts/ci/__tests__/check-emulator-gpu.test.mjs
//
// The gate reads workflow files as text, so the tests drive the shapes the real
// workflows use: the `- name:` step form, the `- uses:` list-item form, a block
// scalar, a step whose script body holds its own `-` lines, a boot with no
// options, and a workflow that never boots an emulator.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkWorkflow, emulatorOptionsOfStep, REQUIRED_GPU_FLAG } from '../check-emulator-gpu.mjs';

const RUNNER = 'reactivecircus/android-emulator-runner@a421e43855164a8197daf9d8d40fe71c6996bb0d';

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
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
`;
  const { findings, emulators } = checkWorkflow(listForm, 'list-form.yml');
  assert.equal(emulators, 1);
  assert.equal(findings.length, 1);
  assert.ok(findings[0].problem.includes(REQUIRED_GPU_FLAG));
});

test("the options of a neighbouring step are not read as the emulator's", () => {
  // Only the runner step's inputs count: another action may carry an option with
  // the same name, and it must never satisfy or break this gate.
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
  assert.equal(
    emulatorOptionsOfStep(lines, anchor),
    '-no-window -gpu swiftshader_indirect -noaudio',
  );
  assert.deepEqual(checkWorkflow(blocked, 'blocked.yml').findings, []);
});

test('a script body that holds -lines does not end the scan early', () => {
  // screen-recordings.yml keeps the boot inside a `script:` body whose lines
  // start with a dash: the scan must skip the body whole and keep reading the
  // step's inputs.
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

test('a workflow that never boots an emulator has no findings', () => {
  const plain = `
jobs:
  build:
    steps:
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
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
