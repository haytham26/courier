/**
 * The Today screen of the four directions.
 *
 * The brief is the same in the four (`docs/design/SPEC.md` §3.1): the state
 * of the run, the next stop, the voice state and one action of 72 pt. What
 * differs is the grammar:
 *
 * - **Weather Light** is an asymmetric block: the light of the day sits in
 *   the right third and the run in the left two thirds.
 * - **Haptic City** is a column of physical targets: nothing sits beside a
 *   target that could be a second target.
 * - **Night Shift** puts the map under everything and the interface on one
 *   plate above it.
 * - **Gantry Run** is an overhead rail: the run is the rail, the next stop
 *   hangs under it.
 *
 * The states of the screen (SPEC-5) are the seven of the contract, and the
 * lab can show each of them.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInUp,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';
import { typeStyle } from '@/design/typeStyle';
import { hapticFor } from '@/motion/haptics';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { useDirection } from './DirectionScope';
import { dayLight, longRun, run, statusLabels, type RunStop } from './content';
import {
  ErrorBlock,
  PermissionBlock,
  PrimaryAction,
  SkeletonBlock,
  StateChip,
  StatusWord,
  VoicePresence,
  confirmDelivery,
} from './parts';

export function TodayScreen(): React.JSX.Element {
  const { direction } = useDirection();
  const { theme } = useTheme();

  return (
    <View
      testID="today-screen"
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      accessibilityLabel={`Today's run, ${direction.displayName} direction`}
    >
      {direction.grammar === 'asymmetric-block' ? <WeatherLightToday /> : null}
      {direction.grammar === 'gesture-column' ? <HapticCityToday /> : null}
      {direction.grammar === 'full-bleed-map' ? <NightShiftToday /> : null}
      {direction.grammar === 'overhead-rail' ? <GantryRunToday /> : null}
    </View>
  );
}

/**
 * The gate of the states.
 *
 * A screen that only works when everything is well is a screen that has not
 * been designed, so the lab shows all seven states of the contract.
 */
function StateGate({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { state, setState } = useDirection();
  const { theme } = useTheme();
  const { direction } = useDirection();

  if (state === 'loading') {
    return (
      <View style={styles.stateBlock} testID="today-loading">
        <SkeletonBlock width={140} height={64} testID="today-skeleton-metric" />
        <SkeletonBlock width="100%" height={36} testID="today-skeleton-address" />
        <SkeletonBlock width="80%" height={20} testID="today-skeleton-note" />
        <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
          Loading today's run
        </Text>
      </View>
    );
  }

  if (state === 'empty') {
    return (
      <View style={styles.stateBlock}>
        <EmptyRun onAction={() => setState('ready')} />
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.stateBlock}>
        <ErrorBlock
          message="The run did not load from the server."
          action="Try again"
          onAction={() => setState('ready')}
        />
      </View>
    );
  }

  if (state === 'denied') {
    return (
      <View style={styles.stateBlock}>
        <PermissionBlock
          message="Location is off, so the map cannot follow you."
          action="Open the location setting"
          onAction={() => setState('ready')}
        />
      </View>
    );
  }

  return (
    <View style={styles.gate}>
      {state === 'offline' ? <StateChip kind="offline" queued={run.queuedActions} /> : null}
      {state === 'partial' ? (
        <StateChip kind="partial" queued={run.queuedActions} onRetry={() => setState('ready')} />
      ) : null}
      {children}
    </View>
  );
}

/** The empty state of the run: what is missing and what to do next. */
function EmptyRun({ onAction }: { onAction: () => void }): React.JSX.Element {
  const { theme } = useTheme();
  const { direction } = useDirection();

  return (
    <View style={styles.stateBlock} testID="empty-state">
      <MaterialCommunityIcons name="package-variant-closed" size={32} color={theme.colors.textTertiary} />
      <Text style={[typeStyle(direction.type.title), { color: theme.colors.textPrimary }]}>
        No run today
      </Text>
      <Text style={[typeStyle(direction.type.body), { color: theme.colors.textSecondary }]}>
        The depot has not loaded a run for you yet.
      </Text>
      <Pressable
        onPress={onAction}
        accessibilityRole="button"
        accessibilityLabel="Ask the depot for a run"
        testID="empty-action"
        style={[styles.stateAction, { borderColor: theme.colors.border }]}
      >
        <Text style={[typeStyle(direction.type.row), { color: theme.colors.textPrimary }]}>
          Ask the depot for a run
        </Text>
      </Pressable>
    </View>
  );
}

/** The stops of the run, in the number the direction shows. */
function useStops(): RunStop[] {
  const { state } = useDirection();
  return state === 'long' ? longRun : run.stops;
}

/**
 * The stops the screen shows.
 *
 * A direction shows its own number of stops on the ordinary screen, and the
 * whole day in the long-list state: three hundred rows is the number a real
 * day has, and the list has to scroll at sixty frames a second.
 */
function useVisibleStops(): RunStop[] {
  const { state, direction } = useDirection();
  const stops = useStops();

  return state === 'long' ? stops : stops.slice(0, direction.stopsVisible);
}

/* ------------------------------------------------------------------ *
 * 07 - Weather Light: the asymmetric block.
 * ------------------------------------------------------------------ */

function WeatherLightToday(): React.JSX.Element {
  const { theme } = useTheme();
  const { direction, confirmed, confirm } = useDirection();
  const reducedMotion = useReducedMotion();
  const stops = useVisibleStops();
  const [light, setLight] = useState(dayLight);
  const lift = useSharedValue(0);

  const onNext = useCallback(() => {
    confirmDelivery();
    setLight({ ...dayLight, condition: 'Clear', step: 'midday', temperature: '17°', contrast: '9.1:1' });
    lift.value = withSpring(1, { damping: 26, stiffness: 220, mass: 1.1 });
    confirm();
  }, [confirm, lift]);

  const liftStyle = useAnimatedStyle(() => ({
    opacity: 1 - lift.value * 0.12,
    transform: [{ translateY: -lift.value * 4 }],
  }));

  return (
    <StateGate>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.weatherHeader}>
          <View style={styles.weatherHeaderMain}>
            <Text
              style={[typeStyle(direction.type.label), { color: theme.colors.textSecondary }]}
              accessibilityRole="header"
            >
              {`${run.date} · ${run.runName}`}
            </Text>
            <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
              {`${run.clock} · ${run.driver}`}
            </Text>
          </View>
          <View style={[styles.lightCard, { borderColor: theme.colors.border }]}>
            <Text style={[typeStyle(direction.type.title), { color: theme.colors.textPrimary }]}>
              {light.temperature}
            </Text>
            <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textSecondary }]}>
              {light.condition}
            </Text>
            <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
              {`Light ${light.contrast}`}
            </Text>
          </View>
        </View>

        <Animated.View
          entering={reducedMotion ? undefined : FadeIn.duration(direction.motion.durationMs)}
          style={[
            styles.nowBlock,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: direction.radii.card,
              borderColor: theme.colors.border,
            },
            liftStyle,
          ]}
          testID="today-now-block"
        >
          <Text
            style={[typeStyle(direction.type.metric), styles.metric, { color: theme.colors.textPrimary }]}
            accessibilityRole="heading"
            accessibilityLabel={`${confirmed ? run.remaining - 1 : run.remaining} stops left`}
          >
            {String(confirmed ? run.remaining - 1 : run.remaining)}
          </Text>
          <Text style={[typeStyle(direction.type.label), { color: theme.colors.textSecondary }]}>
            Stops left
          </Text>
          <View style={styles.nowRow}>
            <Text style={[typeStyle(direction.type.body), { color: theme.colors.textSecondary }]}>
              {`${run.delivered} delivered`}
            </Text>
            <Text style={[typeStyle(direction.type.body), { color: theme.colors.textSecondary }]}>
              {`${run.kilometres} km to drive`}
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={reducedMotion ? undefined : FadeInUp.duration(direction.motion.durationMs)}
          style={styles.nextBlock}
        >
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
            {`${run.nextStop.suburb} · ${run.nextStop.eta} · 1.2 km · ${run.nextStop.parcels} parcels`}
          </Text>
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
            {run.nextStop.note}
          </Text>
        </Animated.View>

        <View style={styles.listHead}>
          <Text style={[typeStyle(direction.type.label), { color: theme.colors.textSecondary }]}>
            The run
          </Text>
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
            {`${stops.length} shown`}
          </Text>
        </View>

        {stops.map((stop) => (
          <StopRow key={stop.id} stop={stop} />
        ))}
      </ScrollView>

      <View style={[styles.actionBlock, { backgroundColor: theme.colors.background }]}>
        <PrimaryAction
          label="Next stop"
          onPress={onNext}
          testID="today-next-stop"
          hint="Opens the next stop"
        />
        <View style={styles.voiceBlock}>
          <VoicePresence state={run.voice} queued={run.queuedActions} />
        </View>
      </View>
    </StateGate>
  );
}

/* ------------------------------------------------------------------ *
 * 08 - Haptic City: the column of physical targets.
 * ------------------------------------------------------------------ */

function HapticCityToday(): React.JSX.Element {
  const { theme } = useTheme();
  const { direction, confirmed, confirm } = useDirection();
  const reducedMotion = useReducedMotion();
  const stops = useVisibleStops();
  const press = useSharedValue(0);

  const targetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: press.value * 2 }],
  }));

  const onSeal = useCallback(() => {
    hapticFor('deliver');
    confirm();
  }, [confirm]);

  return (
    <StateGate>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View
          entering={reducedMotion ? undefined : FadeIn.duration(direction.motion.durationMs)}
          style={styles.hapticHeader}
        >
          <Text style={[typeStyle(direction.type.label), { color: theme.colors.textSecondary }]}>
            {`${run.runName} · ${run.clock}`}
          </Text>
          <Text
            style={[typeStyle(direction.type.metric), styles.metric, { color: theme.colors.textPrimary }]}
            accessibilityRole="heading"
            accessibilityLabel={`${confirmed ? run.remaining - 1 : run.remaining} stops left`}
          >
            {String(confirmed ? run.remaining - 1 : run.remaining)}
          </Text>
          <Text style={[typeStyle(direction.type.label), { color: theme.colors.textSecondary }]}>
            Stops left
          </Text>
          <Text style={[typeStyle(direction.type.body), { color: theme.colors.textTertiary }]}>
            {`${run.delivered} delivered · ${run.failed} failed`}
          </Text>
        </Animated.View>

        <Animated.View
          entering={reducedMotion ? undefined : FadeIn.duration(direction.motion.durationMs)}
          style={[
            styles.hapticTarget,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.textPrimary,
              borderRadius: direction.radii.control,
            },
            targetStyle,
          ]}
          testID="today-next-stop"
        >
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
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
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
            {run.nextStop.note}
          </Text>
        </Animated.View>

        <Animated.View style={targetStyle}>
          <Pressable
            onPress={onSeal}
            onPressIn={() => {
              press.value = withSpring(1, { damping: 34, stiffness: 320, mass: 0.9 });
            }}
            onPressOut={() => {
              press.value = withSpring(0, { damping: 30, stiffness: 260, mass: 1.2 });
            }}
            accessibilityRole="button"
            accessibilityLabel="Mark the stop delivered"
            accessibilityHint="Marks 14 Harewood Road as delivered"
            testID="today-seal"
            style={[
              styles.hapticSeal,
              {
                backgroundColor: confirmed ? theme.colors.textPrimary : theme.colors.surface,
                borderColor: theme.colors.textPrimary,
                borderRadius: direction.radii.control,
              },
            ]}
          >
            <View
              style={[
                styles.hapticSealMark,
                {
                  borderColor: confirmed ? theme.colors.textInverse : theme.colors.textPrimary,
                  backgroundColor: confirmed ? theme.colors.textPrimary : 'transparent',
                },
              ]}
            />
            <Text
              style={[
                typeStyle(direction.type.row),
                { color: confirmed ? theme.colors.textInverse : theme.colors.textPrimary },
              ]}
            >
              {confirmed ? 'Delivered' : 'Mark delivered'}
            </Text>
          </Pressable>
        </Animated.View>

        <View style={styles.listHead}>
          <Text style={[typeStyle(direction.type.label), { color: theme.colors.textSecondary }]}>
            The run
          </Text>
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
            {`${stops.length} shown`}
          </Text>
        </View>

        {stops.map((stop) => (
          <StopRow key={stop.id} stop={stop} />
        ))}
      </ScrollView>

      <View style={[styles.actionBlock, { backgroundColor: theme.colors.background }]}>
        <View style={styles.voiceBlock}>
          <VoicePresence state={run.voice} queued={run.queuedActions} />
        </View>
      </View>
    </StateGate>
  );
}

/* ------------------------------------------------------------------ *
 * 09 - Night Shift: the map is the page.
 * ------------------------------------------------------------------ */

function NightShiftToday(): React.JSX.Element {
  const { theme } = useTheme();
  const { direction, confirmed, confirm } = useDirection();
  const reducedMotion = useReducedMotion();
  const stops = useVisibleStops();

  const onNext = useCallback(() => {
    confirmDelivery();
    confirm();
  }, [confirm]);

  return (
    <StateGate>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View
          entering={reducedMotion ? undefined : FadeIn.duration(direction.motion.durationMs)}
          style={[
            styles.nightPlate,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: direction.radii.card,
              borderColor: theme.colors.border,
            },
          ]}
          testID="today-plate"
        >
          <View style={styles.nightPlateTop}>
            <Text style={[typeStyle(direction.type.label), { color: theme.colors.textSecondary }]}>
              {`${run.runName} · ${run.clock}`}
            </Text>
            <Text
              style={[
                typeStyle(direction.type.metric),
                styles.metric,
                { color: theme.colors.textPrimary, fontSize: 56 },
              ]}
              accessibilityRole="heading"
              accessibilityLabel={`${confirmed ? run.remaining - 1 : run.remaining} stops left`}
            >
              {String(confirmed ? run.remaining - 1 : run.remaining)}
            </Text>
            <Text style={[typeStyle(direction.type.label), { color: theme.colors.textSecondary }]}>
              Stops left
            </Text>
          </View>

          <View style={[styles.nightRule, { backgroundColor: theme.colors.border }]} />

          <Text
            style={[typeStyle(direction.type.address), { color: theme.colors.textPrimary }]}
            accessibilityRole="heading"
            accessibilityLabel={`Next stop, ${run.nextStop.address}, ${run.nextStop.suburb}`}
          >
            {run.nextStop.address}
          </Text>
          <Text style={[typeStyle(direction.type.body), { color: theme.colors.textSecondary }]}>
            {`${run.nextStop.suburb} · ${run.nextStop.eta} · 1.2 km`}
          </Text>
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
            {run.nextStop.note}
          </Text>
        </Animated.View>

        <View style={styles.listHead}>
          <Text style={[typeStyle(direction.type.label), { color: theme.colors.textSecondary }]}>
            The run
          </Text>
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
            {`${stops.length} shown`}
          </Text>
        </View>

        {stops.map((stop) => (
          <StopRow key={stop.id} stop={stop} />
        ))}
      </ScrollView>

      <View style={[styles.actionBlock, { backgroundColor: theme.colors.background }]}>
        <PrimaryAction
          label="Next stop"
          onPress={onNext}
          testID="today-next-stop"
          hint="Opens the next stop"
        />
        <View style={styles.voiceBlock}>
          <VoicePresence state={run.voice} queued={run.queuedActions} />
        </View>
      </View>
    </StateGate>
  );
}

/* ------------------------------------------------------------------ *
 * 10 - Gantry Run: the overhead rail.
 * ------------------------------------------------------------------ */

function GantryRunToday(): React.JSX.Element {
  const { theme } = useTheme();
  const { direction, confirmed, confirm } = useDirection();
  const reducedMotion = useReducedMotion();
  const stops = useVisibleStops();
  const latch = useSharedValue(0);

  const signStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - latch.value) * -12 }],
  }));

  const onNext = useCallback(() => {
    hapticFor('deliver');
    latch.value = withSpring(1, { duration: 220, dampingRatio: 0.94 });
    confirm();
  }, [confirm, latch]);

  return (
    <StateGate>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.gantryHeader}>
          <Text
            style={[typeStyle(direction.type.label), { color: theme.colors.textPrimary }]}
            accessibilityRole="header"
          >
            {run.runName}
          </Text>
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
            {`${run.date} · ${run.clock}`}
          </Text>
        </View>

        <View style={styles.rail} testID="today-rail">
          <View style={[styles.railLine, { backgroundColor: theme.colors.border }]} />
          {stops.slice(0, 8).map((stop, index) => (
            <View key={stop.id} style={styles.railTick}>
              <View
                style={[
                  styles.railMark,
                  {
                    backgroundColor:
                      index === 0 ? theme.colors.brandPrimary : theme.colors.surfaceElevated,
                    borderColor: index === 0 ? theme.colors.brandPrimary : theme.colors.border,
                    borderRadius: direction.radii.pill,
                  },
                ]}
              />
            </View>
          ))}
        </View>

        <View style={styles.gantryCount}>
          <Text
            style={[typeStyle(direction.type.metric), styles.metric, { color: theme.colors.textPrimary }]}
            accessibilityRole="heading"
            accessibilityLabel={`${confirmed ? run.remaining - 1 : run.remaining} stops left`}
          >
            {String(confirmed ? run.remaining - 1 : run.remaining)}
          </Text>
          <Text style={[typeStyle(direction.type.label), { color: theme.colors.textSecondary }]}>
            Stops left
          </Text>
          <Text style={[typeStyle(direction.type.body), { color: theme.colors.textTertiary }]}>
            {`${run.delivered} delivered · ${run.kilometres} km`}
          </Text>
        </View>

        <Animated.View
          entering={reducedMotion ? undefined : SlideInDown.duration(direction.motion.durationMs)}
          style={[
            styles.gantrySign,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: direction.radii.card,
            },
            signStyle,
          ]}
          testID="today-sign"
        >
          <View style={styles.gantrySignHead}>
            <Text style={[typeStyle(direction.type.caption), { color: theme.colors.brandPrimary }]}>
              NEXT STOP
            </Text>
            <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
              {`${run.nextStop.eta} · 1.2 km`}
            </Text>
          </View>
          <Text
            style={[typeStyle(direction.type.address), { color: theme.colors.textPrimary }]}
            accessibilityRole="heading"
            accessibilityLabel={`Next stop, ${run.nextStop.address}, ${run.nextStop.suburb}`}
          >
            {run.nextStop.address}
          </Text>
          <Text style={[typeStyle(direction.type.body), { color: theme.colors.textSecondary }]}>
            {`${run.nextStop.suburb} · ${run.nextStop.parcels} parcels`}
          </Text>
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
            {run.nextStop.note}
          </Text>
        </Animated.View>

        <View style={styles.actionBlock}>
          <PrimaryAction
            label="Next stop"
            onPress={onNext}
            testID="today-next-stop"
            hint="Opens the next stop"
          />
        </View>

        <View style={styles.listHead}>
          <Text style={[typeStyle(direction.type.label), { color: theme.colors.textSecondary }]}>
            The run
          </Text>
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
            {`${stops.length} shown`}
          </Text>
        </View>

        {stops.map((stop) => (
          <StopRow key={stop.id} stop={stop} />
        ))}

        <View style={styles.voiceBlock}>
          <VoicePresence state={run.voice} queued={run.queuedActions} />
        </View>
      </ScrollView>
    </StateGate>
  );
}

/** One row of the run: it always carries something that changes a decision. */
function StopRow({ stop }: { stop: RunStop }): React.JSX.Element {
  const { theme } = useTheme();
  const { direction } = useDirection();

  const statusColor =
    stop.status === 'active'
      ? theme.colors.statusActive
      : stop.status === 'delivered'
        ? theme.colors.statusDelivered
        : stop.status === 'failed'
          ? theme.colors.statusFailed
          : theme.colors.textTertiary;

  return (
    <Pressable
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
          typeStyle(direction.type.caption),
          styles.rowSequence,
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
        <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]} numberOfLines={1}>
          {stop.suburb}
        </Text>
      </View>
      <Text style={[typeStyle(direction.type.caption), styles.rowEta, { color: theme.colors.textSecondary }]}>
        {stop.eta}
      </Text>
      <StatusWord word={statusLabels[stop.status]} color={statusColor} testID={`today-status-${stop.id}`} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingBottom: 32 },
  gate: { flex: 1 },
  stateBlock: { padding: 24, gap: 12 },
  stateAction: {
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  metric: { fontVariant: ['tabular-nums'] },
  listHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  rowSequence: { width: 32, fontVariant: ['tabular-nums'] },
  rowMain: { flex: 1, gap: 2 },
  rowActive: { fontWeight: '700' },
  rowEta: { fontVariant: ['tabular-nums'] },
  actionBlock: { paddingHorizontal: 24, paddingTop: 24 },
  voiceBlock: { paddingHorizontal: 24, paddingTop: 24 },
  // Weather Light
  weatherHeader: { flexDirection: 'row', gap: 16, paddingHorizontal: 24, paddingTop: 16 },
  weatherHeaderMain: { flex: 1, gap: 2 },
  lightCard: {
    width: 116,
    padding: 12,
    gap: 2,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  nowBlock: { margin: 24, marginTop: 16, padding: 24, gap: 4, borderWidth: 1 },
  nowRow: { flexDirection: 'row', gap: 16, paddingTop: 8 },
  nextBlock: { paddingHorizontal: 24, paddingBottom: 8, gap: 4 },
  // Haptic City
  hapticHeader: { paddingHorizontal: 16, paddingTop: 16, gap: 4 },
  hapticTarget: { margin: 16, padding: 16, gap: 4, borderWidth: 2 },
  hapticSeal: {
    marginHorizontal: 16,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 2,
  },
  hapticSealMark: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  // Night Shift
  nightPlate: { margin: 24, marginTop: 16, padding: 24, gap: 4, borderWidth: 1 },
  nightPlateTop: { gap: 2 },
  nightRule: { height: 1, marginVertical: 16 },
  nightActions: { marginTop: 24 },
  // Gantry Run
  gantryHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  rail: { height: 40, marginHorizontal: 20, marginTop: 12, flexDirection: 'row', alignItems: 'center' },
  railLine: { position: 'absolute', left: 0, right: 0, height: 2 },
  railTick: { flex: 1, alignItems: 'center' },
  railMark: { width: 12, height: 12, borderWidth: 2 },
  gantryCount: { paddingHorizontal: 20, paddingTop: 8, gap: 2 },
  gantrySign: { margin: 20, padding: 16, gap: 4, borderWidth: 1 },
  gantrySignHead: { flexDirection: 'row', justifyContent: 'space-between' },
});
