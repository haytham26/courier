/**
 * The app's storage for the settings that belong to a driver.
 *
 * The courier's own choices - the map mode, the map toggles - are small, they
 * are read on every screen and they have to survive a restart, so they live
 * as one small JSON file per driver:
 *
 *   <documentDirectory>/preferences/<driver id>.json
 *
 * The file is **per driver** because a shared van phone can carry more than
 * one driver: the driver who had the 3D map on is not the driver who has it
 * now, and the next driver must not inherit the choice.
 *
 * Everything here is pure - the file system lives in `preferenceFiles.ts` -
 * so the behaviour can be tested without a device and without a network.
 */

/** The preferences of one driver, as they are stored. */
export type DriverPreferences = Record<string, unknown>;

/**
 * Where the preferences of the drivers are kept.
 *
 * The store is addressed by driver, so a caller cannot read another driver's
 * settings by accident: it has to ask for them by name.
 */
export interface PreferenceStore {
  /** The raw JSON of one driver's preferences, or null when there are none. */
  read(driverId: string): Promise<string | null>;
  /** Writes the raw JSON of one driver's preferences. */
  write(driverId: string, raw: string): Promise<void>;
}

/** The directory the preference files live in, inside the document directory. */
export const PREFERENCES_DIRECTORY_NAME = 'preferences';

/**
 * The file name one driver's preferences are kept in.
 *
 * A driver id is an id and not a name, but it can still carry a character the
 * file system will not take, so the name is made safe here rather than at
 * every call site.
 */
export function driverPreferenceFileName(driverId: string): string {
  const safe = driverId.replace(/[^A-Za-z0-9_-]/g, '-');
  return `${safe.length > 0 ? safe : 'unknown-driver'}.json`;
}

/**
 * Reads the preferences of a driver.
 *
 * A file that is not there is not an error: the driver has simply not set
 * anything yet, so the empty set comes back. A file that cannot be read is
 * also not an error: the empty set comes back and the caller carries on with
 * the defaults. A broken preferences file must never take the screen down.
 */
export function parseDriverPreferences(raw: string | null): DriverPreferences {
  if (raw === null || raw.trim().length === 0) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {};
  }

  return parsed as DriverPreferences;
}

/** The raw JSON of a set of preferences. */
export function serialiseDriverPreferences(preferences: DriverPreferences): string {
  return JSON.stringify(preferences);
}

/** The preferences of one driver, read from the store. */
export async function readDriverPreferences(
  store: PreferenceStore,
  driverId: string,
): Promise<DriverPreferences> {
  const raw = await store.read(driverId);
  return parseDriverPreferences(raw);
}

/**
 * The writes of one driver, one after the other.
 *
 * The map mode, the map settings and the theme are three separate choices
 * and they all live in the same file, so the writes are queued per driver:
 * a write reads the file, changes one value and writes it back, and two
 * writes at the same time would lose one of them.
 */
const writeQueues = new Map<string, Promise<void>>();

/**
 * Writes one preference of one driver.
 *
 * The other preferences of that driver are kept: the file is read, the one
 * value is replaced and the file is written back.
 */
export async function writeDriverPreference(
  store: PreferenceStore,
  driverId: string,
  key: string,
  value: unknown,
): Promise<void> {
  const previous = writeQueues.get(driverId) ?? Promise.resolve();

  const write: Promise<void> = previous.then(async () => {
    const preferences = await readDriverPreferences(store, driverId);
    preferences[key] = value;
    await store.write(driverId, serialiseDriverPreferences(preferences));
  });

  // The queue keeps going after a failed write, and the caller still sees
  // the failure. The swallow answers with a resolved promise because, in
  // the non-strict mode of the app, an `undefined` result widens the chain
  // to Promise<any>.
  writeQueues.set(
    driverId,
    write.catch(() => Promise.resolve()),
  );

  return write;
}

/**
 * A store that keeps the preferences in memory.
 *
 * It is the store of a test, and the fallback of a device whose file system
 * will not open: the courier still gets the screen, the setting is simply not
 * kept between runs.
 */
export function createMemoryPreferenceStore(): PreferenceStore {
  const files = new Map<string, string>();

  return {
    read(driverId: string): Promise<string | null> {
      return Promise.resolve(files.get(driverId) ?? null);
    },
    write(driverId: string, raw: string): Promise<void> {
      files.set(driverId, raw);
      return Promise.resolve();
    },
  };
}
