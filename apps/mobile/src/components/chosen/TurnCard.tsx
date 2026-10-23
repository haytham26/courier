/**
 * The turn card and the Then strip (the reference's r30 dark-green card with
 * the distance in the biggest rounded numbers and the street under it, and
 * the darker `turnStrip` strip for the turn after then).
 *
 * Pairs asserted on the driving screen: `onTurnCard` on `turnCard` and
 * `onTurnStrip` on `turnStrip`, both at 7:1, both modes (D33).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useChosen } from './context';

export interface TurnCardProps {
  distance: string;
  street: string;
  /** The turn after this one, on the Then strip (the colour carries it). */
  thenStreet?: string;
  testID?: string;
}

export const TurnCard = ({ distance, street, thenStreet, testID }: TurnCardProps) => {
  const { t } = useChosen();
  return (
    <View testID={testID} style={styles.column} accessibilityLabel={`In ${distance}, ${street}`}>
      <View
        accessible
        style={[styles.card, { backgroundColor: t.colors.turnCard, borderRadius: t.radii.turnCard }]}
      >
        <Ionicons name="return-up-back" size={46} color={t.colors.onTurnCard} />
        <View style={styles.texts}>
          <Text
            testID={testID ? `${testID}-distance` : undefined}
            style={{
              fontSize: t.typography.turnDistance.size,
              lineHeight: t.typography.turnDistance.lineHeight,
              fontWeight: t.typography.turnDistance.weight,
              color: t.colors.onTurnCard,
              fontVariant: ['tabular-nums'],
            }}
            maxFontSizeMultiplier={1.2}
          >
            {distance}
          </Text>
          <Text
            testID={testID ? `${testID}-street` : undefined}
            style={{
              fontSize: t.typography.streetTitle.size,
              lineHeight: t.typography.streetTitle.lineHeight,
              fontWeight: t.typography.streetTitle.weight,
              color: t.colors.onTurnCard,
            }}
            maxFontSizeMultiplier={1.3}
          >
            {street}
          </Text>
        </View>
      </View>
      {thenStreet ? (
        <View
          style={[styles.strip, { backgroundColor: t.colors.turnStrip, borderBottomLeftRadius: t.radii.stripCorner, borderBottomRightRadius: t.radii.stripCorner }]}
          accessible
          accessibilityLabel={`Then ${thenStreet}`}
        >
          <Text
            style={{
              fontSize: t.typography.body.size,
              lineHeight: t.typography.body.lineHeight,
              fontWeight: t.typography.body.weight,
              color: t.colors.onTurnStrip,
            }}
            maxFontSizeMultiplier={1.4}
          >
            Then {thenStreet}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  column: {
    paddingHorizontal: 10,
    paddingTop: 56,
  },
  card: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  texts: {
    flex: 1,
  },
  strip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    gap: 6,
    flexDirection: 'row',
  },
});
