/**
 * The root stack's routes: every screen a flow can land on is registered.
 *
 * expo-router navigates by the FILE name, and a screen whose route is not
 * registered in the root `Stack` is unreachable: `router.navigate('/summary')`
 * does nothing at all, which is exactly how the summary flow failed on its
 * first emulator run (the app stayed on Today). The routes the app owns outside
 * the tabs are asserted here, so a new screen cannot ship without its
 * registration. When a screen lands, its route joins this list.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import RootLayout, { unstable_settings } from '../_layout';

/** The route names the root Stack registers, recorded by the mock Screen. */
const mockRegisteredRoutes: string[] = [];

/** The router the root layout drives, recorded per call. */
const mockRouter = { navigate: jest.fn(), push: jest.fn(), replace: jest.fn() };

jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const Stack = ({ children }: { children?: React.ReactNode }) =>
    ReactActual.createElement(ReactActual.Fragment, null, children);
  Stack.Protected = ({ children }: { children?: React.ReactNode }) =>
    ReactActual.createElement(ReactActual.Fragment, null, children);
  Stack.Screen = ({ name }: { name: string }) => {
    mockRegisteredRoutes.push(name);
    return null;
  };
  return {
    Stack,
    useRouter: () => mockRouter,
  };
});

/** The session the mocked provider answers with. */
type MockAuthState = { isLoading: boolean; isAuthenticated: boolean; user: { id: string } | null };

jest.mock('@/providers/AuthProvider', () => {
  // The session the provider answers with, so a test can render the
  // signed-out phone (the a1 job's case) as well as the signed-in one.
  const state: MockAuthState = { isLoading: false, isAuthenticated: true, user: { id: 'driver-1' } };
  return {
    useAuth: () => state,
    __setAuthState: (next: Partial<MockAuthState>) => {
      Object.assign(state, next);
    },
  };
});

jest.mock('@/providers/Providers', () => ({
  Providers: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/maps/runState', () => ({
  RunProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// The root layout hands the run state its store; this suite asserts the routes
// the stack registers, not the store, so the store is a mock here.
jest.mock('@/run/productionRunStore', () => ({
  runStoreForThisBuild: () => ({
    markDelivered: () => Promise.resolve(),
    undoDelivered: () => Promise.resolve(),
    deliveredMarks: () => Promise.resolve([]),
    close: () => Promise.resolve(),
  }),
}));

jest.mock('@/scans/scanLoad', () => ({
  ScanLoadProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/config/buildFlags', () => ({ DEV_SCREENS_IN_BUNDLE: false }));

describe('the root stack', () => {
  it('registers the routes the app owns outside the tabs', () => {
    mockRegisteredRoutes.length = 0;
    render(
      <GestureHandlerRootView>
        <RootLayout />
      </GestureHandlerRootView>,
    );

    expect(mockRegisteredRoutes).toContain('(tabs)');
    expect(mockRegisteredRoutes).toContain('scan');
    expect(mockRegisteredRoutes).toContain('driving');
    expect(mockRegisteredRoutes).toContain('delivered');
    expect(mockRegisteredRoutes).toContain('driving-night');
    // The summary route rides this branch: the end-of-day action navigates to
    // it, and a screen nobody can open is dead code (the flow that caught this
    // is what this row is for).
    expect(mockRegisteredRoutes).toContain('summary');
  });

  it('registers the routes the app owns outside the tabs', () => {
    mockRegisteredRoutes.length = 0;
    render(
      <GestureHandlerRootView>
        <RootLayout />
      </GestureHandlerRootView>,
    );

    expect(mockRegisteredRoutes).toContain('(tabs)');
    expect(mockRegisteredRoutes).toContain('scan');
    expect(mockRegisteredRoutes).toContain('driving');
    expect(mockRegisteredRoutes).toContain('delivered');
    expect(mockRegisteredRoutes).toContain('driving-night');
  });

  it('sends the signed-out phone to the welcome, not the router\'s not-found (the a1 job\'s screen)', () => {
    // Run 41326369521's device dump: the root Stack mounts only after the
    // 8 s session-restore bound, and the launch URL '/' matches no screen
    // of the signed-out stack, so the a1 flow saw `not-found-screen` and
    // waited 60 s for `welcome-screen`. The signed-out phone must be sent
    // to the welcome explicitly; the signed-in one needs nothing ('/' is
    // the tabs' index, which is why the mock legs were always green).
    const { __setAuthState } = jest.requireMock<{
      __setAuthState: (next: Partial<MockAuthState>) => void;
    }>('@/providers/AuthProvider');

    __setAuthState({ isLoading: false, isAuthenticated: false, user: null });
    mockRouter.replace.mockClear();
    render(
      <GestureHandlerRootView>
        <RootLayout />
      </GestureHandlerRootView>,
    );
    expect(mockRouter.replace).toHaveBeenCalledWith('/welcome');

    __setAuthState({ isLoading: false, isAuthenticated: true, user: { id: 'driver-1' } });
    mockRouter.replace.mockClear();
    render(
      <GestureHandlerRootView>
        <RootLayout />
      </GestureHandlerRootView>,
    );
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("anchors the root layout on the welcome (run 41362984260's signed-out launch)", () => {
    // Run 41362984260's device dump: the welcome effect above fires, but its
    // router.replace is enqueued in the same commit the Stack first mounts and
    // never lands - the phone sat on not-found-screen for the flow's whole 60 s.
    // Root cause in expo-router 58: the launch URL '/' seeds the protected
    // (tabs) group, the signed-out guard strips that route from the navigation
    // state (useClearGuardedRoutes), and with no anchor on the root layout the
    // state collapses to +not-found. The anchor is the route expo-router seeds
    // in front of the target (createSeededNavigationState's getRoutesToCreate),
    // so with it the seeded state is [welcome, (tabs)]: the guard removes the
    // tabs and the welcome stays focused, while a signed-in phone still
    // focuses the tabs (the anchor sits behind the target). The (auth) and
    // (tabs) layouts carry the same setting as `initialRouteName`.
    expect(unstable_settings).toEqual({ anchor: 'welcome' });
  });
});
