/**
 * What a screen shows when it has nothing to show yet.
 *
 * The design system asks for all of them on every screen: a skeleton while it
 * loads (never a spinner that spins for minutes), a sentence that says what
 * is missing, and a plain sentence with a way out when it failed
 * (`docs/design/SYSTEM.md` §4).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { useTheme } from '@/providers/ThemeProvider';
import { fontSize, radius, space } from '@/styles/tokens';

interface LoadingSkeletonProps {
  /** The height of the placeholder (the size of what is loading). */
  height: number;
  testID?: string;
}

export function LoadingSkeleton({ height, testID }: LoadingSkeletonProps) {
  const { theme } = useTheme();

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[styles.skeleton, { height, backgroundColor: theme.colors.border, borderRadius: radius.md }]}
    />
  );
}

interface StateMessageProps {
  /** The plain sentence that says what is going on. */
  title: string;
  /** The extra line, when there is one to say. */
  message?: string;
  /** The way out ("Try again"). */
  actionLabel?: string;
  onAction?: () => void;
  /** 'warning' for a state that needs a look, 'error' when it went wrong. */
  tone?: 'neutral' | 'warning' | 'error';
  testID?: string;
}

export function StateMessage({
  title,
  message,
  actionLabel,
  onAction,
  tone = 'neutral',
  testID,
}: StateMessageProps) {
  const { theme } = useTheme();

  const toneColor =
    tone === 'error' ? theme.colors.error : tone === 'warning' ? theme.colors.warning : theme.colors.textSecondary;

  return (
    <View style={styles.container} testID={testID}>
      <Text style={[styles.title, { color: theme.colors.textPrimary, fontSize: fontSize.lg }]}>{title}</Text>
      {message !== undefined && (
        <Text style={[styles.message, { color: toneColor, fontSize: fontSize.base }]}>{message}</Text>
      )}
      {actionLabel !== undefined && onAction !== undefined && (
        <Button variant="outline" onPress={onAction} style={styles.action}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    width: '100%',
  },
  container: {
    paddingVertical: space.md,
    gap: space.xs,
  },
  title: {
    fontWeight: '600',
  },
  message: {
    fontWeight: '400',
  },
  action: {
    marginTop: space.sm,
    alignSelf: 'flex-start',
  },
});
