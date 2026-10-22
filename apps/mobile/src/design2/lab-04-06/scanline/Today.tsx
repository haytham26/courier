/**
 * Direction 06 - **Scanline**. Today.
 *
 * The scanner sets the language of the screen: every block is a ruled band
 * with a rule on the left, a key on the left and a value on the right, and
 * the data is monospaced so a scanned address and a typed address look like
 * they came out of the same machine.
 *
 * The rules it obeys: the metric is 56 px and tabular, the body is never
 * smaller than 17 px, every row is 56 px or taller, the primary action is
 * 72 px, and the status is never colour-only.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';
import { labDirections } from '@courier/design-tokens/lab-directions';
import { hapticFor } from '@/motion/haptics';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { LabMessage, LabOfflineChip, LabSkeleton } from '../LabStates';
import { Band } from './Band';
import { enteringFor, typeStyle, type LabScreenState } from '../labTheme';
import {
  distanceToNextStop,
  emptyMessage,
  errorRecovery,
  offlineChip,
  run,
  statusLabels,
  voiceConditionWords,
} from '../labContent';

const direction = labDirections.scanline;

/**
 * One ruled band: a rule on the left, a key and a value.
 *
 * The band is the whole grammar of the direction, so it is one component
 * and every block of every screen is made of it.
 */
export function ScanlineToday({
  state = 'ready',
}: {
  state?: LabScreenState;
}): React.JSX.Element {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const entering = enteringFor(direction, reducedMotion);
  const rule = theme.colors.border;

  if (state === 'loading') {
    return (
      <View
        testID="today-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
        accessibilityLabel="Today's list, Scanline direction"
      >
        <LabSkeleton direction={direction} lines={6} />
      </View>
    );
  }

  if (state === 'empty') {
    return (
      <View
        testID="today-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
        accessibilityLabel="Today's list, Scanline direction"
      >
        <LabMessage
          direction={direction}
          title="No run yet"
          message={emptyMessage}
          testID="today-empty"
        />
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View
        testID="today-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
        accessibilityLabel="Today's list, Scanline direction"
      >
        <LabMessage
          direction={direction}
          title="The run did not load"
          message="The manifest could not be read. Check the connection and try again."
          action={errorRecovery}
          onAction={() => hapticFor('confirm')}
          testID="today-error"
        />
      </View>
    );
  }

  const offline = state === 'offline' || state === 'partialSync';

  return (
    <View
      testID="today-screen"
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      accessibilityLabel="Today's list, Scanline direction"
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text
            style={[typeStyle(direction.type.title), { color: theme.colors.textPrimary }]}
            accessibilityRole="header"
          >
            {run.runName}
          </Text>
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
            {`${run.date} ${run.clock} · ${run.driver}`}
          </Text>
        </View>

        {offline ? (
          <View style={styles.chipRow}>
            <LabOfflineChip
              direction={direction}
              label={state === 'offline' ? offlineChip.label : offlineChip.partialSyncLabel}
              queued={state === 'offline' ? offlineChip.queued : 2}
              onRetry={state === 'partialSync' ? () => hapticFor('confirm') : undefined}
            />
          </View>
        ) : null}

        <View style={styles.metricRow}>
          <View style={[styles.metricRule, { backgroundColor: theme.colors.brandPrimary }]} />
          <View style={styles.metricBody}>
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
            <Text style={[typeStyle(direction.type.label), { color: theme.colors.textTertiary }]}>
              STOPS LEFT
            </Text>
          </View>
        </View>

        <Animated.View entering={entering} style={styles.next}>
          <Band label="NEXT STOP" value={run.nextStop.address} rule={theme.colors.brandPrimary}>
            <Text
              style={[typeStyle(direction.type.address), { color: theme.colors.textPrimary }]}
              accessibilityRole="heading"
              accessibilityLabel={`Next stop, ${run.nextStop.address}, ${run.nextStop.suburb}`}
            >
              {run.nextStop.address}
            </Text>
            <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textSecondary }]}>
              {`${run.nextStop.suburb} · ${run.nextStop.eta} · ${distanceToNextStop} km · ${run.nextStop.parcels} parcels`}
            </Text>
          </Band>
        </Animated.View>

        <Band label="DELIVERED" value={String(run.delivered)} rule={rule} tone="accent" />
        <Band label="TO DRIVE" value={`${run.kilometres} km`} rule={rule} />
        <Band label="FAILED" value={String(run.failed)} rule={rule} tone="muted" />
        {run.nextStop.note ? (
          <Band label="DOOR NOTE" value={run.nextStop.note} rule={rule} />
        ) : null}

        <View style={[styles.sectionRule, { backgroundColor: rule }]} />

        {run.stops.slice(0, state === 'longList' ? 7 : 4).map((stop) => (
          <Pressable
            key={stop.id}
            onPress={() => hapticFor('confirm')}
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel={`Stop ${stop.sequence}, ${stop.address}, ${stop.suburb}, ${statusLabels[stop.status]}`}
            testID={`today-stop-${stop.id}`}
          >
            <Text
              style={[typeStyle(direction.type.caption), styles.sequence, { color: theme.colors.textTertiary }]}
            >
              {String(stop.sequence).padStart(2, '0')}
            </Text>
            <Text
              style={[typeStyle(direction.type.row), styles.rowAddress, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
            >
              {stop.address}
            </Text>
            <Text
              style={[typeStyle(direction.type.caption), styles.rowEta, { color: theme.colors.textSecondary }]}
            >
              {stop.eta}
            </Text>
            <Text
              style={[typeStyle(direction.type.caption), styles.rowStatus, { color: theme.colors.textTertiary }]}
            >
              {statusLabels[stop.status]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          onPress={() => hapticFor('confirm')}
          style={[styles.primary, { backgroundColor: theme.colors.brandPrimary }]}
          accessibilityRole="button"
          accessibilityLabel="Next stop"
          accessibilityHint="Opens the next stop"
          testID="today-next-stop"
        >
          <Text style={[typeStyle(direction.type.address), { color: theme.colors.textInverse }]}>
            Next stop
          </Text>
        </Pressable>
        <Text
          style={[styles.voice, typeStyle(direction.type.caption), { color: theme.colors.textSecondary }]}
          accessibilityRole="text"
          accessibilityLabel={`Copilot is ${voiceConditionWords.listening.toLowerCase()}`}
          testID="voice-bar"
        >
          {`> ${voiceConditionWords.listening.toUpperCase()} · ${run.queuedActions} WAITING`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 24 },
  head: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  chipRow: { paddingHorizontal: 16, paddingBottom: 8 },
  metricRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8 },
  metricRule: { width: 4 },
  metricBody: { flex: 1, paddingLeft: 12, gap: 2 },
  metric: { fontVariant: ['tabular-nums'] },
  next: { paddingHorizontal: 16, paddingTop: 8 },
  sectionRule: { height: 1, marginHorizontal: 16, marginVertical: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  sequence: { width: 24, fontVariant: ['tabular-nums'] },
  rowAddress: { flex: 1 },
  rowEta: { width: 64, fontVariant: ['tabular-nums'] },
  rowStatus: { width: 72, textAlign: 'right' },
  actions: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 8 },
  primary: {
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voice: { textAlign: 'left' },
});
