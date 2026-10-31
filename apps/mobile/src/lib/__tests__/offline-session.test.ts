/**
 * Tests for the offline session.
 *
 * The offline session is what lets a courier keep working in the rural
 * Canterbury dead zones: the phone keeps a receipt of the last session the
 * server confirmed, and opens with it when there is no signal.
 *
 * The device store is mocked: the test is about the rule, not the keychain.
 *
 * The module is loaded fresh for every case through `loadSession`, because
 * the BUG-077 fix keeps one piece of app-session state (a receipt the driver
 * signed out of reads as gone for the rest of the app's life) and a test must
 * not inherit the previous one's driver.
 */
import {
  OFFLINE_SESSION_HOURS as HOURS,
  OFFLINE_SESSION_KEY,
  type OfflineSession,
} from '@/lib/offline-session';

const mockStore = new Map<string, string>();

/** Whether the device store accepts its writes and deletes. */
let mockWritable = true;

jest.mock('@/lib/session-storage', () => ({
  readStoredValue: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
  writeStoredValue: jest.fn((key: string, value: string) => {
    if (mockWritable === false) {
      return Promise.reject(new Error('the device store refused the write'));
    }
    mockStore.set(key, value);
    return Promise.resolve();
  }),
  clearStoredValue: jest.fn((key: string) => {
    if (mockWritable === false) {
      return Promise.reject(new Error('the device store refused the delete'));
    }
    mockStore.delete(key);
    return Promise.resolve();
  }),
}));

interface SessionModule {
  forgetSession: () => Promise<void>;
  readOfflineSession: (now?: number) => Promise<OfflineSession | null>;
  rememberSession: (user: unknown, now?: number) => Promise<void>;
}

/** The module as a fresh app start: a new registry, so no state is shared. */
function loadSession(): SessionModule {
  jest.resetModules();
  return jest.requireActual<SessionModule>('@/lib/offline-session');
}

const user = {
  id: 'driver-1',
  email: 'driver@example.co.nz',
  name: 'Test Driver',
  emailVerified: false,
  createdAt: '2026-10-21T00:00:00.000Z',
};

describe('the offline session', () => {
  beforeEach(() => {
    mockStore.clear();
    mockWritable = true;
  });

  it('has no session when the phone kept nothing', async () => {
    const { readOfflineSession } = loadSession();

    expect(await readOfflineSession()).toBeNull();
  });

  it('remembers the courier the server confirmed', async () => {
    const { readOfflineSession, rememberSession } = loadSession();
    await rememberSession(user, 1_000);

    const session = await readOfflineSession(1_000);

    expect(session?.user.email).toBe('driver@example.co.nz');
    expect(session?.confirmedAt).toBe(1_000);
    expect(session?.expiresAt).toBe(1_000 + HOURS * 60 * 60 * 1000);
  });

  it('forgets a session that is older than a shift', async () => {
    const { readOfflineSession, rememberSession } = loadSession();
    await rememberSession(user, 1_000);
    const later = 1_000 + HOURS * 60 * 60 * 1000 + 1;

    const session = await readOfflineSession(later);

    expect(session).toBeNull();
    // The old receipt is not kept around.
    expect(mockStore.has(OFFLINE_SESSION_KEY)).toBe(false);
  });

  it('keeps a session that is still inside the shift', async () => {
    const { readOfflineSession, rememberSession } = loadSession();
    await rememberSession(user, 1_000);
    const later = 1_000 + HOURS * 60 * 60 * 1000 - 1;

    expect(await readOfflineSession(later)).not.toBeNull();
  });

  it('ignores a receipt that was written by something else', async () => {
    const { readOfflineSession } = loadSession();
    mockStore.set(OFFLINE_SESSION_KEY, 'not json at all');

    expect(await readOfflineSession()).toBeNull();
  });

  it('ignores a receipt with the wrong shape', async () => {
    const { readOfflineSession } = loadSession();
    mockStore.set(OFFLINE_SESSION_KEY, JSON.stringify({ user: { id: 'x' } }));

    expect(await readOfflineSession()).toBeNull();
  });

  it('forgets the session when the courier signs out', async () => {
    const { forgetSession, readOfflineSession, rememberSession } = loadSession();
    await rememberSession(user, 1_000);

    await forgetSession();

    expect(await readOfflineSession(1_000)).toBeNull();
    expect(mockStore.has(OFFLINE_SESSION_KEY)).toBe(false);
  });

  // BUG-077 (the C1 audit squad 1's delete-swallow half): the delete was
  // swallowed, so a device store that refused it left the receipt in place
  // and `readOfflineSession()` still resolved a driver for a session the
  // driver asked to forget. A sign-out that does not take effect is the one
  // thing a receipt must never be able to do.
  it('says so when the receipt could not be forgotten, and fails the read closed', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { forgetSession, readOfflineSession, rememberSession } = loadSession();
      await rememberSession(user, 1_000);
      mockWritable = false;

      await expect(forgetSession()).rejects.toThrow('could not be forgotten');

      // The stored value is still there - the device store refused the delete -
      // and the read must not resolve a driver for it: the app fails closed
      // for as long as it is open, so the sign-out stands.
      expect(mockStore.has(OFFLINE_SESSION_KEY)).toBe(true);
      expect(await readOfflineSession(1_000)).toBeNull();
    } finally {
      warn.mockRestore();
    }
  });

  it('fails the read closed even when the store later answers again', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { forgetSession, readOfflineSession, rememberSession } = loadSession();
      await rememberSession(user, 1_000);
      mockWritable = false;
      await expect(forgetSession()).rejects.toThrow('could not be forgotten');

      mockWritable = true;
      mockStore.set(
        OFFLINE_SESSION_KEY,
        JSON.stringify({
          user,
          confirmedAt: 1_000,
          expiresAt: 1_000 + HOURS * 60 * 60 * 1000,
        }),
      );

      expect(await readOfflineSession(1_000)).toBeNull();
    } finally {
      warn.mockRestore();
    }
  });

  it('a sign-out that took stands on its own: the read stays null after the forget', async () => {
    const { forgetSession, readOfflineSession, rememberSession } = loadSession();
    await rememberSession(user, 1_000);

    await forgetSession();

    // A receipt that was cleared is not resurrected by anything the store
    // answers afterwards either: the receipt is gone, so there is nothing to
    // read.
    mockStore.set(
      OFFLINE_SESSION_KEY,
      JSON.stringify({
        user,
        confirmedAt: 1_000,
        expiresAt: 1_000 + HOURS * 60 * 60 * 1000,
      }),
    );

    expect(await readOfflineSession(1_000)).toBeNull();
  });
});

// `jest.requireActual` returns the same module the static imports point at, so
// the file's imports above are the values the cases assert against.
void OFFLINE_SESSION_KEY;
void HOURS;
