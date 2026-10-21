import React, { useEffect } from 'react';
import { ThemeProvider } from './ThemeProvider';
import { AuthProvider } from './AuthProvider';
import { ShiftProvider } from './ShiftProvider';
import { setAuthTokenProvider } from '@/api/authToken';
import { authClient } from '@/lib/auth-client';
import { getSyncService } from '@/sync/runtime';

/**
 * Ties the app to the things it needs from the world: the session of the
 * signed-in courier (the token the API checks) and the queue that empties
 * itself when the phone has a network again.
 */
function SessionBridge({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    setAuthTokenProvider(async () => {
      try {
        const result = await authClient.getSession({ query: {} });
        const data = result?.data as
          | { token?: string; session?: { token?: string } }
          | undefined;
        return data?.token ?? data?.session?.token ?? null;
      } catch {
        // Without a session the API answers with a plain "please sign in".
        return null;
      }
    });
  }, []);

  useEffect(() => {
    const stop = getSyncService().start();
    return () => {
      stop();
    };
  }, []);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ShiftProvider>
          <SessionBridge>{children}</SessionBridge>
        </ShiftProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
