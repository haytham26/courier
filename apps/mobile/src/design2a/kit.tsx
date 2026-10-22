/**
 * The parts of the lab screens that every direction shares.
 *
 * The content of a state is the same in the three directions - a skeleton, a
 * sentence and a recovery action, a chip with the number of queued actions -
 * but each direction dresses it in its own language: the type scale, the
 * corners and the rhythm of the direction decide how it looks.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import type { Direction2a } from '@courier/design-tokens/directions2a';
import { stepStyle } from './typeStyle';

/**
 * The loading state.
 *
 * A skeleton, never a spinner: the contract says no spinner runs longer than
 * 300 ms (`docs/design/SYSTEM.md` §4).
 */
export function LabSkeleton({
  rows = 4,
  testID,
}: {
  direction: Direction2a;
  rows?: number;
  testID?: string;
}): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <View testID={testID} style={styles.skeleton} accessibilityLabel="Loading the run">
      {Array.from({ length: rows }, (_unused, index) => (
        <View
          key={index}
          style={[
            styles.skeletonBar,
            {
              backgroundColor: theme.colors.border,
              opacity: 0.25,
              width: `${88 - index * 12}%`,
            },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * The empty, error and permission-denied states.
 *
 * One plain sentence and the recovery action, on the screen, never a
 * blocking dialog (`docs/design/REVIEW.md` REVIEW-J3 and J5).
 */
export function LabStateMessage({
  direction,
  title,
  body,
  action,
  onAction,
  testID,
}: {
  direction: Direction2a;
  title: string;
  body: string;
  action: string;
  onAction: () => void;
  testID?: string;
}): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <View
      testID={testID}
      style={[styles.message, { borderColor: theme.colors.border }]}
      accessibilityRole="text"
    >
      <Text
        style={[stepStyle(direction, 'label'), { color: theme.colors.textPrimary }]}
        accessibilityRole="header"
      >
        {title}
      </Text>
      <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textSecondary }]}>
        {body}
      </Text>
      <Pressable
        onPress={onAction}
        style={({ pressed }) => [
          styles.messageAction,
          {
            borderColor: theme.colors.border,
            borderRadius: direction.radii.control,
            opacity: pressed ? 0.6 : 1,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={action}
        testID={testID ? `${testID}-action` : undefined}
      >
        <Text style={[stepStyle(direction, 'body'), { color: theme.colors.textPrimary }]}>
          {action}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * The offline and partial-sync chip.
 *
 * The chip carries the number of actions that are waiting for the network.
 * It is never a blocking dialog, and in the partial-sync state it carries
 * the retry.
 */
export function LabChip({
  direction,
  queued,
  partial = false,
  onRetry,
  testID,
}: {
  direction: Direction2a;
  queued: number;
  partial?: boolean;
  onRetry?: () => void;
  testID?: string;
}): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <View
      testID={testID}
      style={[
        styles.chip,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: direction.radii.pill,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={
        partial
          ? `Part synced, ${queued} actions waiting, retry`
          : `Offline, ${queued} actions waiting`
      }
    >
      <MaterialCommunityIcons
        name={partial ? 'cloud-sync-outline' : 'cloud-off-outline'}
        size={18}
        color={theme.colors.textSecondary}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.textSecondary }]}>
        {partial ? `Part synced · ${queued} waiting` : `Offline · ${queued} waiting`}
      </Text>
      {partial && onRetry ? (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [styles.chipRetry, { opacity: pressed ? 0.6 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Retry the sync"
          testID={testID ? `${testID}-retry` : undefined}
        >
          <Text style={[stepStyle(direction, 'caption'), { color: theme.colors.brandPrimary }]}>
            Retry
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: { padding: 16, gap: 12 },
  skeletonBar: { height: 18, borderRadius: 2 },
  message: { margin: 16, padding: 16, borderWidth: 1, gap: 8 },
  messageAction: {
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  chipRetry: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 4 },
});
