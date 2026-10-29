/**
 * The op-sqlite store of the event log.
 *
 * op-sqlite is the encrypted database of the app (SQLCipher + FTS5), so the
 * events of the courier are on the phone in the clear only.
 *
 * Three filed defects are closed where this module touches them:
 *
 *   - **BUG-087** (no migration): the shape is versioned, and an installed
 *     table is brought to it before the first new-shape statement runs.
 *   - **BUG-088** (the timestamp ordered as text): `occurred_at` is normalised
 *     to an aware instant on the write path and ordered by the instant.
 *   - **BUG-089** (no shared connection, no close, no lock): one cached
 *     connection per name, an explicit `close()`, and the write path is
 *     serialised at the log that owns the pending/confirm window
 *     (`EventLog.window`).
 *
 * A delivery the courier undid before the server stored it can be taken back
 * out of the log (`forget`); a refusal is kept out of the send path without
 * being lost (ADR-014 §3).
 */
import { open, type DB, type Scalar } from '@op-engineering/op-sqlite';
import { errorMessage } from '@/lib/errors';

import { dbNumber, dbText, migrateTable, normaliseOccurredAt, type TableShape } from './eventSchema';
import type { DeliveryEvent, EventStore } from './types';

/** The shape of the event log's table, and the version of that shape. */
export const EVENT_TABLE: TableShape = {
  table: 'delivery_events',
  columns: [
    ['id', 'TEXT', 'PRIMARY KEY NOT NULL'],
    ['stop_id', 'TEXT', 'NOT NULL'],
    ['kind', 'TEXT', 'NOT NULL'],
    ['utterance', 'TEXT'],
    ['safe_place', 'TEXT'],
    ['lat', 'REAL'],
    ['lon', 'REAL'],
    ['accuracy_m', 'REAL'],
    ['occurred_at', 'TEXT', 'NOT NULL'],
    ['synced', 'INTEGER', 'NOT NULL DEFAULT 0'],
    ['refused_at', 'TEXT'],
  ],
  version: 1,
};

/** The version every database of the event log is migrated to. */
const PENDING_INDEX = 'delivery_events_pending';

/**
 * One connection per name, opened once (BUG-089).
 *
 * The app's log is one file, so two handles on it would race; the cache also
 * means a second `open` is the same store, and `close()` takes it out again.
 */
const CONNECTIONS = new Map<string, OpSqliteEventStore>();

export class OpSqliteEventStore implements EventStore {
  /** The first thing every operation waits for: the shape it runs against. */
  private readonly ready: Promise<void>;

  private constructor(private readonly database: DB) {
    this.ready = this.prepare();
  }

  /** The shape, the version, and the index the pending list reads by. */
  private async prepare(): Promise<void> {
    await migrateTable(this.database, EVENT_TABLE);
    await this.database.execute(
      `CREATE INDEX IF NOT EXISTS ${PENDING_INDEX} ON ${EVENT_TABLE.table} (synced, occurred_at)`,
    );
  }

  /** The store over a database the caller has already opened. */
  static over(database: DB): OpSqliteEventStore {
    return new OpSqliteEventStore(database);
  }

  /** The store of one name, opened once and cached by name. */
  static open(name = 'courier.db'): OpSqliteEventStore {
    const cached = CONNECTIONS.get(name);
    if (cached !== undefined) {
      return cached;
    }
    const store = new OpSqliteEventStore(open({ name }));
    CONNECTIONS.set(name, store);
    return store;
  }

  /** Drops this connection, so the next open opens a new one. */
  async close(): Promise<void> {
    for (const [name, store] of CONNECTIONS) {
      if (store === this) {
        CONNECTIONS.delete(name);
      }
    }
    await this.ready.catch((error: unknown) => {
      // A store whose migration failed still has to give its connection back.
      console.warn(`sync: the event log was never ready, its connection is closed anyway: ${errorMessage(error)}`);
    });
    await this.database.closeAsync();
  }

  async append(event: DeliveryEvent): Promise<void> {
    await this.ready;
    await this.database.execute(
      `INSERT OR IGNORE INTO ${EVENT_TABLE.table}
         (id, stop_id, kind, utterance, safe_place, lat, lon, accuracy_m, occurred_at, synced, refused_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)`,
      [
        event.id,
        event.stopId,
        event.kind,
        event.utterance ?? null,
        event.safePlace ?? null,
        event.lat ?? null,
        event.lon ?? null,
        event.accuracyM ?? null,
        normaliseOccurredAt(event.occurredAt),
      ],
    );
  }

  async pending(limit: number): Promise<DeliveryEvent[]> {
    await this.ready;
    const result = await this.database.execute(
      `SELECT id, stop_id, kind, utterance, safe_place, lat, lon, accuracy_m, occurred_at
         FROM ${EVENT_TABLE.table}
        WHERE synced = 0 AND refused_at IS NULL
        ORDER BY julianday(occurred_at) ASC
        LIMIT ?`,
      [limit],
    );
    return result.rows.map(eventOf);
  }

  async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await this.ready;
    const placeholders = ids.map(() => '?').join(', ');
    await this.database.execute(
      `UPDATE ${EVENT_TABLE.table} SET synced = 1 WHERE id IN (${placeholders})`,
      ids,
    );
  }

  async quarantine(events: DeliveryEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }
    await this.ready;
    const refusedAt = new Date().toISOString();
    for (const event of events) {
      await this.database.execute(
        `UPDATE ${EVENT_TABLE.table} SET refused_at = ? WHERE id = ? AND synced = 0`,
        [refusedAt, event.id],
      );
    }
  }

  async forget(id: string): Promise<void> {
    await this.ready;
    await this.database.execute(
      `DELETE FROM ${EVENT_TABLE.table} WHERE id = ? AND synced = 0`,
      [id],
    );
  }

  async pendingCount(): Promise<number> {
    await this.ready;
    const result = await this.database.execute(
      `SELECT count(*) AS total FROM ${EVENT_TABLE.table}
        WHERE synced = 0 AND refused_at IS NULL`,
    );
    return Number(result.rows[0]?.total ?? 0);
  }
}

/** Reads a row of the log back as an event, with its absent fields absent. */
function eventOf(row: Record<string, Scalar>): DeliveryEvent {
  return {
    id: dbText(row, 'id'),
    stopId: dbText(row, 'stop_id'),
    kind: dbText(row, 'kind') as DeliveryEvent['kind'],
    utterance: row.utterance === null ? undefined : dbText(row, 'utterance'),
    safePlace: row.safe_place === null ? undefined : dbText(row, 'safe_place'),
    lat: dbNumber(row, 'lat'),
    lon: dbNumber(row, 'lon'),
    accuracyM: dbNumber(row, 'accuracy_m'),
    occurredAt: dbText(row, 'occurred_at'),
  };
}
