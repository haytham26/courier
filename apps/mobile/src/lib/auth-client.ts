import { createAuthClient } from 'better-auth/react';

// Create Better Auth client
export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000',
  // For mobile, we use the native fetch
  fetchOptions: {
    credentials: 'include',
  },
});

// Export auth methods
export const signIn = authClient.signIn;
export const signUp = authClient.signUp;
export const signOut = authClient.signOut;
export const getSession = authClient.getSession;
export const useSession = authClient.useSession;

// Type exports - import from better-auth/client which exports the core types
export type { Session, User } from 'better-auth/client';