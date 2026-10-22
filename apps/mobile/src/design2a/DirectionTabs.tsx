/**
 * The navigation of a direction in the lab.
 *
 * The four screens of a direction are the four tabs of its route
 * (`docs/design/SPEC.md` §3). The bar sits at the bottom of the screen, in
 * the thumb's reach, and nothing sits in the top fifth of the driving screen
 * (`docs/design/REVIEW.md` REVIEW-C4 and C5).
 *
 * The bar is drawn in the language of the direction: a row of squares for
 * Control Room, a ruled margin for Topo and a set of words for Address
 * First.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import type { Direction2a } from '@courier/design-tokens/directions2a';
import { stepStyle } from './typeStyle';

/** The four screens of a direction, in the order of the spec. */
export const SCREENS = [
  { key: 'today', label: 'Today' },
  { key: 'driving', label: 'Driving' },
  { key: 'copilot', label: 'Copilot' },
  { key: 'scanner', label: 'Scanner' },
] as const;

export type ScreenKey = (typeof SCREENS)[number]['key'];

interface DirectionTabsProps {
  direction: Direction2a;
  /** The folder of the direction, the route of the lab. */
  folder: string;
  /** The screen that is on the phone. */
  current: ScreenKey;
  /** Whether the night palette of the direction is on. */
  night: boolean;
  /** Turns the night palette on and off. */
  onToggleNight: () => void;
}

export function DirectionTabs({
  direction,
  folder,
  current,
  night,
  onToggleNight,
}: DirectionTabsProps): React.JSX.Element {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <View
      style={[styles.bar, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background }]}
      accessibilityRole="tablist"
    >
      <Pressable
        style={styles.end}
        onPress={() => router.push('/design2')}
        accessibilityRole="button"
        accessibilityLabel="Back to the directions"
        testID="design-back"
      >
        <MaterialCommunityIcons name="arrow-left" size={20} color={theme.colors.textSecondary} />
      </Pressable>

      {SCREENS.map((screen) => {
        const selected = screen.key === current;
        return (
          <Pressable
            key={screen.key}
            onPress={() => router.push(`/design2/${folder}/${screen.key}`)}
            style={({ pressed }) => [
              styles.tab,
              { opacity: pressed ? 0.6 : 1 },
              direction.name === 'controlRoom' ? styles.tabSquare : null,
              direction.name === 'topo' ? styles.tabRuled : null,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={screen.label}
            testID={`design-tab-${screen.key}`}
          >
            <Text
              style={[
                stepStyle(direction, 'caption'),
                { color: selected ? theme.colors.textPrimary : theme.colors.textTertiary },
              ]}
              numberOfLines={1}
            >
              {screen.label}
            </Text>
            {selected ? (
              <View
                style={[
                  styles.marker,
                  direction.name === 'controlRoom'
                    ? { backgroundColor: theme.colors.brandPrimary, width: 8, height: 8 }
                    : null,
                  direction.name === 'topo'
                    ? { backgroundColor: theme.colors.textPrimary, height: 1, width: 24 }
                    : null,
                  direction.name === 'addressFirst'
                    ? { backgroundColor: theme.colors.brandPrimary, height: 2, width: 24 }
                    : null,
                ]}
              />
            ) : null}
          </Pressable>
        );
      })}

      <Pressable
        style={styles.end}
        onPress={onToggleNight}
        accessibilityRole="button"
        accessibilityLabel={night ? 'Use the day palette' : 'Use the night palette'}
        testID="design-theme-toggle"
      >
        <MaterialCommunityIcons
          name={night ? 'weather-sunny' : 'weather-night'}
          size={20}
          color={theme.colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    borderTopWidth: 1,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabSquare: { borderRadius: 2 },
  tabRuled: { borderTopWidth: 1, borderTopColor: 'transparent' },
  end: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  marker: { position: 'absolute', bottom: 6 },
});
