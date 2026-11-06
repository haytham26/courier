/**
 * The prominent in-app disclosure for the background location (audit B5,
 * Play's review rule): the app shows it BEFORE it asks for the location
 * permission, and the settings open it on demand so a reviewer can read it
 * at any time without starting a drive.
 *
 * The wording is the ONE legal text (`src/constants/legal.ts`), so the app,
 * the store listing and the privacy policy say the same thing - and the
 * release check (check-store-readiness) proves the constant is wired into a
 * screen, not only defined in the constants file.
 */
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { openURL } from 'expo-linking';

import { radii, spacing, touch, typography } from '@courier/design-tokens/chosen';

import { BACKGROUND_LOCATION_DISCLOSURE, PRIVACY_POLICY_URL } from '@/constants/legal';

import { useChosen } from './context';

export interface LocationDisclosureProps {
  /** Whether the disclosure is on screen. */
  visible: boolean;
  /**
   * The one action. On the drive it continues to the permission request; in
   * the settings it just closes the sheet.
   */
  onContinue: () => void;
  /** The action's label ("Continue" on the drive, "Done" in the settings). */
  continueLabel?: string;
  testID?: string;
}

export const LocationDisclosure = ({
  visible,
  onContinue,
  continueLabel = 'Continue',
  testID = 'location-disclosure',
}: LocationDisclosureProps) => {
  const { t } = useChosen();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onContinue}
      accessibilityViewIsModal
    >
      <View style={[styles.backdrop, { backgroundColor: t.colors.scrim }]}>
        <View
          testID={testID}
          accessibilityLabel="Location disclosure"
          style={[styles.card, { backgroundColor: t.colors.card, borderRadius: radii.card }]}
        >
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: t.colors.label }]}
            maxFontSizeMultiplier={1.4}
          >
            Location while you drive
          </Text>
          <Text
            testID={`${testID}-body`}
            style={[styles.body, { color: t.colors.label }]}
            maxFontSizeMultiplier={1.6}
          >
            {BACKGROUND_LOCATION_DISCLOSURE}
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Privacy policy"
            accessibilityHint="Opens the privacy policy in the browser"
            onPress={() => void openURL(PRIVACY_POLICY_URL)}
            testID={`${testID}-privacy`}
            style={styles.privacyRow}
          >
            <Text
              style={[styles.privacyLabel, { color: t.colors.accentText }]}
              maxFontSizeMultiplier={1.4}
            >
              Read the privacy policy
            </Text>
          </Pressable>
          <Pressable
            accessible
            accessibilityRole="button"
            accessibilityLabel={continueLabel}
            onPress={onContinue}
            testID={`${testID}-continue`}
            style={[styles.continue, { backgroundColor: t.colors.accent, borderRadius: radii.button }]}
          >
            <Text
              style={[styles.continueLabel, { color: t.colors.onAccent }]}
              maxFontSizeMultiplier={1.4}
            >
              {continueLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.space24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: spacing.space24,
    gap: spacing.space16,
  },
  title: {
    fontSize: typography.confirmTitle.size,
    lineHeight: typography.confirmTitle.lineHeight,
    fontWeight: typography.confirmTitle.weight,
  },
  body: {
    fontSize: typography.paragraph.size,
    lineHeight: typography.paragraph.lineHeight,
    fontWeight: typography.paragraph.weight,
  },
  privacyRow: {
    minHeight: touch.minimum,
    justifyContent: 'center',
  },
  privacyLabel: {
    fontSize: typography.paragraph.size,
    lineHeight: typography.paragraph.lineHeight,
    fontWeight: typography.paragraph.weight,
  },
  continue: {
    minHeight: touch.minimum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueLabel: {
    fontSize: typography.button.size,
    lineHeight: typography.button.lineHeight,
    fontWeight: typography.button.weight,
  },
});
