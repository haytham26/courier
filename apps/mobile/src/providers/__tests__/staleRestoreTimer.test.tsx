/**
 * BUG-300: the session restore's 8 s bound must not outlive the effect run
 * that armed it.
 *
 * The session effect used to arm `SESSION_RESTORE_TIMEOUT_MS` on EVERY run
 * but return the `clearTimeout` cleanup only on its fall-through path, so any
 * settled run - a sign-in, a sign-out - left its timer live. Eight seconds
 * later the stale timer re-read the phone's receipt and overwrote the settled
 * answer. In the E2E sign-in flow the app signs out first (which discards the
 * receipt for the rest of the app session, BUG-077's fail-closed), then signs
 * back in: the stale timer then fired right after the sign-in, read the
 * discarded receipt as gone, and flipped the freshly signed-in courier back to
 * the front door. On the large AVD (411x731 dp) every command takes seconds,
 * so the flow's own steps outlast the 8 s and the failure was deterministic on
 * both large legs (run 42455960697); the small AVD only outran the timer.
 *
 * The contract these tests pin: the bound exists only while the server has not
 * answered (`isPending`), and every run of the effect returns the cleanup, so
 * no timer can fire after its run is done. The offline session itself is the
 * REAL module here (over an in-memory secure store), because the fail-closed
 * receipt is part of the bug's mechanism.
 *
 * A note on this file's fixtures: every identifier the `jest.mock` factory
 * below closes over is a `let` whose name begins with `mock`. A `const`
 * referenced from a factory is hoisted to the very top of the module by
 * babel-plugin-jest-hoist (babel-jest applies it to every test file), so it is
 * read before its initializer runs and answers `undefined` - which reads as an
 * app defect while it is a fixture defect. `mock`-prefixed `let` bindings are
 * the documented-safe shape and are what this file uses throughout.
 */
import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { Dimensions, Text } from 'react-native';

import { AuthProvider, useAuth, type AuthContextType } from '../AuthProvider';

let mockUser = {
  id: 'e2e-driver',
  email: 'driver@example.co.nz',
  name: 'E2E Driver',
  emailVerified: true,
  createdAt: new Date(0),
  image: null,
};

let mockSignedInData = { user: mockUser, session: { token: 'e2e-token' } };

interface MockAnswer {
  data: typeof mockSignedInData | null;
  error: unknown;
  isPending: boolean;
  isRefetching: boolean;
  refetch: () => Promise<void>;
}

const mockAnswerFor = (data: typeof mockSignedInData | null, isPending = false): MockAnswer => ({
  data,
  error: null,
  isPending,
  isRefetching: false,
  refetch: () => Promise.resolve(),
});

// The answer `useSession` hands back: moved by the mock's sign-in and sign-out,
// the way the E2E mock in `src/lib/auth-client.ts` moves its own.
let mockAnswer: MockAnswer = mockAnswerFor(mockSignedInData);

jest.mock('@/lib/auth-client', () => ({
  authClient: {
    useSession: () => mockAnswer,
    signIn: {
      email: () => {
        mockAnswer = mockAnswerFor(mockSignedInData);
        return Promise.resolve({ data: { user: mockUser, token: 'e2e-token' }, error: null });
      },
      social: () => Promise.resolve({ data: null, error: { message: 'refused in the emulator run' } }),
      passkey: () => Promise.resolve({ data: null, error: { message: 'refused in the emulator run' } }),
    },
    signUp: {
      email: () => {
        mockAnswer = mockAnswerFor(mockSignedInData);
        return Promise.resolve({ data: { user: mockUser }, error: null });
      },
    },
    signOut: () => {
      mockAnswer = mockAnswerFor(null);
      return Promise.resolve({ data: { success: true }, error: null });
    },
    getSession: () => Promise.resolve({ data: mockAnswer.data, error: null }),
    twoFactor: {
      verifyTotp: () => Promise.resolve({ data: null, error: { message: 'refused' } }),
      verifyBackupCode: () => Promise.resolve({ data: null, error: { message: 'refused' } }),
    },
    organization: {
      list: () => Promise.resolve({ data: [], error: null }),
      listUserTeams: () => Promise.resolve({ data: [], error: null }),
      setActiveTeam: () => Promise.resolve({ data: null, error: null }),
    },
  },
}));

// The device store in memory, so the real offline-session runs over it: its
// `receiptDiscarded` fail-closed (BUG-077) is what the stale timer trips over.
let mockStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
  getItem: (key: string) => mockStore.get(key) ?? null,
  getItemAsync: (key: string) => Promise.resolve(mockStore.get(key) ?? null),
  setItem: (key: string, value: string) => {
    mockStore.set(key, value);
  },
  setItemAsync: (key: string, value: string) => {
    mockStore.set(key, value);
    return Promise.resolve();
  },
  deleteItemAsync: (key: string) => {
    mockStore.delete(key);
    return Promise.resolve();
  },
}));

jest.mock('expo-constants', () => ({ expoConfig: { scheme: 'courier' } }));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: () => Promise.resolve(false),
  isEnrolledAsync: () => Promise.resolve(false),
  authenticateAsync: () => Promise.resolve({ success: false }),
}));

let mockProbed: AuthContextType | undefined;

const Probe = () => {
  mockProbed = useAuth();
  return <Text testID="status">{mockProbed.status}</Text>;
};

const auth = (): AuthContextType => {
  if (mockProbed === undefined) {
    throw new Error('the probe never rendered');
  }
  return mockProbed;
};

const statusOnScreen = (): string => String(screen.getByTestId('status').props.children);

const flush = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('the session restore bound never outlives its run (BUG-300)', () => {
  beforeEach(() => {
    mockStore = new Map<string, string>();
    mockAnswer = mockAnswerFor(mockSignedInData);
    mockProbed = undefined;
  });

  // The control: the bound itself is real - a restore that never answers is a
  // restore the app goes on without (the a1 job's first real run).
  it('while the restore is pending, the 8 s deadline still goes on without the server', async () => {
    jest.useFakeTimers();
    try {
      mockAnswer = mockAnswerFor(null, true);
      render(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      );
      await flush();
      expect(statusOnScreen()).toBe('loading');

      await act(async () => {
        await Promise.resolve();
        jest.advanceTimersByTime(9_000);
      });
      await flush();

      // No answer and no receipt on the phone: the front door.
      expect(statusOnScreen()).toBe('signed-out');
    } finally {
      jest.useRealTimers();
    }
  });

  it("an answer that lands clears the pending run's timer: the deadline never fires after the server answered", async () => {
    jest.useFakeTimers();
    try {
      mockAnswer = mockAnswerFor(null, true);
      const view = render(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      );
      await flush();
      expect(statusOnScreen()).toBe('loading');

      // The server answers while the bound is still running.
      await act(async () => {
        jest.advanceTimersByTime(3_000);
        await Promise.resolve();
      });
      mockAnswer = mockAnswerFor(mockSignedInData);
      await act(async () => {
        view.rerender(
          <AuthProvider>
            <Probe />
          </AuthProvider>,
        );
        await Promise.resolve();
      });
      await flush();
      expect(statusOnScreen()).toBe('signed-in');

      // The deadline passes after the answer: the session must not move.
      await act(async () => {
        await Promise.resolve();
        jest.advanceTimersByTime(9_000);
      });
      await flush();
      expect(statusOnScreen()).toBe('signed-in');
    } finally {
      jest.useRealTimers();
    }
  });

  // The E2E sign-in flow's own shape, on the large AVD's window (411x731 dp):
  // boot signed in, sign out (which discards the receipt for this app
  // session), sign back in with the email form - and the 8 s bound must not
  // flip the fresh session back to the front door afterwards.
  it('a signed-in session is not flipped back to the front door by a stale restore timer after a sign-out in the same app session', async () => {
    jest.useFakeTimers();
    const window = jest
      .spyOn(Dimensions, 'get')
      .mockReturnValue({ width: 411, height: 731, scale: 3.5, fontScale: 1 });
    try {
      render(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      );
      await flush();
      expect(statusOnScreen()).toBe('signed-in');

      // The flow signs out first, the way the courier reaches the front door.
      await act(async () => {
        await auth().logout();
      });
      await flush();
      expect(statusOnScreen()).toBe('signed-out');

      // Then signs back in with the email form.
      await act(async () => {
        const outcome = await auth().login('driver@example.co.nz', 'correct-horse-battery');
        expect(outcome.status).toBe('signed-in');
      });
      await flush();
      expect(statusOnScreen()).toBe('signed-in');

      // The 8 s restore bound passes: no stale timer may move the session.
      await act(async () => {
        await Promise.resolve();
        jest.advanceTimersByTime(9_000);
      });
      await flush();
      expect(statusOnScreen()).toBe('signed-in');
      expect(auth().isAuthenticated).toBe(true);
    } finally {
      window.mockRestore();
      jest.useRealTimers();
    }
  });
});
