/**
 * Tests for the offline session.
 *
 * The offline session is what lets a courier keep working in the rural
 * Canterbury dead zones: the phone keeps a receipt of the last session the
 * server confirmed, and opens with it when there is no signal.
 *
 * The device store is mocked: the test is about the rule, not the keychain.
 */
import {
  forgetSession,
  OFFLINE_SESSION_HOURS,
  OFFLINE_SESSION_KEY,
  readOfflineSession,
  rememberSession,
} from '@/lib/offline-session';

const mockStore = new Map<string, string>();

jest.mock('@/lib/session-storage', () => ({
  readStoredValue: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
  writeStoredValue: jest.fn((key: string, value: string) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
}));

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
  });

  it('has no session when the phone kept nothing', async () => {
    const session = await readOfflineSession();

    expect(session).toBeNull();
  });

  it('remembers the courier the server confirmed', async () => {
    await rememberSession(user, 1_000);

    const session = await readOfflineSession(1_000);

    expect(session?.user.email).toBe('driver@example.co.nz');
    expect(session?.confirmedAt).toBe(1_000);
    expect(session?.expiresAt).toBe(1_000 + OFFLINE_SESSION_HOURS * 60 * 60 * 1000);
  });

  it('forgets a session that is older than a shift', async () => {
    await rememberSession(user, 1_000);
    const later = 1_000 + OFFLINE_SESSION_HOURS * 60 * 60 * 1000 + 1;

    const session = await readOfflineSession(later);

    expect(session).toBeNull();
    // The old receipt is not kept around.
    expect(mockStore.get(OFFLINE_SESSION_KEY)).toBe('');
  });

  it('keeps a session that is still inside the shift', async () => {
    await rememberSession(user, 1_000);
    const later = 1_000 + OFFLINE_SESSION_HOURS * 60 * 60 * 1000 - 1;

    const session = await readOfflineSession(later);

    expect(session).not.toBeNull();
  });

  it('ignores a receipt that was written by something else', async () => {
    mockStore.set(OFFLINE_SESSION_KEY, 'not json at all');

    const session = await readOfflineSession();

    expect(session).toBeNull();
  });

  it('ignores a receipt with the wrong shape', async () => {
    mockStore.set(OFFLINE_SESSION_KEY, JSON.stringify({ user: { id: 'x' } }));

    const session = await readOfflineSession();

    expect(session).toBeNull();
  });

  it('forgets the session when the courier signs out', async () => {
    await rememberSession(user, 1_000);

    await forgetSession();

    expect(await readOfflineSession(1_000)).toBeNull();
  });
});
