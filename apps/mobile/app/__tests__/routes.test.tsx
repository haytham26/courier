/**
 * The root stack's routes: every screen a flow can land on is registered.
 *
 * expo-router navigates by the FILE name, and a screen whose route is not
 * registered in the root `Stack` is unreachable: `router.navigate('/summary')`
 * does nothing at all, which is exactly how the summary flow failed on its
 * first emulator run (the app stayed on Today). The routes the app owns outside
 * the tabs are asserted here, so a new screen cannot ship without its
 * registration.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import RootLayout from '../_layout';

/** The route names the root Stack registers, recorded by the mock Screen. */
const mockRegisteredRoutes: string[] = [];

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
  useAuth: () => ({ isLoading: false, isAuthenticated: true, user: { id: 'driver-1' } }),
}));

jest.mock('@/providers/Providers', () => ({
  Providers: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/maps/runState', () => ({
  RunProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/scans/scanLoad', () => ({
  ScanLoadProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/config/buildFlags', () => ({ DEV_SCREENS_IN_BUNDLE: false }));

describe('the root stack', () => {
  it('registers the summary route the end-of-day action navigates to', () => {
    mockRegisteredRoutes.length = 0;
    render(
      <GestureHandlerRootView>
        <RootLayout />
      </GestureHandlerRootView>,
    );

    expect(mockRegisteredRoutes).toContain('summary');
    expect(mockRegisteredRoutes).toContain('scan');
    expect(mockRegisteredRoutes).toContain('driving');
    expect(mockRegisteredRoutes).toContain('delivered');
    expect(mockRegisteredRoutes).toContain('(tabs)');
  });
});
