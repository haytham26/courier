/**
 * Jest setup for the mobile app.
 *
 * React Native Testing Library 13 ships its matchers by default, so nothing
 * extra is required here yet; the file is the place for future global setup.
 */
jest.useRealTimers();

/**
 * Unistyles 3 runs on a native module (NitroModules) that a JavaScript test
 * has no access to, so the parts the app uses are stood in for here: the
 * theme switching of the provider and the style sheet configuration.
 */
jest.mock('react-native-unistyles', () => ({
  UnistylesRuntime: {
    setAdaptiveThemes: jest.fn(),
    setTheme: jest.fn(),
  },
  StyleSheet: {
    configure: jest.fn(),
    create: (styles) => styles,
  },
}));

/**
 * The icon set loads its font through expo-font, which needs a native module
 * a JavaScript test does not have. The font counts as loaded, so the icons
 * render as their glyph and the test never waits for a font.
 */
jest.mock('expo-font', () => ({
  isLoaded: jest.fn(() => true),
  isLoading: jest.fn(() => false),
  loadAsync: jest.fn(async () => undefined),
  useFonts: jest.fn(() => [true, null]),
  process: jest.fn(),
}));
