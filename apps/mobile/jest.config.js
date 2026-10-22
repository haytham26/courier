/**
 * Jest configuration for the mobile app.
 *
 * `jest-expo` provides the Expo/React Native transform and the React Native
 * jest preset (jest-expo 58 -> @react-native/jest-preset 0.88).
 *
 * The test environment is `./jestEnvironment.js`: the native environment of
 * jest-expo, extended with a real jsdom document. The Reanimated 4 web
 * implementation, which the setup of every suite loads (`setUpTests()`),
 * reaches for `document` at import time, and the plain native environment
 * keeps no DOM, so the setup crashes with "document is not defined" where
 * the window exists without the document (jest-expo aliases `window` and the
 * React Native preset setup redefines it).
 *
 * The resolver is `./jest/resolver.js`: it keeps the official semantics of
 * the Reanimated 4 and worklets resolvers (the web twins of the listed
 * worklets files stay forced for jest), with one correction in its
 * worklets membership test - a Reanimated-internal file must not count as
 * worklets-bound just because the pnpm virtual-store name of its directory
 * carries worklets as a peer suffix. jest resolution therefore stops
 * depending on directory names, and the native build of Reanimated loads
 * in jest on every machine.
 */
module.exports = {
  preset: 'jest-expo',
  testEnvironment: '<rootDir>/jestEnvironment.js',
  setupFiles: ['<rootDir>/jest.setup.media.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  resolver: '<rootDir>/jest/resolver.js',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/android/', '<rootDir>/ios/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
};
