/**
 * The sign-in screen (screen 02, `docs/design/chosen/screens/02-sign-in.html`),
 * rebuilt on the chosen tokens (D27).
 *
 * The reference is the front door of the product: the app mark, the title and
 * the subtitle, the four ways in in the reference's order and wording (Apple,
 * Google, Passkey, then the "or" and Email), and the two lines the reference
 * keeps at the bottom. Every colour, radius, spacing and type size comes from
 * `@courier/design-tokens/chosen`, and they are read through the
 * `ChosenProvider` this screen provides (the one light/dark truth, which
 * follows the device, D37): the screen never writes a raw value.
 *
 * What the screen does, on top of the reference:
 *
 *  - a method the service does not offer keeps its place and says why, in
 *    plain words, so the courier is never left guessing why a button does
 *    nothing (the passkey carries the phone's reason as well as the
 *    service's),
 *  - the Email way in opens the email and password form: the two fields with a
 *    label each and the one primary action of the 64 pt main-action floor,
 *  - the phone's remembered session is offered when there is one, and resuming
 *    it says in plain words that the server has not confirmed it (the
 *    `SessionStatus` is `offline`): the app never pretends otherwise,
 *  - the biometric unlock is offered when the phone has one enrolled, through
 *    the one biometric surface the app already has (`BiometricUnlock` over
 *    `src/lib/biometric.ts`): there is no second implementation,
 *  - the register screen is a quiet line at the bottom, not a button: the
 *    reference does not name it.
 *
 * The copy is plain New Zealand English: no emoji, no em dash, no en dash and
 * no all-caps body text. Every control has an accessibility label and a role,
 * and the text scales to the 200% setting the screens' gate asks for.
 *
 * `login-screen` is kept as the root testID: `.maestro/run-all.sh` greps the
 * first window dump for it, so the boot check of the emulator run reads it.
 * The chosen names (`sign-in-*`) are the ones the new flows and tests use.
 */
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { BiometricUnlock } from '@/components/BiometricUnlock';
import { ChosenProvider, useChosen } from '@/components/chosen';
import { useAuth } from '@/providers/AuthProvider';
import { PASSKEY_DEVICE_REASON, passkeySupportedOnDevice } from '@/lib/passkey-support';
import { radii, spacing, touch, typography } from '@courier/design-tokens/chosen';
import type { Tokens } from '@courier/design-tokens/chosen';

/** A token colour name, the way the screens resolve one against the mode. */
type ColorName = keyof Tokens['colors'];

/** The app mark of the reference (its 72 pt tile, on the pill radius). */
const MARK_SIZE = 72;
/** A way in sits at the reference's 54, which clears the 48 pt floor. */
const METHOD_HEIGHT = 54;
/** The fields of the email form, above the 48 pt floor. */
const FIELD_HEIGHT = 56;
/** The quiet register line: the 48 pt floor, not a pill. */
const QUIET_ROW_HEIGHT = touch.minimum;
/** The gutter either side of the "or" between the two groups. */
const DIVIDER_GAP = spacing.space12;
/** The weight of a hairline, the same one the chosen components use. */
const HAIRLINE = StyleSheet.hairlineWidth;
/** How far the text scales under the 200% setting (the merged screens' caps). */
const TITLE_SCALE = 1.6;
const TEXT_SCALE = 1.4;

/** A way in, as the reference draws it: the fill, the label and the border. */
type MethodTone = 'apple' | 'google' | 'passkey' | 'email';

/** The fill of a way in: a token colour name, never a value. */
const TONE_FILL: Record<MethodTone, ColorName> = {
  apple: 'accent',
  google: 'card',
  passkey: 'fill',
  email: 'fill',
};

/** The label of a way in: a token colour name, never a value. */
const TONE_LABEL: Record<MethodTone, ColorName> = {
  apple: 'onAccent',
  google: 'label',
  passkey: 'accentText',
  email: 'label',
};

/** The border a way in carries: only the card one, the reference's hairline. */
const TONE_BORDER: Record<MethodTone, ColorName | null> = {
  apple: null,
  google: 'separator',
  passkey: null,
  email: null,
};

export default function LoginScreen() {
  const scheme = useColorScheme();
  return (
    <ChosenProvider mode={scheme === 'dark' ? 'dark' : 'light'}>
      <SignInScreen />
    </ChosenProvider>
  );
}

function SignInScreen() {
  const { t } = useChosen();
  const router = useRouter();
  const {
    login,
    signInWithGoogle,
    signInWithApple,
    signInWithPasskey,
    verifyTwoFactor,
    step,
    signInMethods,
    teams,
    selectTeam,
    storedSession,
    biometricAvailable,
    unlockWithBiometrics,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The email form is behind the Email way in, exactly as the reference has it. */
  const [showEmailForm, setShowEmailForm] = useState(false);
  /**
   * The screen's own scroll view, so a revealed form can be brought to the
   * courier instead of left below the fold.
   *
   * On a 320x640 phone (the E2E AVD, and the small phones real couriers use)
   * the screen is taller than the viewport: the four ways in and the form do
   * not both fit. Before this the form opened with its password field outside
   * the a11y tree, so Android's removeClippedSubviews dropped it and the
   * courier (and the E2E flow) could not type the password. The app brings
   * what the courier just asked for into view; it never hides it (PLAYBOOK
   * 12).
   */
  const scrollRef = useRef<ScrollViewInstance>(null);
  /** The biometric unlock surface, opened from the reference's Face ID line. */
  const [showBiometricUnlock, setShowBiometricUnlock] = useState(false);
  /** What the resumed session is, said in plain words. Never a fake confirm. */
  const [offlineNote, setOfflineNote] = useState<string | null>(null);

  const passkeyOnDevice = passkeySupportedOnDevice();

  /**
   * The email form is revealed by the courier's tap: bring it to them.
   *
   * `useLayoutEffect` runs before the device can show a frame, so the form is
   * in view the moment it appears rather than after it has been missed. On a
   * tall screen the offset the content already has is 0, so nothing moves.
   */
  useLayoutEffect(() => {
    if (!showEmailForm) {
      return;
    }
    const scroller = scrollRef.current;
    if (scroller === null) {
      return;
    }
    // The form is the last thing on the screen, so the end of the content is
    // where it lives: scroll there and the password field is in view.
    const node = scroller as unknown as {
      scrollTo?: (options?: { y?: number; animated?: boolean }) => void;
    };
    if (typeof node.scrollTo === 'function') {
      node.scrollTo({ y: Number.MAX_SAFE_INTEGER, animated: true });
    }
  }, [showEmailForm]);

  const handleLogin = useCallback(async () => {
    if (email.trim().length === 0 || password.length === 0) {
      setError('Enter your email and password');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const outcome = await login(email.trim(), password);
      if (outcome.status === 'failed') {
        setError(outcome.message);
      }
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Wrong email or password');
    } finally {
      setIsSubmitting(false);
    }
  }, [email, login, password]);

  const handleProviderSignIn = useCallback(
    async (provider: 'google' | 'apple' | 'passkey') => {
      setIsSubmitting(true);
      setError(null);
      try {
        const outcome =
          provider === 'google'
            ? await signInWithGoogle()
            : provider === 'apple'
              ? await signInWithApple()
              : await signInWithPasskey();
        if (outcome.status === 'failed') {
          setError(outcome.message);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [signInWithApple, signInWithGoogle, signInWithPasskey],
  );

  const handleTwoFactor = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const outcome = await verifyTwoFactor(code, useBackupCode);
      if (outcome.status === 'failed') {
        setError(outcome.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [code, useBackupCode, verifyTwoFactor]);

  const handleTeamPick = useCallback(
    async (teamId: string) => {
      await selectTeam(teamId);
    },
    [selectTeam],
  );

  /** What the courier reads when the remembered session is resumed. */
  const resumedNote =
    'You are on the session from this shift. The server has not confirmed it yet, so it catches up when there is signal.';

  /**
   * The remembered session.
   *
   * The phone has one resume call, and this is it: the provider asks the
   * phone and then reads the receipt the device kept. What the screen says
   * afterwards is the truth of it - the session is the one the phone kept and
   * the server has not confirmed it, which is what the `offline` status of the
   * app means. It never claims a confirmation that did not happen.
   */
  const resumeOfflineSession = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const resumed = await unlockWithBiometrics();
      setOfflineNote(
        resumed ? resumedNote : 'That did not unlock. Use one of the ways in below.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [resumedNote, unlockWithBiometrics]);

  /** The one biometric surface the app has: reuse it, do not rewrite it. */
  const openBiometricUnlock = useCallback(() => {
    setOfflineNote(null);
    setShowBiometricUnlock(true);
  }, []);

  const closeBiometricUnlock = useCallback(() => {
    setShowBiometricUnlock(false);
  }, []);

  const handleBiometricUnlock = useCallback(async () => {
    const resumed = await unlockWithBiometrics();
    if (resumed) {
      setOfflineNote(resumedNote);
      setShowBiometricUnlock(false);
    }
  }, [resumedNote, unlockWithBiometrics]);

  if (showBiometricUnlock) {
    return (
      <View
        testID="login-screen"
        style={[styles.container, { backgroundColor: t.colors.background }]}
      >
        <SafeAreaView testID="sign-in-biometric-screen" style={styles.container}>
          <BiometricUnlock onUnlock={handleBiometricUnlock} onSkip={closeBiometricUnlock} />
        </SafeAreaView>
      </View>
    );
  }

  if (step === 'two-factor') {
    return (
      <View
        testID="login-screen"
        style={[styles.container, { backgroundColor: t.colors.background }]}
      >
        <SafeAreaView testID="sign-in-two-factor" style={styles.container}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Text
                role="heading"
                style={[styles.title, { color: t.colors.label }]}
                maxFontSizeMultiplier={TITLE_SCALE}
              >
                Check your code
              </Text>
              <Text
                style={[styles.subtitle, { color: t.colors.secondaryLabel }]}
                maxFontSizeMultiplier={TEXT_SCALE}
              >
                {useBackupCode
                  ? 'Enter one of your backup codes'
                  : 'Enter the code from your authenticator app'}
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text
                  style={[styles.fieldLabel, { color: t.colors.label }]}
                  maxFontSizeMultiplier={TEXT_SCALE}
                >
                  {useBackupCode ? 'Backup code' : 'Six digit code'}
                </Text>
                <TextInput
                  testID="sign-in-two-factor-code"
                  style={[
                    styles.input,
                    { backgroundColor: t.colors.fill, color: t.colors.label },
                  ]}
                  placeholder={useBackupCode ? 'ABCDE-12345' : '123456'}
                  placeholderTextColor={t.colors.secondaryLabel}
                  value={code}
                  onChangeText={setCode}
                  keyboardType={useBackupCode ? 'default' : 'number-pad'}
                  autoCapitalize="characters"
                  autoComplete={useBackupCode ? 'off' : 'one-time-code'}
                  editable={!isSubmitting}
                  accessibilityLabel={useBackupCode ? 'Backup code' : 'Six digit code'}
                />
              </View>

              {error !== null ? (
                <Text
                  testID="sign-in-error"
                  accessibilityLiveRegion="polite"
                  style={[styles.errorText, { color: t.colors.danger }]}
                  maxFontSizeMultiplier={TEXT_SCALE}
                >
                  {error}
                </Text>
              ) : null}

              <Pressable
                onPress={() => void handleTwoFactor()}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Confirm"
                accessibilityHint="Checks the code and signs you in"
                accessibilityState={{ disabled: isSubmitting }}
                testID="sign-in-two-factor-submit"
                style={[styles.primaryAction, { backgroundColor: t.colors.accent }]}
              >
                <Text
                  style={[styles.primaryLabel, { color: t.colors.onAccent }]}
                  maxFontSizeMultiplier={TEXT_SCALE}
                >
                  Confirm
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setUseBackupCode((current) => !current);
                  setError(null);
                }}
                accessibilityRole="link"
                accessibilityLabel={
                  useBackupCode ? 'Use the code from your authenticator app' : 'Use a backup code'
                }
                testID="sign-in-two-factor-backup"
                style={styles.backupLink}
              >
                <Text
                  style={[styles.linkText, { color: t.colors.accentText }]}
                  maxFontSizeMultiplier={TEXT_SCALE}
                >
                  {useBackupCode ? 'Use the authenticator app' : 'Use a backup code'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  if (step === 'teams') {
    return (
      <View
        testID="login-screen"
        style={[styles.container, { backgroundColor: t.colors.background }]}
      >
        <SafeAreaView testID="sign-in-team" style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <Text
                role="heading"
                style={[styles.title, { color: t.colors.label }]}
                maxFontSizeMultiplier={TITLE_SCALE}
              >
                Which team are you on?
              </Text>
              <Text
                style={[styles.subtitle, { color: t.colors.secondaryLabel }]}
                maxFontSizeMultiplier={TEXT_SCALE}
              >
                Pick the route you are driving today
              </Text>
            </View>
            <View style={styles.form}>
              {teams.map((team) => (
                <Pressable
                  key={team.id}
                  onPress={() => void handleTeamPick(team.id)}
                  accessibilityRole="button"
                  accessibilityLabel={team.name}
                  testID={`sign-in-team-${team.id}`}
                  style={[
                    styles.team,
                    { backgroundColor: t.colors.card, borderColor: t.colors.separator },
                  ]}
                >
                  <Text
                    style={[styles.teamName, { color: t.colors.label }]}
                    maxFontSizeMultiplier={TEXT_SCALE}
                  >
                    {team.name}
                  </Text>
                </Pressable>
              ))}
              {teams.length === 0 ? (
                <Text
                  style={[styles.reason, { color: t.colors.secondaryLabel }]}
                  maxFontSizeMultiplier={TEXT_SCALE}
                >
                  You are not in a team yet. Ask your team lead for an invitation.
                </Text>
              ) : null}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  const googleReason = signInMethods.methods.google.enabled
    ? ''
    : signInMethods.methods.google.reason;
  const appleReason = signInMethods.methods.apple.enabled
    ? ''
    : signInMethods.methods.apple.reason;
  const passkeyReason = !signInMethods.methods.passkey.enabled
    ? signInMethods.methods.passkey.reason
    : passkeyOnDevice
      ? ''
      : PASSKEY_DEVICE_REASON;
  const emailReason = signInMethods.methods.email.enabled
    ? ''
    : signInMethods.methods.email.reason;
  const storedSessionUser = storedSession?.user;
  const storedWho = storedSessionUser?.name ?? storedSessionUser?.email ?? '';

  const errorBlock =
    error !== null ? (
      <Text
        testID="sign-in-error"
        accessibilityLiveRegion="polite"
        style={[styles.errorText, { color: t.colors.danger }]}
        maxFontSizeMultiplier={TEXT_SCALE}
      >
        {error}
      </Text>
    ) : null;

  return (
    <View
      testID="login-screen"
      style={[styles.container, { backgroundColor: t.colors.background }]}
    >
      <SafeAreaView testID="sign-in-screen" style={styles.container}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={[styles.mark, { backgroundColor: t.colors.accent }]}>
              <Ionicons
                name="cube-outline"
                size={38}
                color={t.colors.onAccent}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </View>
            <Text
              testID="sign-in-title"
              role="heading"
              style={[styles.title, { color: t.colors.label }]}
              maxFontSizeMultiplier={TITLE_SCALE}
            >
              Sign in
            </Text>
            <Text
              testID="sign-in-subtitle"
              style={[styles.subtitle, { color: t.colors.secondaryLabel }]}
              maxFontSizeMultiplier={TEXT_SCALE}
            >
              Use the account you drive with.
            </Text>
          </View>

          {storedSession !== null ? (
            <View style={[styles.card, { backgroundColor: t.colors.card }]}>
              <Text
                style={[styles.offerTitle, { color: t.colors.label }]}
                maxFontSizeMultiplier={TEXT_SCALE}
              >
                Your session from this shift
              </Text>
              <Text
                style={[styles.offerBody, { color: t.colors.secondaryLabel }]}
                maxFontSizeMultiplier={TEXT_SCALE}
              >
                The phone kept your session, so you can carry on without signal.
              </Text>
              <Text
                style={[styles.offerWho, { color: t.colors.secondaryLabel }]}
                maxFontSizeMultiplier={TEXT_SCALE}
              >
                {storedWho}
              </Text>
              <Pressable
                onPress={() => void resumeOfflineSession()}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Continue on this session"
                accessibilityHint="Opens the session the phone kept for the shift"
                accessibilityState={{ disabled: isSubmitting }}
                testID="sign-in-offer-offline"
                style={[styles.primaryAction, { backgroundColor: t.colors.accent }]}
              >
                <Text
                  style={[styles.primaryLabel, { color: t.colors.onAccent }]}
                  maxFontSizeMultiplier={TEXT_SCALE}
                >
                  Continue on this session
                </Text>
              </Pressable>
              {offlineNote !== null ? (
                <Text
                  testID="sign-in-offline-result"
                  accessibilityLiveRegion="polite"
                  style={[styles.offerNote, { color: t.colors.secondaryLabel }]}
                  maxFontSizeMultiplier={TEXT_SCALE}
                >
                  {offlineNote}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.methods}>
            <MethodButton
              testID="sign-in-apple"
              label="Sign in with Apple"
              icon="logo-apple"
              tone="apple"
              reason={appleReason}
              disabled={!signInMethods.methods.apple.enabled || isSubmitting}
              onPress={() => void handleProviderSignIn('apple')}
            />
            <MethodButton
              testID="sign-in-google"
              label="Sign in with Google"
              icon="logo-google"
              tone="google"
              reason={googleReason}
              disabled={!signInMethods.methods.google.enabled || isSubmitting}
              onPress={() => void handleProviderSignIn('google')}
            />
            <MethodButton
              testID="sign-in-passkey"
              label="Use a Passkey"
              icon="finger-print"
              tone="passkey"
              reason={passkeyReason}
              disabled={!signInMethods.methods.passkey.enabled || !passkeyOnDevice || isSubmitting}
              onPress={() => void handleProviderSignIn('passkey')}
            />
          </View>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: t.colors.separator }]} />
            <Text
              style={[styles.dividerLabel, { color: t.colors.secondaryLabel }]}
              maxFontSizeMultiplier={TEXT_SCALE}
            >
              or
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: t.colors.separator }]} />
          </View>

          <MethodButton
            testID="sign-in-email"
            label="Continue with Email"
            icon="mail-outline"
            tone="email"
            reason={emailReason}
            disabled={!signInMethods.methods.email.enabled || isSubmitting}
            onPress={() => {
              setError(null);
              setOfflineNote(null);
              setShowEmailForm(true);
            }}
          />

          {showEmailForm ? null : errorBlock}

          {showEmailForm ? (
            <View testID="sign-in-form" style={[styles.card, { backgroundColor: t.colors.card }]}>
              <View style={styles.field}>
                <Text
                  style={[styles.fieldLabel, { color: t.colors.label }]}
                  maxFontSizeMultiplier={TEXT_SCALE}
                >
                  Email
                </Text>
                <TextInput
                  testID="sign-in-email-field"
                  style={[styles.input, { backgroundColor: t.colors.fill, color: t.colors.label }]}
                  placeholder="you@example.co.nz"
                  placeholderTextColor={t.colors.secondaryLabel}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isSubmitting}
                  accessibilityLabel="Email"
                />
              </View>
              <View style={styles.field}>
                <Text
                  style={[styles.fieldLabel, { color: t.colors.label }]}
                  maxFontSizeMultiplier={TEXT_SCALE}
                >
                  Password
                </Text>
                <TextInput
                  testID="sign-in-password-field"
                  style={[styles.input, { backgroundColor: t.colors.fill, color: t.colors.label }]}
                  placeholder="Your password"
                  placeholderTextColor={t.colors.secondaryLabel}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                  editable={!isSubmitting}
                  accessibilityLabel="Password"
                />
              </View>
              {errorBlock}
              <Pressable
                onPress={() => void handleLogin()}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel={error !== null ? 'Try again' : 'Sign in'}
                accessibilityHint="Signs you in"
                accessibilityState={{ disabled: isSubmitting }}
                testID="sign-in-submit"
                style={[styles.primaryAction, { backgroundColor: t.colors.accent }]}
              >
                <Text
                  style={[styles.primaryLabel, { color: t.colors.onAccent }]}
                  maxFontSizeMultiplier={TEXT_SCALE}
                >
                  {error !== null ? 'Try again' : 'Sign in'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.footer}>
            <Text
              style={[styles.footerNote, { color: t.colors.secondaryLabel }]}
              maxFontSizeMultiplier={TEXT_SCALE}
            >
              You stay signed in for the whole shift, even without signal.
            </Text>
            {biometricAvailable ? (
              /* The reference's line, and when the phone can do it the line is
                 the offer: the one biometric surface the app has. */
              <Pressable
                onPress={openBiometricUnlock}
                accessibilityRole="button"
                accessibilityLabel="Face ID unlocks the app"
                accessibilityHint="Opens the app with your face or fingerprint"
                testID="sign-in-biometric"
                style={styles.footerAction}
              >
                <Text
                  style={[styles.footerLink, { color: t.colors.accentText }]}
                  maxFontSizeMultiplier={TEXT_SCALE}
                >
                  Face ID unlocks the app.
                </Text>
              </Pressable>
            ) : (
              <Text
                style={[styles.footerNote, { color: t.colors.secondaryLabel }]}
                maxFontSizeMultiplier={TEXT_SCALE}
              >
                Face ID unlocks the app.
              </Text>
            )}

            <View style={styles.registerRow}>
              <Text
                style={[styles.registerText, { color: t.colors.secondaryLabel }]}
                maxFontSizeMultiplier={TEXT_SCALE}
              >
                New to Courier Copilot?{' '}
              </Text>
              <Pressable
                onPress={() => router.push('/(auth)/register')}
                accessibilityRole="link"
                accessibilityLabel="Create an account"
                accessibilityHint="Opens the create-account screen"
                testID="sign-in-register"
                style={styles.registerAction}
              >
                <Text
                  style={[styles.registerLink, { color: t.colors.accentText }]}
                  maxFontSizeMultiplier={TEXT_SCALE}
                >
                  Create an account
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/**
 * One of the other ways in.
 *
 * A method the service cannot offer yet keeps its place on the screen and says
 * why, so the courier is not left wondering. The tone is the reference's own:
 * Apple is the filled action, Google the card with its hairline border, the
 * passkey and the email the quiet fills.
 */
function MethodButton({
  testID,
  label,
  icon,
  tone,
  reason,
  disabled,
  onPress,
}: {
  testID: string;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tone: MethodTone;
  reason: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const { t } = useChosen();
  const borderColor = TONE_BORDER[tone];

  return (
    <View style={styles.method}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={reason.length > 0 ? reason : label}
        accessibilityState={{ disabled }}
        testID={testID}
        style={[
          styles.methodAction,
          {
            backgroundColor: t.colors[TONE_FILL[tone]],
            borderColor: borderColor === null ? 'transparent' : t.colors[borderColor],
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={t.colors[TONE_LABEL[tone]]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text
          style={[styles.methodLabel, { color: t.colors[TONE_LABEL[tone]] }]}
          maxFontSizeMultiplier={TEXT_SCALE}
        >
          {label}
        </Text>
      </Pressable>
      {reason.length > 0 ? (
        <Text
          testID={`${testID}-reason`}
          style={[styles.reason, { color: t.colors.secondaryLabel }]}
          maxFontSizeMultiplier={TEXT_SCALE}
        >
          {reason}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.space20,
    paddingTop: spacing.space24,
    paddingBottom: spacing.space32,
    gap: spacing.space12,
  },
  header: {
    alignItems: 'center',
    gap: spacing.space4,
  },
  mark: {
    width: MARK_SIZE,
    height: MARK_SIZE,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.largeTitle.size,
    lineHeight: typography.largeTitle.lineHeight,
    fontWeight: typography.largeTitle.weight,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.paragraph.size,
    lineHeight: typography.paragraph.lineHeight,
    fontWeight: typography.paragraph.weight,
    textAlign: 'center',
  },
  card: {
    borderRadius: radii.card,
    padding: spacing.space16,
    gap: spacing.space12,
  },
  offerTitle: {
    fontSize: typography.emphasis.size,
    lineHeight: typography.emphasis.lineHeight,
    fontWeight: typography.emphasis.weight,
  },
  offerBody: {
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    fontWeight: typography.body.weight,
  },
  offerWho: {
    fontSize: typography.secondary.size,
    lineHeight: typography.secondary.lineHeight,
    fontWeight: typography.secondary.weight,
  },
  offerNote: {
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    fontWeight: typography.body.weight,
  },
  methods: {
    gap: spacing.space8,
  },
  method: {
    gap: spacing.space4,
  },
  methodAction: {
    height: METHOD_HEIGHT,
    borderRadius: radii.button,
    borderWidth: HAIRLINE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space8,
  },
  methodLabel: {
    fontSize: typography.button.size,
    lineHeight: typography.button.lineHeight,
    fontWeight: typography.button.weight,
  },
  reason: {
    fontSize: typography.secondary.size,
    lineHeight: typography.secondary.lineHeight,
    fontWeight: typography.secondary.weight,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DIVIDER_GAP,
  },
  dividerLine: {
    flex: 1,
    height: HAIRLINE,
  },
  dividerLabel: {
    fontSize: typography.secondary.size,
    lineHeight: typography.secondary.lineHeight,
    fontWeight: typography.secondary.weight,
  },
  form: {
    gap: spacing.space16,
  },
  field: {
    gap: spacing.space4,
  },
  fieldLabel: {
    fontSize: typography.secondary.size,
    lineHeight: typography.secondary.lineHeight,
    fontWeight: typography.secondary.weight,
  },
  input: {
    height: FIELD_HEIGHT,
    borderRadius: radii.ghostButton,
    paddingHorizontal: spacing.space12,
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    fontWeight: typography.body.weight,
  },
  primaryAction: {
    height: touch.drivingAction,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    fontSize: typography.button.size,
    lineHeight: typography.button.lineHeight,
    fontWeight: typography.button.weight,
  },
  errorText: {
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    fontWeight: typography.body.weight,
  },
  backupLink: {
    minHeight: QUIET_ROW_HEIGHT,
    justifyContent: 'center',
  },
  linkText: {
    fontSize: typography.secondary.size,
    lineHeight: typography.secondary.lineHeight,
    fontWeight: typography.secondary.weight,
    textAlign: 'center',
  },
  team: {
    minHeight: METHOD_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: spacing.space16,
    borderRadius: radii.card,
    borderWidth: HAIRLINE,
  },
  teamName: {
    fontSize: typography.emphasis.size,
    lineHeight: typography.emphasis.lineHeight,
    fontWeight: typography.emphasis.weight,
  },
  footer: {
    marginTop: spacing.space8,
    alignItems: 'center',
    gap: spacing.space4,
  },
  footerNote: {
    fontSize: typography.secondary.size,
    lineHeight: typography.secondary.lineHeight,
    fontWeight: typography.secondary.weight,
    textAlign: 'center',
  },
  footerLink: {
    fontSize: typography.secondary.size,
    lineHeight: typography.secondary.lineHeight,
    fontWeight: typography.secondary.weight,
    textAlign: 'center',
  },
  footerAction: {
    minHeight: QUIET_ROW_HEIGHT,
    justifyContent: 'center',
  },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.space8,
  },
  registerText: {
    fontSize: typography.secondary.size,
    lineHeight: typography.secondary.lineHeight,
    fontWeight: typography.secondary.weight,
  },
  registerLink: {
    fontSize: typography.secondary.size,
    lineHeight: typography.secondary.lineHeight,
    fontWeight: typography.secondary.weight,
  },
  registerAction: {
    minHeight: QUIET_ROW_HEIGHT,
    justifyContent: 'center',
  },
});
