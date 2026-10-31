/**
 * Tests for the sign-in screen (screen 02, the chosen tokens).
 *
 * The reference is `docs/design/chosen/screens/02-sign-in.html`: the title and
 * the subtitle, the four ways in in the reference's order and wording (Apple,
 * Google, Passkey, Email), the "or" between the groups, and the two lines the
 * reference keeps at the bottom. What the tests assert is the REAL contract:
 *
 *  - the four ways in render, in order, with the plain reason under the ones
 *    the service does not offer (a method is never hidden, so the courier is
 *    never left guessing why a button does nothing),
 *  - the email way in opens the email and password form, and its one primary
 *    action calls `login` with the two fields,
 *  - the second factor step keeps working, the backup code path included,
 *  - the team picker keeps working,
 *  - the remembered session is offered and resuming it says, in plain words,
 *    that the server has not confirmed it (it never pretends it did),
 *  - the biometric unlock is offered when the phone has one, and it calls the
 *    one biometric implementation the app has.
 *
 * `login-screen` is kept as the root testID: `.maestro/run-all.sh` greps the
 * first window dump for it, so the boot check of the E2E run reads it.
 *
 * The auth provider is mocked: the point of these tests is the screen, not the
 * service. Every colour, radius, spacing and type size the screen draws comes
 * from `@courier/design-tokens/chosen`, and the screen is rendered inside the
 * `ChosenProvider` it reads them through (the ESLint design gate is the other
 * half of that rule).
 */
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ChosenProvider } from '@/components/chosen';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { touch } from '@courier/design-tokens/chosen';
import LoginScreen from '../login';
import type { SignInMethods, SignInStep } from '@/providers/AuthProvider';
import type { OfflineSession } from '@/lib/offline-session';

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

/** A session the phone kept, young enough to be worth offering. */
const storedSession: OfflineSession = {
  user: {
    id: 'driver-1',
    email: 'driver@example.co.nz',
    emailVerified: true,
    createdAt: '2026-10-26T06:00:00.000Z',
  },
  confirmedAt: Date.now() - 60 * 60 * 1000,
  expiresAt: Date.now() + 6 * 60 * 60 * 1000,
};

const mockAuth = {
  login: jest.fn(),
  signInWithGoogle: jest.fn(),
  signInWithApple: jest.fn(),
  signInWithPasskey: jest.fn(),
  verifyTwoFactor: jest.fn(),
  selectTeam: jest.fn(),
  unlockWithBiometrics: jest.fn(),
  step: 'none' as SignInStep,
  signInMethods: liveMethods,
  teams: [] as Array<{ id: string; name: string; organizationId: string }>,
  storedSession: null as OfflineSession | null,
  biometricAvailable: false,
};

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => mockAuth,
}));

function renderScreen() {
  return render(
    <GestureHandlerRootView>
      <ChosenProvider mode="light">
        {/* The biometric unlock surface is the one legacy island left: it
            still reads the legacy theme, and the app's root provider carries
            it in production. The test gives it the same island. */}
        <ThemeProvider>
          <LoginScreen />
        </ThemeProvider>
      </ChosenProvider>
    </GestureHandlerRootView>,
  );
}

/** The flat style of an element, so a height can be asserted. */
function styleOf(testID: string): Record<string, number> {
  const element = screen.getByTestId(testID);
  return StyleSheet.flatten(element.props.style as never) as Record<string, number>;
}

/** The height a target actually offers its finger, floor included. */
function targetHeight(testID: string): number {
  const style = styleOf(testID);
  return Math.max(style.height ?? 0, style.minHeight ?? 0);
}

describe('the sign-in screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.step = 'none';
    mockAuth.teams = [];
    mockAuth.storedSession = null;
    mockAuth.biometricAvailable = false;
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
    mockAuth.unlockWithBiometrics.mockResolvedValue(true);
  });

  it('keeps the root test id the E2E boot check greps for', () => {
    renderScreen();

    expect(screen.getByTestId('login-screen')).toBeTruthy();
    expect(screen.getByTestId('sign-in-screen')).toBeTruthy();
  });

  it('shows the reference copy', () => {
    renderScreen();

    expect(screen.getByTestId('sign-in-title')).toBeTruthy();
    expect(screen.getByText('Sign in')).toBeTruthy();
    expect(screen.getByText('Use the account you drive with.')).toBeTruthy();
    expect(screen.getByText('or')).toBeTruthy();
    expect(
      screen.getByText('You stay signed in for the whole shift, even without signal.'),
    ).toBeTruthy();
  });

  it('shows the four ways in, in the reference order and wording', () => {
    renderScreen();

    expect(screen.getByText('Sign in with Apple')).toBeTruthy();
    expect(screen.getByText('Sign in with Google')).toBeTruthy();
    expect(screen.getByText('Use a Passkey')).toBeTruthy();
    expect(screen.getByText('Continue with Email')).toBeTruthy();

    // The order is the reference's order, not an accident of the loop.
    const order = ['sign-in-apple', 'sign-in-google', 'sign-in-passkey', 'sign-in-email'];
    const rendered = [
      ...new Set(
        screen.root
          .findAll((node) => order.includes(String(node.props?.testID ?? '')))
          .map((node) => String(node.props.testID)),
      ),
    ];
    expect(rendered).toEqual(order);
  });

  it('calls through to Apple and Google when the service offers them', async () => {
    mockAuth.signInMethods = {
      methods: {
        email: { enabled: true, reason: '' },
        google: { enabled: true, reason: '' },
        apple: { enabled: true, reason: '' },
        passkey: { enabled: false, reason: 'Passkeys are not set up on this server yet.' },
      },
      mfa: true,
      teamRoles: ['owner', 'admin', 'member'],
    };
    renderScreen();

    fireEvent.press(screen.getByTestId('sign-in-apple'));

    await waitFor(() => expect(mockAuth.signInWithApple).toHaveBeenCalled());
    // The screen answers at once: each way in lands on its own, so the next
    // press is its own sign-in and not a queued one.
    fireEvent.press(screen.getByTestId('sign-in-google'));

    await waitFor(() => expect(mockAuth.signInWithGoogle).toHaveBeenCalled());
    // A method the service offers carries no reason.
    expect(screen.queryByTestId('sign-in-apple-reason')).toBeNull();
  });

  it('says why a method is off, and still shows it', () => {
    renderScreen();

    expect(screen.getByTestId('sign-in-apple-reason')).toBeTruthy();
    expect(screen.getByText('Apple sign-in is not set up on this server yet.')).toBeTruthy();
    expect(screen.getByTestId('sign-in-apple')).toBeDisabled();

    expect(screen.getByTestId('sign-in-passkey-reason')).toBeTruthy();
    expect(screen.getByText('Passkeys are not set up on this server yet.')).toBeTruthy();
    expect(screen.getByTestId('sign-in-passkey')).toBeDisabled();
  });

  it('carries the reason of the phone when the service offers the passkey', () => {
    mockAuth.signInMethods = {
      methods: {
        email: { enabled: true, reason: '' },
        google: { enabled: false, reason: 'Google sign-in is not set up on this server yet.' },
        apple: { enabled: false, reason: 'Apple sign-in is not set up on this server yet.' },
        passkey: { enabled: true, reason: '' },
      },
      mfa: true,
      teamRoles: ['owner', 'admin', 'member'],
    };
    renderScreen();

    // The service can do passkeys, but this phone has no WebAuthn API of its
    // own: the button says so rather than promising the phone cannot keep.
    expect(
      screen.getByText(
        'Passkeys need the fingerprint or face reader of this phone. Use your email for now.',
      ),
    ).toBeTruthy();
    expect(screen.getByTestId('sign-in-passkey')).toBeDisabled();
  });

  it('opens the email form and signs in with an email and a password', async () => {
    renderScreen();

    // The form is not on the screen until the courier asks for it: the
    // reference shows the four ways in first.
    expect(screen.queryByTestId('sign-in-form')).toBeNull();

    fireEvent.press(screen.getByTestId('sign-in-email'));

    await waitFor(() => expect(screen.getByTestId('sign-in-form')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('sign-in-email-field'), 'driver@example.co.nz');
    fireEvent.changeText(screen.getByTestId('sign-in-password-field'), 'correct-horse-battery');
    fireEvent.press(screen.getByTestId('sign-in-submit'));

    await waitFor(() =>
      expect(mockAuth.login).toHaveBeenCalledWith('driver@example.co.nz', 'correct-horse-battery'),
    );
    // The form is the screen's own, and the other ways in are one named link
    // away rather than stacked underneath it (BUG-113: on a short phone the
    // stack pushed the password field out of the tree; the named link is how
    // the door back stays open).
    expect(screen.getByTestId('sign-in-other-ways')).toBeTruthy();
    expect(screen.queryByTestId('sign-in-apple')).toBeNull();
  });

  // The app bug this pins (BUG-113), and the two shapes it took:
  //
  //   1. the E2E AVD is 320x640 and the email form opened below the fold, so
  //      Android's removeClippedSubviews dropped the password field out of the
  //      a11y tree and the courier could not type it (run 40970724190, both
  //      legs, the assert failed at `sign-in-password-field`);
  //   2. the first fix scrolled the revealed content with an imperative
  //      `scrollTo` from a `useLayoutEffect`, and the device answered with a
  //      BLANK screen - the scroll ran before the newly revealed content had
  //      a layout (run 41010537066, both legs, the sign-in screen rendering
  //      with no children at all).
  //
  // Both are the same defect wearing a different hat: the app let the reveal
  // depend on timing. The fix that cannot race is the one asserted here - the
  // ways in step aside, so the revealed form is the screen's content and the
  // fold is nowhere near it. The assertion is the state of the tree, which is
  // exactly what the device showed was wrong.
  it('gives the email form the screen, so the password field is in the tree', async () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('sign-in-email'));

    await waitFor(() => {
      expect(screen.getByTestId('sign-in-form')).toBeTruthy();
      expect(screen.getByTestId('sign-in-password-field')).toBeTruthy();
      expect(screen.getByTestId('sign-in-submit')).toBeTruthy();
    });

    // The two fields and the action are all on the screen the courier sees,
    // which is what "in the tree" means on the device.
    expect(screen.getByTestId('sign-in-email-field')).toBeTruthy();
  });

  // BUG-113's last shape, proven on the api-35 leg of PR #52 (run
  // 41097310063): the keyboard is the device's, not the app's, and its height
  // is not a constant. That day Gboard carried its clipboard strip and its top
  // edge sat at y=381, where the run before had it at y=405; the password
  // field is at y=369..425, so its centre (y=397) was under the keyboard.
  // Maestro's tap lands on an element's centre, so the tap opened the
  // keyboard's clipboard instead of focusing the field: the email field kept
  // the focus, the typed password landed in it, and the submit then refused
  // its own empty password. The same code, the same tap, green on api-34 -
  // an action that works most of the time is an app bug (PLAYBOOK 12), and
  // the app let a keyboard height it does not own decide whether its own
  // fields are reachable.
  //
  // The fix the app owns: when the email form opens it takes the whole screen,
  // the way the ways in already step aside, so nothing pushes the fields into
  // the bottom half of a small phone where the keyboard lives - whatever
  // height the device's keyboard has that day. The assertion is the state of
  // the tree, which is the decision the screen makes; the device proved the
  // decision wrong.
  it('gives the email form the whole screen, so no field the courier taps sits under the keyboard', async () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('sign-in-email'));

    await waitFor(() => {
      expect(screen.getByTestId('sign-in-form')).toBeTruthy();
      expect(screen.getByTestId('sign-in-password-field')).toBeTruthy();
      expect(screen.getByTestId('sign-in-submit')).toBeTruthy();
    });

    // The front door's own furniture steps aside with the ways in: the header
    // is what pushes a form down the screen, and on a small phone with the
    // keyboard up exactly that is what covers the fields the courier taps.
    expect(screen.queryByTestId('sign-in-title')).toBeNull();
    expect(screen.queryByTestId('sign-in-subtitle')).toBeNull();
    expect(screen.queryByTestId('sign-in-apple')).toBeNull();
    expect(screen.queryByTestId('sign-in-google')).toBeNull();
    expect(screen.queryByTestId('sign-in-passkey')).toBeNull();
    // The way in that opened it steps aside too, so the form is the whole of
    // the screen's content and starts at the top of it.
    expect(screen.queryByTestId('sign-in-email')).toBeNull();

    // The way back is named, because the front door stepped aside: a screen
    // that hides its own front door with no way out is a defect, not a design.
    expect(screen.getByTestId('sign-in-other-ways')).toBeTruthy();
  });

  // BUG-113's last shape, second half, proven on the api-34 leg of run
  // 41150635942: the app's own content stopped existing. The form, the way
  // back and the first footer sentence were in the accessibility tree, and the
  // second footer sentence - ten pixels lower - was gone, because that device
  // raised a taller keyboard (a password keyboard with its number row, top
  // edge at y=405 against y=381 on api-35) and Android's `removeClippedSubviews`
  // drops whatever falls outside the ScrollView's clip. The same code, the
  // same taps, one leg green and one leg red: the app let a keyboard height it
  // does not own decide whether its own sentences exist (PLAYBOOK 12).
  //
  // The app keeps its content in the tree: the heuristic buys nothing on a
  // screen of fifteen nodes, and a screen whose own footer vanishes under a
  // keyboard is also a screen a courier using TalkBack cannot read to the end.
  // Where things are drawn is the layout's business and it is unchanged - this
  // is about what the tree holds.
  it('keeps the scrolled content in the accessibility tree, so a keyboard cannot drop it', () => {
    renderScreen();

    const scrollView = screen.UNSAFE_getByType(ScrollView);
    expect(scrollView.props.removeClippedSubviews).toBe(false);
  });

  // The way back is named, because the ways in stepped aside: a screen that
  // hides its own front door with no way out is a defect, not a design.
  it('offers the way back to the other ways in when the form holds the screen', async () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('sign-in-email'));
    await waitFor(() => expect(screen.getByTestId('sign-in-form')).toBeTruthy());

    fireEvent.press(screen.getByTestId('sign-in-other-ways'));

    await waitFor(() => {
      expect(screen.queryByTestId('sign-in-form')).toBeNull();
      expect(screen.getByTestId('sign-in-email')).toBeTruthy();
      expect(screen.getByTestId('sign-in-apple')).toBeTruthy();
      expect(screen.getByTestId('sign-in-google')).toBeTruthy();
    });
  });

  it('shows the error with a way out', async () => {
    mockAuth.login.mockResolvedValue({ status: 'failed', message: 'Wrong email or password' });
    renderScreen();

    fireEvent.press(screen.getByTestId('sign-in-email'));
    await waitFor(() => expect(screen.getByTestId('sign-in-form')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('sign-in-email-field'), 'driver@example.co.nz');
    fireEvent.changeText(screen.getByTestId('sign-in-password-field'), 'wrong-password');
    fireEvent.press(screen.getByTestId('sign-in-submit'));

    await waitFor(() => expect(screen.getByTestId('sign-in-error')).toBeTruthy());
    expect(screen.getByText('Wrong email or password')).toBeTruthy();
    // The primary action offers the recovery.
    expect(screen.getByText('Try again')).toBeTruthy();
  });

  it('asks for the second factor when the service asks for it', async () => {
    mockAuth.login.mockResolvedValue({ status: 'two-factor-required', methods: ['totp'] });
    renderScreen();

    fireEvent.press(screen.getByTestId('sign-in-email'));
    await waitFor(() => expect(screen.getByTestId('sign-in-form')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('sign-in-email-field'), 'driver@example.co.nz');
    fireEvent.changeText(screen.getByTestId('sign-in-password-field'), 'correct-horse-battery');
    fireEvent.press(screen.getByTestId('sign-in-submit'));

    await waitFor(() => expect(mockAuth.login).toHaveBeenCalled());
  });

  it('shows the second factor step, with the backup code path', async () => {
    mockAuth.step = 'two-factor';
    renderScreen();

    expect(screen.getByTestId('sign-in-two-factor')).toBeTruthy();
    expect(screen.getByTestId('sign-in-two-factor-code')).toBeTruthy();
    expect(screen.getByTestId('sign-in-two-factor-submit')).toBeTruthy();
    expect(screen.getByText('Check your code')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('sign-in-two-factor-code'), '123456');
    fireEvent.press(screen.getByTestId('sign-in-two-factor-submit'));

    await waitFor(() => expect(mockAuth.verifyTwoFactor).toHaveBeenCalledWith('123456', false));

    fireEvent.press(screen.getByTestId('sign-in-two-factor-backup'));
    fireEvent.changeText(screen.getByTestId('sign-in-two-factor-code'), 'ABCDE-12345');
    fireEvent.press(screen.getByTestId('sign-in-two-factor-submit'));

    await waitFor(() => expect(mockAuth.verifyTwoFactor).toHaveBeenCalledWith('ABCDE-12345', true));
  });

  it('shows the team picker after the sign-in', () => {
    mockAuth.step = 'teams';
    mockAuth.teams = [
      { id: 'north', name: 'North Run', organizationId: 'org' },
      { id: 'south', name: 'South Run', organizationId: 'org' },
    ];
    renderScreen();

    expect(screen.getByTestId('sign-in-team')).toBeTruthy();
    expect(screen.getByTestId('sign-in-team-north')).toBeTruthy();
    expect(screen.getByText('South Run')).toBeTruthy();
  });

  it('remembers the team the courier picked', async () => {
    mockAuth.step = 'teams';
    mockAuth.teams = [{ id: 'north', name: 'North Run', organizationId: 'org' }];
    renderScreen();

    fireEvent.press(screen.getByTestId('sign-in-team-north'));

    await waitFor(() => expect(mockAuth.selectTeam).toHaveBeenCalledWith('north'));
  });

  it('offers the remembered session when the phone has one', () => {
    mockAuth.storedSession = storedSession;
    renderScreen();

    expect(screen.getByTestId('sign-in-offer-offline')).toBeTruthy();
    // The offer names the courier it is for, not a generic promise.
    expect(screen.getByText('driver@example.co.nz')).toBeTruthy();
  });

  it('does not offer a remembered session when the phone has none', () => {
    renderScreen();

    expect(screen.queryByTestId('sign-in-offer-offline')).toBeNull();
  });

  it('resumes the remembered session and never says the server confirmed it', async () => {
    mockAuth.storedSession = storedSession;
    renderScreen();

    fireEvent.press(screen.getByTestId('sign-in-offer-offline'));

    await waitFor(() => expect(mockAuth.unlockWithBiometrics).toHaveBeenCalled());

    // The screen says what is true: the session is the one the phone kept,
    // and the server has not confirmed it (the SessionStatus is `offline`).
    await waitFor(() => expect(screen.getByTestId('sign-in-offline-result')).toBeTruthy());
    expect(screen.getByText(/You are on the session from this shift/)).toBeTruthy();
    expect(screen.getByText(/server has not confirmed it/)).toBeTruthy();
    expect(screen.queryByText(/server confirmed/)).toBeNull();
  });

  it('says so in plain words when the remembered session will not unlock', async () => {
    mockAuth.storedSession = storedSession;
    mockAuth.unlockWithBiometrics.mockResolvedValue(false);
    renderScreen();

    fireEvent.press(screen.getByTestId('sign-in-offer-offline'));

    await waitFor(() => expect(screen.getByTestId('sign-in-offline-result')).toBeTruthy());
    expect(screen.getByText(/That did not unlock/)).toBeTruthy();
    // The four ways in stay on the screen: the resume is never a lock-out.
    expect(screen.getByTestId('sign-in-apple')).toBeTruthy();
  });

  it('offers the biometric unlock when the phone has one', async () => {
    mockAuth.storedSession = storedSession;
    mockAuth.biometricAvailable = true;
    renderScreen();

    fireEvent.press(screen.getByTestId('sign-in-biometric'));

    // The one biometric surface the app has, reused as it is.
    await waitFor(() => expect(screen.getByTestId('biometric-unlock-screen')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('biometric-unlock')).toBeTruthy());

    fireEvent.press(screen.getByTestId('biometric-unlock'));

    await waitFor(() => expect(mockAuth.unlockWithBiometrics).toHaveBeenCalled());
    // The resume says so in plain words, and the ways in come back.
    await waitFor(() => expect(screen.getByTestId('sign-in-screen')).toBeTruthy());
    await waitFor(() => expect(screen.getByTestId('sign-in-offline-result')).toBeTruthy());
    expect(screen.getByText(/server has not confirmed it/)).toBeTruthy();

    // "Not now" is never a lock-out either: the ways in come straight back.
    fireEvent.press(screen.getByTestId('sign-in-biometric'));
    await waitFor(() => expect(screen.getByTestId('biometric-unlock-screen')).toBeTruthy());
    fireEvent.press(screen.getByTestId('biometric-unlock-skip'));
    await waitFor(() => expect(screen.getByTestId('sign-in-screen')).toBeTruthy());
    expect(screen.getByTestId('sign-in-apple')).toBeTruthy();
  });

  it('does not offer the biometric unlock when the phone has none', () => {
    renderScreen();

    expect(screen.queryByTestId('sign-in-biometric')).toBeNull();
    expect(screen.queryByTestId('biometric-unlock-screen')).toBeNull();
  });

  it('keeps the register line quiet at the bottom and opens the register screen', () => {
    renderScreen();

    const register = screen.getByTestId('sign-in-register');
    expect(register).toBeTruthy();
    // A quiet line, not a button: no accent fill, no 54 pt pill.
    expect(styleOf('sign-in-register').height).toBeUndefined();
    expect(register.props.accessibilityRole).toBe('link');

    fireEvent.press(register);
    expect(mockRouter.push).toHaveBeenCalledWith('/(auth)/register');
  });

  it('holds the touch floors: every target 48, the primary action 64', () => {
    renderScreen();

    // The front door's own targets, before any way in is taken.
    for (const target of [
      'sign-in-apple',
      'sign-in-google',
      'sign-in-passkey',
      'sign-in-email',
      'sign-in-register',
    ]) {
      expect(targetHeight(target)).toBeGreaterThanOrEqual(touch.minimum);
    }

    // The form's targets, in the state where they are on screen. Measuring
    // them in the state that shows them is the point: a floor is a claim
    // about a target the courier can actually reach.
    fireEvent.press(screen.getByTestId('sign-in-email'));
    for (const target of ['sign-in-submit', 'sign-in-email-field', 'sign-in-password-field']) {
      expect(targetHeight(target)).toBeGreaterThanOrEqual(touch.minimum);
    }

    // The screen's one primary action is at least the 64 pt main-action floor.
    expect(targetHeight('sign-in-submit')).toBeGreaterThanOrEqual(touch.drivingAction);
  });
});
