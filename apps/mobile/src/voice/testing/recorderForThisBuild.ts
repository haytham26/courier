/**
 * The seam for the debug-build-only surfaces (audit A3 item 3): the opt-in
 * voice-sample recorder exists in the app's DEBUG build only.
 *
 * `__DEV__` is Expo's build flag - true in debug builds (the E2E legs install
 * the debug build), false in every release build, so nothing a release
 * courier sees can reach the recorder. It is read at CALL time, the way the
 * other ForThisBuild seams read their env at call time, so a test can flip
 * it.
 */
export const recorderForThisBuild = (): boolean => __DEV__ === true;
