/**
 * Where a sign-out lands.
 *
 * The app has one front door and it is behind the auth state: the root stack
 * guards `(tabs)` on `isAuthenticated` and `(auth)` on `!isAuthenticated`, so a
 * sign-out has to end on the sign-in screen. The E2E run 40253640893 (api-34)
 * proved it does not: `settings-sign-out` was tapped twice, the two-tap confirm
 * worked, `logout()` was called, and the app never landed on `sign-in-screen` -
 * the flow failed after its full 60 s wait.
 *
 * `routes.test.tsx` records the route names the root stack registers; it cannot
 * see where the app LANDS, because its mocked `Stack.Protected` renders its
 * children whatever the guard says. This test mocks the guard the way the
 * navigator honours it - a screen behind a guard that closed is not in the tree
 * at all - and it runs the app's own `AuthProvider` over a client that behaves
 * the way `src/lib/auth-client.ts` behaves in the E2E mode, so the guard is
 * moved by a real `logout()` rather than by hand. That is the flow the emulator
 * walks: the app opens signed in on the tabs, the Account tab signs out, and the
 * front door has to be there afterwards.
 */
import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import RootLayout from '../_layout';
import { AuthProvider, useAuth, type AuthContextType } from '@/providers/AuthProvider';

/** The routes the root Stack renders, recorded by the mock's Screen. */
const mockRenderedRoutes: string[] = [];

jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const pathModule = jest.requireActual<typeof import('path')>('path');

  const APP_DIR = pathModule.join(__dirname, '..');

  /**
   * The screen a route name opens.
   *
   * This is the file system's own mapping, done by hand so the test does not
   * need the router's whole route tree: a group name opens its layout, a screen
   * name opens its own screen. The (auth) group's layout then renders `login`,
   * which is the sign-in screen.
   *
   * The tabs side is a stub: the real (tabs) layout loads the voice engine
   * (`expo-audio` through `VoiceService`), which has no native runtime in jest.
   * What this test is about is which GROUP the guard leaves standing, so a
   * stand-in that says "the tabs are here" is enough for the signed-in half.
   */
  function screenFor(name: string): React.ComponentType | null {
    switch (name) {
      case '(auth)': {
        const group = jest.requireActual<{ default: React.ComponentType }>(
          pathModule.join(APP_DIR, '(auth)/_layout'),
        );
        return group.default;
      }
      case 'login': {
        const screen = jest.requireActual<{ default: React.ComponentType }>(
          pathModule.join(APP_DIR, '(auth)/login'),
        );
        return screen.default;
      }
      case '(tabs)':
        return function TabsGroup() {
          const RN = jest.requireActual<typeof import('react-native')>('react-native');
          return ReactActual.createElement(
            RN.View,
            { testID: 'tabs-group' },
            ReactActual.createElement(RN.Text, null, 'the tabs'),
          );
        };
      default:
        return null;
    }
  }

  const Stack = ({ children }: { children?: React.ReactNode }) =>
    ReactActual.createElement(ReactActual.Fragment, null, children);

  /**
   * `<Stack.Protected>` is a guard: a screen behind a closed guard is not in the
   * tree at all. That is the one rule of the component the app's whole sign-out
   * landing rests on, so the mock keeps it rather than always showing the
   * children.
   */
  Stack.Protected = ({
    guard,
    children,
  }: {
    guard?: boolean;
    children?: React.ReactNode;
  }) => (guard === true ? children : null);

  Stack.Screen = ({ name }: { name: string }) => {
    mockRenderedRoutes.push(name);
    const Screen = screenFor(name);
    return Screen === null ? null : ReactActual.createElement(Screen);
  };

  return {
    Stack,
    useRouter: () => ({ navigate: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  };
});

/**
 * The client the app talks to, as the E2E mode spells it.
 *
 * The read of the session is the one the provider polls, and it has to be a new
 * object when the session moves or the provider never notices the sign-out.
 */
jest.mock('@/lib/auth-client', () => {
  const store = {
    user: {
      id: 'e2e-driver',
      email: 'driver@example.co.nz',
      name: 'E2E Driver',
      emailVerified: true,
      createdAt: new Date(0),
    },
    session: { token: 'e2e-token' },
  };

  const buildAnswer = () => ({
    data: store.session === null ? null : { user: store.user, session: store.session },
    error: null,
    isPending: false,
    isRefetching: false,
    refetch: () => Promise.resolve(),
  });

  // The answer the provider reads, rebuilt only when the session moves.
  let answer = buildAnswer();

  return {
    authClient: {
      signIn: {
        email: jest.fn(async () => {
          await Promise.resolve();
          store.session = { token: 'e2e-token' };
          answer = buildAnswer();
          return { data: { user: store.user, token: 'e2e-token' }, error: null };
        }),
        social: jest.fn(() => Promise.resolve({ data: null, error: null })),
        passkey: jest.fn(() => Promise.resolve({ data: null, error: null })),
      },
      signUp: {
        email: jest.fn(async () => {
          await Promise.resolve();
          store.session = { token: 'e2e-token' };
          answer = buildAnswer();
          return { data: null, error: null };
        }),
      },
      // A sign-out clears the session: the front door has to be reachable.
      signOut: jest.fn(async () => {
        await Promise.resolve();
        store.session = null;
        answer = buildAnswer();
        return { data: { success: true }, error: null };
      }),
      getSession: jest.fn(() => Promise.resolve({
        data: store.session === null ? null : { user: store.user, session: store.session },
        error: null,
      })),
      useSession: () => answer,
      $fetch: jest.fn(() => Promise.resolve({ methods: {}, mfa: true, teamRoles: [] })),
      twoFactor: {
        verifyTotp: jest.fn(() => Promise.resolve({ data: null, error: null })),
        verifyBackupCode: jest.fn(() => Promise.resolve({ data: null, error: null })),
      },
      organization: {
        list: jest.fn(() => Promise.resolve({ data: [], error: null })),
        listUserTeams: jest.fn(() => Promise.resolve({ data: [], error: null })),
        setActiveTeam: jest.fn(() => Promise.resolve({ data: null, error: null })),
      },
      // The test's own handle on the session the mock holds: a cold start with
      // nothing there, or the boot signed in the way the E2E mock boots it.
      __setSession: (hasSession: boolean) => {
        store.session = hasSession ? { token: 'e2e-token' } : null;
        answer = buildAnswer();
      },
    },
    signIn: { email: jest.fn(() => Promise.resolve({ data: null, error: null })) },
    signUp: { email: jest.fn(() => Promise.resolve({ data: null, error: null })) },
    signOut: jest.fn(() => Promise.resolve({ data: null, error: null })),
    getSession: jest.fn(() => Promise.resolve({ data: null, error: null })),
    useSession: () => answer,
    __setSession: (hasSession: boolean) => {
      store.session = hasSession ? { token: 'e2e-token' } : null;
      answer = buildAnswer();
    },
  };
});

// The app's own provider stack is kept, so the guard follows the session the
// way it does on the phone. The two session-scoped stores the root layout
// remounts on a sign-out are stubs: the suite needs neither the map nor the
// device store to say where a sign-out lands.
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

/** Renders the app the way it launches, so a guard can be read off its tree. */
function renderApp() {
  return render(
    <GestureHandlerRootView>
      <AuthProvider>
        <RootLayout />
      </AuthProvider>
    </GestureHandlerRootView>,
  );
}

/**
 * The session the app is currently holding, as the Account tab reads it.
 *
 * The root layout is inside the provider, so a small sibling component is the
 * way to reach the same context the tab's `useAuth()` reaches.
 */
function CaptureSession({ onReady }: { onReady: (auth: AuthContextType) => void }) {
  const auth = useAuth();
  onReady(auth);
  return null;
}

describe('where a sign-out lands', () => {
  beforeEach(() => {
    mockRenderedRoutes.length = 0;
  });

  it('renders the sign-in screen when there is no session', async () => {
    // The app opens with no session at all: the guard on (auth) is the only one
    // open, and its first screen has to be the sign-in screen.
    const authClient = jest.requireMock<{
      authClient: { __setSession: (hasSession: boolean) => void };
    }>('@/lib/auth-client').authClient;
    authClient.__setSession(false);

    const screen = renderApp();

    await waitFor(() => expect(screen.getByTestId('sign-in-screen')).toBeTruthy());

    // The guard flipped: the front door is the only group left standing.
    expect(mockRenderedRoutes).toContain('(auth)');
    expect(mockRenderedRoutes).not.toContain('(tabs)');
    expect(screen.getByTestId('sign-in-title')).toBeTruthy();
    expect(screen.getByText('Sign in')).toBeTruthy();
  });

  it('keeps the app on the tabs while the session is good', async () => {
    const authClient = jest.requireMock<{
      authClient: { __setSession: (hasSession: boolean) => void };
    }>('@/lib/auth-client').authClient;

    // The app opens with a session, the way the E2E mock boots it.
    authClient.__setSession(true);

    const screen = renderApp();

    // The signed-in shift stays on the tabs, and the front door is nowhere in
    // the tree: the guard on (auth) is closed.
    await waitFor(() => expect(screen.getByTestId('tabs-group')).toBeTruthy());
    expect(mockRenderedRoutes).toContain('(tabs)');
    expect(mockRenderedRoutes).not.toContain('(auth)');
    expect(screen.queryByTestId('sign-in-screen')).toBeNull();
    expect(screen.queryByTestId('login-screen')).toBeNull();
  });

  it('lands on the sign-in screen when the Account tab signs out', async () => {
    const authClient = jest.requireMock<{
      authClient: {
        __setSession: (hasSession: boolean) => void;
        signOut: jest.Mock;
      };
    }>('@/lib/auth-client').authClient;

    // The E2E mock boots the app signed in, so this is the screen the emulator's
    // flows start on.
    authClient.__setSession(true);

    let auth: AuthContextType | null = null;

    const screen = render(
      <GestureHandlerRootView>
        <AuthProvider>
          <RootLayout />
          <CaptureSession onReady={(captured) => (auth = captured)} />
        </AuthProvider>
      </GestureHandlerRootView>,
    );

    // The app opened signed in.
    await waitFor(() => expect(auth?.isAuthenticated).toBe(true));
    expect(screen.queryByTestId('sign-in-screen')).toBeNull();
    expect(screen.getByTestId('tabs-group')).toBeTruthy();

    // The Account tab's sign-out: `logout()` clears the session and the state.
    await act(async () => {
      await auth?.logout();
    });

    await waitFor(() => expect(screen.getByTestId('sign-in-screen')).toBeTruthy());
    expect(authClient.signOut).toHaveBeenCalled();
  });
});
