/**
 * Jest setup for the mobile app.
 *
 * React Native Testing Library 13 ships its matchers by default, so nothing
 * extra is required here yet; the file is the place for future global setup.
 */
jest.useRealTimers();

// Unistyles reaches for the native Nitro module, which a test run does not
// have. The library ships its own mock for exactly this case, and it has to
// be registered before any screen that uses the theme is imported.
require('react-native-unistyles/mocks');
