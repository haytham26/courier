/**
 * The op-sqlite store of the event log.
 *
 * op-sqlite is the encrypted database of the app (SQLCipher + FTS5), so the
 * events of the courier are on the phone in the clear only.
 */
import { open, type DB } from '@op-engineering/op-sqlite';
import type { DeliveryEvent, EventStore } from './types';

const TABLE = 'delivery_events';

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
      id: String(row.id),
      stopId: String(row.stop_id),
      kind: String(row.kind) as DeliveryEvent['kind'],
      utterance: row.utterance === null ? undefined : String(row.utterance),
      safePlace: row.safe_place === null ? undefined : String(row.safe_place),
      lat: row.lat === null ? undefined : Number(row.lat),
      lon: row.lon === null ? undefined : Number(row.lon),
      accuracyM: row.accuracy_m === null ? undefined : Number(row.accuracy_m),
      occurredAt: String(row.occurred_at),
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
