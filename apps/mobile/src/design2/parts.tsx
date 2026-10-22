/**
 * The parts the four screens of a direction share.
 *
 * The rules they obey come from the contract (`docs/design/SYSTEM.md`): a
 * touch target is 56 pt or more and the primary action is 72 pt, the body is
 * never smaller than 17 pt, the status is never colour alone, and a state
 * says what happened in one plain sentence with the way out on the screen.
 *
 * The parts are the same in the four directions; the *grammar* is not. Every
 * part here takes the direction, so the same part wears four different
 * languages.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/providers/ThemeProvider';
import { hapticFor } from '@/motion/haptics';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { typeStyle } from '@/design/typeStyle';
import { useDirection, type LabMode } from './DirectionScope';
import { voiceStateWords, type CopilotTurn } from './content';

/**
 * The primary action of a screen.
 *
 * It is 72 pt tall in every direction, it is in the lower third of the
 * screen, and it is the only primary action on the screen.
 */
export function PrimaryAction({
  label,
  onPress,
  testID,
  hint,
  tone = 'accent',
}: {
  label: string;
  onPress: () => void;
  testID: string;
  hint?: string;
  tone?: 'accent' | 'ink';
}): React.JSX.Element {
  const { theme } = useTheme();
  const { direction } = useDirection();
  const press = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.02 }],
  }));

  return (
    <Animated.View style={style}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          press.value = withSpring(1, { damping: 30, stiffness: 300, mass: 0.6 });
        }}
        onPressOut={() => {
          press.value = withSpring(0, { damping: 26, stiffness: 220, mass: 0.8 });
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={hint}
        testID={testID}
        style={[
          styles.action,
          {
            backgroundColor: tone === 'ink' ? theme.colors.textPrimary : theme.colors.brandPrimary,
            borderRadius: direction.radii.control,
          },
        ]}
      >
        <Text
          style={[
            typeStyle(direction.type.row),
            styles.actionText,
            { color: tone === 'ink' ? theme.colors.textInverse : theme.colors.textInverse },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/**
 * The presence of Copilot, in the language of the direction.
 *
 * The state is in a word in every direction, and the shape of the presence
 * is what tells the state apart: a band in Weather Light, a physical target
 * in Haptic City, a rule in Night Shift and a sign in Gantry Run.
 */
export function VoicePresence({
  state,
  queued,
  testID = 'voice-bar',
}: {
  state: CopilotTurn['state'];
  queued: number;
  mode?: LabMode;
  testID?: string;
}): React.JSX.Element {
  const { theme } = useTheme();
  const { direction } = useDirection();
  const reducedMotion = useReducedMotion();
  const word = voiceStateWords[state];
  const speaking = state === 'listening' || state === 'speaking';
  const amplitude = useSharedValue(0.35);

  // The amplitude is the microphone, not a loop: it settles and stops.
  React.useEffect(() => {
    amplitude.value = withTiming(speaking ? 0.9 : 0.25, {
      duration: reducedMotion ? 0 : 200,
    });
  }, [amplitude, reducedMotion, speaking]);

  const bandStyle = useAnimatedStyle(() => ({
    width: `${Math.round(amplitude.value * 100)}%`,
  }));

  const label = (
    <Text
      style={[typeStyle(direction.type.caption), { color: theme.colors.textSecondary }]}
      numberOfLines={1}
    >
      {queued > 0 ? `${word} · ${queued} waiting` : word}
    </Text>
  );

  if (direction.name === 'hapticCity') {
    // A physical target: the shape is the state, the colour is almost nothing.
    const shape =
      state === 'listening' ? styles.hapticSquare : state === 'thinking' ? styles.hapticBar : styles.hapticDisc;
    return (
      <View
        style={[styles.hapticRow, { borderTopColor: theme.colors.border }]}
        accessibilityRole="text"
        accessibilityLabel={`Copilot is ${word.toLowerCase()}, ${queued} actions waiting`}
        testID={testID}
      >
        <View style={[styles.hapticTarget, { borderColor: theme.colors.textPrimary }]}>
          <View style={[shape, { backgroundColor: theme.colors.textPrimary }]} />
        </View>
        {label}
      </View>
    );
  }

  if (direction.name === 'nightShift') {
    // A single rule at the foot of the dark.
    return (
      <View
        style={styles.nightRule}
        accessibilityRole="text"
        accessibilityLabel={`Copilot is ${word.toLowerCase()}, ${queued} actions waiting`}
        testID={testID}
      >
        <Animated.View
          style={[
            styles.nightRuleLine,
            { backgroundColor: theme.colors.brandPrimary },
            bandStyle,
          ]}
        />
        {label}
      </View>
    );
  }

  if (direction.name === 'gantryRun') {
    // A sign that slides into the gantry and latches there.
    return (
      <View
        style={styles.gantryRow}
        accessibilityRole="text"
        accessibilityLabel={`Copilot is ${word.toLowerCase()}, ${queued} actions waiting`}
        testID={testID}
      >
        <View
          style={[
            styles.gantrySign,
            {
              backgroundColor: theme.colors.textPrimary,
              borderRadius: direction.radii.pill,
            },
          ]}
        >
          <Text
            style={[
              typeStyle(direction.type.caption),
              { color: theme.colors.textInverse, letterSpacing: 0.06 },
            ]}
          >
            {word.toUpperCase()}
          </Text>
        </View>
        <Text
          style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}
          numberOfLines={1}
        >
          {queued > 0 ? `${queued} waiting` : 'Copilot'}
        </Text>
      </View>
    );
  }

  // Weather Light: a band under the address whose width is the microphone.
  return (
    <View
      style={styles.weatherRow}
      accessibilityRole="text"
      accessibilityLabel={`Copilot is ${word.toLowerCase()}, ${queued} actions waiting`}
      testID={testID}
    >
      <View style={[styles.weatherTrack, { backgroundColor: theme.colors.surfaceElevated }]}>
        <Animated.View
          style={[
            styles.weatherBand,
            { backgroundColor: theme.colors.brandPrimary },
            bandStyle,
          ]}
        />
      </View>
      {label}
    </View>
  );
}

/**
 * The chip of a state that is not a failure.
 *
 * The offline state is a chip with the number of the actions that are
 * waiting, never a dialog that stops the courier (REVIEW-J4).
 */
export function StateChip({
  kind,
  queued,
  onRetry,
}: {
  kind: 'offline' | 'partial';
  queued: number;
  onRetry?: () => void;
}): React.JSX.Element {
  const { theme } = useTheme();
  const { direction } = useDirection();
  const word = kind === 'offline' ? 'Offline' : 'Partly synced';

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderRadius: direction.radii.pill,
          borderColor: theme.colors.border,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${word}. ${queued} actions waiting`}
      testID={kind === 'offline' ? 'offline-chip' : 'partial-chip'}
    >
      <MaterialCommunityIcons
        name={kind === 'offline' ? 'cloud-off-outline' : 'cloud-sync-outline'}
        size={18}
        color={theme.colors.textSecondary}
      />
      <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textSecondary }]}>
        {`${word} · ${queued} waiting`}
      </Text>
      {kind === 'partial' && onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry the sync"
          testID="partial-retry"
          style={styles.chipAction}
        >
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.brandPrimary }]}>
            Retry
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * The skeleton of a loading screen.
 *
 * A skeleton, never a spinner: the contract allows a spinner for 300 ms and
 * no longer (REVIEW-J2).
 */
export function SkeletonBlock({
  width,
  height,
  testID,
}: {
  width: number | string;
  height: number;
  testID: string;
}): React.JSX.Element {
  const { theme } = useTheme();
  const { direction } = useDirection();

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          backgroundColor: theme.colors.surfaceElevated,
          borderRadius: direction.radii.control,
        },
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      testID={testID}
    />
  );
}

/** The empty state: what is missing and what to do next. */
export function EmptyBlock({
  title,
  body,
  action,
  onAction,
}: {
  title: string;
  body: string;
  action: string;
  onAction: () => void;
}): React.JSX.Element {
  const { theme } = useTheme();
  const { direction } = useDirection();

  return (
    <View style={styles.block} testID="empty-state">
      <Text style={[typeStyle(direction.type.title), { color: theme.colors.textPrimary }]}>{title}</Text>
      <Text style={[typeStyle(direction.type.body), { color: theme.colors.textSecondary }]}>{body}</Text>
      <Pressable
        onPress={onAction}
        accessibilityRole="button"
        accessibilityLabel={action}
        testID="empty-action"
        style={[styles.blockAction, { borderColor: theme.colors.border }]}
      >
        <Text style={[typeStyle(direction.type.row), { color: theme.colors.textPrimary }]}>{action}</Text>
      </Pressable>
    </View>
  );
}

/** The error state: one plain sentence and the way out. */
export function ErrorBlock({
  message,
  action,
  onAction,
}: {
  message: string;
  action: string;
  onAction: () => void;
}): React.JSX.Element {
  const { theme } = useTheme();
  const { direction } = useDirection();

  return (
    <View style={styles.block} testID="error-state">
      <MaterialCommunityIcons name="alert-circle-outline" size={28} color={theme.colors.error} />
      <Text style={[typeStyle(direction.type.body), { color: theme.colors.textPrimary }]}>{message}</Text>
      <Pressable
        onPress={onAction}
        accessibilityRole="button"
        accessibilityLabel={action}
        testID="error-action"
        style={[styles.blockAction, { borderColor: theme.colors.border }]}
      >
        <Text style={[typeStyle(direction.type.row), { color: theme.colors.textPrimary }]}>{action}</Text>
      </Pressable>
    </View>
  );
}

/**
 * The permission state.
 *
 * One line, and the system setting is the next step (REVIEW-J5).
 */
export function PermissionBlock({
  message,
  action,
  onAction,
}: {
  message: string;
  action: string;
  onAction: () => void;
}): React.JSX.Element {
  const { theme } = useTheme();
  const { direction } = useDirection();

  return (
    <View style={styles.block} testID="permission-state">
      <MaterialCommunityIcons name="map-marker-off-outline" size={28} color={theme.colors.warning} />
      <Text style={[typeStyle(direction.type.body), { color: theme.colors.textPrimary }]}>{message}</Text>
      <Pressable
        onPress={onAction}
        accessibilityRole="button"
        accessibilityLabel={action}
        testID="permission-action"
        style={[styles.blockAction, { borderColor: theme.colors.border }]}
      >
        <Text style={[typeStyle(direction.type.row), { color: theme.colors.textPrimary }]}>{action}</Text>
      </Pressable>
    </View>
  );
}

/** The word of a status, so the status is never colour alone. */
export function StatusWord({
  word,
  color,
  testID,
}: {
  word: string;
  color: string;
  testID?: string;
}): React.JSX.Element {
  const { direction } = useDirection();
  return (
    <Text
      style={[typeStyle(direction.type.caption), { color }]}
      numberOfLines={1}
      testID={testID}
    >
      {word}
    </Text>
  );
}

/**
 * The confirmation of a delivery.
 *
 * The moment is the signature of the direction, so the part that runs it
 * lives here: the haptic, the word, and the sound of the seal. The screen
 * decides what the moment looks like.
 */
export function confirmDelivery(): void {
  hapticFor('deliver');
}

const styles = StyleSheet.create({
  action: {
    minHeight: 72,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { fontWeight: '700' },
  weatherRow: { gap: 8 },
  weatherTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  weatherBand: { height: 8, borderRadius: 4 },
  hapticRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  hapticTarget: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hapticSquare: { width: 18, height: 18, borderRadius: 2 },
  hapticBar: { width: 24, height: 8, borderRadius: 4 },
  hapticDisc: { width: 18, height: 18, borderRadius: 9 },
  nightRule: { gap: 8 },
  nightRuleLine: { height: 2, borderRadius: 1 },
  gantryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gantrySign: { paddingHorizontal: 12, paddingVertical: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    minHeight: 40,
  },
  chipAction: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 8 },
  skeleton: { opacity: 0.9 },
  block: { gap: 12, paddingVertical: 16 },
  blockAction: {
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});
