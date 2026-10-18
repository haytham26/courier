// jest.setup.js - Setup file for Jest tests
require('@testing-library/jest-native/extend-expect');

// Mock react-native-platform to prevent window redefinition issues
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  Version: '16.0',
  select: jest.fn((obj) => obj.ios),
}));

// Silence console warnings during tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('componentWillReceiveProps') ||
      args[0].includes('componentWillMount') ||
      args[0].includes('componentWillUpdate'))
  ) {
    return;
  }
  originalWarn.apply(console, args);
};