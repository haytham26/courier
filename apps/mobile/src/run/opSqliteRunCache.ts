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
import type { Scalar } from '@op-engineering/op-sqlite';
import { errorMessage } from '@/lib/errors';

import { dbNumber, dbText, migrateTable, type TableShape } from '@/sync/eventSchema';
import { sharedDatabase, type SharedHandle } from '@/sync/dbConnections';

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
    // Queue 4d (the trial's #12 and #14, ADR-022's app half): the run's own
    // break window and finish point ride the cache, so the offline answer is
    // the same rows the API answers (A1's one-fact rule). Older installed
    // tables get the columns on migration (migrateTable adds + bumps).
    ['break_start_at', 'TEXT'],
    ['break_end_at', 'TEXT'],
    ['finish_lat', 'REAL'],
    ['finish_lon', 'REAL'],
    ['updated_at', 'TEXT', 'NOT NULL'],
  ],
  version: 2,
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
    // ADR-024: the stop's type rides the contract; older installed tables get
    // the column with the default on migration (migrateTable adds + bumps).
    ['type', 'TEXT', "NOT NULL DEFAULT 'delivery'"],
  ],
  version: 2,
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
  private ready: Promise<void>;

  /** The shared handle, released when this cache closes (it does not own it). */
  private handle: SharedHandle;

  /** The name the database is opened under, so a closed cache can reopen it. */
  private readonly name: string;

  /**
   * Set the moment close() starts, synchronously: BUG-172's remount hands the
   * new session this very instance before the dying session's cleanup runs,
   * and that cleanup closes the handle under it - so the next operation
   * reopens instead of failing on the closed handle.
   */
  private closed = false;

  private constructor(name: string, handle: SharedHandle) {
    this.name = name;
    this.handle = handle;
    this.ready = this.prepare();
  }

  /** The cache of one name, opened once and cached by name. */
  static open(name = 'courier.db'): OpSqliteRunCache {
    const cached = CONNECTIONS.get(name);
    if (cached !== undefined && !cached.closed) {
      return cached;
    }
    const cache = new OpSqliteRunCache(name, sharedDatabase(name));
    CONNECTIONS.set(name, cache);
    return cache;
  }

  /** Closes the handle and drops it, so the next open opens a new one. */
  async close(): Promise<void> {
    this.closed = true;
    for (const [name, cache] of CONNECTIONS) {
      if (cache === this) {
        CONNECTIONS.delete(name);
      }
    }
    await this.ready.catch((error: unknown) => {
      console.warn(`run: the run cache was never ready, its handle is released anyway: ${errorMessage(error)}`);
    });
    // The handle is shared with the event log, so it is released rather than
    // closed: the log may still be reading the same file.
    await this.handle.release();
  }

  /**
   * BUG-172: the one gate every operation passes: a cache whose handle was
   * closed under it (the session remount racing the previous session's
   * cleanup) reopens the database first, so the new session's first write
   * lands instead of throwing on the closed handle.
   */
  private async ensureOpen(): Promise<void> {
    if (!this.closed) {
      await this.ready;
      return;
    }
    this.handle = sharedDatabase(this.name);
    this.closed = false;
    this.ready = this.prepare();
    if (!CONNECTIONS.has(this.name)) {
      CONNECTIONS.set(this.name, this);
    }
    await this.ready;
  }

  async read(): Promise<RunSnapshot | null> {
    await this.ensureOpen();
    const run = await this.handle.database.execute(
      `SELECT run_id, shift_id, name, depot_lat, depot_lon, speed_kmh, start_at, capacity_parcels,
              break_start_at, break_end_at, finish_lat, finish_lon
         FROM ${RUN_TABLE.table} ORDER BY id ASC LIMIT 1`,
    );
    const row = run.rows[0];
    if (row === undefined) {
      return null;
    }
    const stops = await this.handle.database.execute(
      `SELECT id, location_id, seq, status, address, lat, lon, priority, parcels, service_time_s, window_start, window_end, type
         FROM ${STOP_TABLE.table} ORDER BY seq ASC`,
    );
    return { run: runOf(row), stops: stops.rows.map(stopOf) };
  }

  async write(snapshot: RunSnapshot): Promise<void> {
    await this.ensureOpen();
    // One day is one run: the previous row and its stops leave before the new
    // ones are written, so a stop that left the run does not linger.
    await this.handle.database.execute(`DELETE FROM ${RUN_TABLE.table}`);
    await this.handle.database.execute(`DELETE FROM ${STOP_TABLE.table}`);
    await this.handle.database.execute(
      `INSERT OR REPLACE INTO ${RUN_TABLE.table}
         (id, run_id, shift_id, name, depot_lat, depot_lon, speed_kmh, start_at, capacity_parcels,
          break_start_at, break_end_at, finish_lat, finish_lon, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        // Queue 4d (ADR-022's app half): the run's own break window and finish
        // point, written as their own columns - null when the run has none.
        snapshot.run.break_window?.start ?? null,
        snapshot.run.break_window?.end ?? null,
        snapshot.run.finish?.lat ?? null,
        snapshot.run.finish?.lon ?? null,
        new Date().toISOString(),
      ],
    );
    for (const stop of snapshot.stops) {
      await this.handle.database.execute(
        `INSERT OR REPLACE INTO ${STOP_TABLE.table}
           (id, run_id, location_id, seq, status, address, lat, lon, priority, parcels, service_time_s, window_start, window_end, type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          stop.type,
        ],
      );
    }
  }

  async markDelivered(mark: DeliveredMark): Promise<void> {
    await this.ensureOpen();
    await this.handle.database.execute(
      `INSERT OR REPLACE INTO ${MARK_TABLE.table} (stop_id, sequence, at, event_id) VALUES (?, ?, ?, ?)`,
      [mark.stopId, mark.sequence, mark.at, mark.eventId],
    );
  }

  async undoDelivered(stopId: string): Promise<void> {
    await this.ensureOpen();
    await this.handle.database.execute(`DELETE FROM ${MARK_TABLE.table} WHERE stop_id = ?`, [stopId]);
  }

  async markOf(stopId: string): Promise<DeliveredMark | null> {
    await this.ensureOpen();
    const result = await this.handle.database.execute(
      `SELECT stop_id, sequence, at, event_id FROM ${MARK_TABLE.table} WHERE stop_id = ? LIMIT 1`,
      [stopId],
    );
    const row = result.rows[0];
    return row === undefined ? null : markOf(row);
  }

  async deliveredMarks(): Promise<DeliveredMark[]> {
    await this.ensureOpen();
    const result = await this.handle.database.execute(
      `SELECT stop_id, sequence, at, event_id FROM ${MARK_TABLE.table} ORDER BY at ASC, rowid ASC`,
    );
    return result.rows.map(markOf);
  }

  async clear(): Promise<void> {
    await this.ensureOpen();
    await this.handle.database.execute(`DELETE FROM ${RUN_TABLE.table}`);
    await this.handle.database.execute(`DELETE FROM ${STOP_TABLE.table}`);
    await this.handle.database.execute(`DELETE FROM ${MARK_TABLE.table}`);
  }

  private async prepare(): Promise<void> {
    await migrateTable(this.handle.database, RUN_TABLE);
    await migrateTable(this.handle.database, STOP_TABLE);
    await migrateTable(this.handle.database, MARK_TABLE);
  }
}

/** The run row, back as the contract answers it. */
function runOf(row: Record<string, Scalar>): RunSnapshot['run'] {
  // Queue 4d (ADR-022's app half): the break window and the finish point read
  // back as the contract's optional fields - present only when the row
  // carries both of their halves, because half a window is not a window.
  const breakStart = row.break_start_at;
  const breakEnd = row.break_end_at;
  const finishLat = row.finish_lat;
  const finishLon = row.finish_lon;
  return {
    id: dbText(row, 'run_id'),
    shift_id: dbText(row, 'shift_id'),
    name: dbText(row, 'name'),
    depot: { lat: Number(row.depot_lat), lon: Number(row.depot_lon) },
    speed_kmh: Number(row.speed_kmh),
    start_at: dbText(row, 'start_at'),
    capacity_parcels: dbNumber(row, 'capacity_parcels'),
    ...(breakStart === null || breakEnd === null
      ? {}
      : { break_window: { start: dbText(row, 'break_start_at'), end: dbText(row, 'break_end_at') } }),
    ...(finishLat === null || finishLon === null
      ? {}
      : { finish: { lat: Number(finishLat), lon: Number(finishLon) } }),
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
    // ADR-024: the type is required by the contract; a row migrated in from
    // before the column existed carries the default.
    type: (row.type === null ? 'delivery' : dbText(row, 'type')) as RunSnapshot['stops'][number]['type'],
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
