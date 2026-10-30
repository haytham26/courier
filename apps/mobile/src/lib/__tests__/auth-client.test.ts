/**
 * The auth client's base URL contract (BUG-072, the C1 audit squad 1 #3).
 *
 * The shipped APK could not reach any auth server: `src/lib/auth-client.ts`
 * hard-coded `http://localhost:3000` as the fallback, and the release
 * workflow set no `EXPO_PUBLIC_AUTH_URL`, so the bundle carried the literal
 * (and, when the variable was set but empty, an inlined `undefined`). On a
 * phone `localhost` is the phone, so there is nothing to talk to, and no
 * runtime override can reach in - the value is frozen at build time by the
 * babel pipeline.
 *
 * The contract these tests pin is the fix:
 *
 *   1. a URL supplied by the environment is used exactly as given, with
 *      surrounding space rejected rather than sent to the DNS resolver;
 *   2. an unset or empty variable never falls back to a localhost literal;
 *   3. in E2E mode the local mock takes over, so the emulator run has no auth
 *      dependency at all.
 *
 * The release half of the fix is `.github/workflows/release-apk.yml`, which
 * now sets EXPO_PUBLIC_AUTH_URL from the release repository variable; there
 * is no jest test for a workflow, so the gate for that half is the release
 * job itself, recorded in the PR.
 */
jest.mock('better-auth/react', () => ({
  createAuthClient: jest.fn(() => ({ signIn: {}, signUp: {}, useSession: jest.fn() })),
}));
jest.mock('@better-auth/expo/client', () => ({ expoClient: jest.fn(() => ({})) }));
jest.mock('better-auth/client/plugins', () => ({
  organizationClient: jest.fn(() => ({})),
  twoFactorClient: jest.fn(() => ({})),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('expo-constants', () => ({ expoConfig: { scheme: 'courier' } }));

/** The `better-auth/react` mock, so its arguments can be read back. */
interface AuthClientModuleMock {
  createAuthClient: jest.Mock;
}

function createAuthClientMock(): jest.Mock {
  const mocked = jest.requireMock<AuthClientModuleMock>('better-auth/react');
  return mocked.createAuthClient;
}

/** The URL the client was actually constructed with, on a fresh load. */
function baseURLFromFreshLoad(): string | undefined {
  const mock = createAuthClientMock();
  const calls = mock.mock.calls as unknown[][];
  expect(mock).toHaveBeenCalled();
  const firstArgs = calls[0];
  const firstArg: unknown = firstArgs?.[0];
  const options = firstArg as { baseURL?: string } | undefined;
  return options?.baseURL;
}

/**
 * Loads the app's auth module under the given environment, as a build would.
 *
 * The variable is read at module scope and the client is constructed once, so
 * each case needs a fresh registry: the value a case sets is the value that
 * build would have frozen into the bundle.
 */
function loadWithEnv(value: string | undefined): void {
  jest.resetModules();
  if (value === undefined) {
    Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_AUTH_URL');
  } else {
    process.env.EXPO_PUBLIC_AUTH_URL = value;
  }
  void jest.requireActual<{ authClient: unknown }>('@/lib/auth-client');
}

describe('the auth base URL (BUG-072)', () => {
  const original = process.env.EXPO_PUBLIC_AUTH_URL;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (original === undefined) {
      Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_AUTH_URL');
    } else {
      process.env.EXPO_PUBLIC_AUTH_URL = original;
    }
    jest.resetModules();
  });

  it('uses the URL the environment supplies, exactly as given', () => {
    loadWithEnv('https://auth.staging.courier.nz');

    expect(baseURLFromFreshLoad()).toBe('https://auth.staging.courier.nz');
  });

  // Surrounding space is the shape a CI variable or a .env.local line picks up
  // by accident, and sending it on produces a URL nothing resolves.
  it('trims the URL it is given', () => {
    loadWithEnv('  https://auth.staging.courier.nz\n');

    expect(baseURLFromFreshLoad()).toBe('https://auth.staging.courier.nz');
  });

  // The defect's first half: an unset variable produced a build that could not
  // reach any server, and a localhost default hid it. Whatever the fallback is,
  // it must not be a localhost literal frozen into a bundle.
  it('never falls back to a localhost literal when the variable is unset', () => {
    loadWithEnv(undefined);

    const url = baseURLFromFreshLoad();
    expect(url).toBeDefined();
    expect(url).not.toContain('localhost');
  });

  // The defect's second half: an empty string, the shape the babel pipeline
  // inlines when the variable is set to nothing.
  it('never falls back to a localhost literal when the variable is empty', () => {
    loadWithEnv('');

    const url = baseURLFromFreshLoad();
    expect(url).toBeDefined();
    expect(url).not.toContain('localhost');
  });

  // The E2E mode must keep working with no auth server anywhere: the mock
  // client is selected before any URL is needed.
  it('still selects the local mock in E2E mode', () => {
    process.env.EXPO_PUBLIC_E2E = '1';
    try {
      jest.resetModules();
      const loaded = jest.requireActual<{ authClient: unknown; isE2EMode: boolean }>(
        '@/lib/auth-client',
      );
      expect(loaded.authClient).toBeTruthy();
      expect(loaded.isE2EMode).toBe(true);
    } finally {
      Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_E2E');
      jest.resetModules();
    }
  });
});

