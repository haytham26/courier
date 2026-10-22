/**
 * The crop marks.
 *
 * The signature of the Scanline direction: the scanner sets the language of
 * the screen, so the guide that says where the app is reading is drawn the
 * way a scanner draws it - four corner marks and a hairline frame, never a
 * rounded rectangle and never a glow.
 *
 * The marks are lines on the 4-pt grid, drawn with plain views so they cost
 * nothing on the frame budget.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';

interface ScanFrameProps {
  /** The colour of the marks. The vermilion of the direction. */
  color?: string;
  /** The length of one arm of a mark, in points. */
  arm?: number;
  /** Whether the frame is closed on all four sides. */
  active?: boolean;
}

export function ScanFrame({ color, arm = 20, active = true }: ScanFrameProps): React.JSX.Element {
  const { theme } = useTheme();
  const mark = color ?? theme.colors.brandPrimary;

  return (
    <View
      style={styles.frame}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="scan-frame"
    >
      <View style={[styles.corner, styles.topLeft]}>
        <View style={[styles.horizontal, { width: arm, backgroundColor: mark }]} />
        <View style={[styles.vertical, { height: arm, backgroundColor: mark }]} />
      </View>
      <View style={[styles.corner, styles.topRight]}>
        <View style={[styles.horizontal, { width: arm, backgroundColor: mark }]} />
        <View style={[styles.vertical, { height: arm, backgroundColor: mark }]} />
      </View>
      <View style={[styles.corner, styles.bottomLeft]}>
        <View style={[styles.horizontal, { width: arm, backgroundColor: mark }]} />
        <View style={[styles.vertical, { height: arm, backgroundColor: mark }]} />
      </View>
      <View style={[styles.corner, styles.bottomRight]}>
        <View style={[styles.horizontal, { width: arm, backgroundColor: mark }]} />
        <View style={[styles.vertical, { height: arm, backgroundColor: mark }]} />
      </View>
      {active ? (
        <View style={[styles.caret, { backgroundColor: mark }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  corner: { position: 'absolute' },
  topLeft: { top: 0, left: 0 },
  topRight: { top: 0, right: 0, alignItems: 'flex-end' },
  bottomLeft: { bottom: 0, left: 0, justifyContent: 'flex-end' },
  bottomRight: { bottom: 0, right: 0, alignItems: 'flex-end', justifyContent: 'flex-end' },
  horizontal: { height: 2 },
  vertical: { width: 2 },
  caret: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    opacity: 0.6,
  },
});
