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

/** The auth state the mocked provider answers with, per test. */
const mockAuthState = { isLoading: false, isAuthenticated: true, user: { id: 'driver-1' } };

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
    useRouter: () => ({ navigate: jest.fn(), push: jest.fn() }),
  };
});

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => mockAuthState,
}));

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

  it('shows the front door while the session is still restoring, not a blank screen', () => {
    // RED first: the layout answered `if (isLoading) return null` while the
    // session restored, so a slow or hung restore held the whole app hostage -
    // the a1 flow's `welcome-screen is visible` failed on a 60-second timeout
    // with nothing on screen, and a courier on a bad signal would have seen the
    // same blank app at the depot (PLAYBOOK 12: the app is made robust, never
    // the flow). The front door - the welcome and the auth group, the stack a
    // session that has not answered yet gets - is what renders now, and the
    // guard swaps the stack the moment the answer lands.
    mockAuthState.isLoading = true;
    mockAuthState.isAuthenticated = false;
    mockRegisteredRoutes.length = 0;
    try {
      render(
        <GestureHandlerRootView>
          <RootLayout />
        </GestureHandlerRootView>,
      );

      expect(mockRegisteredRoutes).toContain('welcome');
      expect(mockRegisteredRoutes).toContain('(auth)');
    } finally {
      mockAuthState.isLoading = false;
      mockAuthState.isAuthenticated = true;
    }
  });
});
