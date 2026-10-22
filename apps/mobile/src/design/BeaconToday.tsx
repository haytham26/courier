/**
 * Direction B - **Beacon**. Calm and glanceable.
 *
 * One thing at a time. The number of stops left is the biggest thing on the
 * screen, the address of the next stop is the second, and the action is the
 * third. Everything else is quiet: the run of the day is three rows and a
 * line of small text, and the space between the blocks does the work that
 * borders do in a dense layout.
 *
 * The rules it obeys: the metric is 76 px and tabular, the body is never
 * smaller than 17 px, every row is 72 px or taller, the primary action is
 * 72 px, and the status is never colour-only - the row carries its word.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { directions } from '@courier/design-tokens/directions';
import { hapticFor } from '@/motion/haptics';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { run, statusLabels } from './runContent';
import { typeStyle } from './typeStyle';
import { enteringFor } from './entering';
import { VoiceBar } from './VoiceBar';

const direction = directions.beacon;

export function BeaconToday(): React.JSX.Element {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const entering = enteringFor(direction, reducedMotion);

  return (
    <View
      testID="today-screen"
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      accessibilityLabel="Today's list, Beacon direction"
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[typeStyle(direction.type.title), { color: theme.colors.textPrimary }]}>
              {run.runName}
            </Text>
            <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
              {`${run.date} · ${run.clock} · ${run.driver}`}
            </Text>
          </View>
          <Pressable
            style={styles.iconButton}
            onPress={() => hapticFor('confirm')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            accessibilityHint="Opens the settings"
            testID="today-settings"
          >
            <MaterialCommunityIcons name="cog" size={24} color={theme.colors.textPrimary} />
          </Pressable>
        </View>

        <Animated.View entering={entering} style={styles.metricBlock}>
          <Text
            style={[
              typeStyle(direction.type.metric),
              styles.metric,
              { color: theme.colors.textPrimary },
            ]}
            accessibilityRole="heading"
            accessibilityLabel={`${run.remaining} stops left`}
          >
            {String(run.remaining)}
          </Text>
          <Text style={[typeStyle(direction.type.label), { color: theme.colors.textSecondary }]}>
            Stops left
          </Text>
          <Text style={[typeStyle(direction.type.body), { color: theme.colors.textTertiary }]}>
            {`${run.delivered} delivered · ${run.failed} failed`}
          </Text>
        </Animated.View>

        <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />

        <Animated.View entering={entering} style={styles.next}>
          <Text style={[typeStyle(direction.type.label), { color: theme.colors.brandPrimary }]}>
            Next stop
          </Text>
          <Text
            style={[typeStyle(direction.type.address), { color: theme.colors.textPrimary }]}
            accessibilityRole="heading"
            accessibilityLabel={`Next stop, ${run.nextStop.address}, ${run.nextStop.suburb}`}
          >
            {run.nextStop.address}
          </Text>
          <Text style={[typeStyle(direction.type.body), { color: theme.colors.textSecondary }]}>
            {`${run.nextStop.suburb} · ${run.nextStop.eta}`}
          </Text>
          {run.nextStop.note ? (
            <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
              {run.nextStop.note}
            </Text>
          ) : null}
        </Animated.View>

        <View style={styles.list}>
          {run.stops.slice(1, 4).map((stop) => (
            <Pressable
              key={stop.id}
              onPress={() => hapticFor('confirm')}
              style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel={`Stop ${stop.sequence}, ${stop.address}, ${stop.suburb}, ${statusLabels[stop.status]}`}
              testID={`today-stop-${stop.id}`}
            >
              <View style={styles.rowText}>
                <Text
                  style={[typeStyle(direction.type.row), { color: theme.colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {stop.address}
                </Text>
                <Text
                  style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}
                >
                  {`${stop.suburb} · ${stop.eta} · ${statusLabels[stop.status]}`}
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
          ))}
        </View>
      </ScrollView>

      <View style={[styles.actions, { backgroundColor: theme.colors.background }]}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => hapticFor('confirm')}
          style={{ borderRadius: direction.radii.control }}
          accessibilityHint="Opens the next stop"
          testID="today-next-stop"
        >
          Next stop
        </Button>
      </View>

      <View style={[styles.voice, { paddingHorizontal: direction.spacing.pad }]}>
        <VoiceBar direction={direction} state={run.voice} queued={run.queuedActions} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  iconButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricBlock: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 4 },
  metric: { fontVariant: ['tabular-nums'] },
  rule: { height: 1, marginHorizontal: 24 },
  next: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8, gap: 4 },
  list: { paddingHorizontal: 24, paddingTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 72,
    paddingVertical: 8,
  },
  rowText: { flex: 1, gap: 2 },
  actions: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  voice: { paddingBottom: 12 },
});
