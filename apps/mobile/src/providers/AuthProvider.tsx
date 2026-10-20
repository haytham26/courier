import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { authClient } from '@/lib/auth-client';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string | null;
  emailVerified: boolean;
  createdAt: Date | string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface SessionState {
  data: { user: AuthUser } | null;
  error: unknown;
  isPending: boolean;
  isRefetching: boolean;
  refetch: () => Promise<void>;
}

/**
 * Session state comes from the Better Auth client (the Expo variant keeps the
 * session cookie in the device secure store), so the provider only maps it
 * into the shape the screens use.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, isPending, refetch } = authClient.useSession() as SessionState;

  const user = useMemo<AuthUser | null>(() => data?.user ?? null, [data]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await authClient.signIn.email({ email, password });
    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const { error } = await authClient.signUp.email({ email, password, name });
    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const logout = useCallback(async () => {
    const { error } = await authClient.signOut({});
    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading: isPending,
      isAuthenticated: user !== null,
      login,
      register,
      logout,
      refreshSession,
    }),
    [user, isPending, login, register, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
