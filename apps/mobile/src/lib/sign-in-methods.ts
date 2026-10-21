/**
 * The sign-in methods the service offers.
 *
 * The app asks the service what it can offer instead of guessing from its own
 * environment. That is what lets the build work before the founder has
 * supplied the Google and the Apple client ids and the passkey domain: the
 * service answers with the methods it has, and the app hides the other
 * buttons with a plain sentence.
 */
import { authClient } from './auth-client';

/** The sign-in methods the app can offer. */
export const SIGN_IN_METHODS = ['email', 'google', 'apple', 'passkey'] as const;

export type SignInMethod = (typeof SIGN_IN_METHODS)[number];

export interface SignInMethodState {
  /** Whether the courier can use this method right now. */
  enabled: boolean;
  /** Why the method is off, in plain words. Empty when the method is on. */
  reason: string;
}

export interface SignInMethods {
  methods: Record<SignInMethod, SignInMethodState>;
  /** Whether the service has the second factor switched on. */
  mfa: boolean;
  /** The team roles the service knows. */
  teamRoles: string[];
}

/**
 * What the app assumes when the service cannot be reached.
 *
 * Email and password always work, because they need nothing from the server
 * configuration. The other methods are off with a plain reason.
 */
export const DEFAULT_SIGN_IN_METHODS: SignInMethods = {
  methods: {
    email: { enabled: true, reason: '' },
    google: { enabled: false, reason: 'Google sign-in is not available right now.' },
    apple: { enabled: false, reason: 'Apple sign-in is not available right now.' },
    passkey: { enabled: false, reason: 'Passkeys are not available right now.' },
  },
  mfa: true,
  teamRoles: ['owner', 'admin', 'member'],
};

function isMethodState(value: unknown): value is SignInMethodState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const state = value as { enabled?: unknown; reason?: unknown };
  return typeof state.enabled === 'boolean' && typeof state.reason === 'string';
}

/**
 * Reads the answer of the service.
 *
 * The client hands back either the document or an error, so the shape is
 * checked before anything is believed.
 */
function parseMethods(payload: unknown): SignInMethods {
  if (typeof payload !== 'object' || payload === null) {
    return DEFAULT_SIGN_IN_METHODS;
  }
  const document = payload as Partial<SignInMethods>;
  const methods = { ...DEFAULT_SIGN_IN_METHODS.methods };
  const given = document.methods;
  if (typeof given === 'object' && given !== null) {
    for (const method of SIGN_IN_METHODS) {
      const state = (given as Record<string, unknown>)[method];
      if (isMethodState(state)) {
        methods[method] = state;
      }
    }
  }
  return {
    methods,
    mfa: typeof document.mfa === 'boolean' ? document.mfa : DEFAULT_SIGN_IN_METHODS.mfa,
    teamRoles: Array.isArray(document.teamRoles)
      ? document.teamRoles
      : DEFAULT_SIGN_IN_METHODS.teamRoles,
  };
}

/**
 * Asks the service which methods are live.
 *
 * A failure is not fatal: the app falls back to the defaults, so the courier
 * can still sign in with an email address and a password.
 */
export async function fetchSignInMethods(): Promise<SignInMethods> {
  try {
    const response: unknown = await authClient.$fetch('/sign-in-methods');
    return parseMethods(response);
  } catch {
    return DEFAULT_SIGN_IN_METHODS;
  }
}
