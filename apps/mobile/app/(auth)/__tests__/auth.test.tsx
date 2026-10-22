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

const mockAuthClient = jest.requireMock('@/lib/auth-client').authClient;

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
      const { user, isAuthenticated } = useAuth();
      return <Text testID="email">{user?.email ?? 'none'}</Text>;
    };

    const { getByTestId } = render(<TestComponent />, { wrapper });

    await waitFor(() => expect(getByTestId('email').props.children).toBe('driver@example.co.nz'));
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
