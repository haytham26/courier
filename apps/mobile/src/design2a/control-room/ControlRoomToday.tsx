/**
 * 01 Control Room - **Today**.
 *
 * The run is an instrument panel. The screen is a fixed grid of readouts: a
 * gauge for the day, three readouts for the state of the run, one slot that
 * carries the next move, and a list of the stops that are still to come.
 * The only bright thing on the panel is the next move.
 *
 * The signature moment of the direction lives here: confirming a delivery
 * sweeps the needle of the gauge one notch with a critically damped spring
 * (`docs/design/RESEARCH-2.md` §5.3, the `settle` spring), the count rolls
 * down, and the hand feels one firm pulse.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { directions2a } from '@courier/design-tokens/directions2a';
import { hapticFor } from '@/motion/haptics';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { emptyCopy, errorCopy, run, statusLabels, type LabState } from '../content';
import { LabSkeleton, LabStateMessage } from '../kit';
import { enteringFor, springs } from '../motion';
import { stepStyle } from '../typeStyle';

const direction = directions2a.controlRoom;

/** The stops on the manifest. */
const TOTAL_STOPS = 60;

/** The gauge: twenty cells, a needle that rides on top of them. */
const GAUGE_CELLS = 20;
const GAUGE_CELL = 12;
const GAUGE_GAP = 3;

function filledCells(delivered: number): number {
  return Math.round((delivered / TOTAL_STOPS) * GAUGE_CELLS);
}

function needleX(delivered: number): number {
  return filledCells(delivered) * (GAUGE_CELL + GAUGE_GAP);
}

export function ControlRoomToday({ state = 'ready' }: { state?: LabState }): React.JSX.Element {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const entering = enteringFor(direction, reducedMotion);
  const [delivered, setDelivered] = useState(run.delivered);
  const [remaining, setRemaining] = useState(run.remaining);
  const needle = useSharedValue(needleX(run.delivered));

  const confirmDelivery = useCallback(() => {
    hapticFor('deliver');
    setDelivered((value) => value + 1);
    setRemaining((value) => Math.max(0, value - 1));
    needle.value = withSpring(needleX(delivered + 1), springs.settle);
  }, [delivered, needle]);

  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: needle.value }],
  }));

  if (state === 'loading') {
    return (
      <View testID="today-screen" style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <LabSkeleton direction={direction} rows={5} testID="today-loading" />
      </View>
    );
  }

  if (state === 'empty') {
    return (
      <View testID="today-screen" style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <LabStateMessage
          direction={direction}
          title="No stops left"
          body={emptyCopy.today}
          action="Show the next manifest"
          onAction={() => hapticFor('confirm')}
          testID="today-empty"
        />
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View testID="today-screen" style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <LabStateMessage
          direction={direction}
          title="The run did not load"
          body={errorCopy.sentence}
          action={errorCopy.action}
          onAction={() => hapticFor('confirm')}
          testID="today-error"
        />
      </View>
    );
  }

  return (
    <View
      testID="today-screen"
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      accessibilityLabel="Today's run, Control Room direction"
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[stepStyle(direction, 'label'), { color: theme.colors.textSecondary }]}>
              {`${run.date.toUpperCase()} · ${run.runName.toUpperCase()}`}
            </Text>
            <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}>
              {run.driver}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text
              style={[stepStyle(direction, 'row'), styles.tabular, { color: theme.colors.textPrimary }]}
            >
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
              <MaterialCommunityIcons name="cog" size={22} color={theme.colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />

        <Animated.View entering={entering} style={styles.gaugeBlock}>
          <View style={styles.gaugeRow}>
            <Text
              style={[
                stepStyle(direction, 'metric'),
                styles.tabular,
                { color: theme.colors.textPrimary },
              ]}
              accessibilityRole="heading"
              accessibilityLabel={`${remaining} stops left`}
            >
              {String(remaining)}
            </Text>
            <Text
              style={[stepStyle(direction, 'label'), { color: theme.colors.textSecondary }]}
            >
              STOPS LEFT
            </Text>
          </View>

          <View style={styles.gauge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {Array.from({ length: GAUGE_CELLS }, (_unused, index) => (
              <View
                key={index}
                style={[
                  styles.gaugeCell,
                  {
                    backgroundColor:
                      index < filledCells(delivered)
                        ? theme.colors.brandPrimary
                        : theme.colors.border,
                    opacity: index < filledCells(delivered) ? 1 : 0.4,
                  },
                ]}
              />
            ))}
            <Animated.View
              style={[
                styles.needle,
                { backgroundColor: theme.colors.textPrimary },
                needleStyle,
              ]}
            />
          </View>
        </Animated.View>

        <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />

        <View style={styles.readouts}>
          <View style={styles.readout}>
            <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textSecondary }]}>
              Delivered
            </Text>
            <Text
              style={[
                stepStyle(direction, 'row'),
                styles.tabular,
                { color: theme.colors.statusDelivered },
              ]}
            >
              {String(delivered)}
            </Text>
          </View>
          <View style={[styles.readout, styles.readoutDivided, { borderLeftColor: theme.colors.border }]}>
            <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textSecondary }]}>
              Failed
            </Text>
            <Text
              style={[
                stepStyle(direction, 'row'),
                styles.tabular,
                { color: theme.colors.statusFailed },
              ]}
            >
              {String(run.failed)}
            </Text>
          </View>
          <View style={[styles.readout, styles.readoutDivided, { borderLeftColor: theme.colors.border }]}>
            <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textSecondary }]}>
              To drive
            </Text>
            <Text
              style={[
                stepStyle(direction, 'row'),
                styles.tabular,
                { color: theme.colors.textPrimary },
              ]}
            >
              {`${run.kilometres} km`}
            </Text>
          </View>
        </View>

        <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />

        <Animated.View entering={entering} style={styles.nextMove}>
          <View style={styles.nextMoveHead}>
            <Text style={[stepStyle(direction, 'label'), { color: theme.colors.brandPrimary }]}>
              NEXT MOVE
            </Text>
            <Text
              style={[
                stepStyle(direction, 'caption'),
                styles.tabular,
                { color: theme.colors.textTertiary },
              ]}
            >
              {`${run.nextStop.km.toFixed(1)} km`}
            </Text>
          </View>
          <Text
            style={[stepStyle(direction, 'address'), { color: theme.colors.textPrimary }]}
            accessibilityRole="heading"
            accessibilityLabel={`Next stop, ${run.nextStop.address}, ${run.nextStop.suburb}`}
          >
            {run.nextStop.address}
          </Text>
          <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textSecondary }]}>
            {`${run.nextStop.suburb} · ${run.nextStop.eta} · ${run.nextStop.parcels} parcels`}
          </Text>
          <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}>
            {run.nextStop.note}
          </Text>
        </Animated.View>

        <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />

        <View style={styles.listHead}>
          <Text style={[stepStyle(direction, 'label'), { color: theme.colors.textSecondary }]}>
            STOPS
          </Text>
          <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}>
            {`${run.stops.length} shown`}
          </Text>
        </View>

        {run.stops.slice(0, direction.stopsVisible).map((stop) => (
          <Pressable
            key={stop.id}
            onPress={() => hapticFor('confirm')}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: theme.colors.border, opacity: pressed ? 0.6 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Stop ${stop.sequence}, ${stop.address}, ${stop.suburb}, ${statusLabels[stop.status]}`}
            testID={`today-stop-${stop.id}`}
          >
            <Text
              style={[
                stepStyle(direction, 'row'),
                styles.sequence,
                styles.tabular,
                { color: theme.colors.textTertiary },
              ]}
            >
              {String(stop.sequence)}
            </Text>
            <View style={styles.rowMain}>
              <Text
                style={[
                  stepStyle(direction, 'row'),
                  { color: theme.colors.textPrimary, fontWeight: stop.status === 'active' ? '700' : '500' },
                ]}
                numberOfLines={1}
              >
                {stop.address}
              </Text>
              <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}>
                {stop.suburb}
              </Text>
            </View>
            <Text
              style={[
                stepStyle(direction, 'row'),
                styles.tabular,
                { color: theme.colors.textSecondary },
              ]}
            >
              {stop.eta}
            </Text>
            <Text
              style={[
                stepStyle(direction, 'caption'),
                styles.status,
                {
                  color:
                    stop.status === 'active'
                      ? theme.colors.brandPrimary
                      : theme.colors.textTertiary,
                },
              ]}
            >
              {statusLabels[stop.status]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.actions}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={confirmDelivery}
          style={{ borderRadius: direction.radii.control }}
          accessibilityHint="Confirms the delivery and moves the gauge"
          testID="today-next-stop"
        >
          Next stop
        </Button>
      </View>

      <View
        style={[styles.voice, { borderTopColor: theme.colors.border }]}
        accessibilityRole="text"
        accessibilityLabel={`Copilot is listening, ${run.queuedActions} actions waiting`}
        testID="voice-bar"
      >
        <View style={[styles.lamp, { backgroundColor: theme.colors.brandPrimary }]} />
        <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textSecondary }]}>
          Listening
        </Text>
        <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}>
          {`${run.queuedActions} waiting`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: { gap: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconButton: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  rule: { height: 1, marginHorizontal: 16 },
  tabular: { fontVariant: ['tabular-nums'] },
  gaugeBlock: { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  gaugeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  gauge: { flexDirection: 'row', alignItems: 'center', height: 24 },
  gaugeCell: { width: GAUGE_CELL, height: 12, marginRight: GAUGE_GAP },
  needle: { position: 'absolute', left: 0, width: 2, height: 24 },
  readouts: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12 },
  readout: { flex: 1, gap: 2 },
  readoutDivided: { borderLeftWidth: 1, paddingLeft: 12 },
  nextMove: { paddingHorizontal: 16, paddingVertical: 12, gap: 2 },
  nextMoveHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  sequence: { width: 28 },
  rowMain: { flex: 1, gap: 1 },
  status: { width: 68, textAlign: 'right' },
  actions: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  voice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 64,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  lamp: { width: 8, height: 8 },
});
