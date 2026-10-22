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
 * The resolver of Reanimated 4 is the other important line: it sends the
 * `react-native-worklets` native files to their web twins, so a test run
 * never reaches for a native module that is not there.
 */
module.exports = {
  preset: 'jest-expo',
  testEnvironment: '<rootDir>/jestEnvironment.js',
  setupFiles: ['<rootDir>/jest.setup.media.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  resolver: 'react-native-reanimated/jest/resolver',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/android/', '<rootDir>/ios/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
};
