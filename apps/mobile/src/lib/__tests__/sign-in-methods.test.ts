/**
 * The sign-in methods the app reads from the service (src/lib/sign-in-methods.ts).
 *
 * BUG-171: `authClient.$fetch` is `@better-fetch/fetch`'s `createFetch`, which
 * resolves the ENVELOPE `{ data, error, status }` and never the raw body. This
 * suite's mocks answer the envelope; before the fix `fetchSignInMethods`
 * parsed the envelope itself, so `methods` never matched and the app silently
 * fell back to the defaults on every real device (run 41457437873's a1 run
 * had the same envelope gap in `sessionToken`).
 */
jest.mock('@/lib/auth-client', () => ({ authClient: { $fetch: jest.fn() } }));

import {
  DEFAULT_SIGN_IN_METHODS,
  fetchSignInMethods,
} from '../sign-in-methods';

const $fetch = jest.requireMock<{ authClient: { $fetch: jest.Mock } }>(
  '@/lib/auth-client',
).authClient.$fetch;

const LIVE = {
  methods: {
    email: { enabled: true, reason: '' },
    google: { enabled: true, reason: '' },
    apple: { enabled: false, reason: 'Apple is not configured.' },
    passkey: { enabled: true, reason: '' },
  },
  mfa: false,
  teamRoles: ['owner', 'admin'],
};

describe('the sign-in methods the service offers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // The red that named BUG-171's second half: the document rides in the
  // envelope's `data`, and reading the envelope itself yields the defaults.
  it('reads the methods from the envelope data, not from the envelope', async () => {
    $fetch.mockResolvedValue({ data: LIVE, error: null, status: 200 });

    await expect(fetchSignInMethods()).resolves.toEqual(LIVE);
  });

  it('falls back to the defaults when the envelope carries an error', async () => {
    $fetch.mockResolvedValue({
      data: null,
      error: { status: 500, statusText: 'Server Error', message: 'boom' },
      status: 500,
    });

    await expect(fetchSignInMethods()).resolves.toEqual(DEFAULT_SIGN_IN_METHODS);
  });

  it('falls back to the defaults when the call throws', async () => {
    $fetch.mockRejectedValue(new Error('no radio'));

    await expect(fetchSignInMethods()).resolves.toEqual(DEFAULT_SIGN_IN_METHODS);
  });

  // A bare body is not the client's answer: it is not believed (the raw-body
  // mock is what hid the envelope gap in the first place).
  it('falls back to the defaults when the answer is not the envelope', async () => {
    $fetch.mockResolvedValue(LIVE);

    await expect(fetchSignInMethods()).resolves.toEqual(DEFAULT_SIGN_IN_METHODS);
  });
});
