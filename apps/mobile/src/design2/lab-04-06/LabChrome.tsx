/**
 * The chrome of the design lab, for the directions of the 04-06 team.
 *
 * The lab route is not a product screen: it is the harness the founder looks
 * at. The chrome says which direction is on the screen, which palette it is
 * drawn in, and how to get back - and it never wears the palette of the
 * direction, so it can never pass for part of the product.
 *
 * The two switches of the lab are the day and the night palette and the
 * state of the screen. Both are props of the route (`?theme=night` and
 * `?state=offline`), so a screenshot is reproducible from its URL and a
 * Maestro flow can reach every state.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import type { LabDirection } from '@courier/design-tokens/lab-directions';
import type { LabScreenState, LabVariant } from './labTheme';

interface LabChromeProps {
  direction: LabDirection;
  variant: LabVariant;
  state: LabScreenState;
  onVariant: (variant: LabVariant) => void;
  onState: (state: LabScreenState) => void;
  onBack: () => void;
}

/** The states the founder can look at, in the order of the contract. */
const STATES: LabScreenState[] = [
  'ready',
  'loading',
  'empty',
  'error',
  'offline',
  'partialSync',
  'permissionDenied',
  'longList',
];

export function LabChrome({ direction, variant, onBack }: LabChromeProps): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border },
      ]}
    >
      <Pressable
        onPress={onBack}
        style={styles.back}
        accessibilityRole="button"
        accessibilityLabel="Back to the directions"
        accessibilityHint="Opens the list of the directions of the round"
        testID="design-back"
      >
        <MaterialCommunityIcons name="arrow-left" size={20} color={theme.colors.textPrimary} />
        <Text style={[styles.backText, { color: theme.colors.textPrimary }]}>Directions</Text>
      </Pressable>

      <Text
        style={[styles.name, { color: theme.colors.textSecondary }]}
        accessibilityLabel={`Direction ${direction.number}, ${direction.name}, ${variant}`}
      >
        {`${direction.number} · ${direction.name} · ${variant}`}
      </Text>
    </View>
  );
}

/**
 * The switches of the lab: the palette and the state of the screen.
 *
 * They live under the chrome, so the founder can look at every state of
 * every screen without leaving the direction.
 */
export function LabSwitches({
  variant,
  state,
  onVariant,
  onState,
}: {
  variant: LabVariant;
  state: LabScreenState;
  onVariant: (variant: LabVariant) => void;
  onState: (state: LabScreenState) => void;
}): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.switches,
        { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {(['day', 'night'] as LabVariant[]).map((option) => (
          <Pressable
            key={option}
            onPress={() => onVariant(option)}
            style={[
              styles.chip,
              {
                borderColor: variant === option ? theme.colors.brandPrimary : theme.colors.border,
                backgroundColor: variant === option ? theme.colors.surface : 'transparent',
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: variant === option }}
            accessibilityLabel={`${option} palette`}
            testID={`design-variant-${option}`}
          >
            <Text style={[styles.chipText, { color: theme.colors.textPrimary }]}>{option}</Text>
          </Pressable>
        ))}
        {STATES.map((option) => (
          <Pressable
            key={option}
            onPress={() => onState(option)}
            style={[
              styles.chip,
              {
                borderColor: state === option ? theme.colors.brandPrimary : theme.colors.border,
                backgroundColor: state === option ? theme.colors.surface : 'transparent',
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: state === option }}
            accessibilityLabel={`${option} state`}
            testID={`design-state-${option}`}
          >
            <Text style={[styles.chipText, { color: theme.colors.textSecondary }]}>{option}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
  },
  backText: { fontSize: 17, fontWeight: '500' },
  name: { fontSize: 17, fontWeight: '500' },
  switches: { borderBottomWidth: 1 },
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 999,
  },
  chipText: { fontSize: 17, fontWeight: '500' },
});
