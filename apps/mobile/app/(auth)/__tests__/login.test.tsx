/**
 * Tests for the sign-in screen.
 *
 * The screen is the front door of the product, so these tests check the
 * things a courier sees: the ways in, the second factor, the team picker and
 * the error with a way out.
 *
 * The auth provider is mocked: the point of these tests is the screen, not
 * the service.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ThemeProvider } from '@/providers/ThemeProvider';
import LoginScreen from '../login';
import type { SignInMethods, SignInStep } from '@/providers/AuthProvider';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

/** The methods the service offers in this test. */
const liveMethods: SignInMethods = {
  methods: {
    email: { enabled: true, reason: '' },
    google: { enabled: true, reason: '' },
    apple: { enabled: false, reason: 'Apple sign-in is not set up on this server yet.' },
    passkey: { enabled: false, reason: 'Passkeys are not set up on this server yet.' },
  },
  mfa: true,
  teamRoles: ['owner', 'admin', 'member'],
};

const mockAuth = {
  login: jest.fn(),
  signInWithGoogle: jest.fn(),
  signInWithApple: jest.fn(),
  signInWithPasskey: jest.fn(),
  verifyTwoFactor: jest.fn(),
  selectTeam: jest.fn(),
  step: 'none' as SignInStep,
  signInMethods: liveMethods,
  teams: [] as Array<{ id: string; name: string; organizationId: string }>,
};

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => mockAuth,
}));

// The preferences are kept in memory, so one test cannot leave a choice
// behind for the next one.
jest.mock('@/sync/preferenceFiles', () => ({
  createFilePreferenceStore: () => {
    const files = new Map<string, string>();
    return {
      read: (driverId: string) => Promise.resolve(files.get(driverId) ?? null),
      write: (driverId: string, raw: string) => {
        files.set(driverId, raw);
        return Promise.resolve();
      },
    };
  },
}));

function renderScreen() {
  return render(
    <ThemeProvider>
      <LoginScreen />
    </ThemeProvider>,
  );
}

describe('the sign-in screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.step = 'none';
    mockAuth.teams = [];
    mockAuth.signInMethods = {
      methods: {
        email: { enabled: true, reason: '' },
        google: { enabled: true, reason: '' },
        apple: { enabled: false, reason: 'Apple sign-in is not set up on this server yet.' },
        passkey: { enabled: false, reason: 'Passkeys are not set up on this server yet.' },
      },
      mfa: true,
      teamRoles: ['owner', 'admin', 'member'],
    };
    mockAuth.login.mockResolvedValue({ status: 'signed-in' });
    mockAuth.verifyTwoFactor.mockResolvedValue({ status: 'signed-in' });
    mockAuth.signInWithGoogle.mockResolvedValue({ status: 'signed-in' });
    mockAuth.signInWithApple.mockResolvedValue({ status: 'signed-in' });
    mockAuth.signInWithPasskey.mockResolvedValue({ status: 'signed-in' });
    mockAuth.selectTeam.mockResolvedValue(undefined);
  });
  it('shows every way in', () => {
    renderScreen();

    expect(screen.getByTestId('login-screen')).toBeTruthy();
    expect(screen.getByTestId('login-method-google')).toBeTruthy();
    expect(screen.getByTestId('login-method-apple')).toBeTruthy();
    expect(screen.getByTestId('login-method-passkey')).toBeTruthy();
    expect(screen.getByTestId('login-email')).toBeTruthy();
    expect(screen.getByTestId('login-password')).toBeTruthy();
    expect(screen.getByTestId('login-submit')).toBeTruthy();
    expect(screen.getByTestId('login-sign-up')).toBeTruthy();
  });

  it('says why a method is off', () => {
    renderScreen();

    expect(screen.getByTestId('login-method-apple-hint')).toBeTruthy();
    expect(
      screen.getByText('Apple sign-in is not set up on this server yet.'),
    ).toBeTruthy();
    expect(screen.getByTestId('login-method-apple')).toBeDisabled();
  });

  it('signs the courier in with an email address and a password', async () => {
    renderScreen();

    fireEvent.changeText(screen.getByTestId('login-email'), 'driver@example.co.nz');
    fireEvent.changeText(screen.getByTestId('login-password'), 'correct-horse-battery');
    fireEvent.press(screen.getByTestId('login-submit'));

    await waitFor(() =>
      expect(mockAuth.login).toHaveBeenCalledWith(
        'driver@example.co.nz',
        'correct-horse-battery',
      ),
    );
  });

  it('shows the error with a way out', async () => {
    mockAuth.login.mockResolvedValue({ status: 'failed', message: 'Wrong email or password' });
    renderScreen();

    fireEvent.changeText(screen.getByTestId('login-email'), 'driver@example.co.nz');
    fireEvent.changeText(screen.getByTestId('login-password'), 'wrong-password');
    fireEvent.press(screen.getByTestId('login-submit'));

    await waitFor(() => expect(screen.getByTestId('login-error')).toBeTruthy());
    expect(screen.getByText('Wrong email or password')).toBeTruthy();
    // The primary action offers the recovery.
    expect(screen.getByText('Try again')).toBeTruthy();
  });

  it('asks for the second factor when the service asks for it', async () => {
    mockAuth.login.mockResolvedValue({
      status: 'two-factor-required',
      methods: ['totp'],
    });
    renderScreen();

    fireEvent.changeText(screen.getByTestId('login-email'), 'driver@example.co.nz');
    fireEvent.changeText(screen.getByTestId('login-password'), 'correct-horse-battery');
    fireEvent.press(screen.getByTestId('login-submit'));

    await waitFor(() => expect(mockAuth.login).toHaveBeenCalled());
  });

  it('shows the second factor step', () => {
    mockAuth.step = 'two-factor';
    renderScreen();

    expect(screen.getByTestId('login-mfa-screen')).toBeTruthy();
    expect(screen.getByTestId('login-mfa-code')).toBeTruthy();
    expect(screen.getByTestId('login-mfa-submit')).toBeTruthy();
    expect(screen.getByText('Check your code')).toBeTruthy();
  });

  it('checks the code and can use a backup code instead', async () => {
    mockAuth.step = 'two-factor';
    renderScreen();

    fireEvent.changeText(screen.getByTestId('login-mfa-code'), '123456');
    fireEvent.press(screen.getByTestId('login-mfa-submit'));

    await waitFor(() => expect(mockAuth.verifyTwoFactor).toHaveBeenCalledWith('123456', false));

    fireEvent.press(screen.getByTestId('login-mfa-backup'));
    fireEvent.changeText(screen.getByTestId('login-mfa-code'), 'ABCDE-12345');
    fireEvent.press(screen.getByTestId('login-mfa-submit'));

    await waitFor(() =>
      expect(mockAuth.verifyTwoFactor).toHaveBeenCalledWith('ABCDE-12345', true),
    );
  });

  it('shows the team picker after the sign-in', () => {
    mockAuth.step = 'teams';
    mockAuth.teams = [
      { id: 'north', name: 'North Run', organizationId: 'org' },
      { id: 'south', name: 'South Run', organizationId: 'org' },
    ];
    renderScreen();

    expect(screen.getByTestId('login-teams-screen')).toBeTruthy();
    expect(screen.getByTestId('login-team-north')).toBeTruthy();
    expect(screen.getByText('South Run')).toBeTruthy();
  });

  it('remembers the team the courier picked', async () => {
    mockAuth.step = 'teams';
    mockAuth.teams = [{ id: 'north', name: 'North Run', organizationId: 'org' }];
    renderScreen();

    fireEvent.press(screen.getByTestId('login-team-north'));

    await waitFor(() => expect(mockAuth.selectTeam).toHaveBeenCalledWith('north'));
  });
});
