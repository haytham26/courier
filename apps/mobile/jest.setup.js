/**
 * Jest setup for the mobile app.
 *
 * React Native Testing Library 13 ships its matchers by default, so nothing
 * extra is required there; this file is the place for the global setup of
 * the native modules the app uses.
 */
jest.useRealTimers();

// Unistyles reaches for the native Nitro module, which a test run does not
// have. The library ships its own mock for exactly this case, and it has to
// be registered before any screen that uses the theme is imported.
require('react-native-unistyles/mocks');

// Reanimated 4 and the worklets runtime: the tests run on the web
// implementation, and the timers are the real ones so a spring settles.
require('react-native-reanimated').setUpTests();

// The mount drivers of Reanimated's web layout animations ask the element
// for browser-only interfaces that the host instances of the React test
// renderer do not carry (the diagnostics of the workers, 2026-10-22: the
// suites crashed at "Array.from(element.style)" when an entering animation
// mounted). The inert twin (jest/motion-void-web-layout.js) is therefore
// pinned for every suite regardless of how the library resolves; the real
// animations remain under test on the emulator, where the Android E2E
// flows drive the genuine applied build.
const mockMotionVoid = require('./jest/motion-void-web-layout');
jest.mock('react-native-reanimated/src/layoutReanimation/web', () => mockMotionVoid);

// The gesture handler ships its own mocks for the native module.
require('react-native-gesture-handler/jestSetup');

// The gesture handler installs the worklets runtime bindings when it loads.
// On the test platform there is no UI runtime, so the call is mocked out
// (the same fix the gesture handler made upstream in its own jest setup).
jest.mock(
  'react-native-gesture-handler/lib/module/handlers/gestures/installUIRuntimeBindings',
  () => ({
    installUIRuntimeBindings: jest.fn(),
  }),
);

// The icon set loads a font through expo-font, and a test run has no asset
// registry for it. The icon becomes a text node with the name of the glyph,
// which is enough for a test to find it.
jest.mock('@expo/vector-icons', () => {
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  const icon = (props) =>
    ReactActual.createElement(RN.Text, { accessibilityLabel: props.name }, props.name);

  return {
    MaterialCommunityIcons: icon,
    MaterialIcons: icon,
    Ionicons: icon,
  };
});


