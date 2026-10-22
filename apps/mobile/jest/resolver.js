/**
 * The resolver of the mobile test run.
 *
 * `jest.config.js` points jest here instead of at the resolver of
 * Reanimated 4 directly. It reproduces the official resolution semantics of
 * Reanimated 4.7.1 (`react-native-reanimated/jest/resolver`) and of
 * React Native Worklets 0.13.0 (`react-native-worklets/jest/resolver`) with
 * one corrected condition:
 *
 * the worklets resolver decides "worklets-bound" with a substring match on
 * the base directory (`basedir.includes('react-native-worklets')`). On pnpm
 * layouts that name the virtual store with peer suffixes, the base
 * directory of a Reanimated-internal file is
 * `.pnpm/react-native-reanimated@4.7.1_react-native-worklets@0.13.0_...`,
 * so every Reanimated-internal request looked worklets-bound, the "native"
 * platform extensions were stripped, and the WEB build of Reanimated loaded
 * in jest (the runs of 2026-10-22, see docs/status/BUGS.md). Its mount runs
 * the web layout animations against the host elements of the React test
 * renderer, which crashed the suites on the workers, while this machine
 * (short virtual-store names, the Windows default) loaded the native build
 * and passed.
 *
 * The correction keeps the intent of both resolvers and drops the false
 * trigger. Only three rules decide, in order:
 *
 * 1. The web twins Reanimated itself lists keep their official forcing:
 *    a relative request inside Reanimated that ends in one of the
 *    WEB_ONLY_IN_JEST entries resolves without the "native" extensions.
 * 2. Genuinely worklets-bound requests (the request mentions worklets, or
 *    the importing file really lives inside its package, decided by the
 *    segment after the last `node_modules` in the base directory, not by a
 *    substring) keep the official strip.
 * 3. Everything else - including every other request internal to
 *    Reanimated - resolves with the untouched extension list, so the
 *    native build of Reanimated loads in jest on every machine regardless
 *    of how pnpm names the virtual store directory.
 *
 * When either library version changes, re-read both upstream resolvers
 * (react-native-reanimated@<version>/jest/resolver.js and
 * react-native-worklets@<version>/jest/resolver.js) and keep this file in
 * step.
 */
'use strict';

const WEB_ONLY_IN_JEST = new Set([
  'initializers',
  'mutables',
  'mappers',
  'ConfigHelper',
  'UpdateLayoutAnimations',
  'useAnimatedRef',
  'useAnimatedStyle',
  'WorkletEventHandler',
  'JSPropsUpdater',
  'updateProps',
  'util',
  'css/component/AnimatedComponent',
]);

/** The name of the package that owns a base directory: the segment after
 * the last `node_modules`, e.g. "react-native-reanimated" itself or the
 * virtual-store directory ".pnpm/react-native-reanimated@4.7_...". A peer
 * suffix in that virtual-store name never counts, because it sits in a
 * different segment. */
function packageRootSegment(basedir) {
  const segments = String(basedir).split(/[\\/]/);
  const index = segments.lastIndexOf('node_modules');
  return index >= 0 ? (segments[index + 1] ?? '') : '';
}

/** @type {import('jest-resolve').SyncResolver} */
module.exports = (request, options) => {
  const reanimatedResolver = require('react-native-reanimated/jest/resolver');
  const basename = request.split('/').pop();
  const isWebOnly = [...WEB_ONLY_IN_JEST].some((entry) =>
    entry.includes('/') ? request.endsWith(entry) : basename === entry
  );
  const reanimatedInternal = String(options.basedir).includes(
    'react-native-reanimated'
  );
  const workletsBound =
    request.includes('react-native-worklets') ||
    packageRootSegment(options.basedir).startsWith('react-native-worklets');

  if (reanimatedInternal && request.startsWith('.') && isWebOnly) {
    return reanimatedResolver(request, options);
  }

  if (workletsBound) {
    return reanimatedResolver(request, options);
  }

  if (reanimatedInternal) {
    return options.defaultResolver(request, options);
  }

  return reanimatedResolver(request, options);
};
