/**
 * The Copilot screen of the four directions.
 *
 * The brief is the same in the four (`docs/design/SPEC.md` §3.1): the state
 * of the assistant in words, the line it last said, the intent it
 * understood, one control to talk, and the confirmation of a spoken action.
 *
 * The screen listens on the real voice channel of the app
 * (`apps/mobile/src/voice/commandChannel.ts`), so a command that arrives
 * from the voice engine lands here the way it lands in the product. The
 * control of the lab stands in for the microphone: it publishes a command
 * down the same channel, so the path that is exercised is the real one.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';
import { typeStyle } from '@/design/typeStyle';
import { hapticFor } from '@/motion/haptics';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { publishVoiceCommand, subscribeToVoiceCommands } from '@/voice/commandChannel';
import { useDirection } from './DirectionScope';
import { copilotTurn, run, voiceStateWords, type CopilotTurn } from './content';
import { ErrorBlock, PermissionBlock, StateChip, VoicePresence } from './parts';

export function CopilotScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const { direction, state } = useDirection();
  const reducedMotion = useReducedMotion();
  const [turn, setTurn] = useState<CopilotTurn>(copilotTurn);
  const amplitude = useSharedValue(0.3);
  const press = useSharedValue(0);

  // The real voice path: the engine publishes a command, this screen hears
  // it and says what it understood.
  useEffect(() => {
    const unsubscribe = subscribeToVoiceCommands((command) => {
      if (command.type === 'mark_delivered') {
        setTurn({
          state: 'speaking',
          last: 'Stop 45 is delivered. 17 stops left.',
          intent: 'Marked stop 45 as delivered',
          heard: 'Delivered',
        });
        hapticFor('deliver');
      }
      if (command.type === 'mark_skipped') {
        setTurn({
          state: 'speaking',
          last: 'Stop 45 skipped. 17 stops left.',
          intent: 'Marked stop 45 as skipped',
          heard: 'Skip',
        });
      }
    });
    return unsubscribe;
  }, []);

  // The microphone: the width of the band is the sound, and it stops when
  // the sound stops. Nothing loops.
  useEffect(() => {
    amplitude.value = withTiming(turn.state === 'listening' ? 0.86 : 0.22, {
      duration: reducedMotion ? 0 : 220,
    });
  }, [amplitude, reducedMotion, turn.state]);

  const onTalk = useCallback(() => {
    // The lab's control stands in for the microphone and publishes the same
    // command the voice engine publishes.
    hapticFor('voice');
    setTurn((current) => ({ ...current, state: 'thinking' }));
    publishVoiceCommand({ type: 'mark_delivered', stopId: 'current' });
  }, []);

  const bandStyle = useAnimatedStyle(() => ({
    width: `${Math.round(amplitude.value * 100)}%`,
  }));

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: press.value * 2 }],
  }));

  if (state === 'error') {
    return (
      <View testID="copilot-screen" style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <View style={styles.stateBlock}>
          <ErrorBlock message="The voice engine stopped." action="Start it again" onAction={onTalk} />
        </View>
      </View>
    );
  }

  if (state === 'denied') {
    return (
      <View testID="copilot-screen" style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <View style={styles.stateBlock}>
          <PermissionBlock
            message="The microphone is off, so Copilot cannot hear you."
            action="Open the microphone setting"
            onAction={onTalk}
          />
        </View>
      </View>
    );
  }

  const word = voiceStateWords[turn.state];

  return (
    <View
      testID="copilot-screen"
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
      accessibilityLabel={`Copilot, ${direction.displayName} direction`}
    >
      <Animated.View
        entering={reducedMotion ? undefined : FadeIn.duration(direction.motion.durationMs)}
        style={styles.body}
      >
        {state === 'offline' ? <StateChip kind="offline" queued={run.queuedActions} /> : null}
        {state === 'partial' ? (
          <StateChip kind="partial" queued={run.queuedActions} onRetry={() => undefined} />
        ) : null}

        <View style={styles.stateRow}>
          <Text
            style={[
              typeStyle(direction.type.title),
              { color: theme.colors.textPrimary },
              direction.name === 'nightShift' ? styles.nightState : null,
            ]}
            accessibilityRole="heading"
            accessibilityLabel={`Copilot is ${word.toLowerCase()}`}
            testID="copilot-state"
          >
            {word}
          </Text>
          {direction.name === 'hapticCity' ? (
            <View
              style={[
                styles.hapticMark,
                {
                  backgroundColor: theme.colors.textPrimary,
                  borderRadius: turn.state === 'listening' ? 4 : turn.state === 'thinking' ? 2 : 12,
                  width: turn.state === 'thinking' ? 28 : 18,
                  height: turn.state === 'thinking' ? 8 : 18,
                },
              ]}
            />
          ) : null}
        </View>

        {direction.name === 'gantryRun' ? (
          <Animated.View
            entering={reducedMotion ? undefined : SlideInDown.duration(direction.motion.durationMs)}
            style={[
              styles.gantrySign,
              {
                backgroundColor: theme.colors.textPrimary,
                borderRadius: direction.radii.card,
              },
            ]}
            testID="copilot-sign"
          >
            <Text
              style={[
                typeStyle(direction.type.caption),
                styles.gantrySignLabel,
                { color: theme.colors.textInverse },
              ]}
            >
              {turn.heard.toUpperCase()}
            </Text>
            <Text style={[typeStyle(direction.type.address), { color: theme.colors.textInverse }]}>
              {turn.last}
            </Text>
          </Animated.View>
        ) : (
          <Text
            style={[typeStyle(direction.type.address), { color: theme.colors.textPrimary }]}
            testID="copilot-last"
            accessibilityLabel={`Copilot said, ${turn.last}`}
          >
            {turn.last}
          </Text>
        )}

        <View style={[styles.intentRow, { borderTopColor: theme.colors.border }]}>
          <Text style={[typeStyle(direction.type.label), { color: theme.colors.textSecondary }]}>
            Understood
          </Text>
          <Text
            style={[typeStyle(direction.type.body), { color: theme.colors.textPrimary }]}
            testID="copilot-intent"
          >
            {turn.intent}
          </Text>
        </View>

        {direction.name === 'weatherLight' ? (
          <View style={styles.bandBlock}>
            <View style={[styles.bandTrack, { backgroundColor: theme.colors.surfaceElevated }]}>
              <Animated.View
                style={[styles.band, { backgroundColor: theme.colors.brandPrimary }, bandStyle]}
              />
            </View>
            <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
              {turn.heard ? `Heard: ${turn.heard}` : 'Say what you need'}
            </Text>
          </View>
        ) : null}

        {direction.name === 'nightShift' ? (
          <View style={styles.nightBlock}>
            <Animated.View
              style={[styles.nightLine, { backgroundColor: theme.colors.brandPrimary }, bandStyle]}
            />
            <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}>
              {turn.heard ? `Heard: ${turn.heard}` : 'Say what you need'}
            </Text>
          </View>
        ) : null}
      </Animated.View>

      <View style={styles.control}>
        {/* The press movement runs on the UI thread, so it lives on an
            animated view around the target, the way the rest of the app does
            it (`src/voice/VoiceButton.tsx`). */}
        <Animated.View style={pressStyle}>
          <Pressable
            onPress={onTalk}
            onPressIn={() => {
              press.value = withSpring(1, { damping: 34, stiffness: 320, mass: 0.9 });
            }}
            onPressOut={() => {
              press.value = withSpring(0, { damping: 30, stiffness: 260, mass: 1.2 });
            }}
            accessibilityRole="button"
            accessibilityLabel="Talk to Copilot"
            accessibilityHint="Speaks to the assistant, the way the microphone does"
            testID="copilot-talk"
            style={[
              styles.talkTarget,
              {
                backgroundColor: theme.colors.textPrimary,
                borderRadius: direction.radii.control,
              },
            ]}
          >
            <MaterialCommunityIcons name="microphone" size={24} color={theme.colors.textInverse} />
            <Text style={[typeStyle(direction.type.row), { color: theme.colors.textInverse }]}>
              {`Hold to talk · ${word}`}
            </Text>
          </Pressable>
        </Animated.View>

        <VoicePresence state={turn.state} queued={run.queuedActions} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1, padding: 24, gap: 16 },
  stateBlock: { padding: 24 },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  nightState: { letterSpacing: -0.02 },
  hapticMark: {},
  intentRow: { borderTopWidth: 1, paddingTop: 16, gap: 4 },
  bandBlock: { gap: 8 },
  bandTrack: { height: 12, borderRadius: 6, overflow: 'hidden' },
  band: { height: 12, borderRadius: 6 },
  nightBlock: { gap: 8 },
  nightLine: { height: 2, borderRadius: 1 },
  gantrySign: { padding: 20, gap: 8 },
  gantrySignLabel: { letterSpacing: 0.12 },
  control: { padding: 24, gap: 16 },
  talkTarget: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
});
