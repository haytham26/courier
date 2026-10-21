/**
 * The chrome of the design lab.
 *
 * The lab route is not a product screen: it is the harness the founder looks
 * at. The chrome says which direction is on the screen and how to get back,
 * and it deliberately keeps the app's own theme so it never passes for part
 * of the product.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';

interface DirectionChromeProps {
  /** "A", "B" or "C". */
  letter: string;
  name: string;
  density: string;
  onBack: () => void;
}

export function DirectionChrome({
  letter,
  name,
  density,
  onBack,
}: DirectionChromeProps): React.JSX.Element {
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
        accessibilityHint="Opens the list of the three directions"
        testID="design-back"
      >
        <MaterialCommunityIcons name="arrow-left" size={20} color={theme.colors.textPrimary} />
        <Text style={[styles.backText, { color: theme.colors.textPrimary }]}>Directions</Text>
      </Pressable>

      <Text
        style={[styles.name, { color: theme.colors.textSecondary }]}
        accessibilityLabel={`Direction ${letter}, ${name}, ${density}`}
      >
        {`${letter} · ${name} · ${density}`}
      </Text>
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
});
