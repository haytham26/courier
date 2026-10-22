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
    // D27, "editable by design": every colour a screen uses comes from the
    // ONE token file (`@courier/design-tokens/chosen` and, until the screens
    // are rebuilt, the legacy token modules). A hex colour outside those
    // files fails the build. The lints run per package (`eslint .`), so the
    // patterns are anchored to any directory (the `**/` head).
    files: ['**/*.{ts,tsx}'],
    ignores: [
      '**/packages/design-tokens/**',
      '**/app/design/**',
      '**/app/design2/**',
      '**/src/design/**',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
          message:
            'Colours come from one token file (import { tokens } from @courier/design-tokens/chosen), never as hex literals.',
        },
      ],
    },
  },
  {
    // Config files and plain JavaScript are not type checked.
    files: ['**/*.js', '**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
);
