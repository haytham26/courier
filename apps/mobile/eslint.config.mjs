/**
 * ESLint flat config for the mobile app (the shared rules live in
 * @courier/eslint-config).
 */
import config from '@courier/eslint-config';

export default [
  {
    ignores: [
      'node_modules/**',
      'android/**',
      'ios/**',
      '.expo/**',
      'coverage/**',
      '**/__mocks__/**',
    ],
  },
  ...config,
];
