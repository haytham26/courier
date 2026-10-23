/**
 * The top pills: the run name and the weather (the reference's 36 pt pills
 * at radius `pill`, 15/600 body labels on the control glass). The scanner
 * screen uses the same pill shape over the camera, which is why it has its
 * own overlay colour in the ScanOverlay, not here.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassSurface } from './GlassSurface';
import { useChosen } from './context';

export interface PillProps {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  children: React.ReactNode;
  testID?: string;
}

const Pill = ({ icon, children, testID }: PillProps) => {
  const { t } = useChosen();
  return (
    <GlassSurface kind="control" style={styles.pill} testID={testID}>
      <View accessible accessibilityRole="text" style={styles.content}>
        {icon ? <Ionicons name={icon} size={16} color={t.colors.label} /> : null}
        <Text
          style={{
            fontSize: t.typography.body.size,
            lineHeight: t.typography.body.lineHeight,
            fontWeight: t.typography.body.weight,
            color: t.colors.label,
          }}
          maxFontSizeMultiplier={1.4}
        >
          {children}
        </Text>
      </View>
    </GlassSurface>
  );
};

export interface TopPillsProps {
  runName: string;
  weather?: string;
  weatherIcon?: React.ComponentProps<typeof Ionicons>['name'];
  testID?: string;
}

export const TopPills = ({ runName, weather, weatherIcon, testID }: TopPillsProps) => {
  const { t } = useChosen();
  void t;
  return (
    <View style={styles.row} pointerEvents="box-none" testID={testID}>
      <Pill testID={testID ? `${testID}-run` : undefined}>{runName}</Pill>
      {weather ? (
        <Pill icon={weatherIcon} testID={testID ? `${testID}-weather` : undefined}>
          {weather}
        </Pill>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 58,
  },
  pill: {
    borderRadius: 18,
    paddingVertical: 0,
    height: 36,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
  },
});
