import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import {
  forgetSession,
  readOfflineSession,
  rememberSession,
  type OfflineSession,
  type OfflineSessionUser,
} from '@/lib/offline-session';
import { biometricSupport, unlockWithBiometrics as askThePhone } from '@/lib/biometric';
import {
  DEFAULT_SIGN_IN_METHODS,
  fetchSignInMethods,
  type SignInMethods,
} from '@/lib/sign-in-methods';

export type { SignInMethods };

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string | null;
  emailVerified: boolean;
  createdAt: Date | string;
}

/**
 * Where the app is with the session.
 *
 * `offline` is the state the research calls for: the phone has a session it
 * cannot check because there is no signal. The app opens with the last known
 * session and says so, rather than pretending the server said yes.
 */
export type SessionStatus = 'loading' | 'signed-out' | 'signed-in' | 'offline';

/**
 * The step of the sign-in the courier is on.
 *
 * `none` means the sign-in is finished (or has not started).
 */
export type SignInStep = 'none' | 'two-factor' | 'teams';

export interface Team {
  id: string;
  name: string;
  organizationId: string;
}

/**
 * What came out of a sign-in attempt.
 *
 * `two-factor-required` is not a failure: the password was right and the
 * courier now has to enter the code from the authenticator app.
 */
export type SignInOutcome =
  | { status: 'signed-in' }
  | { status: 'two-factor-required'; methods: string[] }
  | { status: 'failed'; message: string };

interface AuthContextType {
  user: AuthUser | null;
  status: SessionStatus;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOffline: boolean;
  /** The step of the sign-in the courier is on. */
  step: SignInStep;
  /** The methods the service offers. */
  signInMethods: SignInMethods;
  /** The session the phone kept for the days without a signal. */
  storedSession: OfflineSession | null;
  /** Whether the phone can unlock with a fingerprint or a face. */
  biometricAvailable: boolean;
  /** The teams the courier can pick from after signing in. */
  teams: Team[];
  login: (email: string, password: string) => Promise<SignInOutcome>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  signInWithGoogle: () => Promise<SignInOutcome>;
  signInWithApple: () => Promise<SignInOutcome>;
  signInWithPasskey: () => Promise<SignInOutcome>;
  verifyTwoFactor: (code: string, useBackupCode: boolean) => Promise<SignInOutcome>;
  loadTeams: () => Promise<Team[]>;
  selectTeam: (teamId: string) => Promise<void>;
  unlockWithBiometrics: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** The plain sentence the app shows when a sign-in does not work. */
function messageFor(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

function toOfflineUser(user: AuthUser): OfflineSessionUser {
  return {
    id: user.id,
    email: user.email,
    ...(user.name === undefined ? {} : { name: user.name }),
    emailVerified: user.emailVerified,
    createdAt: new Date(user.createdAt).toISOString(),
  };
}

/** The offline session becomes the signed-in courier of the app. */
function toAuthUser(user: OfflineSessionUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    ...(user.name === undefined ? {} : { name: user.name }),
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}

/**
 * Session state comes from the Better Auth client (the Expo variant keeps the
 * session cookie in the device secure store), so the provider maps it into
 * the shape the screens use.
 *
 * When the server cannot be reached the provider falls back to the session
 * the phone kept, and the app says it is offline. That fallback is bounded
 * (a shift) and it never pretends the server confirmed it.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, error, isPending, refetch } = authClient.useSession();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [step, setStep] = useState<SignInStep>('none');
  const [signInMethods, setSignInMethods] = useState<SignInMethods>(DEFAULT_SIGN_IN_METHODS);
  const [storedSession, setStoredSession] = useState<OfflineSession | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);

  // The methods the service offers and what the phone can do are read once,
  // when the app opens.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [methods, support, stored] = await Promise.all([
        fetchSignInMethods(),
        biometricSupport(),
        readOfflineSession(),
      ]);
      if (cancelled) {
        return;
      }
      setSignInMethods(methods);
      setBiometricAvailable(support.hardware && support.enrolled);
      setStoredSession(stored);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // The session itself: the server first, the phone second.
  useEffect(() => {
    if (isPending) {
      return;
    }

    if (data?.user) {
      setUser(data.user);
      setStatus('signed-in');
      void rememberSession(toOfflineUser(data.user));
      return;
    }

    if (error !== null && error !== undefined) {
      // No network, or the service is down: the phone may still hold a
      // session that is good enough for the shift.
      void readOfflineSession().then((offline) => {
        if (offline) {
          setUser(toAuthUser(offline.user));
          setStatus('offline');
        } else {
          setUser(null);
          setStatus('signed-out');
        }
      });
      return;
    }

    setUser(null);
    setStatus('signed-out');
  }, [data, error, isPending]);

  const loadTeams = useCallback(async (): Promise<Team[]> => {
    try {
      const { data: organizations } = await authClient.organization.list({ query: {} });
      const list = organizations ?? [];
      const found: Team[] = [];
      for (const organization of list) {
        const { data: organizationTeams } = await authClient.organization.listUserTeams({
          query: { organizationId: organization.id },
        });
        for (const team of organizationTeams ?? []) {
          found.push(team);
        }
      }
      setTeams(found);
      return found;
    } catch {
      setTeams([]);
      return [];
    }
  }, []);

  const selectTeam = useCallback(async (teamId: string) => {
    try {
      await authClient.organization.setActiveTeam({ teamId });
    } catch {
      // The team is a preference; the shift carries on without it.
    }
    setTeams((current) => current.filter((team) => team.id !== teamId));
    setStep('none');
  }, []);

  /**
   * The end of a sign-in.
   *
   * When the courier belongs to more than one team the app asks which route
   * they are driving; otherwise the shift starts straight away.
   */
  const finishSignIn = useCallback(async () => {
    const found = await loadTeams();
    setStep(found.length > 1 ? 'teams' : 'none');
  }, [loadTeams]);

  const login = useCallback(
    async (email: string, password: string): Promise<SignInOutcome> => {
      const { data: result, error: failure } = await authClient.signIn.email({ email, password });
      if (failure) {
        return { status: 'failed', message: messageFor(failure, 'Wrong email or password') };
      }
      if (result?.twoFactorRedirect === true) {
        setStep('two-factor');
        return {
          status: 'two-factor-required',
          methods: result.twoFactorMethods ?? ['totp'],
        };
      }
      await finishSignIn();
      return { status: 'signed-in' };
    },
    [finishSignIn],
  );

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const { error: failure } = await authClient.signUp.email({ email, password, name });
    if (failure) {
      throw new Error(failure.message);
    }
  }, []);

  const logout = useCallback(async () => {
    const { error: failure } = await authClient.signOut({});
    if (failure) {
      throw new Error(failure.message);
    }
    setUser(null);
    setStatus('signed-out');
    setStep('none');
    setTeams([]);
    await forgetSession();
  }, []);

  const refreshSession = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const signInWithProvider = useCallback(
    async (provider: 'google' | 'apple'): Promise<SignInOutcome> => {
      try {
        const { error: failure } = await authClient.signIn.social({
          provider,
          callbackURL: 'courier://',
        });
        if (failure) {
          return { status: 'failed', message: messageFor(failure, 'That did not work, try again') };
        }
        await finishSignIn();
        return { status: 'signed-in' };
      } catch (problem) {
        return {
          status: 'failed',
          message: messageFor(problem, 'That did not work, try again'),
        };
      }
    },
    [finishSignIn],
  );

  const signInWithGoogle = useCallback(() => signInWithProvider('google'), [signInWithProvider]);
  const signInWithApple = useCallback(() => signInWithProvider('apple'), [signInWithProvider]);

  const signInWithPasskey = useCallback(async (): Promise<SignInOutcome> => {
    try {
      const { error: failure } = await authClient.signIn.passkey();
      if (failure) {
        return {
          status: 'failed',
          message: messageFor(
            failure,
            'Passkeys need the fingerprint or face reader of this phone',
          ),
        };
      }
      await finishSignIn();
      return { status: 'signed-in' };
    } catch (problem) {
      return {
        status: 'failed',
        message: messageFor(problem, 'Passkeys need the fingerprint or face reader of this phone'),
      };
    }
  }, [finishSignIn]);

  const verifyTwoFactor = useCallback(
    async (code: string, useBackupCode: boolean): Promise<SignInOutcome> => {
      const trimmed = code.trim();
      if (trimmed.length === 0) {
        return { status: 'failed', message: 'Enter the code from your authenticator app' };
      }
      try {
        const { error: failure } = useBackupCode
          ? await authClient.twoFactor.verifyBackupCode({ code: trimmed })
          : await authClient.twoFactor.verifyTotp({ code: trimmed });
        if (failure) {
          return { status: 'failed', message: messageFor(failure, 'That code did not work') };
        }
        await finishSignIn();
        return { status: 'signed-in' };
      } catch (problem) {
        return { status: 'failed', message: messageFor(problem, 'That code did not work') };
      }
    },
    [finishSignIn],
  );

  const unlockWithBiometrics = useCallback(async (): Promise<boolean> => {
    const unlocked = await askThePhone();
    if (!unlocked) {
      return false;
    }
    const offline = await readOfflineSession();
    if (offline) {
      setUser(toAuthUser(offline.user));
      setStatus('offline');
      return true;
    }
    return false;
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      status,
      isLoading: status === 'loading',
      isAuthenticated: status === 'signed-in' || status === 'offline',
      isOffline: status === 'offline',
      step,
      signInMethods,
      storedSession,
      biometricAvailable,
      teams,
      login,
      register,
      logout,
      refreshSession,
      signInWithGoogle,
      signInWithApple,
      signInWithPasskey,
      verifyTwoFactor,
      loadTeams,
      selectTeam,
      unlockWithBiometrics,
    }),
    [
      user,
      status,
      step,
      signInMethods,
      storedSession,
      biometricAvailable,
      teams,
      login,
      register,
      logout,
      refreshSession,
      signInWithGoogle,
      signInWithApple,
      signInWithPasskey,
      verifyTwoFactor,
      loadTeams,
      selectTeam,
      unlockWithBiometrics,
    ],
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

/**
 * The session, or null when there is no session.
 *
 * A screen that only needs to know **who** is signed in - the map mode is
 * remembered per driver - must not break when the screen is shown without a
 * session, so it uses this instead of `useAuth`.
 */
export function useOptionalAuth(): AuthContextType | null {
  return useContext(AuthContext);
}
