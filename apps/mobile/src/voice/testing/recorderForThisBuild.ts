/**
 * The seam for the test-build-only surfaces (audit A3 item 3): the opt-in
 * voice-sample recorder exists in a TEST build only — a debug build
 * (`__DEV__ === true`, read at call time) or the E2E emulator build
 * (`EXPO_PUBLIC_E2E === '1'`, inlined at bundle time, the same flag the
 * disclosure, turn and PoD seams read).
 *
 * A shipped release can satisfy neither: `assembleRelease` always has
 * `__DEV__ === false`, and BUG-079's `check-e2e-flag.mjs` refuses
 * `EXPO_PUBLIC_E2E=1` in a release-variant build, so the flag is never
 * inlined into the artifact a courier runs. Both reads happen at call time,
 * so a test can flip either.
 */
export const recorderForThisBuild = (): boolean =>
  __DEV__ === true || process.env.EXPO_PUBLIC_E2E === '1';
