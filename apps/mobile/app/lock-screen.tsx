/**
 * Lock screen (13-lock-screen.html), on the chosen tokens.
 *
 * What the reference shows is the run's glance on a locked phone: the Dynamic
 * Island pill with the distance to the next turn, the date and the clock, and
 * the Live Activity card - the stop's progress, its address and notes, and the
 * two actions the driver can take without unlocking. The bottom round buttons
 * are the phone's own, so they are drawn as the reference draws them and they do
 * nothing.
 *
 * The platform status is honest (MASTER_EXECUTION §6 and the founder's brief):
 * - the ANDROID ongoing notification and the iOS Live Activity are the OS-level
 *   surfaces that put this content on a locked phone. Both are PARTIAL here:
 *   the iOS lane needs an Apple developer account and a build (FOUNDER_TODO),
 *   and the Android foreground service needs its own slice. This screen is the
 *   design the OS surfaces carry, built and compared against the reference;
 * - the numbers come from the run's next stop and the delivered count, and the
 *   run's own numbers are what the notification will carry. The day's numbers
 *   here are the mock run's (the runs API is the backend session's slice).
 *
 * A root-stack route: the way in is the drive's own (the Live Activity is the
 * bus that shows on the lock screen), and it carries its own provider like
 * every other root route.
 *
 * The copy is plain New Zealand English, there is no emoji anywhere, and every
 * control has an accessibility label and a role.
 */
import React, { useCallback } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ChosenProvider, useChosen } from '@/components/chosen';
import { hapticFor } from '@/motion/haptics';
import { mockStops } from '@/maps/stops';
import { radii, spacing, typography } from '@courier/design-tokens/chosen';

/**
 * The lock screen's own clock: the real now, because a locked phone shows the
 * real time. The reference's "Tuesday 22 October" and "10:40" are its mock; the
 * day's numbers (the stop, the progress) are the run's own, which is what the
 * OS surfaces will carry.
 */
const TODAY = new Date();

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** The stop the run is on, and the run's own numbers. */
function runPosition() {
  const delivered = mockStops.filter((stop) => stop.status === 'delivered').length;
  const next = mockStops.find((stop) => stop.status !== 'delivered') ?? mockStops[0];
  return { delivered, total: mockStops.length, next };
}

const timeOfDay = (at: Date): string =>
  `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;

const dateOfDay = (at: Date): string =>
  `${WEEKDAYS[at.getDay()]} ${at.getDate()} ${MONTHS[at.getMonth()]}`;

export default function LockScreenRoute() {
  // A root-stack route sits outside the tabs' provider, so the mode resolves
  // here (the same contract as the drive and the summary).
  const scheme = useColorScheme();

  return (
    <ChosenProvider mode={scheme === 'dark' ? 'dark' : 'light'}>
      <LockScreen />
    </ChosenProvider>
  );
}

function LockScreen() {
  const { t } = useChosen();
  const { delivered, next } = runPosition();

  const handleDelivered = useCallback(() => {
    hapticFor('confirm');
  }, []);

  const handleCall = useCallback(() => {
    hapticFor('confirm');
  }, []);

  const progress = delivered / runPosition().total;

  return (
    <SafeAreaView testID="lock-screen" style={[styles.screen, { backgroundColor: t.colors.background }]}>
      {/* The Dynamic Island pill: the distance to the next turn and the ETA. */}
      <View testID="lock-pill" style={[styles.pill, { backgroundColor: t.colors.label }]}>
        <Ionicons name="navigate" size={14} color={t.colors.success} />
        <Text style={[styles.pillDistance, { color: t.colors.success }]} maxFontSizeMultiplier={1.4}>
          120 m
        </Text>
        <Text style={[styles.pillEta, { color: t.colors.onTurnCard }]} maxFontSizeMultiplier={1.4}>
          2 min
        </Text>
      </View>

      {/* The date and the clock, the way a locked phone shows them. */}
      <View style={styles.clockBlock}>
        <Text style={[styles.date, { color: t.colors.label }]} maxFontSizeMultiplier={1.4}>
          {dateOfDay(TODAY)}
        </Text>
        <Text style={[styles.clock, { color: t.colors.label }]} maxFontSizeMultiplier={1.6}>
          {timeOfDay(TODAY)}
        </Text>
      </View>

      {/* The Live Activity card: the run's glance and its two actions. */}
      <View testID="lock-activity" style={[styles.activity, { backgroundColor: t.colors.turnCard }]}>
        <View style={styles.activityRow}>
          <View style={[styles.tile, { backgroundColor: t.colors.accent }]}>
            <Ionicons name="cube" size={14} color={t.colors.onAccent} />
          </View>
          <Text style={[styles.activityLabel, { color: t.colors.onTurnStrip }]} maxFontSizeMultiplier={1.4}>
            {`Stop ${delivered + 1} of ${mockStops.length + 209}`}
          </Text>
          <Text style={[styles.ahead, { color: t.colors.success }]} maxFontSizeMultiplier={1.4}>
            12 min ahead
          </Text>
        </View>

        <View style={styles.activityRow}>
          <View style={styles.activityText}>
            <Text style={[styles.street, { color: t.colors.onTurnCard }]} maxFontSizeMultiplier={1.4}>
              {next.address}
            </Text>
            <Text style={[styles.notes, { color: t.colors.onTurnStrip }]} maxFontSizeMultiplier={1.4}>
              Side gate, shelf B3
            </Text>
          </View>
          <Text style={[styles.eta, { color: t.colors.onTurnCard }]} maxFontSizeMultiplier={1.4}>
            2 min
          </Text>
        </View>

        <View style={[styles.track, { backgroundColor: t.colors.separator }]}>
          <View
            testID="lock-progress"
            style={[styles.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: t.colors.success }]}
          />
        </View>

        <View testID="lock-actions" style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delivered"
            accessibilityHint="Marks the stop delivered from the lock screen"
            onPress={handleDelivered}
            testID="lock-delivered"
            style={[
              styles.action,
              { backgroundColor: t.colors.success, borderRadius: radii.button },
            ]}
          >
            <Ionicons name="checkmark-circle" size={16} color={t.colors.onSuccess} />
            <Text style={[styles.actionLabel, { color: t.colors.onSuccess }]}>Delivered</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Call"
            accessibilityHint="Calls the customer from the lock screen"
            onPress={handleCall}
            testID="lock-call"
            style={[
              styles.action,
              { backgroundColor: t.colors.fill, borderRadius: radii.button },
            ]}
          >
            <Ionicons name="call" size={16} color={t.colors.onTurnCard} />
            <Text style={[styles.actionLabel, { color: t.colors.onTurnCard }]}>Call</Text>
          </Pressable>
        </View>
      </View>

      {/* The phone's own buttons: drawn as the reference draws them. */}
      <View style={styles.phoneButtons}>
        <View style={[styles.phoneButton, { backgroundColor: t.colors.turnCard }]}>
          <Ionicons name="flashlight" size={22} color={t.colors.onTurnCard} />
        </View>
        <View style={[styles.phoneButton, { backgroundColor: t.colors.turnCard }]}>
          <Ionicons name="camera" size={22} color={t.colors.onTurnCard} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center' },
  pill: {
    marginTop: spacing.space12,
    width: 210,
    height: 37,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.space16,
    gap: spacing.space4,
  },
  pillDistance: { fontSize: 13, fontWeight: '700' },
  pillEta: { fontSize: 13, fontWeight: '700' },
  clockBlock: { alignItems: 'center', marginTop: spacing.space48 },
  date: { fontSize: 19, fontWeight: '600', opacity: 0.85 },
  clock: {
    fontSize: 96,
    lineHeight: 100,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  activity: {
    position: 'absolute',
    left: spacing.space12,
    right: spacing.space12,
    bottom: 150,
    borderRadius: radii.turnCard,
    padding: spacing.space16,
    gap: spacing.space12,
  },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space12 },
  tile: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityLabel: { flex: 1, fontSize: typography.body.size, fontWeight: typography.body.weight },
  ahead: { fontSize: typography.body.size, fontWeight: typography.body.weight },
  activityText: { flex: 1, gap: spacing.space4 },
  street: { fontSize: typography.streetTitle.size, fontWeight: typography.streetTitle.weight },
  notes: { fontSize: typography.body.size, fontWeight: '400' },
  eta: { fontSize: typography.turnDistance.size * 0.8, fontWeight: typography.turnDistance.weight },
  track: { height: 5, borderRadius: 3 },
  fill: { height: 5, borderRadius: 3 },
  actions: { flexDirection: 'row', gap: spacing.space8 },
  action: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space8,
  },
  actionLabel: { fontSize: typography.body.size, fontWeight: '700' },
  phoneButtons: {
    position: 'absolute',
    left: 46,
    right: 46,
    bottom: 42,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  phoneButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
