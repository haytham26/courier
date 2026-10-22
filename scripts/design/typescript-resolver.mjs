/**
 * The resolver of the design scripts.
 *
 * The token package is written in TypeScript and its imports carry no file
 * extension, the way TypeScript writes them. Node's ESM resolver needs the
 * extension, so this hook adds it: `./tokens` becomes `./tokens.ts`.
 *
 * The hook is registered by the scripts that read the token package, so the
 * numbers in a render come from the source of the tokens and never from a
 * stale build.
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    for (const extension of ['.ts', '.tsx']) {
      try {
        return await nextResolve(`${specifier}${extension}`, context);
      } catch {
        // The next extension may be the right one.
      }
    }
  }
  return nextResolve(specifier, context);
}
