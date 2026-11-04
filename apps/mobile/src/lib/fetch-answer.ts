/**
 * The document a Better Auth client call answers with.
 *
 * BUG-171: Better Auth's `$fetch` is `@better-fetch/fetch`'s `createFetch`,
 * which resolves the ENVELOPE `{ data, error, status, ... }` and never the
 * raw body - read from the installed `@better-fetch/fetch@1.3.2` dist in
 * node_modules, and proven by run 41457437873's a1 failure, where the token
 * was read off the envelope and every mint answered null on the device, so
 * the API was never dialed at all.
 *
 * An answer without a `data` field is not an envelope, and is answered as
 * nothing: a bare body must not be believed, because believing it is exactly
 * what hid this from the unit tests.
 *
 * This helper lives in its own module (no client imports) so the modules that
 * read an answer can be tested with the client mocked out entirely.
 */
export function fetchAnswerBody(answered: unknown): unknown {
  if (typeof answered !== 'object' || answered === null) {
    return null;
  }
  return 'data' in answered ? answered.data : null;
}
