import React from 'react';
import { Text, View } from 'react-native';
import { Link, Stack } from 'expo-router';
import { useUnistyles } from 'react-native-unistyles';

/**
 * The screen for a link the app does not know.
 *
 * Without it, an unknown link (a stale notification, a deep link from a
 * colleague) crashes the router instead of showing where to go.
 */
export default function NotFoundScreen() {
  const { theme } = useUnistyles();

  return (
    <View
      testID="not-found-screen"
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: theme.colors.background,
      }}
    >
      <Stack.Screen options={{ title: 'Not found' }} />
      <Text
        role="heading"
        style={{
          fontSize: 22,
          fontWeight: '600',
          marginBottom: 12,
          color: theme.colors.textPrimary,
        }}
      >
        This link is not on today&apos;s route
      </Text>
      <Text
        style={{
          fontSize: 17,
          textAlign: 'center',
          marginBottom: 24,
          color: theme.colors.textSecondary,
        }}
      >
        The screen you were looking for is not part of the app. Head back to today&apos;s list and
        carry on.
      </Text>
      <Link
        href="/"
        accessibilityRole="link"
        accessibilityLabel="Go to today's list"
        style={{ fontSize: 17, fontWeight: '600', color: theme.colors.brandPrimary }}
      >
        Go to today&apos;s list
      </Link>
    </View>
  );
}
