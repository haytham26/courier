// The flows' cold-start contract (BUG-185).
//
//   node --test scripts/ci/__tests__/flows-cold-start.test.mjs
//
// Run 41609308041's api-34 leg failed `.maestro/summary.yaml` INSIDE the flow
// suite (11 of 13 flows had passed first): `launchApp clearState: true`
// force-stopped the running app and cleared its data, but the old task's
// removal then killed the freshly started process. The device log names it:
//
//   ActivityTaskManager: Destroy timeout of remove-task, attempt to kill Task #19
//   ActivityManager:     Killing 11550:com.courier.copilot (adj -10000): remove task
//   ActivityManager:     Process 11550 failed to attach
//
// so the app never rendered `today-screen` and the flow's 60-second wait timed
// out. The same APK passed the same flow on api-35 seconds later, so the race
// is in the launch, not in the app: stopping the app FIRST lets the old task be
// removed before the new process starts.
//
// The parser is deliberately small, the same way check-e2e-pins.mjs reads the
// repo's YAML: the flows' command list is flat, one command per `- name:` key.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const flowFiles = [
  ...readdirSync(path.join(ROOT, '.maestro'))
    .filter((name) => name.endsWith('.yaml'))
    .map((name) => path.join('.maestro', name)),
  ...readdirSync(path.join(ROOT, '.maestro', 'a1'))
    .filter((name) => name.endsWith('.yaml'))
    .map((name) => path.join('.maestro', 'a1', name)),
];

/** The command names of one flow, in order, blank lines and comments skipped. */
function commandNames(file) {
  return readFileSync(path.join(ROOT, file), 'utf8')
    .split('\n')
    .map((line) => line.match(/^\s*-\s+([A-Za-z]+):/) || line.match(/^\s*-\s+([A-Za-z]+)\s*$/))
    .filter(Boolean)
    .map((match) => match[1]);
}

/** The indices whose command clears the app's state on launch. */
function clearingLaunchIndices(file) {
  const lines = readFileSync(path.join(ROOT, file), 'utf8').split('\n');
  const indices = [];
  let commandIndex = -1;
  for (const line of lines) {
    const command = line.match(/^\s*-\s+([A-Za-z]+)[:]?/);
    if (command) {
      commandIndex += 1;
    }
    if (/^\s*clearState:\s*true\s*$/.test(line) && commandIndex >= 0) {
      indices.push(commandIndex);
    }
  }
  return indices;
}

test('every launch that clears state stops the app first (BUG-185)', () => {
  const offenders = [];
  for (const flow of flowFiles) {
    const names = commandNames(flow);
    for (const index of clearingLaunchIndices(flow)) {
      if (names[index - 1] !== 'stopApp') {
        offenders.push(`${flow}: the launch that clears state has no stopApp before it`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test('the flows under test are all found', () => {
  // A silent empty suite proves nothing: the gate has to see the real flows.
  assert.ok(flowFiles.length >= 14, `expected the suite's flows, found ${flowFiles.length}`);
});
