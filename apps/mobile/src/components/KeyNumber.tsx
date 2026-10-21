/**
 * A key number: the one number the courier reads at a glance.
 *
 * The type is large (48 pt and up) and the figures are tabular, so the
 * number does not jump around while it counts up.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, space } from '@/styles/tokens';

interface KeyNumberProps {
  /** The number, already formatted (the money never becomes a float). */
  value: string;
  /** What the number is, under it. */
  caption?: string;
  /** The sentence a screen reader reads for the number. */
  accessibilityLabel?: string;
  testID?: string;
}

export function KeyNumber({ value, caption, accessibilityLabel, testID }: KeyNumberProps) {
  const { theme } = useTheme();

  return (
    <View>
      <Text
        testID={testID}
        accessibilityLabel={accessibilityLabel ?? value}
        style={[styles.value, { color: theme.colors.textPrimary, fontSize: fontSize.key }]}
      >
        {value}
      </Text>
      {caption !== undefined && (
        <Text style={[styles.caption, { color: theme.colors.textSecondary, fontSize: fontSize.base }]}>
          {caption}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  value: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  caption: {
    marginTop: space.xs,
  },
});
