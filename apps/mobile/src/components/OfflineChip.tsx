/**
 * The chip that says the phone has no network, or that actions are waiting.
 *
 * It is a chip and never a dialog: a courier mid-run cannot stop to answer
 * a pop-up (`docs/design/SYSTEM.md` §4).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, radius, space, target } from '@/styles/tokens';

interface OfflineChipProps {
  /** How many actions are still waiting for the network. */
  pending: number;
  /** Whether the phone has a network right now. */
  online: boolean;
}

export function OfflineChip({ pending, online }: OfflineChipProps) {
  const { theme } = useTheme();

  if (online && pending === 0) {
    return null;
  }

  const label = !online
    ? pending > 0
      ? `Offline · ${pending} actions waiting`
      : 'Offline'
    : `${pending} actions waiting`;

  const tone = online ? theme.colors.warning : theme.colors.warning;
  const icon = online ? 'sync' : 'cloud-off';

  return (
    <View
      testID="offline-chip"
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[
        styles.chip,
        { borderColor: tone, backgroundColor: theme.colors.surface, minHeight: target.min },
      ]}
    >
      <MaterialIcons name={icon} size={18} color={tone} />
      <Text style={[styles.label, { color: theme.colors.textPrimary, fontSize: fontSize.base }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '600',
  },
});
