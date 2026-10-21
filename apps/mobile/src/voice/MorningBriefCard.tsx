/**
 * The morning brief.
 *
 * The card the courier sees when the day starts: how many stops, how many
 * addresses are new, and what the weather is doing. The wording of the spoken
 * line is the wording of the spec ("214 stops, 3 new addresses, rain after
 * 2"), and the card shows the same three facts in the same order.
 *
 * The card is a card, not a control: the only control is the button that
 * asks the voice to say it out loud.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useTheme } from '@/providers/ThemeProvider';

export interface MorningBriefProps {
  /** How many stops the day has. */
  stops: number;
  /** How many of the addresses are new to the courier. */
  newAddresses: number;
  /** The weather, in the words the courier would use. */
  weather?: string | null;
  /** The line the voice says, when the service has already said it. */
  spoken?: string | null;
  /** Asks the voice to say the brief out loud. */
  onSpeak?: () => void;
}

/**
 * The brief as the voice says it.
 *
 * The parts the day does not have are left out rather than said as a zero,
 * which is the rule of the spoken line (MASTER_EXECUTION §12).
 */
export function morningBriefText(
  stops: number,
  newAddresses: number,
  weather?: string | null,
): string {
  const parts = [`${stops} stops`];
  if (newAddresses > 0) {
    parts.push(`${newAddresses} new addresses`);
  }
  if (weather !== undefined && weather !== null && weather.trim().length > 0) {
    parts.push(weather.trim());
  }
  return parts.join(', ');
}

/** The card of the morning brief. */
export function MorningBriefCard({
  stops,
  newAddresses,
  weather,
  spoken,
  onSpeak,
}: MorningBriefProps): React.ReactElement {
  const { theme } = useTheme();
  const line = spoken ?? morningBriefText(stops, newAddresses, weather);

  return (
    <Card
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      testID="morning-brief-card"
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Today</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {line}
          </Text>
        </View>
        <MaterialCommunityIcons
          name="weather-sunny"
          size={28}
          color={theme.colors.textSecondary}
          accessibilityLabel="The weather"
        />
      </View>

      <View style={styles.facts}>
        <View style={styles.fact}>
          <Text style={[styles.factValue, { color: theme.colors.textPrimary }]}>{stops}</Text>
          <Text style={[styles.factLabel, { color: theme.colors.textSecondary }]}>stops</Text>
        </View>
        <Badge variant={newAddresses > 0 ? 'info' : 'default'} size="sm">
          {newAddresses > 0 ? `${newAddresses} new addresses` : 'No new addresses'}
        </Badge>
        {weather !== undefined && weather !== null && weather.trim().length > 0 ? (
          <Badge variant="default" size="sm">
            {weather.trim()}
          </Badge>
        ) : null}
      </View>

      {onSpeak !== undefined ? (
        <Button
          variant="secondary"
          onPress={onSpeak}
          style={styles.button}
          testID="morning-brief-speak"
        >
          <MaterialCommunityIcons name="volume-high" size={20} color={theme.colors.textPrimary} />
          {' Tell me more'}
        </Button>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 4 },
  subtitle: { fontSize: 19 },
  facts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  fact: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  factValue: { fontSize: 28, fontWeight: '800' },
  factLabel: { fontSize: 17 },
  button: { marginTop: 16 },
});
