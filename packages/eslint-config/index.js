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
      // `typeof import('mod')` stays allowed: it is type-only, it carries
      // the real types (unlike a namespace-star type import, which the
      // type-aware program sometimes cannot resolve), and it is the standard
      // shape of `jest.requireActual<typeof import('jest')>` in test files.
      '@typescript-eslint/consistent-type-imports': ['error', { disallowTypeAnnotations: false }],
      '@typescript-eslint/no-floating-promises': 'error',
      // Library module augmentation is the one legitimate empty interface:
      // `declare module 'lib' { interface LibThemes extends Ours {} }` is how
      // a theme is registered with its library. An alias cannot replace the
      // interface there, because the library already declares the interface
      // and interface merging needs it.
      '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends' }],
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
  {
    // Plain JavaScript in this workspace is tooling (Babel, Metro, Jest and
    // Expo plugin files). Those files are CommonJS and run under plain Node,
    // so they carry the Node and Jest globals, and `require` is their module
    // system. The no-require-imports rule targets TypeScript code paths,
    // where `import` replaces `require`; it is scoped off for .js files.

    // The globals are declared here instead of a `globals` dependency so the
    // config stays dependency-free for every package that imports it.
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        module: 'writable',
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        jest: 'readonly',
        window: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
