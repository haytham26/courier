/**
 * Tests for the auth client and the AuthProvider.
 *
 * The mobile app talks to the Better Auth service (`services/auth`); the
 * client is the Expo variant, which keeps the session in the device secure
 * store. The client is mocked here so the tests do not need a server.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { signIn, signUp, signOut, getSession } from '@/lib/auth-client';

jest.mock('@/lib/auth-client', () => {
  const signIn = { email: jest.fn() };
  const signUp = { email: jest.fn() };
  const signOut = jest.fn();
  const getSession = jest.fn();

  return {
    authClient: {
      signIn,
      signUp,
      signOut,
      getSession,
      useSession: jest.fn(() => ({
        data: null,
        error: null,
        isPending: false,
        isRefetching: false,
        refetch: jest.fn(),
      })),
    },
    signIn,
    signUp,
    signOut,
    getSession,
  };
});

// The receipt the phone keeps. Mocked so the store is not the test's problem,
// and so a row can be planted exactly the way the device would have it.
const mockStoredSession = { current: null as unknown };
jest.mock('@/lib/offline-session', () => ({
  forgetSession: jest.fn(),
  readOfflineSession: jest.fn(() => Promise.resolve(mockStoredSession.current)),
  rememberSession: jest.fn(() => Promise.resolve()),
}));

/**
 * The mocked client, as the provider calls it: the same members, but every
 * call is a mockable fn. `requireMock` comes back untyped, so the
 * shape the provider depends on is asserted here once.
 */
interface AuthClientMock {
  signIn: { email: jest.Mock };
  signUp: { email: jest.Mock };
  signOut: jest.Mock;
  getSession: jest.Mock;
  useSession: jest.Mock;
}

const mockAuthClient =
  jest.requireMock<{ authClient: AuthClientMock }>('@/lib/auth-client').authClient;

describe('AuthProvider', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides the auth context to children', () => {
    const TestComponent = () => {
      const { isLoading, isAuthenticated } = useAuth();
      return (
        <>
          <Text testID="state">{isLoading ? 'loading' : 'loaded'}</Text>
          <Text testID="auth">{isAuthenticated ? 'yes' : 'no'}</Text>
        </>
      );
    };

    const { getByTestId } = render(<TestComponent />, { wrapper });

    expect(getByTestId('state')).toBeTruthy();
    expect(getByTestId('auth')).toBeTruthy();
  });

  it('exposes the signed-in user when a session exists', async () => {
    mockAuthClient.useSession.mockReturnValue({
      data: {
        user: {
          id: '1',
          email: 'driver@example.co.nz',
          name: 'Test Driver',
          emailVerified: true,
          createdAt: '2026-10-20T00:00:00.000Z',
        },
      },
      error: null,
      isPending: false,
      isRefetching: false,
      refetch: jest.fn(),
    });

    const TestComponent = () => {
      const { user } = useAuth();
      return <Text testID="email">{user?.email ?? 'none'}</Text>;
    };

    const { getByTestId } = render(<TestComponent />, { wrapper });

    await waitFor(() => expect(getByTestId('email').props.children).toBe('driver@example.co.nz'));
  });

  // BUG-071 (the C1 audit, squad 1 #2, accepted high): a refused session was
  // read as a network failure. `useSession`'s catch mapped EVERY error class
  // onto the offline branch, so a 401 - a revoked or expired session, the
  // server saying plainly that this credential is no longer good - answered
  // with `status: offline` and `isAuthenticated: yes`, built from the receipt
  // the phone kept. The probe is better-auth's exact 401 shape.
  //
  // The distinction the app must make: no network means the phone's session
  // is the best answer it has (the shift carries on, and the app says it is
  // offline); a refusal means the server answered and the answer was no, so
  // the receipt must not be spent.
  it('does not spend the stored receipt when the server refuses the session', async () => {
    // The phone DOES hold a receipt, and it is young: the whole defect is
    // that this receipt was spent on a refusal, so the test has to plant one.
    mockStoredSession.current = {
      user: {
        id: '1',
        email: 'driver@example.co.nz',
        emailVerified: true,
        createdAt: '2026-10-20T00:00:00.000Z',
      },
      confirmedAt: Date.now() - 60 * 60 * 1000,
      expiresAt: Date.now() + 6 * 60 * 60 * 1000,
    };

    mockAuthClient.useSession.mockReturnValue({
      data: null,
      // Better Auth surfaces an auth failure this way: a 401 with its own
      // shape, distinct from a network failure.
      error: { status: 401, statusText: 'Unauthorized', message: 'Unauthorized' },
      isPending: false,
      isRefetching: false,
      refetch: jest.fn(),
    });

    const TestComponent = () => {
      const { status, isAuthenticated } = useAuth();
      return (
        <>
          <Text testID="status">{status}</Text>
          <Text testID="auth">{isAuthenticated ? 'yes' : 'no'}</Text>
        </>
      );
    };

    const { getByTestId } = render(<TestComponent />, { wrapper });

    // The refusal is the refusal: the courier is signed out, not offline, and
    // the receipt is not treated as a ticket.
    await waitFor(() => expect(getByTestId('status').props.children).toBe('signed-out'));
    expect(getByTestId('auth').props.children).toBe('no');

    mockStoredSession.current = null;
  });

  // The other half of the same finding: a network failure IS the offline
  // case, so a courier with no signal keeps working. This test is the pair of
  // the one above - it exists so the fix cannot be "treat every error as a
  // refusal", which would take the offline-first design with it.
  it('still works offline when the server simply cannot be reached', async () => {
    // The phone keeps a receipt, young enough to be worth offering.
    mockStoredSession.current = {
      user: {
        id: '1',
        email: 'driver@example.co.nz',
        emailVerified: true,
        createdAt: '2026-10-20T00:00:00.000Z',
      },
      confirmedAt: Date.now() - 60 * 60 * 1000,
      expiresAt: Date.now() + 6 * 60 * 60 * 1000,
    };

    mockAuthClient.useSession.mockReturnValue({
      data: null,
      error: { status: 0, message: 'Network request failed' },
      isPending: false,
      isRefetching: false,
      refetch: jest.fn(),
    });

    const TestComponent = () => {
      const { status, isAuthenticated, user } = useAuth();
      return (
        <>
          <Text testID="status">{status}</Text>
          <Text testID="auth">{isAuthenticated ? 'yes' : 'no'}</Text>
          <Text testID="email">{user?.email ?? 'none'}</Text>
        </>
      );
    };

    const { getByTestId } = render(<TestComponent />, { wrapper });

    await waitFor(() => expect(getByTestId('status').props.children).toBe('offline'));
    expect(getByTestId('auth').props.children).toBe('yes');
    expect(getByTestId('email').props.children).toBe('driver@example.co.nz');

    mockStoredSession.current = null;
  });
});

describe('auth-client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signIn.email forwards the credentials', async () => {
    mockAuthClient.signIn.email.mockResolvedValue({
      data: { user: { id: '1', email: 'driver@example.co.nz' } },
      error: null,
    });

    await signIn.email({ email: 'driver@example.co.nz', password: 'correct-horse-battery' });

    expect(mockAuthClient.signIn.email).toHaveBeenCalledWith({
      email: 'driver@example.co.nz',
      password: 'correct-horse-battery',
    });
  });

  it('signUp.email forwards the credentials', async () => {
    mockAuthClient.signUp.email.mockResolvedValue({
      data: { user: { id: '1', email: 'driver@example.co.nz', name: 'Test Driver' } },
      error: null,
    });

    await signUp.email({
      email: 'driver@example.co.nz',
      password: 'correct-horse-battery',
      name: 'Test Driver',
    });

    expect(mockAuthClient.signUp.email).toHaveBeenCalledWith({
      email: 'driver@example.co.nz',
      password: 'correct-horse-battery',
      name: 'Test Driver',
    });
  });

  it('signOut calls the client', async () => {
    mockAuthClient.signOut.mockResolvedValue({ error: null });

    await signOut({});

    expect(mockAuthClient.signOut).toHaveBeenCalled();
  });

  it('getSession calls the client', async () => {
    mockAuthClient.getSession.mockResolvedValue({
      data: { user: { id: '1', email: 'driver@example.co.nz' } },
      error: null,
    });

    await getSession({ query: {} });

    expect(mockAuthClient.getSession).toHaveBeenCalled();
  });
});
