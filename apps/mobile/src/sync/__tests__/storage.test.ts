/**
 * The driver preferences store (BUG-091, the C1 audit squad 1's storage finding).
 *
 * Two defects, one file, one row - and the tests that name them were red
 * against the shipped code:
 *
 * 1. **The queue's key and the file's key are two namespaces.** The write
 *    queue was keyed by the driver id while the file is keyed by the
 *    sanitised name, so two ids that sanitise to the same name
 *    (`driverPreferenceFileName('courier:1')` and
 *    `driverPreferenceFileName('courier-1')` are both `courier-1.json`)
 *    were queued apart and wrote to ONE file: the two read-modify-writes
 *    raced and the second overwrote the first's key. The queue is keyed by
 *    the file's own name now, so one file is one queue.
 *
 * 2. **An unreadable file read as an empty one.** The file store turned an IO
 *    error into `null`, which `parseDriverPreferences` turns into the empty
 *    set, so the next write (a read-modify-write) overwrote the stored value
 *    with the one key it happened to hold. A read that cannot say what the
 *    file holds must stop the write, not be papered over.
 *
 * The store here is the real one's shape: a map keyed by the FILE name, the
 * way the device file system is keyed, so a name collision is what a device
 * would see.
 */
import {
  driverPreferenceFileName,
  readDriverPreferences,
  readDriverPreferencesRead,
  writeDriverPreference,
  type PreferenceStore,
} from '../storage';

/** A store that keys its files the way the device does: by the file name. */
function fileKeyedStore(files: Map<string, string> = new Map()): PreferenceStore {
  return {
    read(driverId: string): Promise<string | null> {
      return Promise.resolve(files.get(driverPreferenceFileName(driverId)) ?? null);
    },
    write(driverId: string, raw: string): Promise<void> {
      files.set(driverPreferenceFileName(driverId), raw);
      return Promise.resolve();
    },
  };
}

/** The two ids that sanitise to one file name. */
const FIRST = 'courier:1';

const SECOND = 'courier-1';

describe('the write queue of the driver preferences (BUG-091)', () => {
  it('gives two driver ids that sanitise to one file name one queue', async () => {
    const files = new Map<string, string>();
    const store = fileKeyedStore(files);

    // The two ids are one file: this is the premise the defect stands on.
    expect(driverPreferenceFileName(FIRST)).toBe(driverPreferenceFileName(SECOND));

    // Both writes start before either finishes, the way two screens saving
    // two settings at the same moment do.
    const first = writeDriverPreference(store, FIRST, 'theme', 'night');
    const second = writeDriverPreference(store, SECOND, 'mapMode', '3d');
    await Promise.all([first, second]);

    const stored = readDriverPreferences(store, FIRST);
    expect((await stored).theme).toBe('night');
    expect((await stored).mapMode).toBe('3d');
  });

  it('reads the file before each write of the queue, so no value is lost', async () => {
    const files = new Map<string, string>();
    const store = fileKeyedStore(files);

    await writeDriverPreference(store, FIRST, 'one', 1);
    await writeDriverPreference(store, SECOND, 'two', 2);

    const stored = await readDriverPreferences(store, FIRST);
    expect(stored).toEqual({ one: 1, two: 2 });
  });
});

describe('a preferences file that cannot be read (BUG-091)', () => {
  it('says the file is unreadable rather than answering the empty set', async () => {
    const store: PreferenceStore = {
      read: () => Promise.reject(new Error('the device refused the read')),
      write: () => Promise.resolve(),
    };

    const read = await readDriverPreferencesRead(store, 'driver-1');

    expect(read.status).toBe('unreadable');
    expect(read.status === 'unreadable' ? read.message : '').toContain('the device refused the read');
  });

  it('refuses to write over a file whose value it could not read', async () => {
    const files = new Map<string, string>([['driver-1.json', '{"theme":"night"}']]);
    const store: PreferenceStore = {
      read: () => Promise.reject(new Error('the device refused the read')),
      write: (driverId, raw) => {
        files.set(driverPreferenceFileName(driverId), raw);
        return Promise.resolve();
      },
    };

    await expect(writeDriverPreference(store, 'driver-1', 'mapMode', '3d')).rejects.toThrow(
      'could not be read',
    );

    // The stored value is still the stored value: a write that cannot know
    // what the file holds does not overwrite it with one key.
    expect(files.get('driver-1.json')).toBe('{"theme":"night"}');
  });

  it('keeps the queue going after a refused write', async () => {
    let readable = false;
    const files = new Map<string, string>();
    const store: PreferenceStore = {
      read: () => (readable ? Promise.resolve(files.get('driver-1.json') ?? null) : Promise.reject(new Error('nope'))),
      write: (driverId, raw) => {
        files.set(driverPreferenceFileName(driverId), raw);
        return Promise.resolve();
      },
    };

    await expect(writeDriverPreference(store, 'driver-1', 'mapMode', '3d')).rejects.toThrow('could not be read');

    readable = true;
    await writeDriverPreference(store, 'driver-1', 'theme', 'night');

    expect(files.get('driver-1.json')).toBe('{"theme":"night"}');
  });

  it('answers the empty set for a file that simply is not there', async () => {
    const store = fileKeyedStore();

    const read = await readDriverPreferencesRead(store, 'driver-1');

    expect(read.status).toBe('read');
    expect(read.status === 'read' ? read.preferences : {}).toEqual({});
    expect(await readDriverPreferences(store, 'driver-1')).toEqual({});
  });
});
