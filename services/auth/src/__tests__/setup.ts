/**
 * The test setup: a stub for the Have I Been Pwned range API (BUG-058).
 *
 * The breached-password check is on by default, so every sign-up in the suite
 * would call `api.pwnedpasswords.com`. This interceptor answers the range
 * endpoint in the real k-anonymity shape — 35-character SHA-1 suffixes and a
 * count — for the passwords the policy tests declare as breached, and an
 * empty body for every other range. Any other host falls through to the real
 * `fetch`.
 */
import { createHash } from "node:crypto";

export const BREACHED_PASSWORDS = ["courier-breached-example-password"];

/** Every range prefix the service asked for, in order (the k-anonymity proof). */
export const pwnedRangeCalls: string[] = [];

/**
 * The corpus's behaviour, for the tests that ask about an outage (BUG-128).
 *
 * `hangFor` names the passwords whose range call never answers: the guarded
 * check's deadline is what turns that into a fail-open sign-up instead of a
 * request that never completes. Empty by default: the corpus answers.
 */
const behaviour: { hangFor: string[] } = { hangFor: [] };

export function setPwnedBehaviour(next: { hangFor: string[] }): void {
  behaviour.hangFor = next.hangFor;
}

export function sha1(value: string): string {
  return createHash("sha1").update(value).digest("hex").toUpperCase();
}

const RANGE_PREFIX = "https://api.pwnedpasswords.com/range/";
const realFetch = globalThis.fetch;

globalThis.fetch = (async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  if (url.startsWith(RANGE_PREFIX)) {
    const range = url.slice(RANGE_PREFIX.length).toUpperCase();
    pwnedRangeCalls.push(range);
    if (behaviour.hangFor.map(sha1).some((hash) => hash.startsWith(range))) {
      // The outage: the call never answers, so only a deadline can stop it.
      return new Promise<Response>(() => {});
    }
    const entries = BREACHED_PASSWORDS.map(sha1)
      .filter((hash) => hash.startsWith(range))
      .map((hash) => `${hash.slice(5)}:42`);
    return new Response(entries.join("\r\n"), { status: 200 });
  }
  return realFetch(input, init);
});
