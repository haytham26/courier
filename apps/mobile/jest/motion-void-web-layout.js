/**
 * The inert twin of the web layout animations barrel of Reanimated 4.7.1.
 *
 * `apps/mobile/jest/resolver.js` sends the barrel
 * (`react-native-reanimated/src/layoutReanimation/web/index.ts`) here when
 * the test run consumes it, and keeps every other file of the library at
 * its official resolution (the Reanimated resolver stays in place, and
 * `setUpTests()` keeps running in `jest.setup.js`).
 *
 * Why:
 * the barrel's driving functions ask the element for browser-only
 * interfaces - a DOM snapshot (`getBoundingClientRect`), a CSSStyleDeclaration
 * that iterates (`Array.from(element.style)`), and the Web Animations API.
 * In the test realm the element that reaches them is a host instance of the
 * React test renderer, which has none of these: the diagnostics on the
 * workers of 2026-10-22 (run 39773532865) caught
 * "undefined is not iterable - Array.from(undefined)" coming from
 * `maybeReportOverwrittenProperties` at the mount of the entering animation
 * of the design lab screens, and only on the workers, never on this
 * machine.
 *
 * So in the test realm the drivers are inert: the suites assert content,
 * testIDs and state, not springs; no suite asserts animation behaviour;
 * and the real animations stay under test on the emulator, where the
 * Android E2E flows drive the genuine applied build.
 */
'use strict';

const componentUtils = require(
  'react-native-reanimated/src/layoutReanimation/web/componentUtils'
);

module.exports = {
  __esModule: true,

  // The <style> tags of the predefined keyframes are page cosmetics: the
  // realm already prepares their home through jestEnvironment.js, and
  // nothing reads them back in a test run.
  configureWebLayoutAnimations() {},

  // The reduced-motion check is a pure question about the entered config
  // and the module state; it keeps its real implementation.
  getReducedMotionFromConfig: componentUtils.getReducedMotionFromConfig,

  saveSnapshot() {},
  startWebLayoutAnimation() {},
  tryActivateLayoutTransition() {},
};
