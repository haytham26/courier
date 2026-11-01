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

import RootLayout from '../_layout';

/** The route names the root Stack registers, recorded by the mock Screen. */
const mockRegisteredRoutes: string[] = [];

/** The props the root Stack is mounted with, recorded per render. */
const mockStackProps: Array<Record<string, unknown>> = [];

jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const Stack = (props: { children?: React.ReactNode } & Record<string, unknown>) => {
    mockStackProps.push(props);
    return ReactActual.createElement(ReactActual.Fragment, null, props.children);
  };
  Stack.Protected = ({ children }: { children?: React.ReactNode }) =>
    ReactActual.createElement(ReactActual.Fragment, null, children);
  Stack.Screen = ({ name }: { name: string }) => {
    mockRegisteredRoutes.push(name);
    return null;
  };
  return {
    Stack,
    useRouter: () => ({ navigate: jest.fn(), push: jest.fn() }),
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

  it('names the stack\'s initial route for the session the phone already has (the a1 job\'s welcome screen)', () => {
    // Run 41326369521's device dump: the root Stack mounts only after the
    // 8 s session-restore bound, and with no initialRouteName the router
    // resolved the initial route against the empty stack, so the a1 flow
    // saw `not-found-screen` instead of `welcome-screen`. The stack must
    // name its initial route for the session the phone already has - the
    // signed-out phone opens on the welcome, the signed-in one on the tabs.
    const { __setAuthState } = jest.requireMock<{
      __setAuthState: (next: Partial<MockAuthState>) => void;
    }>('@/providers/AuthProvider');

    __setAuthState({ isLoading: false, isAuthenticated: false, user: null });
    mockStackProps.length = 0;
    render(
      <GestureHandlerRootView>
        <RootLayout />
      </GestureHandlerRootView>,
    );
    expect(mockStackProps.at(-1)?.initialRouteName).toBe('welcome');

    __setAuthState({ isLoading: false, isAuthenticated: true, user: { id: 'driver-1' } });
    mockStackProps.length = 0;
    render(
      <GestureHandlerRootView>
        <RootLayout />
      </GestureHandlerRootView>,
    );
    expect(mockStackProps.at(-1)?.initialRouteName).toBe('(tabs)');
  });
});
