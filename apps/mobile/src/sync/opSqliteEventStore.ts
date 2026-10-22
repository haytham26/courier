/**
 * The op-sqlite store of the event log.
 *
 * op-sqlite is the encrypted database of the app (SQLCipher + FTS5), so the
 * events of the courier are on the phone in the clear only.
 */
import { open, type DB, type Scalar } from '@op-engineering/op-sqlite';
import type { DeliveryEvent, EventStore } from './types';

const TABLE = 'delivery_events';

/**
 * Reads one TEXT column of a row.
 *
 * op-sqlite hands the rows back as records of untyped scalars; the columns of
 * this table are written by append() alone, so a non-text value there means
 * the database is corrupt and the run of reads must fail loudly.
 */
function dbText(row: Record<string, Scalar>, column: string): string {
  const value = row[column];
  if (typeof value !== 'string') {
    throw new Error(`the column ${column} of the event log is not the text it must be`);
  }
  return value;
}

/** Reads one nullable REAL column: sqlite's NULL and the SQL default both mean "not recorded". */
function dbNumber(row: Record<string, Scalar>, column: string): number | undefined {
  const value = row[column];
  if (typeof value !== 'number') {
    return undefined;
  }
  return value;
}

export class OpSqliteEventStore implements EventStore {
  private constructor(private readonly database: DB) {}

  /** Opens (and creates) the database of the event log. */
  static async open(name = 'courier.db'): Promise<OpSqliteEventStore> {
    const database = open({ name });
    await database.execute(
      `CREATE TABLE IF NOT EXISTS ${TABLE} (
         id TEXT PRIMARY KEY NOT NULL,
         stop_id TEXT NOT NULL,
         kind TEXT NOT NULL,
         utterance TEXT,
         safe_place TEXT,
         lat REAL,
         lon REAL,
         accuracy_m REAL,
         occurred_at TEXT NOT NULL,
         synced INTEGER NOT NULL DEFAULT 0
       )`,
    );
    await database.execute(
      `CREATE INDEX IF NOT EXISTS ${TABLE}_pending ON ${TABLE} (synced, occurred_at)`,
    );
    return new OpSqliteEventStore(database);
  }

  async append(event: DeliveryEvent): Promise<void> {
    await this.database.execute(
      `INSERT OR IGNORE INTO ${TABLE}
         (id, stop_id, kind, utterance, safe_place, lat, lon, accuracy_m, occurred_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        event.id,
        event.stopId,
        event.kind,
        event.utterance ?? null,
        event.safePlace ?? null,
        event.lat ?? null,
        event.lon ?? null,
        event.accuracyM ?? null,
        event.occurredAt,
      ],
    );
  }

  async pending(limit: number): Promise<DeliveryEvent[]> {
    const result = await this.database.execute(
      `SELECT id, stop_id, kind, utterance, safe_place, lat, lon, accuracy_m, occurred_at
         FROM ${TABLE}
        WHERE synced = 0
        ORDER BY occurred_at ASC
        LIMIT ?`,
      [limit],
    );
    return result.rows.map((row) => ({
      id: dbText(row, 'id'),
      stopId: dbText(row, 'stop_id'),
      kind: dbText(row, 'kind') as DeliveryEvent['kind'],
      utterance: row.utterance === null ? undefined : dbText(row, 'utterance'),
      safePlace: row.safe_place === null ? undefined : dbText(row, 'safe_place'),
      lat: dbNumber(row, 'lat'),
      lon: dbNumber(row, 'lon'),
      accuracyM: dbNumber(row, 'accuracy_m'),
      occurredAt: dbText(row, 'occurred_at'),
    }));
  }

  async markSynced(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const placeholders = ids.map(() => '?').join(', ');
    await this.database.execute(
      `UPDATE ${TABLE} SET synced = 1 WHERE id IN (${placeholders})`,
      ids,
    );
  }

  async pendingCount(): Promise<number> {
    const result = await this.database.execute(
      `SELECT count(*) AS total FROM ${TABLE} WHERE synced = 0`,
    );
    return Number(result.rows[0]?.total ?? 0);
  }
}
