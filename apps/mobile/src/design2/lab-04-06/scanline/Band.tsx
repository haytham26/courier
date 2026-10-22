/**
 * The ruled band.
 *
 * The grammar of the Scanline direction: every block of every screen is a
 * band with a rule on the left, a key and a value, and the data is
 * monospaced so a scanned address and a typed address look like they came
 * out of the same machine.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { labDirections } from '@courier/design-tokens/lab-directions';
import { typeStyle } from '../labTheme';

const direction = labDirections.scanline;

export function Band({
  label,
  value,
  rule,
  tone = 'ink',
  children,
}: {
  label: string;
  value: string;
  rule: string;
  tone?: 'ink' | 'accent' | 'muted';
  children?: React.ReactNode;
}): React.JSX.Element {
  const { theme } = useTheme();
  const colour =
    tone === 'accent'
      ? theme.colors.brandPrimary
      : tone === 'muted'
        ? theme.colors.textTertiary
        : theme.colors.textPrimary;

  return (
    <View style={styles.band}>
      <View style={[styles.bandRule, { backgroundColor: rule }]} />
      <View style={styles.bandBody}>
        <Text style={[typeStyle(direction.type.label), { color: theme.colors.textSecondary }]}>
          {label}
        </Text>
        {children ?? (
          <Text style={[typeStyle(direction.type.row), { color: colour }]} numberOfLines={2}>
            {value}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 6 },
  bandRule: { width: 3 },
  bandBody: { flex: 1, paddingLeft: 12, gap: 2 },
});
