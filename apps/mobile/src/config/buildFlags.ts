/**
 * The build flags of the mobile app.
 *
 * The design lab (`app/design`, `app/design2`) and the compatibility screen
 * (`app/compat.tsx`) are diagnostics, not the product (MASTER_EXECUTION
 * §16.1.7). They are in the dev build and in the E2E build only.
 *
 * `EXPO_PUBLIC_*` is inlined by babel-preset-expo while the bundle is built,
 * so a release build has no trace of the screens: the branch below is dead
 * code and Metro never puts the screens in the bundle at all (the same
 * decision is made in `metro.config.js`).
 */
export const DEV_SCREENS_IN_BUNDLE =
  process.env.EXPO_PUBLIC_DESIGN_LAB === '1' || process.env.EXPO_PUBLIC_E2E === '1';
