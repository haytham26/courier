/**
 * The session restore is bounded (the a1 job's first real run).
 *
 * The device's own dump named the failure: the flow launched the app, waited 60
 * s for `welcome-screen`, and the a11y tree showed `not-found-screen` — the
 * router's unmatched fallback. No crash, no app-level error in logcat: the
 * root layout answers `if (isLoading) return null` while the auth session is
 * being restored, so a server that never answers keeps the whole stack
 * unmounted and the app without a screen for the whole launch. A courier on a
 * bad signal hits the same thing at the depot.
 *
 * The contract these tests pin: the provider goes on without the server. After
 * the deadline it answers the phone's own session (offline) or the front door
 * (signed-out), and the server's late answer still lands through the same
 * effect and moves the stack then.
 *
 * react-native is mocked here because the auth client and the secure store are
 * the seams this test drives; what is under test is the provider's own
 * decision, not the client's.
 */
import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

// The session that never answers: `isPending` stays true forever, which is the
// shape of a restore the server has not replied to.
jest.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: () => ({ data: undefined, error: undefined, isPending: true, refetch: jest.fn() }),
    signIn: {},
    signUp: {},
    signOut: {},
  },
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-constants', () => ({ expoConfig: { scheme: 'courier' } }));
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(false)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(false)),
  authenticateAsync: jest.fn(),
}));
jest.mock('../AuthProvider', () => {
  const actual = jest.requireActual<typeof import('../AuthProvider')>('../AuthProvider');
  return actual;
});

import { AuthProvider, useAuth } from '../AuthProvider';

describe('the session restore is bounded (the a1 job\'s first real run)', () => {
  it('goes on without the server: the front door, not a blank screen', async () => {
    jest.useFakeTimers();
    try {
      let status = 'loading';
      const Probe = () => {
        const auth = useAuth();
        status = auth.status;
        return <Text testID="status">{auth.status}</Text>;
      };

      const screen = render(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      );

      // While the restore is pending the app is loading — and loading is the
      // only state in which nothing is on screen.
      expect(screen.getByTestId('status').props.children).toBe('loading');

      // The deadline passes without an answer: the app goes on, and the front
      // door (signed-out, no session on the phone) is what shows.
      await act(async () => {
        // The lint rule (@typescript-eslint/require-await, CI run
        // 41326362048) wants an await in this async act: the microtask flush
        // is what lets the provider's promise callbacks land before the
        // timers advance past the deadline.
        await Promise.resolve();
        jest.advanceTimersByTime(9_000);
      });

      await waitFor(() => expect(status).toBe('signed-out'));
    } finally {
      jest.useRealTimers();
    }
  });

});
