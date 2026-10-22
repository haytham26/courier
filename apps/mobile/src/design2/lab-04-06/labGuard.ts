/**
 * Whether the design lab is in this build.
 *
 * MASTER_EXECUTION §16.7: the lab is a development route and stays out of
 * the release build. The check is a flag and not a folder the packager
 * ignores, because the founder opens the lab on a development build and the
 * E2E job opens it on the CI emulator, and a release build must show neither.
 *
 * The flag is `EXPO_PUBLIC_E2E=1` for the CI emulator, and `__DEV__` for a
 * development build. A release build has neither, so the lab redirects to
 * the tabs of the product.
 */
export function isDesignLabEnabled(): boolean {
  if (process.env.EXPO_PUBLIC_E2E === '1') {
    return true;
  }
  return __DEV__;
}
