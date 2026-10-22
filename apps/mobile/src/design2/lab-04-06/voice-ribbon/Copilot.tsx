/**
 * Direction 04 - **Voice Ribbon**. Copilot.
 *
 * The screen shows what the assistant is doing and what it last said, and
 * the ribbon at the bottom is the control: the courier talks, the ribbon
 * answers. The transcript is a log, not a chat bubble (REVIEW-S3), and the
 * confirmation of a spoken action is the signature of the direction - the
 * ribbon collapses to a single flat line and a rule draws across the
 * address, once, in 220 ms.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';
import { labDirections } from '@courier/design-tokens/lab-directions';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { VoiceRibbon, useRibbonLevel } from '../VoiceRibbon';
import { typeStyle } from '../labTheme';
import {
  lastThingSaid,
  run,
  understoodIntent,
  voiceConditionWords,
  type VoiceCondition,
} from '../labContent';

const direction = labDirections.voiceRibbon;

export function VoiceRibbonCopilot({
  condition = 'listening',
  confirmed = false,
}: {
  condition?: VoiceCondition;
  confirmed?: boolean;
}): React.JSX.Element {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const level = useRibbonLevel();
  const rule = theme.colors.border;

  // The rule that draws across the address when the delivery is confirmed.
  // It is the one place a hair of overshoot is allowed, and it happens once.
  const draw = useSharedValue(0);

  React.useEffect(() => {
    draw.value = confirmed
      ? reducedMotion
        ? 1
        : withTiming(1, { duration: 220 })
      : 0;
  }, [confirmed, draw, reducedMotion]);

  const ruleStyle = useAnimatedStyle(() => ({
    width: `${draw.value * 100}%`,
  }));

  return (
    <View
      testID="copilot-screen"
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      accessibilityLabel="Copilot, Voice Ribbon direction"
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text
          style={[typeStyle(direction.type.label), { color: theme.colors.brandPrimary }]}
          accessibilityRole="header"
        >
          {voiceConditionWords[condition]}
        </Text>

        <Text
          style={[typeStyle(direction.type.address), styles.line, { color: theme.colors.textPrimary }]}
          accessibilityRole="heading"
          accessibilityLabel={`Copilot said, ${lastThingSaid}`}
        >
          {lastThingSaid}
        </Text>

        <View style={[styles.under, { borderBottomColor: rule }]}>
          <Text style={[typeStyle(direction.type.body), { color: theme.colors.textSecondary }]}>
            {understoodIntent}
          </Text>
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
            {`${run.nextStop.address}, ${run.nextStop.suburb}`}
          </Text>
        </View>

        {confirmed ? (
          <View
            style={styles.confirmed}
            accessibilityRole="text"
            accessibilityLabel={`Delivered, ${run.nextStop.address}`}
            testID="copilot-confirmed"
          >
            <Text style={[typeStyle(direction.type.label), { color: theme.colors.statusDelivered }]}>
              Delivered
            </Text>
            <Text
              style={[typeStyle(direction.type.row), { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              {run.nextStop.address}
            </Text>
            <Animated.View
              style={[styles.rule, { backgroundColor: theme.colors.statusDelivered }, ruleStyle]}
            />
          </View>
        ) : null}

        {condition === 'error' ? (
          <Text style={[typeStyle(direction.type.body), { color: theme.colors.error }]}>
            The microphone is not answering. Say it again, or use the screen.
          </Text>
        ) : null}

        {condition === 'offline' ? (
          <Text style={[typeStyle(direction.type.body), { color: theme.colors.textSecondary }]}>
            The voice service needs a network. The run is still on the device.
          </Text>
        ) : null}

        {condition === 'muted' ? (
          <Text style={[typeStyle(direction.type.body), { color: theme.colors.textSecondary }]}>
            The microphone is muted in the system settings.
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
          {`${run.remaining} stops left · ${run.queuedActions} actions waiting`}
        </Text>
      </View>

      <VoiceRibbon
        direction={direction}
        state={voiceConditionWords[condition]}
        listening={condition === 'listening'}
        queued={run.queuedActions}
        level={level}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 12 },
  line: { marginTop: 4 },
  under: { borderBottomWidth: 1, paddingBottom: 12, gap: 2 },
  confirmed: { paddingTop: 8, gap: 4 },
  rule: { height: 2, marginTop: 4 },
  actions: { paddingHorizontal: 20, paddingTop: 8 },
});
