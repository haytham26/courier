/**
 * The storage the auth client is given (BUG-078, the C1 audit squad 1's finding).
 *
 * The raw `expo-secure-store` module was handed to the Expo client, so the
 * keychain options the app's own `deviceStore` wrapper sets never reached it:
 * the session cookie was written `WHEN_UNLOCKED` (the module's default), which
 * fails while the phone is locked - and a courier's phone is locked in the van
 * for the whole shift (better-auth #10382, the reason the wrapper exists).
 *
 * The contract these tests pin: the client receives the app's wrapper, and the
 * wrapper's calls carry the keychain option. The wrapper is also what the
 * Expo client's own chunked write queue is keyed by, so a second copy of it
 * would split that queue (see session-storage.ts).
 */
jest.mock('better-auth/react', () => ({ createAuthClient: jest.fn(() => ({})) }));
jest.mock('@better-auth/expo/client', () => ({ expoClient: jest.fn(() => ({})) }));
jest.mock('better-auth/client/plugins', () => ({
  organizationClient: jest.fn(() => ({})),
  twoFactorClient: jest.fn(() => ({})),
}));

const mockSecureStore = {
  AFTER_FIRST_UNLOCK: 'after-first-unlock-option',
  getItem: jest.fn(),
  getItemAsync: jest.fn(),
  setItem: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
};

jest.mock('expo-secure-store', () => mockSecureStore);
jest.mock('expo-constants', () => ({ expoConfig: { scheme: 'courier' } }));

/** What the app handed the Expo client, from the module it built. */
interface ExpoClientOptions {
  scheme?: string;
  storage?: Record<string, unknown>;
  storagePrefix?: string;
}

/** Loads the app's auth module as a build would, and reads back the options. */
function expoClientOptions(): ExpoClientOptions {
  jest.resetModules();
  jest.requireActual<{ authClient: unknown }>('@/lib/auth-client');
  const { expoClient } = jest.requireMock<{ expoClient: jest.Mock }>('@better-auth/expo/client');
  const calls: unknown[][] = expoClient.mock.calls as unknown[][];
  const first: unknown = calls[0]?.[0];
  if (typeof first !== 'object' || first === null) {
    return {};
  }
  const options = first as Partial<ExpoClientOptions>;
  return {
    ...(options.scheme === undefined ? {} : { scheme: options.scheme }),
    ...(options.storagePrefix === undefined ? {} : { storagePrefix: options.storagePrefix }),
    ...(options.storage === undefined ? {} : { storage: options.storage }),
  };
}

describe('the storage the auth client is given (BUG-078)', () => {
  const original = process.env.EXPO_PUBLIC_AUTH_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_AUTH_URL = 'http://auth.test:3001';
    Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_E2E');
  });

  afterEach(() => {
    if (original === undefined) {
      Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_AUTH_URL');
    } else {
      process.env.EXPO_PUBLIC_AUTH_URL = original;
    }
    Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_E2E');
    jest.resetModules();
  });

  it('hands the client the app\'s deviceStore, not the raw module', () => {
    const options = expoClientOptions();

    // The raw module has every method the wrapper has, so the shape alone
    // cannot tell them apart; the calls below are what can.
    expect(options.storage).toBeDefined();
    expect(typeof options.storage?.getItemAsync).toBe('function');
    expect(typeof options.storage?.setItemAsync).toBe('function');
  });

  // The contract the finding is about: the keychain option travels with the
  // call. The raw module's own call carries none, so this is the assertion
  // that was red before the fix.
  it('carries the keychain option with every call the storage makes', () => {
    const options = expoClientOptions();
    const storage = options.storage as
      | {
          getItem: (key: string) => string | null;
          getItemAsync: (key: string) => Promise<string | null>;
          setItem: (key: string, value: string) => void;
          setItemAsync: (key: string, value: string) => Promise<void>;
        }
      | undefined;
    expect(storage).toBeDefined();

    void storage?.getItemAsync('courier_cookie');
    void storage?.setItemAsync('courier_cookie', 'value');
    void storage?.getItem('courier_cookie');
    void storage?.setItem('courier_cookie', 'value');

    expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('courier_cookie', {
      keychainAccessible: mockSecureStore.AFTER_FIRST_UNLOCK,
    });
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('courier_cookie', 'value', {
      keychainAccessible: mockSecureStore.AFTER_FIRST_UNLOCK,
    });
    expect(mockSecureStore.getItem).toHaveBeenCalledWith('courier_cookie', {
      keychainAccessible: mockSecureStore.AFTER_FIRST_UNLOCK,
    });
    expect(mockSecureStore.setItem).toHaveBeenCalledWith('courier_cookie', 'value', {
      keychainAccessible: mockSecureStore.AFTER_FIRST_UNLOCK,
    });
  });

  // The Expo client's storage contract is four methods (client-storage.ts:
  // `Pick<typeof SecureStore, "setItem" | "setItemAsync" | "getItem" |
  // "getItemAsync">`), and the last-login-method plugin's clear action also
  // uses `deleteItemAsync`, so the wrapper carries it too.
  it('hands over the surface the Expo client and its plugins call', () => {
    const options = expoClientOptions();

    expect(Object.keys(options.storage ?? {}).sort()).toEqual([
      'deleteItemAsync',
      'getItem',
      'getItemAsync',
      'setItem',
      'setItemAsync',
    ]);
  });
});
