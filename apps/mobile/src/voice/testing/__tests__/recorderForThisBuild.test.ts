/**
 * The debug-build seam for the voice-sample recorder (audit A3 item 3):
 * the recorder exists in the app's DEBUG build only, so a release build
 * cannot reach it. `__DEV__` is read at call time, so a test can flip it.
 */
import { recorderForThisBuild } from '../recorderForThisBuild';

describe('recorderForThisBuild', () => {
  const g = globalThis as unknown as { __DEV__: boolean };
  const original = g.__DEV__;

  afterEach(() => {
    g.__DEV__ = original;
  });

  it('is on in a debug build', () => {
    g.__DEV__ = true;
    expect(recorderForThisBuild()).toBe(true);
  });

  it('is off in a release build', () => {
    g.__DEV__ = false;
    expect(recorderForThisBuild()).toBe(false);
  });
});
