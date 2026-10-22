/**
 * Direction 06 - **Scanline**. Copilot.
 *
 * The assistant appears as a new ruled band pushed up from the bottom of the
 * screen, with the caret on the last line. The transcript is a log of bands,
 * never a chat bubble (REVIEW-S3), and the confirmation of a spoken action
 * is a vermilion rule that draws across the band from the left, once, in
 * 150 ms.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';
import { labDirections } from '@courier/design-tokens/lab-directions';
import { hapticFor } from '@/motion/haptics';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { Band } from './Band';
import { typeStyle } from '../labTheme';
import {
  lastThingSaid,
  run,
  understoodIntent,
  voiceConditionWords,
  type VoiceCondition,
} from '../labContent';

const direction = labDirections.scanline;

export function ScanlineCopilot({
  condition = 'listening',
  confirmed = false,
}: {
  condition?: VoiceCondition;
  confirmed?: boolean;
}): React.JSX.Element {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const rule = theme.colors.border;

  // The rule that draws across the band when the delivery is confirmed.
  const draw = useSharedValue(0);

  React.useEffect(() => {
    draw.value = confirmed
      ? reducedMotion
        ? 1
        : withTiming(1, { duration: 150 })
      : 0;
  }, [confirmed, draw, reducedMotion]);

  const ruleStyle = useAnimatedStyle(() => ({
    width: `${draw.value * 100}%`,
  }));

  return (
    <View
      testID="copilot-screen"
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      accessibilityLabel="Copilot, Scanline direction"
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Band label="STATE" value={voiceConditionWords[condition]} rule={theme.colors.brandPrimary}>
          <Text style={[typeStyle(direction.type.row), { color: theme.colors.textPrimary }]}>
            {voiceConditionWords[condition]}
          </Text>
        </Band>

        <Band label="HEARD" value={lastThingSaid} rule={rule}>
          <Text
            style={[typeStyle(direction.type.body), { color: theme.colors.textPrimary }]}
            accessibilityRole="heading"
            accessibilityLabel={`Copilot said, ${lastThingSaid}`}
          >
            {lastThingSaid}
          </Text>
        </Band>

        <Band label="INTENT" value={understoodIntent} rule={rule}>
          <Text style={[typeStyle(direction.type.body), { color: theme.colors.textSecondary }]}>
            {understoodIntent}
          </Text>
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
            {`${run.nextStop.address}, ${run.nextStop.suburb}`}
          </Text>
        </Band>

        {confirmed ? (
          <View
            style={styles.confirmed}
            accessibilityRole="text"
            accessibilityLabel={`Delivered, ${run.nextStop.address}`}
            testID="copilot-confirmed"
          >
            <Band label="RESULT" value="Delivered" rule={theme.colors.brandPrimary}>
              <Text style={[typeStyle(direction.type.row), { color: theme.colors.textPrimary }]}>
                {`Delivered · ${run.nextStop.address}`}
              </Text>
            </Band>
            <Animated.View
              style={[styles.rule, { backgroundColor: theme.colors.brandPrimary }, ruleStyle]}
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

      <View style={[styles.caret, { borderTopColor: rule }]}>
        <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
          {`${run.remaining} STOPS LEFT · ${run.queuedActions} WAITING`}
        </Text>
      </View>

      <Pressable
        onPress={() => hapticFor('voice')}
        style={[styles.talk, { backgroundColor: theme.colors.textPrimary }]}
        accessibilityRole="button"
        accessibilityLabel="Talk to Copilot"
        accessibilityHint="Starts the microphone"
        testID="copilot-talk"
      >
        <Text style={[typeStyle(direction.type.body), { color: theme.colors.background }]}>
          {`> ${voiceConditionWords[condition].toUpperCase()}`}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 12 },
  confirmed: {},
  rule: { height: 3, marginHorizontal: 16, marginTop: 4 },
  caret: { borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 8 },
  talk: { minHeight: 64, justifyContent: 'center', paddingHorizontal: 16 },
});
