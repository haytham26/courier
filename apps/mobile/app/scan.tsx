/**
 * The scanner surface (T6 slice 3, screen 06's chrome).
 *
 * The ScanOverlay is the surface the camera lands on: the dark scrim, the
 * two pills, and the reticle hole with the scanner ring. It is deliberately
 * display only (pointerEvents off), so the screen holds the one interactive
 * twin of the Done pill, on the same spot. The camera itself (VisionCamera)
 * lands with the delivered slice; this route is the surface the Today
 * button navigates to, so no screen ships a dead control.
 *
 * The palette is the scanner's own: everything reads onDarkGlass over the
 * dark glass and the scrim, in both modes (D33).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';

import { ChosenProvider, ScanOverlay, useChosen } from '@/components/chosen';
import { colors, typography } from '@courier/design-tokens/chosen';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  feed: {
    flex: 1,
  },
  doneHolder: {
    position: 'absolute',
    left: 16,
    top: 58,
  },
  donePill: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.glass,
  },
  doneLabel: {
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    fontWeight: typography.body.weight,
    color: colors.dark.onDarkGlass,
  },
});

function ScannerSurface() {
  const router = useRouter();
  const { t } = useChosen();
  void t;

  return (
    <View style={styles.screen} testID="scan-screen">
      {/* The camera feed lands here: until then the feed is the plain dark. */}
      <View testID="scan-feed" style={styles.feed} />
      <ScanOverlay done="Done" scanned="0 scanned" testID="scan-overlay" />
      <View style={styles.doneHolder} pointerEvents="box-none">
        <Pressable
          accessible
          role="button"
          accessibilityLabel="Done scanning"
          accessibilityHint="Closes the scanner"
          onPress={() => router.back()}
          testID="scan-done"
          style={styles.donePill}
        >
          <Text style={styles.doneLabel}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ScanScreen() {
  const scheme = useColorScheme();

  return (
    <ChosenProvider mode={scheme === 'dark' ? 'dark' : 'light'}>
      <ScannerSurface />
    </ChosenProvider>
  );
}
