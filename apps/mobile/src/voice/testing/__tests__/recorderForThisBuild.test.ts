/**
 * The test-build seam for the voice-sample recorder (audit A3 item 3): the
 * recorder exists in a debug build or the E2E emulator build, never in a
 * shipped release (BUG-079 refuses the E2E flag in a release variant, and
 * `__DEV__` is false in any `assembleRelease`). Both reads happen at call
 * time, so a test can flip either.
 */
import { recorderForThisBuild } from '../recorderForThisBuild';

describe('recorderForThisBuild', () => {
  const g = globalThis as unknown as { __DEV__: boolean };
  const originalDev = g.__DEV__;
  const originalE2E = process.env.EXPO_PUBLIC_E2E;

  afterEach(() => {
    g.__DEV__ = originalDev;
    if (originalE2E === undefined) {
      delete process.env.EXPO_PUBLIC_E2E;
    } else {
      process.env.EXPO_PUBLIC_E2E = originalE2E;
    }
  });

  it('is on in a debug build', () => {
    g.__DEV__ = true;
    delete process.env.EXPO_PUBLIC_E2E;
    expect(recorderForThisBuild()).toBe(true);
  });

  it('is on in the E2E emulator build (a release-variant TEST artifact with the flag)', () => {
    g.__DEV__ = false;
    process.env.EXPO_PUBLIC_E2E = '1';
    expect(recorderForThisBuild()).toBe(true);
  });

  it('is off in a shipped release build', () => {
    g.__DEV__ = false;
    delete process.env.EXPO_PUBLIC_E2E;
    expect(recorderForThisBuild()).toBe(false);
  });
});
