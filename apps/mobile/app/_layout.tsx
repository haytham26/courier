import React from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Providers } from '@/providers/Providers';
import { useAuth } from '@/providers/AuthProvider';
import { RunProvider } from '@/maps/runState';
import { ScanLoadProvider } from '@/scans/scanLoad';
import { DEV_SCREENS_IN_BUNDLE } from '@/config/buildFlags';
import '@/unistyles';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Providers>
        <AuthNavigator />
      </Providers>
    </GestureHandlerRootView>
  );
}

function AuthNavigator() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return null; // Or show a loading screen
  }

  return (
    // The run state (the delivered marks) lives above the stack, keyed to
    // the auth state: a sign-out remounts it, so the marks never leak
    // across sessions.
    <RunProvider key={isAuthenticated ? 'session' : 'anon'}>
      {/* The scan load (the parcels the courier has read into the van) rides
          the same session: a sign-out remounts it and the van is empty. */}
      <ScanLoadProvider>
        <Stack
          id="root"
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
          }}
        >
          <Stack.Protected guard={isAuthenticated}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="scan" />
            <Stack.Screen name="driving" />
            <Stack.Screen name="delivered" />
            {/* The end of the day (screen 10): Today's End of day action opens
                it, and it is a root-stack route rather than a tab because the
                day is finished - the dock behind it has nothing selected. */}
            <Stack.Screen name="summary" />
            {/* The drive in the dark theme (screen 12): the same drive with
                the mode pinned, so the design gate compares light against
                dark side by side. */}
            <Stack.Screen name="driving-night" />
            {/* The lock screen's glance (screen 13): the run's Live Activity,
                which on a device is the OS surface. */}
            <Stack.Screen name="lock-screen" />
          </Stack.Protected>
          <Stack.Protected guard={!isAuthenticated}>
            {/* The welcome is a courier's first screen: it sits in front of the
                auth group so a signed-out phone opens on the mark, the line and
                the two ways in. The draft session (the E2E mode's mock) skips
                it entirely, which is what every flow expects. */}
            <Stack.Screen name="welcome" />
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        {/* The design lab is outside the guard: the founder has to be able to
            open the directions without signing in first. The lab is a
            diagnostic, so it is only in the dev and the E2E build
            (MASTER_EXECUTION §16.1.7). A release build has no such route, so
            the screen names below must not be registered there. */}
        {DEV_SCREENS_IN_BUNDLE ? <Stack.Screen name="design" /> : null}
        {DEV_SCREENS_IN_BUNDLE ? <Stack.Screen name="design2" /> : null}
        </Stack>
      </ScanLoadProvider>
    </RunProvider>
  );
}