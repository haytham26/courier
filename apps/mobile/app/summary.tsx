/**
 * Summary - the end of the day (10-summary.html), on the chosen tokens.
 *
 * The day is finished and the courier wants three things: what the day earned,
 * the week behind it, and what each carrier paid. That is the reference, in that
 * order, on the card surface: the eyebrow of the finish time, the earned amount
 * in the tabular numbers, the seven bars of the week, the three counts, and the
 * split per carrier.
 *
 * The numbers never invent themselves (MASTER_EXECUTION §13.2): they come from
 * `src/summary/daySummary.ts`, whose source is the reference's mock day until
 * the runs API (ADR-010) is wired through the sync layer. When that lands, the
 * screen keeps its shape and the data changes - nothing here hard-codes a day.
 *
 * The dock stays on a root-stack route: the summary is not a tab, and the way
 * out is the dock itself (no slot is active here, because none of them is this
 * screen). The Copilot centre is here too (D34: on every main screen).
 *
 * A root-stack route sits OUTSIDE the tabs' provider, so it cannot read the
 * tabs' one: the screen carries its own `ChosenProvider`, exactly as the drive
 * and the Copilot screen do. Without it the screen dies at mount with
 * "useChosen needs a ChosenProvider above it" - which is precisely what PR #30's
 * first emulator run showed (the app stayed on Today and the flow's
 * `summary-screen` assert timed out).
 *
 * The copy is plain New Zealand English, there is no emoji anywhere, and every
 * control has an accessibility label and a role.
 */
import React, { useCallback } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { copilotStateOf } from '@/voice/copilotState';
import { useVoice } from '@/voice/useVoice';
import { ChosenProvider, TabBar, useChosen, type TabSlot } from '@/components/chosen';
import { hapticFor } from '@/motion/haptics';
import {
  REFERENCE_DAY,
  barHeightFraction,
  formatKm,
  formatMoney,
} from '@/summary/daySummary';
import { radii, spacing, typography } from '@courier/design-tokens/chosen';

/** The bar band's height, from the reference. */
const BAR_BAND = 70;

/** The reference's quiet accent bar: the accent, at the reference's 22 percent. */
const BAR_QUIET_OPACITY = 0.22;

/** The tallest bar in the week, so every week fills its band. */
const TALLEST = barHeightFraction(REFERENCE_DAY.bars);

export default function SummaryScreen() {
  // The route: the light and the dark resolve here, because a root-stack route
  // sits outside the tabs' provider (BUG-062's root cause).
  const scheme = useColorScheme();

  return (
    <ChosenProvider mode={scheme === 'dark' ? 'dark' : 'light'}>
      <SummaryScreenBody />
    </ChosenProvider>
  );
}

/** The screen itself: everything inside the provider's mode. */
function SummaryScreenBody() {
  const { t } = useChosen();
  const router = useRouter();
  const voice = useVoice();
  const day = REFERENCE_DAY;

  // The Copilot centre is on every main screen (D34): a tap toggles the
  // microphone with the voice haptic, and the sphere reads the engine's state.
  const toggleVoice = useCallback(() => {
    hapticFor('voice');
    if (voice.state === 'listening') {
      void voice.stopListening();
    } else {
      void voice.startListening();
    }
  }, [voice]);

  const slots = useCallback(
    (): [TabSlot, TabSlot] => [
      { key: 'today', label: 'Today', name: 'calendar', onPress: () => router.navigate('/') },
      { key: 'stops', label: 'Route', name: 'list', onPress: () => router.navigate('/stops') },
    ],
    [router],
  );

  const rightSlots = useCallback(
    (): [TabSlot, TabSlot] => [
      { key: 'map', label: 'Map', name: 'map', onPress: () => router.navigate('/map') },
      { key: 'settings', label: 'Account', name: 'person', onPress: () => router.navigate('/settings') },
    ],
    [router],
  );

  return (
    <SafeAreaView testID="summary-screen" style={[styles.container, { backgroundColor: t.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text style={[styles.eyebrow, { color: t.colors.secondaryLabel }]} maxFontSizeMultiplier={1.4}>
            {`Finished at ${day.finishedAt}`}
          </Text>
          <Text style={[styles.title, { color: t.colors.label }]} maxFontSizeMultiplier={1.6}>
            Summary
          </Text>
        </View>

        <View style={[styles.earningsCard, { backgroundColor: t.colors.card }]}>
          <Text style={[styles.earningsLabel, { color: t.colors.secondaryLabel }]} maxFontSizeMultiplier={1.4}>
            Earned today
          </Text>
          <Text
            testID="summary-earned"
            style={[
              styles.earned,
              { color: t.colors.label, fontFamily: typography.family.numbers.iOS },
            ]}
            maxFontSizeMultiplier={1.6}
          >
            {formatMoney(day.earnedCents)}
          </Text>

          <View style={styles.week} accessibilityRole="image" accessibilityLabel="The earnings of the last seven days">
            {day.bars.map((bar, index) => (
              <View key={`${bar.letter}-${index}`} style={styles.barColumn}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(4, Math.round(BAR_BAND * (bar.fraction / TALLEST))),
                      backgroundColor: t.colors.accent,
                      opacity: BAR_QUIET_OPACITY,
                    },
                  ]}
                />
                <Text
                  style={[styles.barLetter, { color: t.colors.secondaryLabel }]}
                  maxFontSizeMultiplier={1.4}
                >
                  {bar.letter}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.statRow}>
            <View style={[styles.statCard, { backgroundColor: t.colors.card }]}>
              <Text
                testID="summary-delivered"
                style={[styles.statValue, { color: t.colors.successText, fontFamily: typography.family.numbers.iOS }]}
                maxFontSizeMultiplier={1.6}
              >
                {day.delivered}
              </Text>
              <Text style={[styles.statLabel, { color: t.colors.secondaryLabel }]} maxFontSizeMultiplier={1.4}>
                Delivered
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: t.colors.card }]}>
              <Text
                testID="summary-not-home"
                style={[styles.statValue, { color: t.colors.danger, fontFamily: typography.family.numbers.iOS }]}
                maxFontSizeMultiplier={1.6}
              >
                {day.notHome}
              </Text>
              <Text style={[styles.statLabel, { color: t.colors.secondaryLabel }]} maxFontSizeMultiplier={1.4}>
                Not home
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: t.colors.card }]}>
              <Text
                testID="summary-driven"
                style={[styles.statValue, { color: t.colors.label, fontFamily: typography.family.numbers.iOS }]}
                maxFontSizeMultiplier={1.6}
              >
                {formatKm(day.drivenKm)}
              </Text>
              <Text style={[styles.statLabel, { color: t.colors.secondaryLabel }]} maxFontSizeMultiplier={1.4}>
                Driven
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.carriersCard, { backgroundColor: t.colors.card }]} testID="summary-carriers">
          {day.carriers.map((carrier, index) => (
            <View
              key={carrier.name}
              style={[
                styles.carrierRow,
                index > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.colors.separator } : null,
              ]}
            >
              <View style={styles.carrierText}>
                <Ionicons name="cube-outline" size={18} color={t.colors.secondaryLabel} />
                <Text style={[styles.carrierName, { color: t.colors.label }]} maxFontSizeMultiplier={1.4}>
                  {carrier.name}
                </Text>
              </View>
              <Text
                testID={`summary-carrier-${index}`}
                style={[styles.carrierAmount, { color: t.colors.label }]}
                maxFontSizeMultiplier={1.4}
              >
                {formatMoney(carrier.cents)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.dock}>
        <TabBar
          left={slots()}
          right={rightSlots()}
          copilot={{
            state: copilotStateOf(voice.state, voice.isReady),
            onPress: toggleVoice,
            onLongPress: () => undefined,
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: spacing.space16,
    paddingTop: spacing.space16,
    paddingBottom: spacing.space64,
    gap: spacing.space12,
  },
  head: {
    paddingHorizontal: spacing.space4,
    gap: spacing.space4,
  },
  eyebrow: {
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    fontWeight: typography.body.weight,
  },
  title: {
    fontSize: typography.largeTitle.size,
    lineHeight: typography.largeTitle.lineHeight,
    fontWeight: typography.largeTitle.weight,
  },
  earningsCard: {
    borderRadius: radii.card,
    padding: spacing.space20,
    gap: spacing.space4,
  },
  earningsLabel: {
    fontSize: typography.body.size,
    lineHeight: typography.body.lineHeight,
    fontWeight: typography.body.weight,
  },
  earned: {
    fontSize: typography.statRange.max,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  week: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.space8,
    height: BAR_BAND,
    marginTop: spacing.space8,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.space4,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 6,
  },
  barLetter: {
    fontSize: 11,
    lineHeight: 14,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.space8,
    marginTop: spacing.space8,
  },
  statCard: {
    flex: 1,
    borderRadius: radii.card,
    padding: spacing.space12,
    gap: spacing.space4,
  },
  statValue: {
    fontSize: typography.stat.size,
    lineHeight: typography.stat.lineHeight,
    fontWeight: typography.stat.weight,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: typography.secondary.size,
    lineHeight: typography.secondary.lineHeight,
    fontWeight: typography.secondary.weight,
  },
  carriersCard: {
    borderRadius: radii.card,
  },
  carrierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.space16,
    paddingVertical: spacing.space12,
  },
  carrierText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space8,
  },
  carrierName: {
    fontSize: typography.paragraph.size,
    lineHeight: typography.paragraph.lineHeight,
    fontWeight: typography.paragraph.weight,
  },
  carrierAmount: {
    fontSize: typography.emphasis.size,
    lineHeight: typography.emphasis.lineHeight,
    fontWeight: typography.emphasis.weight,
    fontVariant: ['tabular-nums'],
  },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
