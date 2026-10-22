/**
 * The Metro configuration of the Courier Copilot mobile app.
 *
 * The design lab (`app/design`, `app/design2`) and the compatibility screen
 * (`app/compat.tsx`) are diagnostics, not the product (MASTER_EXECUTION
 * §16.1.7). They are in the dev build and in the E2E build only: the release
 * APK must not carry them.
 *
 * The switch is a build-time flag, so the decision is made while the bundle is
 * built and nothing is left in the shipped JavaScript:
 *
 *   EXPO_PUBLIC_DESIGN_LAB=1   the design lab is in the bundle
 *   EXPO_PUBLIC_E2E=1          the E2E build: the lab and the compatibility
 *                              screen are in the bundle
 *   (neither)                  the release build: neither is in the bundle
 *
 * The blocked files never reach the bundle, so the router does not register
 * the routes: `app/_layout.tsx` only adds the screen names when the same flag
 * is on (the flag is inlined by babel-preset-expo, so the branch is dead code
 * in a release build).
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const devScreensInBundle =
  process.env.EXPO_PUBLIC_DESIGN_LAB === '1' || process.env.EXPO_PUBLIC_E2E === '1';

if (!devScreensInBundle) {
  const existing = config.resolver.blockList;
  const blocked = [
    /[/\\]app[/\\]design2[/\\].*/,
    /[/\\]app[/\\]design[/\\].*/,
    /[/\\]app[/\\]compat\.tsx$/,
  ];
  config.resolver.blockList = Array.isArray(existing)
    ? [...existing, ...blocked]
    : existing
      ? [existing, ...blocked]
      : blocked;
}

module.exports = config;
