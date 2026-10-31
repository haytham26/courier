/**
 * The device store the session lives in.
 *
 * The Expo client of Better Auth writes the session cookie into
 * `expo-secure-store`, so the session is in the iOS keychain or the Android
 * Keystore and no other app can read it.
 *
 * One thing is changed here: the keychain entry is readable after the phone
 * has been unlocked once (`AFTER_FIRST_UNLOCK`). The default of
 * `expo-secure-store` is `WHEN_UNLOCKED`, which fails while the phone is
 * locked - and a courier's phone is locked in the van for the whole shift
 * (the upstream issue is better-auth #10382).
 *
 * This object is exported once and used everywhere. The Expo client keeps its
 * write queue in a map that is keyed by the storage object, so a second copy
 * of this wrapper would split that queue and could lose a session write.
 */
import {
  AFTER_FIRST_UNLOCK,
  deleteItemAsync,
  getItem,
  getItemAsync,
  setItem,
  setItemAsync,
} from 'expo-secure-store';

const OPTIONS = {
  keychainAccessible: AFTER_FIRST_UNLOCK,
} as const;

/**
 * The device store.
 *
 * The name is not `sessionStorage` on purpose: that is the name of the
 * browser storage, and the two are easy to mix up.
 *
 * It is the app's one wrapper over `expo-secure-store`, and it is exported
 * once and used everywhere - including by the Better Auth client, which needs
 * the whole surface its plugins call (BUG-078: the raw module was handed over
 * before, so none of these options reached the client's cookie writes).
 */
export const deviceStore = {
  getItem: (key: string): string | null => getItem(key, OPTIONS),
  getItemAsync: (key: string): Promise<string | null> => getItemAsync(key, OPTIONS),
  setItem: (key: string, value: string): void => {
    setItem(key, value, OPTIONS);
  },
  setItemAsync: (key: string, value: string): Promise<void> => setItemAsync(key, value, OPTIONS),
  deleteItemAsync: (key: string): Promise<void> => deleteItemAsync(key, OPTIONS),
};

/** Whether the device store is there at all (it is not on the web). */
export const hasDeviceStore = typeof setItemAsync === 'function';

/**
 * Reads one value from the device store.
 *
 * A store that cannot be read is not an error the app has to handle: the
 * answer is simply that there is nothing there.
 */
export async function readStoredValue(key: string): Promise<string | null> {
  try {
    const value = await getItemAsync(key, OPTIONS);
    return value;
  } catch {
    return null;
  }
}

/** Writes one value into the device store, and forgets it when it fails. */
export async function writeStoredValue(key: string, value: string): Promise<void> {
  try {
    await setItemAsync(key, value, OPTIONS);
  } catch {
    // The device store is not writable: the app still works, it just cannot
    // keep a session for the days without a signal.
  }
}

/**
 * Takes one value out of the device store.
 *
 * Unlike `writeStoredValue`, a failure here is NOT swallowed: the caller is
 * the sign-out, and a receipt the device store will not give up is a receipt
 * a driver asked to forget that is still there. The failure is the caller's
 * to answer (BUG-077).
 */
export async function clearStoredValue(key: string): Promise<void> {
  let failed: unknown;
  try {
    await deleteItemAsync(key, OPTIONS);
    return;
  } catch (error) {
    failed = error;
  }
  // A store with no delete, or a delete that failed, gets the value emptied
  // instead: an empty value is what `readStoredValue` hands back as nothing.
  try {
    await setItemAsync(key, '', OPTIONS);
  } catch {
    // Both ways failed: the receipt stays, and the caller is told.
  }
  const detail = failed instanceof Error ? failed.message : 'the delete failed';
  throw new Error(`the value ${key} could not be taken out of the device store: ${detail}`, {
    cause: failed,
  });
}
