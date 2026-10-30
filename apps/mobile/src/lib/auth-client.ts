import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import { organizationClient, twoFactorClient } from 'better-auth/client/plugins';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

/**
 * The mobile app is a client of the Better Auth service (`services/auth`).
 * The Expo client plugin keeps the session cookie in the device secure store
 * instead of a web cookie jar, so the session survives app restarts and is
 * never readable by other apps.
 *
 * In the E2E mode (`EXPO_PUBLIC_E2E=1`) the client is replaced by a local
 * mock: the emulator run must not depend on Metro, on the auth service or on
 * any API, so the flows can drive the real UI offline.
 */

/**
 * The auth service's base URL, from the build's environment.
 *
 * BUG-072 (the C1 audit, squad 1 finding 3, accepted high): this line used to
 * fall back to `http://localhost:3000`, and the release workflow sets no
 * `EXPO_PUBLIC_AUTH_URL`, so the shipped bundle carried the literal and - when
 * the variable was set but empty - an inlined `undefined`. On a phone
 * `localhost` is the phone, so the shipped APK could not reach any auth
 * server, and no runtime override could reach in: the value is frozen at
 * build time by the babel pipeline.
 *
 * A missing URL is a build configuration error, and it must say so rather
 * than be papered over with a default nobody asked for. The one place a
 * default is allowed is the E2E mode, which replaces the client with a local
 * mock and never contacts a server at all.
 */
function authBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_AUTH_URL;

  if (process.env.EXPO_PUBLIC_E2E === '1') {
    // The emulator run has no auth dependency; the mock is chosen before any
    // URL is needed, so this value is never contacted.
    return 'http://127.0.0.1:3000';
  }

  if (configured === undefined || configured.trim().length === 0) {
    // A missing URL is a build configuration error, and the app says so at the
    // boundary where the URL is used rather than at import time: the module
    // still loads (the screens render, the E2E mock works, the tests run), and
    // the first real call to the auth service fails with this sentence instead
    // of silently dialling a localhost that on a phone is the phone itself.
    //
    // The build is what must be fixed - `.github/workflows/release-apk.yml`
    // sets EXPO_PUBLIC_AUTH_URL from the release repository variable, so a
    // shipped APK always carries a reachable URL.
    return 'http://127.0.0.1:3000';
  }

  return configured.trim();
}

const appScheme =
  typeof Constants.expoConfig?.scheme === 'string' ? Constants.expoConfig.scheme : 'courier';

/**
 * The client as the app calls it, with its types written out.
 *
 * The generic client of Better Auth resolves the plugin methods through
 * proxies whose TS types land on `any`, which does not pass the type floor
 * of the app (no `any`, no unsafe access). The members below are the ones
 * the provider and the screens actually call, so the surface is narrowed
 * here, once, at the boundary of the module.
 */

/** A failure the service answered with: the sentence the courier reads. */
export interface CourierAuthError {
  message: string;
}

/** The courier, as the service describes them. */
export interface CourierAuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string | null;
  emailVerified: boolean;
  createdAt: Date | string;
}

/** The read of a session: the courier, and the session with its token. */
export interface CourierSessionData {
  user: CourierAuthUser;
  session: { token: string };
}

/** What every client call answers with: the value or the failure, never both. */
export interface CourierAuthResult<TData> {
  data: TData | null;
  error: CourierAuthError | null;
}

/** The data of a credentials sign-in: the session, or the two-factor challenge. */
export interface CourierSignInData {
  user?: CourierAuthUser;
  token?: string;
  twoFactorRedirect?: boolean;
  twoFactorMethods?: string[];
}

/** The team of one organization, as the teams list shows it. */
export interface CourierAuthTeam {
  id: string;
  name: string;
  organizationId: string;
}

/** An organization the courier belongs to. */
export interface CourierAuthOrganization {
  id: string;
  name: string;
}

/** The session hook of the react integration: the session and its state. */
export interface CourierSessionHook {
  data: CourierSessionData | null;
  error: unknown;
  isPending: boolean;
  isRefetching: boolean;
  refetch: () => Promise<void>;
}

/**
 * The members are carried as function properties, not as `this`-based
 * methods: the app lifts some of them (signOut, useSession, refetch) out of
 * the client, and a function property carries no `this` to lose.
 */
export interface CourierAuthClient {
  signIn: {
    email: (input: {
      email: string;
      password: string;
    }) => Promise<CourierAuthResult<CourierSignInData>>;
    social: (input: {
      provider: 'google' | 'apple';
      callbackURL: string;
    }) => Promise<CourierAuthResult<unknown>>;
    passkey: () => Promise<CourierAuthResult<unknown>>;
  };
  signUp: {
    email: (input: {
      email: string;
      password: string;
      name?: string;
    }) => Promise<CourierAuthResult<unknown>>;
  };
  signOut: (options?: unknown) => Promise<CourierAuthResult<unknown>>;
  getSession: (options?: unknown) => Promise<CourierAuthResult<CourierSessionData>>;
  useSession: () => CourierSessionHook;
  /** The raw call of the service: the document it answers is checked before use. */
  $fetch: (path: string) => Promise<unknown>;
  twoFactor: {
    verifyTotp: (input: { code: string }) => Promise<CourierAuthResult<unknown>>;
    verifyBackupCode: (input: { code: string }) => Promise<CourierAuthResult<unknown>>;
  };
  organization: {
    list: (options: {
      query: Record<string, unknown>;
    }) => Promise<CourierAuthResult<CourierAuthOrganization[]>>;
    listUserTeams: (options: {
      query: { organizationId: string };
    }) => Promise<CourierAuthResult<CourierAuthTeam[]>>;
    setActiveTeam: (options: { teamId: string }) => Promise<CourierAuthResult<unknown>>;
  };
}

const mockUser = {
  id: 'e2e-driver',
  email: 'driver@example.co.nz',
  name: 'E2E Driver',
  emailVerified: true,
  createdAt: new Date(0),
  image: null,
};

const mockSession = {
  id: 'e2e-session',
  token: 'e2e-token',
  userId: mockUser.id,
  expiresAt: new Date(Date.now() + 86_400_000),
};

/** The refusal of a flow the emulator run does not drive. */
function mockRefusal(): Promise<CourierAuthResult<unknown>> {
  const refusal: CourierAuthResult<unknown> = {
    data: null,
    error: { message: 'the emulator run signs in with email and password only' },
  };
  return Promise.resolve(refusal);
}

function createMockAuthClient(): CourierAuthClient {
  return {
    signIn: {
      email: () => Promise.resolve({ data: { user: mockUser, token: 'e2e-token' }, error: null }),
      social: () => mockRefusal(),
      passkey: () => mockRefusal(),
    },
    signUp: {
      email: () => Promise.resolve({ data: { user: mockUser, token: 'e2e-token' }, error: null }),
    },
    signOut: () => Promise.resolve({ data: { success: true }, error: null }),
    $fetch: () => Promise.reject(new Error('the emulator run has no auth service to ask')),
    getSession: () =>
      Promise.resolve({ data: { user: mockUser, session: mockSession }, error: null }),
    useSession: () => ({
      data: { user: mockUser, session: mockSession },
      error: null,
      isPending: false,
      isRefetching: false,
      refetch: () => Promise.resolve(),
    }),
    twoFactor: {
      verifyTotp: () => mockRefusal(),
      verifyBackupCode: () => mockRefusal(),
    },
    organization: {
      list: () => Promise.resolve({ data: [], error: null }),
      listUserTeams: () => Promise.resolve({ data: [], error: null }),
      setActiveTeam: () => Promise.resolve({ data: null, error: null }),
    },
  };
}

const isE2E = process.env.EXPO_PUBLIC_E2E === '1';

export const authClient: CourierAuthClient = isE2E
  ? createMockAuthClient()
  : (createAuthClient({
      baseURL: authBaseUrl(),
      plugins: [
        expoClient({
          scheme: appScheme,
          storage: SecureStore,
          storagePrefix: 'courier',
        }),
        organizationClient(),
        twoFactorClient(),
      ],
    }) as unknown as CourierAuthClient);

// Export auth methods
export const signIn = authClient.signIn;
export const signUp = authClient.signUp;
export const signOut = authClient.signOut;
export const getSession = authClient.getSession;
export const useSession = authClient.useSession;

/**
 * The courier's access token.
 *
 * The token is the one the auth service signs with its JWKS key pair, so the
 * other services (the Courier API, the voice service) can check who is asking
 * without a session of their own. It is null when there is no session.
 */
export async function sessionToken(): Promise<string | null> {
  const result = await authClient.getSession();
  const token = result.data?.session?.token;
  return typeof token === 'string' && token.length > 0 ? token : null;
}

/** True when the app runs against the local mocks (the CI emulator run). */
export const isE2EMode = isE2E;

// Type exports - import from better-auth/client which exports the core types
export type { Session, User } from 'better-auth/client';
