import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

/**
 * The mobile app is a client of the Better Auth service (`services/auth`).
 * The Expo client plugin keeps the session cookie in the device secure store
 * instead of a web cookie jar, so the session survives app restarts and is
 * never readable by other apps.
 */
const authBaseUrl = process.env.EXPO_PUBLIC_AUTH_URL ?? 'http://localhost:3000';
const appScheme =
  typeof Constants.expoConfig?.scheme === 'string' ? Constants.expoConfig.scheme : 'courier';

export const authClient = createAuthClient({
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

// Type exports - import from better-auth/client which exports the core types
export type { Session, User } from 'better-auth/client';
