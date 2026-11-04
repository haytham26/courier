/**
 * One op-sqlite handle per name, shared by every store that needs it.
 *
 * BUG-089 (the audit's squad-3 finding) closed the event log's own duplicate
 * handles: one cached connection per name, an explicit `close()`. The run cache
 * learned the same lesson and caches its WRAPPER per name - but a cached
 * wrapper still called `open({name})` itself, so the event log and the run cache
 * held TWO separate handles on the one SQLCipher file the app keeps (`courier.db`).
 *
 * Two handles on one encrypted file is not a small redundancy: SQLCipher takes a
 * write lock, so the second handle's statements fail with `database is locked`,
 * and the app's own construction site opens both in one call
 * (`src/run/productionRunStore`). The Android E2E run of `e59aaaf` was the
 * witness - both legs, on both images, five flows dead:
 *
 *   run: the marks could not be read back:
 *   [op-sqlite] statement execution error: database is locked
 *
 * and the day the screens answered with was empty, because the cache read that
 * holds it never completed.
 *
 * So the handle is shared here: the name is opened once and every store reads it
 * from here. `close()` drops the shared entry, so the last store to close is the
 * one that closes the database - and a store that is closed before another still
 * holds its own lifetime, because it does not own the handle.
 */

import { open, type DB } from '@op-engineering/op-sqlite';

/** The handles the app has opened, by the name each was opened with. */
const HANDLES = new Map<string, { database: DB; users: number }>();

/**
 * The op-sqlite handle of one name, opened once and counted by its users.
 *
 * The count is what lets one store close without tearing the database out from
 * under another: the last user drops the entry, and only then is the handle
 * itself closed.
 */
export interface SharedHandle {
  database: DB;
  /** This store is done with the handle. The last one to say so closes it. */
  release(): Promise<void>;
}

/** The handle of one name, opened once and shared by every store that asks. */
export function sharedDatabase(name: string): SharedHandle {
  let entry = HANDLES.get(name);
  if (entry === undefined) {
    entry = { database: open({ name }), users: 0 };
    HANDLES.set(name, entry);
  }
  entry.users += 1;

  let released = false;

  return {
    database: entry.database,
    release: async (): Promise<void> => {
      if (released) {
        return;
      }
      released = true;
      const current = HANDLES.get(name);
      if (current === undefined) {
        return;
      }
      current.users -= 1;
      if (current.users > 0) {
        // Another store still reads this handle: the database stays open.
        return;
      }
      HANDLES.delete(name);
      await current.database.closeAsync();
    },
  };
}
