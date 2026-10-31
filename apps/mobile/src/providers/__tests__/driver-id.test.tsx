/**
 * The signed-in driver is published where the session is settled (BUG-092).
 *
 * `setCurrentDriverId` had no caller anywhere in the repo, so every
 * preference write landed in the one `local-driver` bucket: a second driver
 * on a shared van phone inherited the first driver's theme, map mode and
 * toggles. The auth provider is the only place that knows who is signed in
 * (the session hook, the sign-in and sign-up reads, the offline fallback and
 * the sign-out all settle it there), so it is the place that publishes the
 * id - and the test proves it does, by reading the published id inside the
 * provider with a session the mocked service answers with.
 */
import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';

/** The imports the provider would otherwise pull the better-auth chain in with. */
jest.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: jest.fn(),
    getSession: jest.fn(),
    signIn: { email: jest.fn(), social: jest.fn(), passkey: jest.fn() },
    signUp: { email: jest.fn() },
    signOut: jest.fn(),
    twoFactor: { verifyTotp: jest.fn(), verifyBackupCode: jest.fn() },
    organization: { list: jest.fn(), listUserTeams: jest.fn(), setActiveTeam: jest.fn() },
    $fetch: jest.fn(),
  },
}));

jest.mock('@/lib/offline-session', () => ({
  readOfflineSession: jest.fn(() => Promise.resolve(null)),
  forgetSession: jest.fn(() => Promise.resolve()),
  rememberSession: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/biometric', () => ({
  biometricSupport: jest.fn(() => Promise.resolve({ hardware: false, enrolled: false })),
  unlockWithBiometrics: jest.fn(() => Promise.resolve(false)),
}));

jest.mock('@/lib/sign-in-methods', () => ({
  DEFAULT_SIGN_IN_METHODS: { methods: {}, mfa: true, teamRoles: [] },
  fetchSignInMethods: jest.fn(() =>
    Promise.resolve({ methods: {}, mfa: false, teamRoles: [] }),
  ),
}));

import { authClient } from '@/lib/auth-client';
import { AuthProvider } from '../AuthProvider';
import { getCurrentDriverId } from '@/sync/driverSession';
import { useDriverId } from '@/sync/driverSession';

/** The signed-in courier the mocked service answers with. */
const SIGNED_IN_USER = {
  id: 'driver-42',
  email: 'driver@example.co.nz',
  name: 'A1 Courier',
  emailVerified: true,
  createdAt: new Date(0),
};

/** The screen that reads the published driver id. */
function DriverIdReader(): React.ReactElement {
  return <Text testID="driver-id">{useDriverId()}</Text>;
}

/** Renders the provider over a reader, and answers the session with. */
function renderWithSession(session: { data: unknown; error: unknown; isPending: boolean }): void {
  (authClient.useSession as jest.Mock).mockReturnValue({
    ...session,
    refetch: jest.fn(() => Promise.resolve()),
  });
  render(
    <AuthProvider>
      <DriverIdReader />
    </AuthProvider>,
  );
}

describe('the driver id the preferences belong to (BUG-092)', () => {
  afterEach(() => {
    jest.clearAllMocks();
    // The session is module state: a test must not leave its driver behind.
    const { setCurrentDriverId } = jest.requireActual<typeof import('@/sync/driverSession')>(
      '@/sync/driverSession',
    );
    setCurrentDriverId(null);
  });

  it('publishes the signed-in courier, so the preferences are theirs', async () => {
    renderWithSession({
      data: { user: SIGNED_IN_USER },
      error: null,
      isPending: false,
    });

    await waitFor(() => {
      expect(screen.getByTestId('driver-id').props.children).toBe('driver-42');
    });
    expect(getCurrentDriverId()).toBe('driver-42');
  });

  it('publishes no driver when nobody is signed in', async () => {
    renderWithSession({ data: null, error: null, isPending: false });

    await waitFor(() => {
      expect(screen.getByTestId('driver-id').props.children).toBe('local-driver');
    });
    expect(getCurrentDriverId()).toBeNull();
  });
});
