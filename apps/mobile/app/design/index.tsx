/**
 * The picker of the design lab.
 *
 * The founder chooses between the three directions (MASTER_EXECUTION §13.4).
 * Every card below opens a real screen of the app, built with the tokens, the
 * shared components and Reanimated 4 - not a picture of one.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import { directions, directionNames, type DirectionName } from '@courier/design-tokens/directions';

const letters: Record<DirectionName, string> = {
  roadbook: 'A',
  beacon: 'B',
  freight: 'C',
};

const labels: Record<DirectionName, string> = {
  roadbook: 'Dense and operational',
  beacon: 'Calm and glanceable',
  freight: 'Expressive and branded',
};

export default function DesignIndex() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <ScrollView
      testID="design-index"
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: theme.colors.textPrimary }]} accessibilityRole="header">
        Three directions
      </Text>
      <Text style={[styles.intro, { color: theme.colors.textSecondary }]}>
        Every direction is a real screen of the app, built with the design tokens, the shared
        components and Reanimated 4. Pick A, B or C.
      </Text>

      {directionNames.map((name) => {
        const direction = directions[name];

        return (
          <Pressable
            key={name}
            onPress={() => router.push(`/design/${name}`)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Direction ${letters[name]}, ${direction.name}, ${labels[name]}`}
            accessibilityHint="Opens the screen of this direction"
            testID={`design-${name}`}
          >
            <View style={[styles.letter, { backgroundColor: theme.colors.brandPrimary }]}>
              <Text style={[styles.letterText, { color: theme.colors.textInverse }]}>
                {letters[name]}
              </Text>
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                {direction.name}
              </Text>
              <Text style={[styles.cardLabel, { color: theme.colors.textSecondary }]}>
                {labels[name]}
              </Text>
              <Text style={[styles.cardIdea, { color: theme.colors.textTertiary }]}>
                {direction.idea}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={theme.colors.textTertiary}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          </Pressable>
        );
      })}

      <Text style={[styles.note, { color: theme.colors.textTertiary }]}>
        All three are light themes: the day is the default, and the night theme stays as the adapted
        option for driving after dark.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.02 },
  intro: { fontSize: 19, lineHeight: 26, marginBottom: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 88,
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  letter: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  letterText: { fontSize: 24, fontWeight: '800' },
  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 22, fontWeight: '600' },
  cardLabel: { fontSize: 17 },
  cardIdea: { fontSize: 17, lineHeight: 24 },
  note: { fontSize: 17, lineHeight: 24, marginTop: 8 },
});
