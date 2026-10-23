/**
 * The scanner overlay: the pills over the camera, the dimmed surround and
 * the reticle.
 *
 * The scanner keeps the DARK recipe in both modes (the reference 06-scan
 * does): the pills are dark glass with `onDarkGlass` #FFFFFF labels, and the
 * camera feed sits under the `scrim` (rgba(0,0,0,.35) in both modes) — that
 * scrim is what makes the pair assertable at all, and it is why the D33 gate
 * computes 9.88 over the brightest possible feed.
 *
 * The reticle: the address block is highlighted by a hole in the dimmer (the
 * 999 px border trick) framed by the `scanRing` (the reference's 2.5 px
 * ring); the ring is a non-text graphic in the D33 registry.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@courier/design-tokens/chosen';
import { useChosen } from './context';

export interface ScanOverlayProps {
  done: string;
  scanned: string;
  /** The highlight bounds inside the 390 x 844 reference frame, if tracked. */
  target?: { x: number; y: number; width: number; height: number };
  testID?: string;
}

export const ScanOverlay = ({ done, scanned, target, testID }: ScanOverlayProps) => {
  const { t } = useChosen();
  void t; // the dark recipes come from the dark set by design, in both modes
  const glassFill = colors.dark.glass; // rgb(28,28,30) at 62: the scanner's pill fill
  return (
    <View testID={testID} pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* the scrim over the feed, then the hole for the address block */}
      {target ? (
        <View
          testID={testID ? `${testID}-reticle` : 'scan-reticle'}
          style={[
            styles.reticleBase,
            {
              left: target.x,
              top: target.y,
              width: target.width,
              height: target.height,
              borderColor: colors.dark.scrim,
              borderWidth: 999,
              borderRadius: 12,
            },
          ]}
        >
          <View style={[styles.ring, { borderColor: colors.dark.scanRing }]} />
        </View>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.dark.scrim }]} />
      )}

      {/* the pills: dark glass, white labels, both modes */}
      <View style={styles.pillsRow}>
        <View style={[styles.pill, { backgroundColor: glassFill }]}>
          {done ? (
            <Ionicons name="checkmark" size={16} color={colors.dark.onDarkGlass} />
          ) : null}
          <Text style={[styles.pillLabel, { color: colors.dark.onDarkGlass }]} maxFontSizeMultiplier={1.4}>
            {done}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: glassFill }]}>
          <Text style={[styles.pillLabel, { color: colors.dark.onDarkGlass }]} maxFontSizeMultiplier={1.4}>
            {scanned}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  reticleBase: {
    position: 'absolute',
  },
  ring: {
    // The visible ring is inset inside the hole.
    position: 'absolute' as const,
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: 2.5,
  },
  pillsRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 58,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pill: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  pillLabel: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
