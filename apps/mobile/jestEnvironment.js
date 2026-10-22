/**
 * The React Native test environment with a real DOM document.
 *
 * Two worlds meet in a test run of this app:
 *
 * - The suites are React Native Component trees, and the registrations of
 *   `jest-expo` and `@react-native/jest-preset` (the native module mocks,
 *   the error guard, the act flags) belong to that native world.
 * - The Reanimated 4 web implementation, which the global setup loads
 *   (`setUpTests()`), reaches for `document` at import time: it installs
 *   the stylesheet tags it would install in a browser. In the plain native
 *   environment there is no `document` and the import throws.
 *
 * So this environment extends the native one of `jest-expo` and, before
 * the setups run, puts a real jsdom document on the global. The setup runs
 * like it runs in a browser, and every suite keeps the native realm it was
 * written and verified in.
 */
'use strict';

const { TestEnvironment: ReactNativeEnvironment } = require(
  'jest-expo/src/preset/nativeEnvironment'
);
const { JSDOM } = require('jsdom');

class ReactNativeWithDomEnvironment extends ReactNativeEnvironment {
  async setup() {
    await super.setup();

    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
      url: 'http://localhost/',
      pretendToBeVisual: false,
    });
    this._domWindow = dom.window;
    this.global.document = dom.window.document;

    // DIAGNOSTIC (to remove): the CI run of 2026-10-22 fails the design lab
    // suites with "undefined is not iterable" coming from Reanimated's web
    // layout animations, which call `Array.from(element.style)`. Print the
    // offending value with a stack so the fix lands on the true element
    // type instead of a guess. Windows never hits it; CI (Linux) does.
    const RealArrayFrom = this.global.Array.from;
    this.global.Array.from = function ArrayFromDiagnostic(arrayLike, ...rest) {
      if (arrayLike === undefined || arrayLike === null) {
        console.error(`DIAG Array.from(${String(arrayLike)})\n${new Error().stack}`);
      }
      return RealArrayFrom.call(this, arrayLike, ...rest);
    };
  }

  async teardown() {
    // Frees the timers the DOM window may hold.
    this._domWindow?.close();
    this._domWindow = undefined;
    await super.teardown();
  }
}

module.exports = ReactNativeWithDomEnvironment;
module.exports.TestEnvironment = ReactNativeWithDomEnvironment;
