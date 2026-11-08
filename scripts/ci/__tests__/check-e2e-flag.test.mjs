// The test for BUG-079's flag gate.
//
//   node --test scripts/ci/__tests__/check-e2e-flag.test.mjs
//
// The damage the gate exists for (a release build with a test flag - the E2E
// mocks or the option-C audio-file input - in the artifact a courier runs) and
// the android-e2e workflow once built as routine) and the near misses (a
// release with no flag, a debug with the flag, a dev variant with the flag).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CHECK = path.join(ROOT, 'scripts', 'ci', 'check-e2e-flag.mjs');

function runWith(env, args = ['--variant', 'release']) {
  const result = spawnSync(process.execPath, [CHECK, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      EXPO_PUBLIC_E2E: undefined,
      EXPO_PUBLIC_E2E_AUDIO_FILE: undefined,
      GRADLE_VARIANT: undefined,
      ...env,
    },
  });
  return { code: result.status, out: result.stdout + result.stderr };
}

test('a release build with the E2E flag fails (BUG-079)', () => {
  const { code, out } = runWith({ EXPO_PUBLIC_E2E: '1' });
  assert.notEqual(code, 0);
  assert.match(out, /RELEASE build and EXPO_PUBLIC_E2E=1/);
});

test('a release build without the flag passes', () => {
  const { code } = runWith({});
  assert.equal(code, 0);
});

test('a debug build with the flag passes (the test artifact)', () => {
  const { code } = runWith({ EXPO_PUBLIC_E2E: '1' }, ['--variant', 'debug']);
  assert.equal(code, 0);
});

// The legs' APK: a release build that declares itself a test artifact, because
// the flows need the bundle embedded (a debug build waits for Metro and never
// boots - run 41802746356's legs died with "no first screen appeared in 90s").
test('a declared e2e build with the flag passes', () => {
  const { code, out } = runWith({ EXPO_PUBLIC_E2E: '1' }, ['--variant', 'e2e']);
  assert.equal(code, 0);
  assert.match(out, /the E2E flag is set and the build is e2e/);
});

test('a dev build with the flag passes', () => {
  const { code } = runWith({ EXPO_PUBLIC_E2E: '1' }, ['--variant', 'dev']);
  assert.equal(code, 0);
});

test('an empty flag value is not the flag', () => {
  const { code } = runWith({ EXPO_PUBLIC_E2E: '' });
  assert.equal(code, 0);
});

test('the variant can come from the environment', () => {
  const { code } = runWith({ EXPO_PUBLIC_E2E: '1', GRADLE_VARIANT: 'release' }, []);
  assert.notEqual(code, 0);
});

// The option-C audio-file input (docs/research/2026/voice-audio-injection.md):
// `EXPO_PUBLIC_E2E_AUDIO_FILE` names a WAV a TEST build may feed the recognizer,
// so a release build must refuse it exactly as it refuses the E2E flag.
test('a release build with the audio-file flag fails', () => {
  const { code, out } = runWith({ EXPO_PUBLIC_E2E_AUDIO_FILE: 'e2e-utterance.wav' });
  assert.notEqual(code, 0);
  assert.match(out, /RELEASE build and EXPO_PUBLIC_E2E_AUDIO_FILE=e2e-utterance\.wav/);
});

test('a release build with both test flags fails and names both', () => {
  const { code, out } = runWith({
    EXPO_PUBLIC_E2E: '1',
    EXPO_PUBLIC_E2E_AUDIO_FILE: 'e2e-utterance.wav',
  });
  assert.notEqual(code, 0);
  assert.match(out, /EXPO_PUBLIC_E2E=1/);
  assert.match(out, /EXPO_PUBLIC_E2E_AUDIO_FILE=e2e-utterance\.wav/);
});

test('a declared e2e build with the audio-file flag passes (the test artifact)', () => {
  const { code, out } = runWith({ EXPO_PUBLIC_E2E_AUDIO_FILE: 'e2e-utterance.wav' }, [
    '--variant',
    'e2e',
  ]);
  assert.equal(code, 0);
  assert.match(out, /the audio-file flag names e2e-utterance\.wav/);
});

test('a debug build with the audio-file flag passes', () => {
  const { code } = runWith({ EXPO_PUBLIC_E2E_AUDIO_FILE: 'e2e-utterance.wav' }, ['--variant', 'debug']);
  assert.equal(code, 0);
});

test('an empty audio-file flag value is not the flag', () => {
  const { code } = runWith({ EXPO_PUBLIC_E2E_AUDIO_FILE: '' });
  assert.equal(code, 0);
});
