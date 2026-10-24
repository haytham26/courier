/**
 * The root stack's routes: every screen a flow can land on is registered.
 *
 * expo-router navigates by the FILE name, and a screen whose route is not
 * registered in the root `Stack` is unreachable: `router.navigate('/summary')`
 * does nothing at all, which is exactly how the summary flow failed on its
 * first emulator run (the app stayed on Today). The three routes the app owns
 * outside the tabs are asserted here, so a new screen cannot ship without its
 * registration.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import RootLayout from '../_layout';

jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const registered: string[] = [];
  const Stack = ({ children }: { children?: React.ReactNode }) =>
    ReactActual.createElement(ReactActual.Fragment, null, children);
  Stack.Protected = ({ children }: { children?: React.ReactNode }) =>
    ReactActual.createElement(ReactActual.Fragment, null, children);
  Stack.Screen = ({ name }: { name: string }) => {
    registered.push(name);
    return null;
  };
  return {
    Stack: Object.assign(Stack, { __registered: registered }),
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
jest.mock('@/voice/useVoice', () => ({
  useVoice: () => ({
    state: 'idle',
    isReady: false,
    lastCommand: null,
    startListening: jest.fn(),
    stopListening: jest.fn(),
    speak: jest.fn(),
  }),
}));

describe('the root stack', () => {
  it('registers the summary route the end-of-day action navigates to', () => {
    render(
      <GestureHandlerRootView>
        <RootLayout />
      </GestureHandlerRootView>,
    );

    const registered = (jest.requireMock('expo-router') as { Stack: { __registered: string[] } }).Stack
      .__registered;
    expect(registered).toContain('summary');
    expect(registered).toContain('scan');
    expect(registered).toContain('driving');
    expect(registered).toContain('delivered');
    expect(registered).toContain('(tabs)');
  });
});
