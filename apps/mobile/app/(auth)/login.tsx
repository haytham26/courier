/**
 * The sign-in screen.
 *
 * The first screen a courier sees. Plain NZ English, one primary action of
 * 72 pt, the fields at 56 pt with a label each, and no emoji.
 *
 * The screen has three steps:
 *  - the methods: Google, Apple, a passkey, or an email address and a
 *    password,
 *  - the second factor: the code from the authenticator app or a backup
 *    code,
 *  - the team: which route the courier is driving today.
 *
 * A method the service cannot offer yet is shown with the reason under it,
 * so the courier is never left guessing why a button does nothing.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { PASSKEY_DEVICE_REASON, passkeySupportedOnDevice } from '@/lib/passkey-support';

export default function LoginScreen() {
  const router = useRouter();
  const { theme } = useTheme();
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
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passkeyOnDevice = passkeySupportedOnDevice();

  const handleLogin = useCallback(async () => {
    if (!email || !password) {
      setError('Enter your email and password');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const outcome = await login(email, password);
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

  if (step === 'two-factor') {
    return (
      <View
        testID="login-mfa-screen"
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text role="heading" style={[styles.title, { color: theme.colors.textPrimary }]}>
            Check your code
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {useBackupCode
              ? 'Enter one of your backup codes'
              : 'Enter the code from your authenticator app'}
          </Text>

          <View style={styles.form}>
            <Input
              testID="login-mfa-code"
              label={useBackupCode ? 'Backup code' : 'Six digit code'}
              placeholder={useBackupCode ? 'ABCDE-12345' : '123456'}
              value={code}
              onChangeText={setCode}
              keyboardType={useBackupCode ? 'default' : 'number-pad'}
              autoCapitalize="characters"
              autoComplete={useBackupCode ? 'off' : 'one-time-code'}
              editable={!isSubmitting}
              error={error ?? undefined}
            />
            <Button
              size="lg"
              loading={isSubmitting}
              onPress={handleTwoFactor}
              testID="login-mfa-submit"
              accessibilityHint="Checks the code and signs you in"
            >
              Confirm
            </Button>
            <TouchableOpacity
              onPress={() => {
                setUseBackupCode((current) => !current);
                setError(null);
              }}
              accessibilityRole="link"
              accessibilityLabel={
                useBackupCode ? 'Use the code from your authenticator app' : 'Use a backup code'
              }
              testID="login-mfa-backup"
            >
              <Text style={[styles.link, { color: theme.colors.brandPrimary }]}>
                {useBackupCode ? 'Use the authenticator app' : 'Use a backup code'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (step === 'teams') {
    return (
      <View
        testID="login-teams-screen"
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text role="heading" style={[styles.title, { color: theme.colors.textPrimary }]}>
            Which team are you on?
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Pick the route you are driving today
          </Text>
          <View style={styles.form}>
            {teams.map((team) => (
              <TouchableOpacity
                key={team.id}
                onPress={() => void handleTeamPick(team.id)}
                accessibilityRole="button"
                accessibilityLabel={team.name}
                testID={`login-team-${team.id}`}
                style={[
                  styles.team,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.teamName, { color: theme.colors.textPrimary }]}>
                  {team.name}
                </Text>
              </TouchableOpacity>
            ))}
            {teams.length === 0 ? (
              <Text style={[styles.helper, { color: theme.colors.textSecondary }]}>
                You are not in a team yet. Ask your team lead for an invitation.
              </Text>
            ) : null}
          </View>
        </ScrollView>
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

  return (
    <View
      testID="login-screen"
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text role="heading" style={[styles.title, { color: theme.colors.textPrimary }]}>
          Welcome back
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Sign in to continue
        </Text>

        <View style={styles.methods}>
          <MethodButton
            testID="login-method-google"
            label="Continue with Google"
            hint={googleReason}
            disabled={!signInMethods.methods.google.enabled || isSubmitting}
            onPress={() => void handleProviderSignIn('google')}
          />
          <MethodButton
            testID="login-method-apple"
            label="Continue with Apple"
            hint={appleReason}
            disabled={!signInMethods.methods.apple.enabled || isSubmitting}
            onPress={() => void handleProviderSignIn('apple')}
          />
          <MethodButton
            testID="login-method-passkey"
            label="Sign in with a passkey"
            hint={passkeyReason}
            disabled={!signInMethods.methods.passkey.enabled || !passkeyOnDevice || isSubmitting}
            onPress={() => void handleProviderSignIn('passkey')}
          />
        </View>

        <View style={styles.form}>
          <Input
            testID="login-email"
            label="Email"
            placeholder="you@example.co.nz"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!isSubmitting}
          />
          <Input
            testID="login-password"
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            editable={!isSubmitting}
          />
          {error !== null ? (
            <Text
              testID="login-error"
              accessibilityLiveRegion="polite"
              style={[styles.error, { color: theme.colors.error }]}
            >
              {error}
            </Text>
          ) : null}
          <Button
            size="lg"
            loading={isSubmitting}
            onPress={handleLogin}
            testID="login-submit"
            accessibilityHint="Signs you in"
          >
            {error !== null ? 'Try again' : 'Sign In'}
          </Button>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            Don't have an account?{' '}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/register')}
            accessibilityRole="link"
            accessibilityLabel="Sign Up"
            testID="login-sign-up"
          >
            <Text style={[styles.link, { color: theme.colors.brandPrimary }]}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * One of the other ways in.
 *
 * A method the service cannot offer yet keeps its place on the screen and
 * says why, so the courier is not left wondering.
 */
function MethodButton({
  testID,
  label,
  hint,
  disabled,
  onPress,
}: {
  testID: string;
  label: string;
  hint: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.method}>
      <Button
        variant="outline"
        fullWidth
        disabled={disabled}
        onPress={onPress}
        testID={testID}
        accessibilityHint={hint.length > 0 ? hint : label}
      >
        {label}
      </Button>
      {hint.length > 0 ? (
        <Text
          testID={`${testID}-hint`}
          style={[styles.helper, { color: theme.colors.textTertiary }]}
        >
          {hint}
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
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 20,
  },
  methods: {
    gap: 8,
    marginTop: 8,
  },
  method: {
    gap: 4,
  },
  form: {
    gap: 16,
    marginTop: 16,
  },
  error: {
    fontSize: 17,
  },
  helper: {
    fontSize: 15,
  },
  team: {
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  teamName: {
    fontSize: 20,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 19,
  },
  link: {
    fontSize: 19,
    fontWeight: '600',
  },
});
