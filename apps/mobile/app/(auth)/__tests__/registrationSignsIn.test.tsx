/**
 * The sign-up the E2E flow drives, on the real mock client (BUG-074).
 *
 * The audit's probe: `app/(auth)/register.tsx` awaits `register(...)` and
 * immediately calls `router.replace('/(tabs)')`, while the provider's
 * `register` never establishes a session at all - it only throws on failure.
 * The probe shows the replace executing with `status: signed-out`, so the
 * auth-guarded stack renders for an unauthenticated session: the account was
 * just created and the guard still refuses it.
 *
 * A sign-up ends in a session, the same way a sign-in does - Better Auth
 * signs the new courier in (the app's own mock says so in a comment). This
 * test drives the same E2E mock the device uses and asserts the provider ends
 * authenticated, which is the guard's answer.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

// The E2E mode is what the emulator builds, and it is the mode whose mock
// session the flow drives. It has to be set BEFORE the auth client's module
// evaluates, because the client picks its implementation at import time - so
// the provider is required lazily, after this line, rather than imported.
process.env.EXPO_PUBLIC_E2E = '1';

// The ESM boundary of the real client, stubbed so the module can load under
// jest's CommonJS runtime, exactly as `auth.test.tsx` does. What is tested is
// the APP's mock (the E2E one), so the real client's own factory is never
// reached in this mode.
jest.mock('better-auth/react', () => ({
  createAuthClient: jest.fn(() => ({ signIn: {}, signUp: {}, useSession: jest.fn() })),
}));
jest.mock('@better-auth/expo/client', () => ({ expoClient: jest.fn(() => ({})) }));
jest.mock('better-auth/client/plugins', () => ({
  organizationClient: jest.fn(() => ({})),
  twoFactorClient: jest.fn(() => ({})),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-constants', () => ({ expoConfig: { scheme: 'courier' } }));

type AuthModule = typeof import('@/providers/AuthProvider');

function loadProvider(): AuthModule {
  return jest.requireActual<AuthModule>('@/providers/AuthProvider');
}

describe('the sign-up the register screen drives (BUG-074)', () => {
  it('ends with a session, so the guarded stack has a courier to let through', async () => {
    const { AuthProvider, useAuth } = loadProvider();

    const Probe = () => {
      const { register, logout, status, isAuthenticated } = useAuth();
      return (
        <>
          <Text testID="status">{status}</Text>
          <Text testID="auth">{isAuthenticated ? 'yes' : 'no'}</Text>
          <Text
            testID="drive"
            onPress={() => {
              void (async () => {
                // The front door's own condition: nobody is signed in. This is
                // where the courier on the register screen actually is, and it
                // is what makes the probe's finding visible.
                await logout();
                await register('fresh@example.co.nz', 'correct-horse-battery', 'Fresh Courier');
              })();
            }}
          >
            drive
          </Text>
        </>
      );
    };

    const { getByTestId } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(getByTestId('status').props.children).not.toBe('loading'));

    const drive = getByTestId('drive');
    (drive.props.onPress as () => void)();

    // The screen replaces to `/(tabs)` straight after this resolves, and the
    // guard's answer has to be "yes" by then. Against the previous code the
    // status stayed `signed-out` forever, so the guarded stack rendered for a
    // courier who was not authenticated.
    await waitFor(() => expect(getByTestId('auth').props.children).toBe('yes'), { timeout: 8000 });
    expect(getByTestId('status').props.children).toBe('signed-in');
  });
});
