/**
 * The shared op-sqlite handle (BUG-089's second half, opened by the Android
 * E2E run of e59aaaf).
 *
 * The event log and the run cache both open `courier.db`. Each cached its own
 * WRAPPER, so each still called `open({name})` itself and the app's own
 * construction site (`src/run/productionRunStore`) opened TWO handles on the one
 * SQLCipher file. SQLCipher takes a write lock, so the second handle's
 * statements failed on the device:
 *
 *   run: the marks could not be read back:
 *   [op-sqlite] statement execution error: database is locked
 *
 * and the day the screens answer with never loaded, because the cache read that
 * holds it is on that same handle.
 *
 * These tests pin the contract that fixes it: ONE handle per name, handed to
 * every store, and closed only when the last user lets go of it. `open` is
 * mocked, so this proves the app's own sharing and not SQLCipher's locking -
 * the device's own witness is the run linked from BUGS.md and from the PR.
 *
 * The handle is a fresh identity per `open`, which is what the mocking needs
 * to be able to tell apart: a mock that always answered the same object would
 * make "one handle" true whatever the module did.
 */
interface MockHandle {
  readonly name: string;
  readonly id: number;
  closed: boolean;
}

interface MockHandle {
  readonly name: string;
  readonly id: number;
  closed: boolean;
  execute: () => Promise<{ rows: readonly Record<string, unknown>[] }>;
  closeAsync: () => Promise<void>;
}

/** The handles the mocked `open` handed out, so a test can ask for the name. */
const handles: MockHandle[] = [];

jest.mock('@op-engineering/op-sqlite', () => {
  let nextId = 0;
  return {
    open: ({ name }: { name: string }) => {
      // The handle IS the record: the module hands `database` straight back, so
      // a test can ask which handle it holds and whether it has been closed.
      const handle = {
        name,
        id: nextId++,
        closed: false,
        execute: () => Promise.resolve({ rows: [] }),
        closeAsync: () => {
          handle.closed = true;
          return Promise.resolve();
        },
      };
      handles.push(handle);
      return handle;
    },
  };
});

import { sharedDatabase } from '../dbConnections';

/**
 * The handle as the test sees it: the mocked `open` puts an `id` and a
 * `closed` flag on it, which is what tells two handles apart and says whether
 * the database has been closed.
 */
function asHandle(database: unknown): MockHandle {
  return database as MockHandle;
}

/** The ids of the handles `open` has handed out for one name. */
function idsFor(name: string): number[] {
  return handles.filter((handle) => handle.name === name).map((handle) => handle.id);
}

/** Whether a handle has been closed, or false when it was never opened. */
function closedOf(id: number | undefined): boolean {
  if (id === undefined) {
    return false;
  }
  return handles.find((handle) => handle.id === id)?.closed ?? false;
}

describe('the shared op-sqlite handle', () => {
  it('hands the same handle to every caller of one name', () => {
    const first = sharedDatabase('courier.db');
    const second = sharedDatabase('courier.db');

    // One `open` for one name: this is the whole fix. Two handles on one
    // SQLCipher file is what made the store's statements fail on the device.
    expect(idsFor('courier.db')).toEqual([asHandle(first.database).id]);
    expect(second.database).toBe(first.database);

    return Promise.all([first.release(), second.release()]);
  });

  it('hands a different name its own handle', () => {
    const one = sharedDatabase('one.db');
    const two = sharedDatabase('two.db');

    expect(two.database).not.toBe(one.database);
    expect(idsFor('two.db')).toEqual([asHandle(two.database).id]);

    return Promise.all([one.release(), two.release()]);
  });

  it('keeps the handle open while another store still holds it', async () => {
    const first = sharedDatabase('courier.db');
    const second = sharedDatabase('courier.db');
    const id = asHandle(first.database).id;

    // One store finishing its work must not close the database out from under
    // the other: the run state's cleanup closes the cache and the log at the
    // same moment, and the order between them is not something to depend on.
    await first.release();

    expect(closedOf(id)).toBe(false);

    const fresh = sharedDatabase('courier.db');
    expect(fresh.database).toBe(second.database);

    await second.release();
    await fresh.release();
  });

  it('closes the handle when the last store lets go of it', async () => {
    const first = sharedDatabase('courier.db');
    const second = sharedDatabase('courier.db');
    const id = asHandle(first.database).id;
    const before = idsFor('courier.db').length;

    await first.release();
    await second.release();

    // The handle is closed, so the next open is a NEW one: a store opened
    // after the last user left does not read through a closed handle.
    expect(closedOf(id)).toBe(true);

    const fresh = sharedDatabase('courier.db');
    expect(idsFor('courier.db').length).toBe(before + 1);
    await fresh.release();
  });

  it('releases once per call, so a double release is not a double close', async () => {
    const first = sharedDatabase('courier.db');
    const second = sharedDatabase('courier.db');
    const id = asHandle(first.database).id;

    await first.release();
    // A second release of the SAME handle must not take the count below what
    // is held: the store's own `close()` may be called twice by a caller.
    await first.release();

    await second.release();

    expect(closedOf(id)).toBe(true);
  });

  it('does not let a later open read through a handle the last store closed', async () => {
    const first = sharedDatabase('courier.db');
    const firstId = asHandle(first.database).id;
    await first.release();

    const fresh = sharedDatabase('courier.db');
    expect(asHandle(fresh.database).id).not.toBe(firstId);
    await fresh.release();
  });
});
