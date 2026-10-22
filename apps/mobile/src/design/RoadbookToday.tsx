/**
 * Direction A - **Roadbook**. Dense and operational.
 *
 * The screen is the courier's paper run sheet: warm paper, black ink, one
 * highway-amber accent and hairline rules instead of cards. The number, the
 * next stop and eight rows of the run fit on one phone screen without a
 * scroll, which is the whole point of a dense direction: the courier reads
 * the state of the run, not a story about it.
 *
 * The rules it obeys: the metric is 48 px and tabular, the body is never
 * smaller than 17 px, every row is 56 px or taller, the primary action is
 * 72 px, and the status is never colour-only - every row carries its word.
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

const direction = directions.roadbook;

export function RoadbookToday(): React.JSX.Element {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const entering = enteringFor(direction, reducedMotion);
  const rule = theme.colors.border;

  return (
    <View
      testID="today-screen"
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      accessibilityLabel="Today's list, Roadbook direction"
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text
              style={[typeStyle(direction.type.label), { color: theme.colors.textSecondary }]}
              accessibilityRole="header"
            >
              {`${run.date} · ${run.runName}`}
            </Text>
            <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
              {run.driver}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={[typeStyle(direction.type.row), { color: theme.colors.textPrimary }]}>
              {run.clock}
            </Text>
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
        </View>

        <View style={[styles.rule, { backgroundColor: rule }]} />

        <View style={styles.ledger}>
          <View style={styles.ledgerMain}>
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
          </View>

          <View style={[styles.ledgerStats, { borderLeftColor: rule }]}>
            <View style={styles.statRow}>
              <Text
                style={[typeStyle(direction.type.caption), { color: theme.colors.textSecondary }]}
              >
                Delivered
              </Text>
              <Text
                style={[
                  typeStyle(direction.type.row),
                  styles.statValue,
                  { color: theme.colors.statusDelivered },
                ]}
              >
                {String(run.delivered)}
              </Text>
            </View>
            <View style={[styles.statRow, { borderTopColor: rule }]}>
              <Text
                style={[typeStyle(direction.type.caption), { color: theme.colors.textSecondary }]}
              >
                Failed
              </Text>
              <Text
                style={[
                  typeStyle(direction.type.row),
                  styles.statValue,
                  { color: theme.colors.statusFailed },
                ]}
              >
                {String(run.failed)}
              </Text>
            </View>
            <View style={[styles.statRow, { borderTopColor: rule }]}>
              <Text
                style={[typeStyle(direction.type.caption), { color: theme.colors.textSecondary }]}
              >
                To drive
              </Text>
              <Text
                style={[
                  typeStyle(direction.type.row),
                  styles.statValue,
                  { color: theme.colors.textPrimary },
                ]}
              >
                {`${run.kilometres} km`}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.rule, { backgroundColor: rule }]} />

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
            {`${run.nextStop.suburb} · ${run.nextStop.eta} · ${run.nextStop.parcels} parcels`}
          </Text>
          {run.nextStop.note ? (
            <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
              {run.nextStop.note}
            </Text>
          ) : null}
        </Animated.View>

        <View style={[styles.rule, { backgroundColor: rule }]} />

        <View style={styles.listHead}>
          <Text style={[typeStyle(direction.type.label), { color: theme.colors.textSecondary }]}>
            Stops
          </Text>
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
            {`${run.stops.length} shown`}
          </Text>
        </View>

        {run.stops.map((stop) => (
          <Pressable
            key={stop.id}
            onPress={() => hapticFor('confirm')}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: rule, opacity: pressed ? 0.6 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Stop ${stop.sequence}, ${stop.address}, ${stop.suburb}, ${statusLabels[stop.status]}`}
            testID={`today-stop-${stop.id}`}
          >
            <Text
              style={[
                typeStyle(direction.type.row),
                styles.sequence,
                { color: theme.colors.textTertiary },
              ]}
            >
              {String(stop.sequence)}
            </Text>
            <View style={styles.rowMain}>
              <Text
                style={[
                  typeStyle(direction.type.row),
                  { color: theme.colors.textPrimary },
                  stop.status === 'active' ? styles.rowActive : null,
                ]}
                numberOfLines={1}
              >
                {stop.address}
              </Text>
              <Text
                style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}
              >
                {stop.suburb}
              </Text>
            </View>
            <Text
              style={[
                typeStyle(direction.type.row),
                styles.eta,
                { color: theme.colors.textSecondary },
              ]}
            >
              {stop.eta}
            </Text>
            <Text
              style={[
                typeStyle(direction.type.caption),
                styles.status,
                {
                  color:
                    stop.status === 'active'
                      ? theme.colors.statusActive
                      : stop.status === 'delivered'
                        ? theme.colors.statusDelivered
                        : theme.colors.textTertiary,
                },
              ]}
            >
              {statusLabels[stop.status]}
            </Text>
          </Pressable>
        ))}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerLeft: { gap: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rule: { height: 1, marginHorizontal: 16 },
  ledger: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12 },
  ledgerMain: { flex: 1, justifyContent: 'center' },
  metric: { fontVariant: ['tabular-nums'] },
  ledgerStats: { width: 132, borderLeftWidth: 1, paddingLeft: 16 },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statValue: { fontVariant: ['tabular-nums'] },
  next: { paddingHorizontal: 16, paddingVertical: 12, gap: 2 },
  listHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  sequence: { width: 28, fontVariant: ['tabular-nums'] },
  rowMain: { flex: 1, gap: 1 },
  rowActive: { fontWeight: '700' },
  eta: { fontVariant: ['tabular-nums'] },
  status: { width: 72, textAlign: 'right' },
  actions: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  voice: { paddingBottom: 8 },
});
