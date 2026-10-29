/**
 * The op-sqlite cache of the run: what the phone keeps of the day when the
 * API is not there.
 *
 * The audit's A1 says one fact and not three caches: this is the store's own
 * cache, written by the one run store and read by every reader, so the
 * offline answer and the online answer are the same rows. The columns are the
 * contract's own (`RunResponse`, `StopResponse` of
 * `packages/shared/src/generated/api`), so a read is a mapping and not a JSON
 * blob nobody can query.
 *
 * The tables are created here with their current shape and versioned with
 * `PRAGMA user_version` (the event log's BUG-087 lesson: a shape that grows a
 * column has to be able to land on an install that already has the table).
 */
import { open, type DB, type Scalar } from '@op-engineering/op-sqlite';
import { errorMessage } from '@/lib/errors';

import { dbNumber, dbText, migrateTable, type TableShape } from '@/sync/eventSchema';

import type { DeliveredMark, RunCache, RunSnapshot } from './types';

/** The one row the run is kept in: the phone carries one day at a time. */
const THE_ROW = 'current';

/** The run itself: the contract's `RunResponse`, one row per field. */
const RUN_TABLE: TableShape = {
  table: 'run_state_run',
  columns: [
    ['id', 'TEXT', 'PRIMARY KEY NOT NULL'],
    ['run_id', 'TEXT', 'NOT NULL'],
    ['shift_id', 'TEXT', 'NOT NULL'],
    ['name', 'TEXT', 'NOT NULL'],
    ['depot_lat', 'REAL', 'NOT NULL'],
    ['depot_lon', 'REAL', 'NOT NULL'],
    ['speed_kmh', 'REAL', 'NOT NULL'],
    ['start_at', 'TEXT', 'NOT NULL'],
    ['capacity_parcels', 'REAL'],
    ['updated_at', 'TEXT', 'NOT NULL'],
  ],
  version: 1,
};

/** The stops of that run: the contract's `StopResponse`. */
const STOP_TABLE: TableShape = {
  table: 'run_state_stops',
  columns: [
    ['id', 'TEXT', 'PRIMARY KEY NOT NULL'],
    ['run_id', 'TEXT', 'NOT NULL'],
    ['location_id', 'TEXT', 'NOT NULL'],
    ['seq', 'INTEGER', 'NOT NULL'],
    ['status', 'TEXT', 'NOT NULL'],
    ['address', 'TEXT'],
    ['lat', 'REAL'],
    ['lon', 'REAL'],
    ['priority', 'INTEGER'],
    ['parcels', 'INTEGER'],
    ['service_time_s', 'INTEGER'],
    ['window_start', 'TEXT'],
    ['window_end', 'TEXT'],
  ],
  version: 1,
};

/** The marks of that run: what the courier has delivered, undoable. */
const MARK_TABLE: TableShape = {
  table: 'run_state_marks',
  columns: [
    ['stop_id', 'TEXT', 'PRIMARY KEY NOT NULL'],
    ['sequence', 'INTEGER', 'NOT NULL'],
    ['at', 'INTEGER', 'NOT NULL'],
    ['event_id', 'TEXT', 'NOT NULL'],
  ],
  version: 1,
};

/** One cached connection per name, like the event log's (BUG-089). */
const CONNECTIONS = new Map<string, OpSqliteRunCache>();

export class OpSqliteRunCache implements RunCache {
  private readonly ready: Promise<void>;

  private constructor(private readonly database: DB) {
    this.ready = this.prepare();
  }

  /** The cache of one name, opened once and cached by name. */
  static open(name = 'courier.db'): OpSqliteRunCache {
    const cached = CONNECTIONS.get(name);
    if (cached !== undefined) {
      return cached;
    }
    const cache = new OpSqliteRunCache(open({ name }));
    CONNECTIONS.set(name, cache);
    return cache;
  }

  /** Closes the connection and drops it, so the next open opens a new one. */
  async close(): Promise<void> {
    for (const [name, cache] of CONNECTIONS) {
      if (cache === this) {
        CONNECTIONS.delete(name);
      }
    }
    await this.ready.catch((error: unknown) => {
      console.warn(`run: the run cache was never ready, its connection is closed anyway: ${errorMessage(error)}`);
    });
    await this.database.closeAsync();
  }

  async read(): Promise<RunSnapshot | null> {
    await this.ready;
    const run = await this.database.execute(
      `SELECT run_id, shift_id, name, depot_lat, depot_lon, speed_kmh, start_at, capacity_parcels
         FROM ${RUN_TABLE.table} ORDER BY id ASC LIMIT 1`,
    );
    const row = run.rows[0];
    if (row === undefined) {
      return null;
    }
    const stops = await this.database.execute(
      `SELECT id, location_id, seq, status, address, lat, lon, priority, parcels, service_time_s, window_start, window_end
         FROM ${STOP_TABLE.table} ORDER BY seq ASC`,
    );
    return { run: runOf(row), stops: stops.rows.map(stopOf) };
  }

  async write(snapshot: RunSnapshot): Promise<void> {
    await this.ready;
    // One day is one run: the previous row and its stops leave before the new
    // ones are written, so a stop that left the run does not linger.
    await this.database.execute(`DELETE FROM ${RUN_TABLE.table}`);
    await this.database.execute(`DELETE FROM ${STOP_TABLE.table}`);
    await this.database.execute(
      `INSERT OR REPLACE INTO ${RUN_TABLE.table}
         (id, run_id, shift_id, name, depot_lat, depot_lon, speed_kmh, start_at, capacity_parcels, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        THE_ROW,
        snapshot.run.id,
        snapshot.run.shift_id,
        snapshot.run.name,
        snapshot.run.depot.lat,
        snapshot.run.depot.lon,
        snapshot.run.speed_kmh,
        snapshot.run.start_at,
        snapshot.run.capacity_parcels ?? null,
        new Date().toISOString(),
      ],
    );
    for (const stop of snapshot.stops) {
      await this.database.execute(
        `INSERT OR REPLACE INTO ${STOP_TABLE.table}
           (id, run_id, location_id, seq, status, address, lat, lon, priority, parcels, service_time_s, window_start, window_end)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          stop.id,
          snapshot.run.id,
          stop.location_id,
          stop.seq,
          stop.status,
          stop.address ?? null,
          stop.lat ?? null,
          stop.lon ?? null,
          stop.priority === undefined ? null : stop.priority ? 1 : 0,
          stop.parcels ?? null,
          stop.service_time_s ?? null,
          stop.window_start ?? null,
          stop.window_end ?? null,
        ],
      );
    }
  }

  async markDelivered(mark: DeliveredMark): Promise<void> {
    await this.ready;
    await this.database.execute(
      `INSERT OR REPLACE INTO ${MARK_TABLE.table} (stop_id, sequence, at, event_id) VALUES (?, ?, ?, ?)`,
      [mark.stopId, mark.sequence, mark.at, mark.eventId],
    );
  }

  async undoDelivered(stopId: string): Promise<void> {
    await this.ready;
    await this.database.execute(`DELETE FROM ${MARK_TABLE.table} WHERE stop_id = ?`, [stopId]);
  }

  async markOf(stopId: string): Promise<DeliveredMark | null> {
    await this.ready;
    const result = await this.database.execute(
      `SELECT stop_id, sequence, at, event_id FROM ${MARK_TABLE.table} WHERE stop_id = ? LIMIT 1`,
      [stopId],
    );
    const row = result.rows[0];
    return row === undefined ? null : markOf(row);
  }

  async deliveredMarks(): Promise<DeliveredMark[]> {
    await this.ready;
    const result = await this.database.execute(
      `SELECT stop_id, sequence, at, event_id FROM ${MARK_TABLE.table} ORDER BY at ASC, rowid ASC`,
    );
    return result.rows.map(markOf);
  }

  async clear(): Promise<void> {
    await this.ready;
    await this.database.execute(`DELETE FROM ${RUN_TABLE.table}`);
    await this.database.execute(`DELETE FROM ${STOP_TABLE.table}`);
    await this.database.execute(`DELETE FROM ${MARK_TABLE.table}`);
  }

  private async prepare(): Promise<void> {
    await migrateTable(this.database, RUN_TABLE);
    await migrateTable(this.database, STOP_TABLE);
    await migrateTable(this.database, MARK_TABLE);
  }
}

/** The run row, back as the contract answers it. */
function runOf(row: Record<string, Scalar>): RunSnapshot['run'] {
  return {
    id: dbText(row, 'run_id'),
    shift_id: dbText(row, 'shift_id'),
    name: dbText(row, 'name'),
    depot: { lat: Number(row.depot_lat), lon: Number(row.depot_lon) },
    speed_kmh: Number(row.speed_kmh),
    start_at: dbText(row, 'start_at'),
    capacity_parcels: dbNumber(row, 'capacity_parcels'),
  };
}

/** One stop row, back as the contract answers it. */
function stopOf(row: Record<string, Scalar>): RunSnapshot['stops'][number] {
  return {
    id: dbText(row, 'id'),
    location_id: dbText(row, 'location_id'),
    seq: Number(row.seq),
    status: dbText(row, 'status') as RunSnapshot['stops'][number]['status'],
    ...(row.address === null ? {} : { address: dbText(row, 'address') }),
    ...(row.lat === null ? {} : { lat: Number(row.lat) }),
    ...(row.lon === null ? {} : { lon: Number(row.lon) }),
    ...(row.priority === null ? {} : { priority: Number(row.priority) === 1 }),
    ...(row.parcels === null ? {} : { parcels: Number(row.parcels) }),
    ...(row.service_time_s === null ? {} : { service_time_s: Number(row.service_time_s) }),
    ...(row.window_start === null ? {} : { window_start: dbText(row, 'window_start') }),
    ...(row.window_end === null ? {} : { window_end: dbText(row, 'window_end') }),
  };
}

/** One mark row, back as the run state above the screens reads it. */
function markOf(row: Record<string, Scalar>): DeliveredMark {
  return {
    stopId: dbText(row, 'stop_id'),
    sequence: Number(row.sequence),
    at: Number(row.at),
    eventId: dbText(row, 'event_id'),
  };
}
