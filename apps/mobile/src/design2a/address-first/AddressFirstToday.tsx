/**
 * 03 Address First - **Today**.
 *
 * The address is typeset like a headline. The run is a vertical spine of
 * addresses, each set in the display face with its own annotation under it,
 * and the count of the day sits in the margin like the folio of a page.
 *
 * The signature moment of the direction is the setting of the line: the
 * delivered address is struck through with a hairline and the next address
 * rises into its place with a hair of overshoot, once, and the page holds
 * still afterwards.
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

const direction = directions2a.addressFirst;

export function AddressFirstToday({ state = 'ready' }: { state?: LabState }): React.JSX.Element {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const entering = enteringFor(direction, reducedMotion);
  const [, setDelivered] = useState(false);
  const [remaining, setRemaining] = useState(run.remaining);
  const rise = useSharedValue(0);

  const confirmDelivery = useCallback(() => {
    hapticFor('deliver');
    setDelivered(true);
    setRemaining((value) => Math.max(0, value - 1));
    // The line sets itself: the one spring of the round that is allowed a
    // hair of overshoot, and it is used once.
    rise.value = withSpring(1, springs.confirm);
  }, [rise]);

  const riseStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - rise.value) * 16 }],
    opacity: 0.4 + 0.6 * rise.value,
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
      accessibilityLabel="Today's run, Address First direction"
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.masthead}>
          <View style={styles.mastheadText}>
            <Text style={[stepStyle(direction, 'title'), { color: theme.colors.textPrimary }]}>
              {run.runName}
            </Text>
            <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}>
              {`${run.date} · ${run.driver} · ${run.clock}`}
            </Text>
          </View>
          <View style={styles.folio}>
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
              stops left
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
            <MaterialCommunityIcons name="cog" size={22} color={theme.colors.textPrimary} />
          </Pressable>
        </View>

        <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />

        <Animated.View entering={entering} style={[styles.headline, riseStyle]}>
          <Text style={[stepStyle(direction, 'label'), { color: theme.colors.brandPrimary }]}>
            NEXT STOP
          </Text>
          <Text
            style={[stepStyle(direction, 'address'), { color: theme.colors.textPrimary }]}
            accessibilityRole="heading"
            accessibilityLabel={`Next stop, ${run.nextStop.address}, ${run.nextStop.suburb}`}
          >
            {run.nextStop.address}
          </Text>
          <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textSecondary }]}>
            {`${run.nextStop.suburb} · ${run.nextStop.eta} · ${run.nextStop.km.toFixed(1)} km`}
          </Text>
          <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}>
            {run.nextStop.note}
          </Text>
        </Animated.View>

        <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />

        <View style={styles.counts}>
          <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textSecondary }]}>
            {`${run.delivered} delivered`}
          </Text>
          <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textSecondary }]}>
            {`${run.failed} failed`}
          </Text>
          <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textSecondary }]}>
            {`${run.kilometres} km to drive`}
          </Text>
        </View>

        <View style={[styles.rule, { backgroundColor: theme.colors.border }]} />

        {run.stops.slice(0, direction.stopsVisible).map((stop, index) => (
          <Pressable
            key={stop.id}
            onPress={() => hapticFor('confirm')}
            style={({ pressed }) => [
              styles.entry,
              { opacity: pressed ? 0.6 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Stop ${stop.sequence}, ${stop.address}, ${stop.suburb}, ${statusLabels[stop.status]}`}
            testID={`today-stop-${stop.id}`}
          >
            <Text
              style={[
                stepStyle(direction, 'caption'),
                styles.tabular,
                styles.entryIndex,
                { color: theme.colors.textTertiary },
              ]}
            >
              {`${String(index + 1).padStart(2, '0')}`}
            </Text>
            <View style={styles.entryMain}>
              <Text
                style={[
                  stepStyle(direction, 'row'),
                  {
                    color: stop.status === 'active' ? theme.colors.brandPrimary : theme.colors.textPrimary,
                    fontWeight: stop.status === 'active' ? '600' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {stop.address}
              </Text>
              <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textTertiary }]}>
                {`${stop.suburb} · ${stop.eta} · ${statusLabels[stop.status]}`}
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
            accessibilityHint="Confirms the delivery and sets the next address"
            testID="today-next-stop"
          >
            Next stop
          </Button>
        </View>
      </ScrollView>

      <View
        style={[styles.voice, { borderTopColor: theme.colors.border }]}
        accessibilityRole="text"
        accessibilityLabel={`Copilot is listening, ${run.queuedActions} actions waiting`}
        testID="voice-bar"
      >
        <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textSecondary }]}>
          {`Copilot is listening · ${run.queuedActions} actions waiting`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 16 },
  masthead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  mastheadText: { flex: 1, gap: 2 },
  folio: { alignItems: 'flex-end' },
  iconButton: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  rule: { height: 1, marginHorizontal: 24 },
  tabular: { fontVariant: ['tabular-nums'] },
  headline: { paddingHorizontal: 24, paddingVertical: 16, gap: 2 },
  counts: { flexDirection: 'row', gap: 16, paddingHorizontal: 24, paddingVertical: 12 },
  entry: { flexDirection: 'row', gap: 12, minHeight: 64, paddingHorizontal: 24, paddingVertical: 10 },
  entryIndex: { width: 24 },
  entryMain: { flex: 1, gap: 2 },
  actions: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  voice: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 64,
    borderTopWidth: 1,
  },
});
