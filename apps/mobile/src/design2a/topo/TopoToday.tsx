/**
 * 02 Topo - **Today**.
 *
 * The Canterbury landscape is the identity. The screen is a survey chart: the
 * map carries the run, the interface is the margin around it, and every
 * measurement is written the way a survey writes it.
 *
 * The signature moment of the direction is the contour: confirming a
 * delivery crosses one notch of the elevation profile along the top of the
 * chart, in a 150 ms draw, so the day is read as a line crossed rather than a
 * row ticked.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from '@/components/Button';
import { directions2a } from '@courier/design-tokens/directions2a';
import { hapticFor } from '@/motion/haptics';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { emptyCopy, errorCopy, run, statusLabels, type LabState } from '../content';
import { LabSkeleton, LabStateMessage } from '../kit';
import { enteringFor } from '../motion';
import { stepStyle } from '../typeStyle';

const direction = directions2a.topo;

/** The notches of the elevation profile: the shape of the day. */
const PROFILE = [3, 5, 4, 6, 5, 3, 4, 2];

export function TopoToday({ state = 'ready' }: { state?: LabState }): React.JSX.Element {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const entering = enteringFor(direction, reducedMotion);
  const [crossed, setCrossed] = useState(0);
  const [remaining, setRemaining] = useState(run.remaining);
  const draw = useSharedValue(1);

  const confirmDelivery = useCallback(() => {
    hapticFor('deliver');
    setCrossed((value) => value + 1);
    setRemaining((value) => Math.max(0, value - 1));
    // The chart is drawn, not sprung: a 150 ms timing curve, no bounce.
    draw.value = withTiming(0.94, { duration: reducedMotion ? 0 : 150 });
  }, [draw, reducedMotion]);

  const profileStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: draw.value }],
  }));

  if (state === 'loading') {
    return (
      <View testID="today-screen" style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <LabSkeleton direction={direction} rows={4} testID="today-loading" />
      </View>
    );
  }

  if (state === 'empty') {
    return (
      <View testID="today-screen" style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <LabStateMessage
          direction={direction}
          title="No stops on the sheet"
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
          title="The sheet did not load"
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
      accessibilityLabel="Today's run, Topo direction"
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[stepStyle(direction, 'label'), { color: theme.colors.textSecondary }]}>
            {`${run.runName.toUpperCase()} · ${run.date.toUpperCase()}`}
          </Text>
          <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}>
            {`${run.driver} · ${run.clock}`}
          </Text>
        </View>
        <View style={styles.north}>
          <MaterialCommunityIcons name="navigation" size={18} color={theme.colors.textSecondary} />
          <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textSecondary }]}>N</Text>
        </View>
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

      <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />

      <Animated.View entering={entering} style={styles.profileBlock}>
        <View style={styles.profileHead}>
          <Text style={[stepStyle(direction, 'label'), { color: theme.colors.textSecondary }]}>
            PROFILE OF THE RUN
          </Text>
          <View style={styles.metricBlock}>
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
            <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}>
              stops to go
            </Text>
          </View>
        </View>
        <Animated.View style={[styles.profile, profileStyle]}>
          {PROFILE.map((height, index) => (
            <View
              key={index}
              style={[
                styles.profileBar,
                {
                  height: height * 6,
                  backgroundColor:
                    index < crossed ? theme.colors.border : theme.colors.brandPrimary,
                },
              ]}
            />
          ))}
        </Animated.View>
      </Animated.View>

      <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />

      <Animated.View entering={entering} style={styles.nextBlock}>
        <View style={styles.contours} accessibilityElementsHidden>
          {[0, 1, 2, 3].map((index) => (
            <View
              key={index}
              style={[
                styles.contour,
                {
                  borderBottomColor: theme.colors.border,
                  width: `${100 - index * 14}%`,
                  marginLeft: `${index * 7}%`,
                },
              ]}
            />
          ))}
        </View>

        <Text style={[stepStyle(direction, 'label'), { color: theme.colors.brandPrimary }]}>
          {`STOP ${run.nextStop.sequence} · ${run.nextStop.km.toFixed(1)} KM`}
        </Text>
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
        <Text
          style={[
            stepStyle(direction, 'caption'),
            styles.tabular,
            styles.reference,
            { color: theme.colors.textTertiary },
          ]}
        >
          {`43.5180 S · 172.6250 E`}
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
          <View style={styles.rowRight}>
            <Text
              style={[
                stepStyle(direction, 'row'),
                styles.tabular,
                { color: theme.colors.textSecondary },
              ]}
            >
              {stop.eta}
            </Text>
            <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}>
              {statusLabels[stop.status]}
            </Text>
          </View>
        </Pressable>
      ))}

      <View style={styles.actions}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={confirmDelivery}
          style={{ borderRadius: direction.radii.control }}
          accessibilityHint="Confirms the delivery and crosses the contour"
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
        <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textSecondary }]}>
          {`LISTENING · ${run.queuedActions} WAITING`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: { flex: 1, gap: 2 },
  north: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconButton: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  rule: { height: 1, marginHorizontal: 20 },
  tabular: { fontVariant: ['tabular-nums'] },
  profileBlock: { paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
  profileHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  metricBlock: { alignItems: 'flex-end' },
  profile: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 40 },
  profileBar: { width: 18 },
  nextBlock: { paddingHorizontal: 20, paddingVertical: 16, gap: 2, overflow: 'hidden' },
  contours: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center' },
  contour: { position: 'absolute', height: 0, borderBottomWidth: 1 },
  reference: { marginTop: 8 },
  listHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  sequence: { width: 30 },
  rowMain: { flex: 1, gap: 1 },
  rowRight: { alignItems: 'flex-end' },
  actions: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  voice: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    borderTopWidth: 1,
  },
});
