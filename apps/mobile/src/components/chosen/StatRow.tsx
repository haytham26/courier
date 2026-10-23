/**
 * The stat row: three rounded numbers with small labels, and a thin progress
 * line (the reference's 26/700 numbers, 13/600 labels, the 4 px line with
 * the success bar). The delivered stat rides `successText` (D33 darkened the
 * green as text), the others `label`.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useChosen } from './context';

export type StatTone = 'neutral' | 'success';

export interface StatItem {
  label: string;
  value: string;
  tone?: StatTone;
  testID?: string;
}

export interface StatRowProps {
  items: [StatItem, StatItem, StatItem];
  /** The line's fill, 0 to 1. */
  progress?: number;
  testID?: string;
}

export const StatRow = ({ items, progress, testID }: StatRowProps) => {
  const { t } = useChosen();
  return (
    <View testID={testID} style={styles.column}>
      <View style={styles.row}>
        {items.map((item) => (
          <View key={item.label} style={styles.stat}>
            <Text
              testID={item.testID}
              style={{
                fontSize: t.typography.stat.size,
                lineHeight: t.typography.stat.lineHeight,
                fontWeight: t.typography.stat.weight,
                color: item.tone === 'success' ? t.colors.successText : t.colors.label,
                fontVariant: ['tabular-nums'],
              }}
              maxFontSizeMultiplier={2}
            >
              {item.value}
            </Text>
            <Text
              style={{
                fontSize: t.typography.secondary.size,
                lineHeight: t.typography.secondary.lineHeight,
                fontWeight: t.typography.secondary.weight,
                color: t.colors.secondaryLabel,
              }}
              maxFontSizeMultiplier={1.4}
            >
              {item.label}
            </Text>
          </View>
        ))}
      </View>
      {progress === undefined ? null : (
        <View style={[styles.track, { backgroundColor: t.colors.fill }]} testID={testID ? `${testID}-progress` : undefined}>
          <View style={[styles.bar, { backgroundColor: t.colors.success, width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }]} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  column: {
    gap: 6,
    paddingHorizontal: 2,
  },
  row: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  bar: {
    height: 4,
    borderRadius: 2,
  },
});
