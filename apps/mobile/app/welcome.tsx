/**
 * Welcome (01-welcome.html), on the chosen tokens.
 *
 * The app's first screen for a driver who is not signed in: the mark, the
 * name, the one line that says what the app is for, and the two ways in -
 * Get Started and Sign In. The reference is a single card, not a stack of
 * onboarding panels (§17.3's cards, the demo run and the voice tour are the
 * next slices; the design contract is the reference here).
 *
 * A signed-in courier never sees it: the app's root stack puts the welcome in
 * front of the auth group, and the draft session (the E2E mode's mock) opens
 * straight on the tabs, which is what every flow expects.
 *
 * The copy is plain New Zealand English, there is no emoji anywhere, and every
 * control has an accessibility label and a role.
 */
import React, { useCallback } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ChosenProvider, useChosen } from '@/components/chosen';
import { hapticFor } from '@/motion/haptics';
import { radii, spacing, typography } from '@courier/design-tokens/chosen';

/** The app's name and its line. */
const APP_NAME = 'Courier Copilot';

const TAGLINE =
  'Scan your parcels, check every address and drive the best order. Built for couriers in Canterbury.';

export default function WelcomeRoute() {
  return (
    <ChosenProvider mode="light">
      <WelcomeScreen />
    </ChosenProvider>
  );
}

function WelcomeScreen() {
  const { t } = useChosen();
  const router = useRouter();

  const handleGetStarted = useCallback(() => {
    hapticFor('confirm');
    // The demo run (section 17.3) is the way in for a new driver; until it
    // lands, the sign-in is the way in, and the run opens on the tabs.
    router.push('/login');
  }, [router]);

  const handleSignIn = useCallback(() => {
    hapticFor('confirm');
    router.push('/login');
  }, [router]);

  return (
    <SafeAreaView testID="welcome-screen" style={[styles.screen, { backgroundColor: t.colors.background }]}>
      <View style={styles.mark}>
        <View style={[styles.markBadge, { backgroundColor: t.colors.accent }]}>
          <Ionicons name="cube" size={28} color={t.colors.onAccent} />
        </View>
      </View>

      <View style={styles.copy}>
        <Text style={[styles.name, { color: t.colors.label }]} maxFontSizeMultiplier={1.6}>
          {APP_NAME}
        </Text>
        <Text style={[styles.tagline, { color: t.colors.secondaryLabel }]} maxFontSizeMultiplier={1.6}>
          {TAGLINE}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Get Started"
          accessibilityHint="Opens the demo run and the sign-in"
          onPress={handleGetStarted}
          testID="welcome-get-started"
          style={[
            styles.action,
            { backgroundColor: t.colors.accent, borderRadius: radii.button },
          ]}
        >
          <Text style={[styles.actionLabel, { color: t.colors.onAccent }]}>Get Started</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign In"
          accessibilityHint="Signs in with an existing account"
          onPress={handleSignIn}
          testID="welcome-sign-in"
          style={[
            styles.action,
            { backgroundColor: t.colors.fill, borderRadius: radii.button },
          ]}
        >
          <Text style={[styles.actionLabel, { color: t.colors.accentText }]}>Sign In</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.space32 },
  mark: { alignItems: 'center' },
  markBadge: {
    width: 72,
    height: 72,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { alignItems: 'center', gap: spacing.space12, paddingHorizontal: spacing.space32 },
  name: { fontSize: typography.largeTitle.size, fontWeight: typography.largeTitle.weight },
  tagline: {
    fontSize: typography.paragraph.size,
    lineHeight: typography.paragraph.lineHeight,
    textAlign: 'center',
  },
  actions: { gap: spacing.space12, paddingHorizontal: spacing.space32, alignSelf: 'stretch' },
  action: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: typography.button.size,
    fontWeight: typography.button.weight,
    lineHeight: typography.button.lineHeight,
  },
});
