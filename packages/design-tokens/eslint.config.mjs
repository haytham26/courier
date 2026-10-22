/**
 * ESLint flat config for this package (shared rules live in @courier/eslint-config).
 *
 * This package is the ONE place colour literals live: the token file itself
 * and its tests. The shared hex rule ignores this package for a
 * whole-repository lint run; from inside this package the paths are relative
 * (they start with src/ and dist/), so it re-ignores its own tree here.
 */
import config from '@courier/eslint-config';

export default [{ ignores: ['src/**', 'dist/**', 'coverage/**'] }, ...config];
