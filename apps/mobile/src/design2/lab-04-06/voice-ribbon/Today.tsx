/**
 * Direction 04 - **Voice Ribbon**. Today.
 *
 * The voice is the interface: the content is anchored to the top-left and
 * the ribbon owns the bottom of the screen. The number of stops left is the
 * first thing the courier reads, the address of the next stop is the second,
 * and the one action is a thumb away above the ribbon.
 *
 * The rules it obeys: the metric is 64 px and tabular, the body is never
 * smaller than 17 px, every row is 64 px or taller, the primary action is
 * 72 px, and the status is never colour-only - every row carries its word.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { labDirections } from '@courier/design-tokens/lab-directions';
import { hapticFor } from '@/motion/haptics';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { VoiceRibbon, useRibbonLevel } from '../VoiceRibbon';
import { LabMessage, LabOfflineChip, LabSkeleton } from '../LabStates';
import { enteringFor, typeStyle, type LabScreenState } from '../labTheme';
import {
  distanceToNextStop,
  offlineChip,
  emptyMessage,
  errorRecovery,
  run,
  statusLabels,
  voiceConditionWords,
} from '../labContent';

const direction = labDirections.voiceRibbon;

export function VoiceRibbonToday({
  state = 'ready',
}: {
  state?: LabScreenState;
}): React.JSX.Element {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const entering = enteringFor(direction, reducedMotion);
  const level = useRibbonLevel();
  const rule = theme.colors.border;

  if (state === 'loading') {
    return (
      <View
        testID="today-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
        accessibilityLabel="Today's list, Voice Ribbon direction"
      >
        <LabSkeleton direction={direction} lines={5} />
        <View style={styles.spacer} />
        <VoiceRibbon
          direction={direction}
          state={voiceConditionWords.listening}
          listening
          queued={run.queuedActions}
          level={level}
        />
      </View>
    );
  }

  if (state === 'empty') {
    return (
      <View
        testID="today-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
        accessibilityLabel="Today's list, Voice Ribbon direction"
      >
        <LabMessage
          direction={direction}
          title="No run yet"
          message={emptyMessage}
          testID="today-empty"
        />
        <View style={styles.spacer} />
        <VoiceRibbon
          direction={direction}
          state={voiceConditionWords.idle}
          listening={false}
          queued={0}
          level={level}
        />
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View
        testID="today-screen"
        style={[styles.screen, { backgroundColor: theme.colors.background }]}
        accessibilityLabel="Today's list, Voice Ribbon direction"
      >
        <LabMessage
          direction={direction}
          title="The run did not load"
          message="The manifest could not be read. Check the connection and try again."
          action={errorRecovery}
          onAction={() => hapticFor('confirm')}
          testID="today-error"
        />
        <View style={styles.spacer} />
        <VoiceRibbon
          direction={direction}
          state={voiceConditionWords.error}
          listening={false}
          queued={0}
          level={level}
        />
      </View>
    );
  }

  const offline = state === 'offline' || state === 'partialSync';

  return (
    <View
      testID="today-screen"
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      accessibilityLabel="Today's list, Voice Ribbon direction"
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text
            style={[typeStyle(direction.type.title), { color: theme.colors.textPrimary }]}
            accessibilityRole="header"
          >
            {run.runName}
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

        <View style={[styles.rule, { backgroundColor: theme.colors.brandPrimary }]} />

        {offline ? (
          <View style={styles.chipRow}>
            <LabOfflineChip
              direction={direction}
              label={
                state === 'offline' ? offlineChip.label : offlineChip.partialSyncLabel
              }
              queued={state === 'offline' ? offlineChip.queued : 2}
              onRetry={state === 'partialSync' ? () => hapticFor('confirm') : undefined}
            />
          </View>
        ) : null}

        <View style={styles.metricRow}>
          <View style={styles.metricBlock}>
            <Text
              style={[
                typeStyle(direction.type.metric),
                styles.metric,
                { color: theme.colors.brandPrimary },
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

          <View style={[styles.stats, { borderLeftColor: rule }]}>
            <View style={styles.stat}>
              <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textSecondary }]}>
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
            <View style={[styles.stat, { borderTopColor: rule }]}>
              <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textSecondary }]}>
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
            <View style={[styles.stat, { borderTopColor: rule }]}>
              <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textSecondary }]}>
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
          </View>
        </View>

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
            {`${run.nextStop.suburb} · ${run.nextStop.eta} · ${distanceToNextStop} km · ${run.nextStop.parcels} parcels`}
          </Text>
          {run.nextStop.note ? (
            <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
              {run.nextStop.note}
            </Text>
          ) : null}
        </Animated.View>

        <View style={[styles.rule, { backgroundColor: rule }]} />

        {run.stops.slice(0, state === 'longList' ? 8 : 3).map((stop) => (
          <Pressable
            key={stop.id}
            onPress={() => hapticFor('confirm')}
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
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
                numberOfLines={1}
              >
                {`${stop.suburb} · ${statusLabels[stop.status]}`}
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
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.actions}>
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

      <VoiceRibbon
        direction={direction}
        state={voiceConditionWords.listening}
        listening
        queued={run.queuedActions}
        level={level}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 24 },
  spacer: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  iconButton: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  rule: { height: 1, marginHorizontal: 20 },
  chipRow: { paddingHorizontal: 20, paddingTop: 12 },
  metricRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16 },
  metricBlock: { flex: 1, gap: 2 },
  metric: { fontVariant: ['tabular-nums'] },
  stats: { width: 148, borderLeftWidth: 1, paddingLeft: 16 },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statValue: { fontVariant: ['tabular-nums'] },
  next: { paddingHorizontal: 20, paddingBottom: 16, gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 20,
  },
  sequence: { width: 28, fontVariant: ['tabular-nums'] },
  rowMain: { flex: 1, gap: 1 },
  rowActive: { fontWeight: '700' },
  eta: { fontVariant: ['tabular-nums'] },
  actions: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
});
