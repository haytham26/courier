/**
 * The Voice Ribbon.
 *
 * The signature of the direction: a live amplitude ribbon along the bottom
 * edge of the screen, drawn from the level of the microphone. The ribbon is
 * the interface - it replaces the voice button - so it is never a decoration
 * and it never loops: the bars are the level, and a silent microphone is a
 * flat line.
 *
 * The bars are drawn with plain views and animated on the UI thread with
 * Reanimated 4, so the ribbon keeps up with the voice without asking the
 * JavaScript thread for a frame.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';
import { useReducedMotion } from '@/motion/useReducedMotion';
import type { LabDirection } from '@courier/design-tokens/lab-directions';
import { typeStyle } from './labTheme';
import { MicrophoneLevel, useMicrophonePermission } from '@/voice/useMicrophoneLevel';

/** How many bars the ribbon is drawn with. */
const BARS = 21;

/** The spring of the ribbon, from the motion language of the direction. */
const RIBBON_SPRING = { damping: 34, stiffness: 320, mass: 0.9 };

/** The height of the tallest bar, in points. */
const MAX_BAR = 28;

interface VoiceRibbonProps {
  direction: LabDirection;
  /** The state of the assistant, in words. */
  state: string;
  /** Whether the assistant is listening right now. */
  listening: boolean;
  /** The actions waiting for the network. */
  queued: number;
  /** The shared value the ribbon reads. The screen owns it. */
  level: SharedValue<number>;
}

/**
 * One bar of the ribbon.
 *
 * The height is the level times a shape: the middle of the ribbon is the
 * loudest, the ends fall away, so the ribbon reads as a voice and not as a
 * row of equal blocks.
 */
function RibbonBar({
  level,
  index,
  color,
}: {
  level: SharedValue<number>;
  index: number;
  color: string;
}): React.JSX.Element {
  const position = index / (BARS - 1);
  /** The weight of this bar in the shape: 1 in the middle, 0.35 at the ends. */
  const weight = 0.35 + 0.65 * Math.sin(Math.PI * position);

  const style = useAnimatedStyle(() => ({
    height: Math.max(2, level.value * MAX_BAR * weight),
    opacity: 0.45 + 0.55 * Math.min(1, level.value * 1.6),
  }));

  return <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />;
}

/**
 * The ribbon, with the state of the assistant written under it.
 *
 * The state is a word, never a colour alone (REVIEW-L4), and the ribbon is
 * 64 dp high so it is a target the courier can hit with a glove on.
 */
export function VoiceRibbon({
  direction,
  state,
  listening,
  queued,
  level,
}: VoiceRibbonProps): React.JSX.Element {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const microphone = useMicrophonePermission(listening);

  // The spring that carries the level to the bars. It runs on the UI thread,
  // so the ribbon is smooth even while the JavaScript thread is busy with
  // the transcription.
  const smoothed = useDerivedValue(
    () => (reducedMotion ? level.value : withSpring(level.value, RIBBON_SPRING)),
    [level, reducedMotion],
  );

  const ribbonColor = listening ? theme.colors.brandPrimary : theme.colors.textTertiary;

  return (
    <View
      style={[styles.ribbon, { backgroundColor: theme.colors.surface }]}
      accessibilityRole="text"
      accessibilityLabel={`Copilot is ${state.toLowerCase()}, ${queued} actions waiting`}
      testID="voice-ribbon"
    >
      <View style={styles.bars}>
        {Array.from({ length: BARS }, (_, index) => (
          <RibbonBar key={index} level={smoothed} index={index} color={ribbonColor} />
        ))}
      </View>
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: ribbonColor }]} />
        <Text
          style={[typeStyle(direction.type.caption), { color: theme.colors.textSecondary }]}
          numberOfLines={1}
        >
          {state}
        </Text>
        {queued > 0 ? (
          <Text
            style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}
            numberOfLines={1}
          >
            {`${queued} waiting`}
          </Text>
        ) : null}
      </View>
      {microphone === 'granted' ? (
        <MicrophoneLevel level={level} active={listening} />
      ) : null}
    </View>
  );
}

/**
 * The shared value the ribbon reads.
 *
 * The screen owns it, so the level survives the ribbon being re-rendered
 * when the state of the assistant changes.
 */
export function useRibbonLevel(): SharedValue<number> {
  return useSharedValue(0);
}

const styles = StyleSheet.create({
  ribbon: {
    height: 64,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: MAX_BAR,
  },
  bar: { width: 3, borderRadius: 2, minHeight: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
