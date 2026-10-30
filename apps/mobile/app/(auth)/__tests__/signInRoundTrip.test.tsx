/**
 * The sign-in the E2E flow drives, on the real mock client (BUG-113's tail).
 *
 * The Maestro flow `.maestro/sign-in.yaml` signs out, then signs in with the
 * email form, and waits for `today-screen` - the guard's answer that
 * `isAuthenticated` became true. On the device that wait timed out (run
 * 41015361739, both legs): the app stayed on `login-screen` while every other
 * flow in the same run found `today-screen` after its `launchApp clearState`.
 * So the defect is in the sign-out → sign-in round trip itself, not in the
 * mock's boot state.
 *
 * No suite covered it before: the others mock `useSession` as a static answer,
 * so nothing had ever watched the provider move from signed-out back to
 * signed-in through the real mock client's session dance. This one does, the
 * way the device does it.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

// The E2E mode is what the emulator builds, and it is the mode whose mock
// session the flow drives. It has to be set BEFORE the auth client's module
// evaluates, because the client picks its implementation at import time - so
// the provider is required lazily, after this line, rather than imported.
process.env.EXPO_PUBLIC_E2E = '1';

type Probe = typeof import('@/providers/AuthProvider');

function loadProvider(): Probe {
  return jest.requireActual<Probe>('@/providers/AuthProvider');
}

/** The client's session, the way the provider reads it. */
function readMockSession(): Promise<{ data: unknown } | null> {
  const client = jest.requireActual<{
    authClient: { getSession: () => Promise<{ data: unknown }> };
  }>('@/lib/auth-client');
  return client.authClient.getSession();
}

// The ESM boundary of the real client, stubbed so the module can load under
// jest's CommonJS runtime - exactly as `auth.test.tsx` does. What is being
// tested is the APP's mock (the E2E one), so the real client's own factory is
// never reached in this mode anyway.
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

describe('the sign-in the E2E flow drives (BUG-113)', () => {
  it('sends the courier from signed-out back to signed-in on the real mock', async () => {
    const { AuthProvider, useAuth } = loadProvider();
    const seen: string[] = [];

    const Probe = () => {
      const { status, isAuthenticated, login, logout } = useAuth();
      if (status !== 'loading' && seen[seen.length - 1] !== status) {
        seen.push(status);
      }
      return (
        <>
          <Text testID="status">{status}</Text>
          <Text testID="auth">{isAuthenticated ? 'yes' : 'no'}</Text>
          <Text
            testID="drive"
            onPress={() => {
              void (async () => {
                await logout();
                // The sign-out's own effect is asserted here, the moment it
                // lands: the client has no session any more. Without this the
                // test would pass on a provider that ignored the sign-out.
                const afterSignOut = await readMockSession();
                expect(afterSignOut.data).toBeNull();
                await login('driver@example.co.nz', 'correct-horse-battery');
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

    // The boot state of the E2E mock: a session already filled, which is why
    // the other flows open on Today after a clearState.
    await waitFor(() => expect(getByTestId('status').props.children).toBe('signed-in'));

    // The flow's own path: sign out, then sign back in with the email form.
    const drive = getByTestId('drive');
    (drive.props.onPress as () => void)();

    // The guard has to answer "authenticated" again, or the app stays on the
    // front door and today-screen never appears.
    await waitFor(() => expect(getByTestId('auth').props.children).toBe('yes'), { timeout: 8000 });
    expect(getByTestId('status').props.children).toBe('signed-in');

    // The courier is the one who signed in, not a leftover from the boot
    // session: the app really went out and came back. The intermediate
    // signed-out render is not asserted - React may batch the two state
    // changes into one commit, and asserting a render that may never happen
    // would be a test that proves nothing. What is asserted is that the
    // provider asked the client for a session and got the signed-in courier,
    // which is the answer the guard needs.
    expect(seen[0]).toBe('signed-in');
    expect(seen[seen.length - 1]).toBe('signed-in');
  });
});
