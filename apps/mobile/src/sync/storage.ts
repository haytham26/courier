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
 *
 * Two filed defects live where this module keeps its keys (BUG-091, the C1
 * audit squad 1's storage finding):
 *
 *   - the write queue was keyed by the driver id while the FILE is keyed by
 *     the sanitised name, so two ids that sanitise to one name were queued
 *     apart and wrote to one file, losing one of the two values;
 *   - a file that could not be read answered as an empty one, so the next
 *     write overwrote the stored value with the single key it happened to
 *     hold.
 *
 * The first is fixed by keying the queue by the file's own name; the second
 * by a read that says "unreadable" instead of "nothing is stored", and a
 * write that refuses to overwrite a value it could not read.
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
 * What a read of one driver's preferences came back with.
 *
 * The two states are not the same thing and must not be collapsed: a driver
 * who has set nothing yet has the empty set, while a file the device refused
 * to read holds a value nobody can see. The write path reads this to decide
 * whether it may write at all.
 */
export type PreferencesRead =
  /** The file was read, or there is none: the preferences it holds. */
  | { status: 'read'; preferences: DriverPreferences }
  /** The file is there but could not be read, so its value is not known. */
  | { status: 'unreadable'; message: string };

/**
 * Reads the preferences of a driver, and says how the read went.
 *
 * `readDriverPreferences` is the shape the screens want; this is the shape
 * the write path needs, because a write that cannot read the file must not
 * overwrite it.
 */
export async function readDriverPreferencesRead(
  store: PreferenceStore,
  driverId: string,
): Promise<PreferencesRead> {
  let raw: string | null;
  try {
    raw = await store.read(driverId);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      status: 'unreadable',
      message: `the preferences of the driver could not be read: ${detail}`,
    };
  }
  return { status: 'read', preferences: parseDriverPreferences(raw) };
}

/**
 * Reads the preferences of a driver.
 *
 * A file that is not there is not an error: the driver has simply not set
 * anything yet, so the empty set comes back. A file that cannot be read is
 * also not an error here: the empty set comes back and the caller carries on
 * with the defaults, because a broken preferences file must never take the
 * screen down. It is the WRITE path that must not be told "empty" - a write
 * would then destroy the stored value - and that is what
 * `readDriverPreferencesRead` is for.
 */
export async function readDriverPreferences(
  store: PreferenceStore,
  driverId: string,
): Promise<DriverPreferences> {
  const read = await readDriverPreferencesRead(store, driverId);
  return read.status === 'read' ? read.preferences : {};
}

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

/**
 * The writes of one driver, one after the other.
 *
 * The map mode, the map settings and the theme are three separate choices
 * and they all live in the same file, so the writes are queued per file:
 * a write reads the file, changes one value and writes it back, and two
 * writes at the same time would lose one of them.
 *
 * The key is the FILE's own name (`driverPreferenceFileName`), not the raw
 * driver id (BUG-091): the file system is addressed by the sanitised name,
 * so two ids that sanitise to one name are one file and must therefore be
 * one queue. Keyed by the id they were two queues writing one file, and the
 * second read-modify-write overwrote the first's key.
 */
const writeQueues = new Map<string, Promise<void>>();

/**
 * Writes one preference of one driver.
 *
 * The other preferences of that driver are kept: the file is read, the one
 * value is replaced and the file is written back.
 *
 * A file that cannot be read is NOT written over (BUG-091): the read says
 * "unreadable" rather than "empty", so the write refuses and the caller sees
 * the failure, because overwriting a value the app cannot see with the one
 * key it happens to hold is how a courier's settings get silently lost.
 */
export async function writeDriverPreference(
  store: PreferenceStore,
  driverId: string,
  key: string,
  value: unknown,
): Promise<void> {
  // One file, one queue: the key is the name the file system uses, so two
  // ids that sanitise to it cannot race each other.
  const queueKey = driverPreferenceFileName(driverId);
  const previous = writeQueues.get(queueKey) ?? Promise.resolve();

  const write: Promise<void> = previous.then(async () => {
    const read = await readDriverPreferencesRead(store, driverId);
    if (read.status === 'unreadable') {
      throw new Error(read.message);
    }
    const preferences = { ...read.preferences, [key]: value };
    await store.write(driverId, serialiseDriverPreferences(preferences));
  });

  // The queue keeps going after a failed write, and the caller still sees
  // the failure. The swallow answers with a resolved promise because, in
  // the non-strict mode of the app, an `undefined` callback result widens
  // the catch chain off the void promise type.
  writeQueues.set(
    queueKey,
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
