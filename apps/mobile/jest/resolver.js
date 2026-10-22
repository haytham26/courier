/**
 * The resolver of the mobile test run.
 *
 * `jest.config.js` points jest here instead of at the resolver of
 * Reanimated 4 directly. It calls the official resolver for every request
 * (so the web twins of the listed worklets files keep their forced
 * resolution), and adds one test-realm guard on top: the web barrel of
 * Reanimated's layout animations resolves to its inert twin
 * (`motion-void-web-layout.js`), because its driving functions ask the
 * elements for browser-only interfaces that the host instances of the
 * React test renderer do not carry. The details live in the header of
 * the twin.
 *
 * The guard covers both forms of the barrel: the TypeScript source tree
 * (the tests run from `src/` on this machine) and the compiled
 * `lib/module` tree (the tests run from the published build on the
 * workers - the relative requests there carry explicit `.js` suffixes,
 * see docs/status/BUGS.md for the run evidence of 2026-10-22).
 */
'use strict';

const path = require('path');
const reanimatedResolver = require('react-native-reanimated/jest/resolver');

const WEB_BARREL =
  /react-native-reanimated[\\/](?:src|lib[\\/]module)[\\/]layoutReanimation[\\/]web[\\/]index\.(?:tsx?|js|jsx|mjs|cjs)$/;

module.exports = (request, options) => {
  const resolved = reanimatedResolver(request, options);

  if (typeof resolved === 'string' && WEB_BARREL.test(resolved)) {
    return path.join(__dirname, 'motion-void-web-layout.js');
  }

  return resolved;
};
