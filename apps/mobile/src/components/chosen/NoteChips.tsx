/**
 * The note chips: side gate, shelf, dog (the reference's 30 pt chips at
 * radius `chip`, `chipLabel` 14/600 on the fill). The icon colour carries
 * the meaning — accent, info2 (the shelf) and warning (the dog) — which the
 * D33 gate records as a NON-TEXT role: SC 1.4.11 is the follow-up review,
 * not a text bar, and the label in `label` carries the text pair.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useChosen } from './context';

export type ChipTone = 'accent' | 'info2' | 'warning';

export interface NoteChip {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tone: ChipTone;
  label: string;
}

export interface NoteChipsProps {
  chips: NoteChip[];
  testID?: string;
}

export const NoteChips = ({ chips, testID }: NoteChipsProps) => {
  const { t } = useChosen();
  return (
    <View style={styles.wrap} testID={testID} pointerEvents="box-none">
      {chips.map((chip) => (
        <View
          key={chip.label}
          accessible
          accessibilityLabel={`${chip.label}, note`}
          testID={`${testID ?? 'chip'}-${chip.label}`}
          style={[styles.chip, { backgroundColor: t.colors.fill, borderRadius: t.radii.chip }]}
        >
          <Ionicons name={chip.icon} size={15} color={t.colors[chip.tone]} />
          <Text
            style={{
              fontSize: t.typography.chipLabel.size,
              lineHeight: t.typography.chipLabel.lineHeight,
              fontWeight: t.typography.chipLabel.weight,
              color: t.colors.label,
            }}
            maxFontSizeMultiplier={1.5}
          >
            {chip.label}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
  },
});
