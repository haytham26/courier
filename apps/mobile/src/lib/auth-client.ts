import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
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

function createMockAuthClient() {
  return {
    signIn: {
      email: async () => ({ data: { user: mockUser, token: 'e2e-token' }, error: null }),
    },
    signUp: {
      email: async () => ({ data: { user: mockUser, token: 'e2e-token' }, error: null }),
    },
    signOut: async () => ({ data: { success: true }, error: null }),
    getSession: async () => ({ data: { user: mockUser, session: mockSession }, error: null }),
    useSession: () => ({
      data: { user: mockUser, session: mockSession },
      error: null,
      isPending: false,
      isRefetching: false,
      refetch: async () => {},
    }),
  };
}

const mockAuthClient = createMockAuthClient();
const isE2E = process.env.EXPO_PUBLIC_E2E === '1';

export const authClient = isE2E
  ? (mockAuthClient as unknown as ReturnType<typeof createAuthClient>)
  : createAuthClient({
      baseURL: authBaseUrl,
      plugins: [
        expoClient({
          scheme: appScheme,
          storage: SecureStore,
          storagePrefix: 'courier',
        }),
      ],
    });

// Export auth methods
export const signIn = authClient.signIn;
export const signUp = authClient.signUp;
export const signOut = authClient.signOut;
export const getSession = authClient.getSession;
export const useSession = authClient.useSession;

/** True when the app runs against the local mocks (the CI emulator run). */
export const isE2EMode = isE2E;

// Type exports - import from better-auth/client which exports the core types
export type { Session, User } from 'better-auth/client';
