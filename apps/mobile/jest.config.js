/**
 * Jest configuration for the mobile app.
 *
 * `jest-expo` provides the Expo/React Native transform and the React Native
 * jest preset (jest-expo 58 -> @react-native/jest-preset 0.88).
 *
 * The resolver of Reanimated 4 is the important line: it sends the
 * `react-native-worklets` native files to their web twins, so a test run
 * never reaches for a native module that is not there.
 */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  resolver: 'react-native-reanimated/jest/resolver',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/android/', '<rootDir>/ios/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
};
