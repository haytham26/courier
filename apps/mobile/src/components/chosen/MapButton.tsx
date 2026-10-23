/**
 * The round map buttons: map style and recentre (the reference's 48 pt
 * circle at radius 24, on the control glass, icon 21).
 */
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassSurface } from './GlassSurface';
import { useChosen } from './context';

export interface MapButtonProps {
  name: React.ComponentProps<typeof Ionicons>['name'];
  /** The colour the icon carries its meaning in (recentre rides the accent). */
  tone?: 'label' | 'accent' | 'success' | 'warning';
  accessibilityLabel: string;
  onPress: () => void;
  testID?: string;
}

export const MapButton = ({ name, tone = 'label', accessibilityLabel, onPress, testID }: MapButtonProps) => {
  const { t } = useChosen();
  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        { borderRadius: t.radii.mapButton, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <GlassSurface kind="control" style={styles.glass}>
        <Ionicons name={name} size={21} color={t.colors[tone]} />
      </GlassSurface>
    </Pressable>
  );
};

/** The column the driving screen stacks its buttons in. */
export const MapButtonColumn = ({ children, testID }: { children: React.ReactNode; testID?: string }) => (
  <View testID={testID} style={styles.column} pointerEvents="box-none">
    {children}
  </View>
);

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
  },
  glass: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  column: {
    gap: 10,
    alignItems: 'flex-end',
  },
});
