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
const authBaseUrl = process.env.EXPO_PUBLIC_AUTH_URL ?? 'http://localhost:3000';
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

/**
 * The session the mock holds, and the one it hands back.
 *
 * The real client keeps the session in the device store: a sign-in writes it
 * and a sign-out clears it, and the app reads back what is there. The emulator
 * run has no service behind it, so the mock is the service - and it has to
 * behave like one, or the flows drive a UI that cannot be left. Before this,
 * the mock answered every session read with a driver no matter what the app
 * did, so a sign-out was undone by the next read and the front door was never
 * reachable: the sign-in flow could not run at all.
 *
 * The answer object is rebuilt only when the session actually moves. A fresh
 * object on every read would wake the provider's session effect on every
 * render, which is what signed the driver back in.
 */
let currentSession: { user: typeof mockUser; session: typeof mockSession } | null = {
  user: mockUser,
  session: mockSession,
};

/** The answer `useSession` hands back: a new object only when the session moves. */
function buildMockSessionAnswer(): CourierSessionHook {
  return {
    data: currentSession,
    error: null,
    isPending: false,
    isRefetching: false,
    refetch: () => Promise.resolve(),
  };
}

let mockSessionAnswer = buildMockSessionAnswer();

/** Moves the mock session: a sign-in fills it, a sign-out clears it. */
function moveMockSession(
  next: { user: typeof mockUser; session: typeof mockSession } | null,
): void {
  currentSession = next;
  mockSessionAnswer = buildMockSessionAnswer();
}

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
      email: () => {
        // A sign-in fills the session, the way the real client writes it.
        moveMockSession({ user: mockUser, session: mockSession });
        return Promise.resolve({ data: { user: mockUser, token: 'e2e-token' }, error: null });
      },
      social: () => mockRefusal(),
      passkey: () => mockRefusal(),
    },
    signUp: {
      email: () => {
        // A registration signs the courier in too, so it fills the session.
        moveMockSession({ user: mockUser, session: mockSession });
        return Promise.resolve({ data: { user: mockUser, token: 'e2e-token' }, error: null });
      },
    },
    // A sign-out clears the session: the front door has to be reachable.
    signOut: () => {
      moveMockSession(null);
      return Promise.resolve({ data: { success: true }, error: null });
    },
    $fetch: () => Promise.reject(new Error('the emulator run has no auth service to ask')),
    getSession: () => Promise.resolve({ data: currentSession, error: null }),
    useSession: () => mockSessionAnswer,
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
      baseURL: authBaseUrl,
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
