/**
 * The biometric unlock.
 *
 * The courier signs in once and then drives the whole shift. When the phone
 * has no signal the app opens with the session it kept, and the courier
 * opens it with a fingerprint instead of typing a password.
 *
 * The unlock is a convenience and never a lock-out: "Not now" opens the app
 * straight away, and a phone without a scanner never shows this screen.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';

export function BiometricUnlock({
  onUnlock,
  onSkip,
}: {
  onUnlock: () => void | Promise<void>;
  onSkip: () => void;
}) {
  const { theme } = useTheme();
  const [isWorking, setIsWorking] = useState(false);

  const handleUnlock = async () => {
    setIsWorking(true);
    try {
      await onUnlock();
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <View
      testID="biometric-unlock-screen"
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <Text role="heading" style={[styles.title, { color: theme.colors.textPrimary }]}>
          Unlock Courier Copilot
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Use your fingerprint to open the app
        </Text>
        <View style={styles.actions}>
          <Button
            size="lg"
            loading={isWorking}
            onPress={() => void handleUnlock()}
            testID="biometric-unlock"
            accessibilityHint="Opens the app with your fingerprint"
          >
            Unlock
          </Button>
          <Button
            variant="ghost"
            onPress={onSkip}
            testID="biometric-unlock-skip"
            accessibilityHint="Opens the app without the fingerprint"
          >
            Not now
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
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
  actions: {
    gap: 12,
    marginTop: 24,
  },
});
