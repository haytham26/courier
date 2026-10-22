/**
 * The states of the lab screens.
 *
 * The contract (`docs/design/SYSTEM.md` §4) gives every screen of the
 * product seven states, and a direction that shows a state as an afterthought
 * is a FAIL on REVIEW-J. These are the pieces every direction of this team
 * builds its states from: a skeleton for the loading, one plain sentence and
 * a recovery action for the error, one line and the system setting for the
 * refused permission, and a chip for the actions waiting for the network.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import type { LabDirection } from '@courier/design-tokens/lab-directions';
import { typeStyle } from './labTheme';

/**
 * The skeleton of a loading screen.
 *
 * A skeleton, never a spinner: the contract does not let a spinner run for
 * more than 300 ms and a courier reads a skeleton as "the day is coming".
 */
export function LabSkeleton({
  lines = 3,
  testID = 'lab-skeleton',
}: {
  direction: LabDirection;
  lines?: number;
  testID?: string;
}): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <View style={styles.skeleton} accessibilityRole="text" accessibilityLabel="Loading" testID={testID}>
      {Array.from({ length: lines }, (_, index) => (
        <View
          key={index}
          style={[
            styles.skeletonLine,
            {
              backgroundColor: theme.colors.surfaceElevated,
              width: index === 0 ? '100%' : index === 1 ? '72%' : '48%',
            },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * A state that says what happened and what to do next.
 *
 * One plain sentence and the recovery action on the screen (REVIEW-J3), or
 * one line and the system setting when a permission was refused
 * (REVIEW-J5).
 */
export function LabMessage({
  direction,
  title,
  message,
  action,
  onAction,
  testID,
}: {
  direction: LabDirection;
  title: string;
  message: string;
  action?: string;
  onAction?: () => void;
  testID?: string;
}): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <View style={styles.message} accessibilityRole="text" testID={testID}>
      <Text style={[typeStyle(direction.type.title), { color: theme.colors.textPrimary }]}>
        {title}
      </Text>
      <Text
        style={[typeStyle(direction.type.body), { color: theme.colors.textSecondary }]}
        accessibilityRole="text"
      >
        {message}
      </Text>
      {action && onAction ? (
        <Pressable
          onPress={onAction}
          style={[styles.action, { borderColor: theme.colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={action}
          testID={`${testID ?? 'lab-message'}-action`}
        >
          <Text style={[typeStyle(direction.type.body), { color: theme.colors.textPrimary }]}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * The chip that says how many actions are waiting for the network.
 *
 * A chip, never a blocking dialog (REVIEW-J4). The word is in the chip, so
 * the state is never colour alone.
 */
export function LabOfflineChip({
  direction,
  label,
  queued,
  onRetry,
}: {
  direction: LabDirection;
  label: string;
  queued: number;
  onRetry?: () => void;
}): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <View
      style={[styles.chip, { borderColor: theme.colors.warning }]}
      accessibilityRole="text"
      accessibilityLabel={label}
      testID="offline-chip"
    >
      <Text style={[typeStyle(direction.type.caption), { color: theme.colors.warning }]}>{label}</Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={styles.retry}
          accessibilityRole="button"
          accessibilityLabel="Retry the sync"
          testID="offline-retry"
        >
          <Text style={[typeStyle(direction.type.caption), { color: theme.colors.textPrimary }]}>
            Retry
          </Text>
        </Pressable>
      ) : null}
      <Text
        style={[typeStyle(direction.type.caption), { color: theme.colors.textTertiary }]}
        accessibilityElementsHidden
      >
        {String(queued)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: { gap: 12, padding: 16 },
  skeletonLine: { height: 20, borderRadius: 4 },
  message: { padding: 24, gap: 12 },
  action: {
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retry: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 8 },
});
