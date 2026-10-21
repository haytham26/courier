/**
 * The bearer token of the signed-in courier.
 *
 * The auth service (Better Auth) keeps the session in the device secure
 * store, so the token is fetched when a request needs it and never kept in
 * a module. The provider in `src/providers/Providers.tsx` wires the real
 * source in; without it the app simply talks to the API unauthenticated.
 */

export type AuthTokenProvider = () => Promise<string | null>;

let provider: AuthTokenProvider = async () => null;

/** Points the app at the signed-in courier's session. */
export function setAuthTokenProvider(next: AuthTokenProvider): void {
  provider = next;
}

/** The token of the signed-in courier, or null when nobody is signed in. */
export function getAuthToken(): Promise<string | null> {
  return provider();
}
