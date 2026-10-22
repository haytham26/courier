/**
 * The picker of the second round of the design lab.
 *
 * The three directions of this team, with the one line the founder reads on
 * the picker and the theme of each. The other seven directions of the round
 * are built by the other teams and land in their own folders.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/providers/ThemeProvider';
import { labDirections, type LabDirectionName } from '@courier/design-tokens/lab-directions';

const ORDER: LabDirectionName[] = ['voiceRibbon', 'xrayParcel', 'scanline'];

export default function Design2Index() {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <View
      testID="design2-index"
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          The round of ten
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Three directions of this round, four screens each, in the day and at night.
        </Text>

        {ORDER.map((name) => {
          const direction = labDirections[name];
          return (
            <Pressable
              key={name}
              onPress={() => router.push(`/design2/${direction.number}-${name}`)}
              style={({ pressed }) => [
                styles.card,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Direction ${direction.number}, ${name}, ${direction.idea}`}
              testID={`design2-${name}`}
            >
              <Text style={[styles.number, { color: theme.colors.textTertiary }]}>
                {direction.number}
              </Text>
              <View style={styles.cardBody}>
                <Text style={[styles.name, { color: theme.colors.textPrimary }]}>
                  {name.replace(/([A-Z])/g, ' $1')}
                </Text>
                <Text style={[styles.idea, { color: theme.colors.textSecondary }]}>
                  {direction.idea}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 34, fontWeight: '700' },
  subtitle: { fontSize: 19, marginBottom: 8 },
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 96,
  },
  number: { fontSize: 17, fontWeight: '600' },
  cardBody: { flex: 1, gap: 4 },
  name: { fontSize: 22, fontWeight: '600' },
  idea: { fontSize: 19 },
});
