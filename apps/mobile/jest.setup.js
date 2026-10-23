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

// Reanimated 4 and the worklets runtime: setUpTests() installs the testing
// helpers of the library. The resolver (jest/resolver.js) keeps the native
// build of the library loading in jest on every machine.
require('react-native-reanimated').setUpTests();

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

// expo-glass-effect: the Liquid Glass view is iOS 26+ native, so a test run
// gets a plain view. The availability check is switchable so the tests can
// pin the branch (the GlassSurface takes that check at startup).
jest.mock('expo-glass-effect', () => {
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');

  let glassAvailable = false;

  const GlassView = (props) => ReactActual.createElement(RN.View, props, null);

  return {
    GlassView,
    GlassContainer: (props) => ReactActual.createElement(RN.View, props, null),
    isGlassEffectAPIAvailable: () => glassAvailable,
    isLiquidGlassAvailable: () => glassAvailable,
    __setGlassAvailable: (value) => {
      glassAvailable = value;
    },
  };
});

// expo-blur: a stable Android blur needs a real RenderNode; a test run gets
// a plain view that still takes the tint and the styles (the fill layer on
// top is what the D33 pairs ride).
jest.mock('expo-blur', () => {
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    BlurView: (props) => ReactActual.createElement(RN.View, props, null),
    BlurTargetView: (props) => ReactActual.createElement(RN.View, props, null),
  };
});

// Skia: the sphere draws through the Skia view, which has no native runtime
// in a test run; the atomic components resolve to views so the accessibility
// and the layout can still be asserted.
jest.mock('@shopify/react-native-skia', () => {
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  const passthrough = (props: { [key: string]: unknown }) => ReactActual.createElement(RN.View, props, null);
  return {
    Canvas: (props: { style?: unknown; children?: unknown }) => ReactActual.createElement(RN.View, { style: props.style }, props.children),
    Circle: passthrough,
    Path: passthrough,
    Group: passthrough,
    RadialGradient: passthrough,
    BlurMask: passthrough,
  };
});

// The haptics: the impact calls are the contract (a scene change haptic, the
// success haptic on the slide); the mocks record them.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));



