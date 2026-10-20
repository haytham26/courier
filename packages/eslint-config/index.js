/**
 * Shared ESLint flat config for the Courier Copilot workspace.
 *
 * Every package lints with `eslint .` and imports this config:
 *
 *   import config from '@courier/eslint-config';
 *   export default config;
 */
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const ignores = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.turbo/**',
  '**/.expo/**',
  '**/*.d.ts',
];

export default tseslint.config(
  { ignores },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: process.cwd(),
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    // Config files and plain JavaScript are not type checked.
    files: ['**/*.js', '**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
);
