// jest.setup.js - Setup file for Jest tests
const { expect } = require('expect');

global.expect = expect;
global.jest = jest;

require('@testing-library/jest-native/extend-expect');

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