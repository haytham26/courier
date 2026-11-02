import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Providers } from '@/providers/Providers';
import { useAuth } from '@/providers/AuthProvider';
import { RunProvider } from '@/maps/runState';
import { runStoreForThisBuild } from '@/run/productionRunStore';
import type { MarkStore } from '@/run/types';
import { ScanLoadProvider } from '@/scans/scanLoad';
import { DEV_SCREENS_IN_BUNDLE } from '@/config/buildFlags';
import '@/unistyles';

// The root layout's anchor: the route expo-router seeds IN FRONT OF whatever
// the launch URL matches (createSeededNavigationState's getRoutesToCreate).
// Run 41362984260's device dump proved what happens without it: the launch URL
// '/' seeds the protected (tabs) group, the signed-out guard strips that route
// from the navigation state (useClearGuardedRoutes), and the state collapses to
// +not-found - the a1 flow waited its whole 60 s for welcome-screen and the
// welcome effect's router.replace, enqueued in the same commit the Stack first
// mounts, never landed. With the anchor, the seeded state is [welcome, (tabs)]:
// the guard removes the tabs and the welcome is what stays focused, while a
// signed-in phone still focuses the tabs (the anchor sits behind the target,
// and the signed-in guard strips the welcome the same way). The (auth) and
// (tabs) layouts carry the same setting under its older `initialRouteName`
// spelling; `anchor` is the non-deprecated key (layoutAnchor.readAnchor).
export const unstable_settings = {
  anchor: 'welcome',
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Providers>
        <AuthNavigator />
      </Providers>
    </GestureHandlerRootView>
  );
}

/**
 * The run state of one session (A1's run store, wired).
 *
 * Keyed to the session by the caller, so this remounts on a sign-in or a
 * sign-out: the store a session opened is closed with it, the marks and the
 * cached day leave the phone, and the next courier reads their own day and
 * not the previous one's.
 */
function RunSession({ children }: { children: React.ReactNode }) {
  const [runStore] = useState<MarkStore>(() => runStoreForThisBuild());

  return <RunProvider store={runStore}>{children}</RunProvider>;
}

function AuthNavigator() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  // The signed-out COLD START is the anchor's job (unstable_settings above:
  // run 41362984260 showed the imperative replace alone does not land on
  // device). This effect covers the other signed-out landing: a sign-out while
  // a protected screen is focused strips that route from the state without
  // re-seeding the anchor, so the phone is sent to the welcome explicitly. A
  // signed-in phone needs nothing - '/' is the tabs' index. The loading phase
  // still renders nothing, so the run state's key never flips while the
  // restore is pending (the reverted 483a5ef/aa2672e attempts are why this is
  // an effect, not a render of the stack).
  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    router.replace('/welcome');
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return null; // Or show a loading screen
  }

  return (
    // The run state (the delivered marks) lives above the stack, keyed to
    // the auth state: a sign-out remounts it, so the marks never leak
    // across sessions.
    <RunSession key={isAuthenticated ? 'session' : 'anon'}>
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
            {/* Copilot over the map (screen 07): opened by the D34 sphere's
                tap, which starts talking, so the driver sees the conversation
                while it happens. */}
            <Stack.Screen name="copilot" />
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
        </Stack>
      </ScanLoadProvider>
    </RunSession>
  );
}