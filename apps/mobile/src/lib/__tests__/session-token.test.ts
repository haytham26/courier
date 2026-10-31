/**
 * The token the app sends to the API (A1's slice 3, proven on the real stack).
 *
 * The API is a resource server: it verifies JWTs signed by the auth service's
 * own JWKS key pair, with the issuer and the audience the auth service signs
 * (services/api/app/auth/jwks.py, `get_auth_settings`). Better Auth's session
 * token is NOT such a token - it is the auth service's own session credential,
 * and the API has no way to check it.
 *
 * The proof is the real stack, not a fake: with the API, the auth service and
 * Postgres in compose (infra/compose.ci.yml, DEMO_SEED_ENABLED=true) on
 * 2026-10-31,
 *
 *   POST /demo/runs  Authorization: Bearer <the session token>   -> 401
 *                     {"detail":"Invalid or expired token"}
 *   POST /demo/runs  Authorization: Bearer <the minted JWT>      -> 200
 *                     the seeded run, five stops
 *
 * so the app has to send the token the auth service MINTS at its own `/token`
 * endpoint (the endpoint better-auth's JWT plugin answers with the bearer token
 * the JWKS signs), and never the session's own token. These tests pin that
 * contract, and the first one is the red that named it: it asserted the minted
 * token while `sessionToken()` answered with the session's own, which is what
 * the app shipped and what the no-mock job would have answered 401 on.
 *
 * The emulator run has no auth service, so the E2E mock's `$fetch` answers a
 * token of its own - the app's API boundary is never reached in that mode.
 */
jest.mock('better-auth/react', () => ({ createAuthClient: jest.fn() }));
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

/** The session token Better Auth hands the app, and what it is not. */
const SESSION_TOKEN = 'yHT7olEgGGR3oD67hKsSRtQIXJ7fojlg';

/** The bearer token the auth service mints, which is what the API verifies. */
const MINTED_TOKEN = 'eyJhbGciOiJFUzI1NiIsImtpZCI6Im1pbnRlZC1qd2sifQ.minted.courier';

interface FakeClient {
  getSession: jest.Mock;
  $fetch: jest.Mock;
}

/** Installs the auth client the app will build, and says what it answers. */
function installClient(client: Partial<FakeClient>): void {
  const { createAuthClient } = jest.requireMock<{
    createAuthClient: jest.Mock;
  }>('better-auth/react');
  createAuthClient.mockReturnValue({
    getSession: client.getSession ?? jest.fn().mockResolvedValue({
      data: { session: { token: SESSION_TOKEN } },
      error: null,
    }),
    $fetch: client.$fetch ?? jest.fn().mockResolvedValue({ token: MINTED_TOKEN }),
  });
}

/**
 * Loads the app's module as a build would, and hands back its token reader.
 *
 * The registry is reset first and the client installed after it: a reset
 * re-runs the mock factory, so a client installed before the reset is gone by
 * the time the module under test constructs its own.
 */
function loadSessionToken(
  client: Partial<FakeClient> = {},
): () => Promise<string | null> {
  jest.resetModules();
  installClient(client);
  const loaded = jest.requireActual<{
    sessionToken: () => Promise<string | null>;
  }>('@/lib/auth-client');
  return loaded.sessionToken;
}

describe('the token the app sends to the API', () => {
  const originalAuthUrl = process.env.EXPO_PUBLIC_AUTH_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_AUTH_URL = 'http://auth.test:3001';
  });

  afterEach(() => {
    if (originalAuthUrl === undefined) {
      Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_AUTH_URL');
    } else {
      process.env.EXPO_PUBLIC_AUTH_URL = originalAuthUrl;
    }
    jest.resetModules();
  });

  // The contract: the API verifies the minted JWT and refuses the session
  // token, so what the app sends is the minted one. This is the red that
  // named the defect: `sessionToken()` used to answer the session's own token.
  it('sends the token the auth service mints, not the session token', async () => {
    const sessionToken = loadSessionToken();

    await expect(sessionToken()).resolves.toBe(MINTED_TOKEN);
  });

  it('mints it at the auth service\'s own /token endpoint', async () => {
    const sessionToken = loadSessionToken();

    await sessionToken();

    const client = jest.requireMock<{ createAuthClient: jest.Mock }>('better-auth/react')
      .createAuthClient.mock.results[0]?.value as FakeClient;
    expect(client.$fetch).toHaveBeenCalledWith('/token');
  });

  // No session, or a mint that failed: no request goes out with a token that
  // is not one, and the caller answers the courier's own unauthorized.
  it('answers null when the mint fails', async () => {
    const sessionToken = loadSessionToken({
      $fetch: jest.fn().mockRejectedValue(new Error('no radio')),
    });

    await expect(sessionToken()).resolves.toBeNull();
  });

  it('answers null when the service answers without a token', async () => {
    const sessionToken = loadSessionToken({ $fetch: jest.fn().mockResolvedValue({}) });

    await expect(sessionToken()).resolves.toBeNull();
  });

  it('answers null when the minted token is not a string', async () => {
    const sessionToken = loadSessionToken({
      $fetch: jest.fn().mockResolvedValue({ token: 42 }),
    });

    await expect(sessionToken()).resolves.toBeNull();
  });

  // The emulator run has no auth service, so the E2E mock answers a token of
  // its own and the app's API boundary is never reached in that mode.
  it('answers the E2E mock\'s own token in the emulator mode', async () => {
    process.env.EXPO_PUBLIC_E2E = '1';
    try {
      jest.resetModules();
      const loaded = jest.requireActual<{
        sessionToken: () => Promise<string | null>;
      }>('@/lib/auth-client');
      await expect(loaded.sessionToken()).resolves.toBe('e2e-token');
    } finally {
      Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_E2E');
      jest.resetModules();
    }
  });
});
