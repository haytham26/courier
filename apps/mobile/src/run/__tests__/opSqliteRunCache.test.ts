/**
 * The op-sqlite run cache (src/run/opSqliteRunCache.ts): what the phone keeps
 * of the day when the API is not there.
 *
 * The real module is native and cannot run under jest, so
 * `@op-engineering/op-sqlite` is mocked here with a stand-in that answers the
 * SQL this cache issues the way SQLite answers it. What is asserted is this
 * cache's own contract: the columns it writes and reads back (the typed
 * columns, not a JSON blob), the sequence it answers stops in, the stale stop
 * it drops, and the marks it keeps for the run.
 */
jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));

const opSqlite = jest.requireMock<{ open: jest.Mock }>('@op-engineering/op-sqlite');

import type { RunResponse, StopResponse } from '@courier/shared/src/generated/api';

import { OpSqliteRunCache } from '../opSqliteRunCache';
import type { DeliveredMark, RunSnapshot } from '../types';

/** One row of a table as the stand-in keeps it. */
type Row = Record<string, string | number | null>;

/** The answer the stand-in hands back. */
interface Answer {
  rows: Row[];
  rowsAffected: number;
}

/** The column list a CREATE statement declares. */
function declaredColumns(sql: string): string[] {
  const body = sql.slice(sql.indexOf('(') + 1, sql.lastIndexOf(')'));
  return body.split(',').map((entry) => entry.trim().split(/\s+/)[0] ?? '');
}

/** The column list an INSERT or REPLACE statement names. */
function namedColumns(sql: string): string[] {
  const head = sql.slice(sql.indexOf('(') + 1, sql.indexOf(')'));
  return head.split(',').map((entry) => entry.trim());
}

/** The column list a SELECT statement asks for. */
function selectedColumns(sql: string): string[] {
  const head = sql.slice(sql.indexOf('SELECT') + 6, sql.indexOf('FROM')).trim();
  return head.split(',').map((entry) => entry.trim());
}

/**
 * The stand-in database: the statements this cache issues, modelled.
 *
 * It answers the schema statements, the writes and the four reads of the run
 * tables, and fails a test that issues anything else.
 */
class FakeSqlite {
  version = 0;

  readonly tables = new Map<string, string[]>();

  readonly rows = new Map<string, Map<string, { row: Row; rowid: number }>>();

  readonly executed: string[] = [];

  closed = false;

  private lastRowid = 0;

  private put(table: string, row: Row): void {
    const rows = this.rows.get(table) ?? new Map<string, { row: Row; rowid: number }>();
    rows.set(String(row[this.primaryKeyOf(table)]), { row, rowid: (this.lastRowid += 1) });
    this.rows.set(table, rows);
  }

  private primaryKeyOf(table: string): string {
    return table === 'run_state_stops' ? 'id' : table === 'run_state_marks' ? 'stop_id' : 'id';
  }

  private tableRows(table: string): { row: Row; rowid: number }[] {
    return [...(this.rows.get(table)?.values() ?? [])];
  }

  execute(sql: string, params: (string | number | null)[] = []): Promise<Answer> {
    return Promise.resolve(this.answer(sql, params));
  }

  closeAsync(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }

  /** The answer for one statement, modelled the way SQLite answers it. */
  private answer(sql: string, params: (string | number | null)[]): Answer {
    this.executed.push(sql);

    if (/^PRAGMA user_version$/.test(sql)) {
      return { rows: [{ user_version: this.version }], rowsAffected: 0 };
    }
    if (/^PRAGMA user_version = /.test(sql)) {
      this.version = Number(sql.slice(sql.lastIndexOf('=') + 1).trim());
      return { rows: [], rowsAffected: 0 };
    }
    if (/^PRAGMA table_info/.test(sql)) {
      const table = sql.slice(sql.indexOf('(') + 1, sql.lastIndexOf(')'));
      return { rows: (this.tables.get(table) ?? []).map((name) => ({ name })), rowsAffected: 0 };
    }
    if (/^CREATE TABLE IF NOT EXISTS/.test(sql)) {
      const table = sql.replace('CREATE TABLE IF NOT EXISTS ', '').split('(')[0].trim();
      if (!this.tables.has(table)) {
        this.tables.set(table, declaredColumns(sql));
        this.rows.set(table, new Map());
      }
      return { rows: [], rowsAffected: 0 };
    }
    if (/^CREATE INDEX IF NOT EXISTS/.test(sql)) {
      return { rows: [], rowsAffected: 0 };
    }
    if (/^ALTER TABLE .* ADD COLUMN/.test(sql)) {
      const table = sql.slice('ALTER TABLE '.length).split(' ADD COLUMN ')[0];
      const column = sql.split(' ADD COLUMN ')[1].split(' ')[0];
      this.tables.get(table)?.push(column);
      return { rows: [], rowsAffected: 0 };
    }
    if (/^DELETE FROM [a-z_]+$/.test(sql)) {
      const table = sql.replace('DELETE FROM ', '').trim();
      this.rows.get(table)?.clear();
      return { rows: [], rowsAffected: 0 };
    }
    if (/^DELETE FROM [a-z_]+ WHERE [a-z_]+ = \?$/.test(sql)) {
      const table = sql.replace('DELETE FROM ', '').split(' WHERE ')[0].trim();
      const rows = this.rows.get(table);
      const deleted = rows?.delete(String(params[0])) === true;
      return { rows: [], rowsAffected: deleted ? 1 : 0 };
    }
    if (/^INSERT OR REPLACE INTO [a-z_]+/.test(sql)) {
      const table = sql.replace('INSERT OR REPLACE INTO ', '').trim().split(/\s+/)[0];
      const columns = namedColumns(sql);
      const body = sql.slice(sql.indexOf('(', sql.indexOf('VALUES')) + 1, sql.lastIndexOf(')'));
      const values = body.split(',').map((entry) => entry.trim());
      const row: Row = {};
      let parameter = 0;
      columns.forEach((column, index) => {
        const value = values[index];
        if (value === '?') {
          row[column] = params[parameter] ?? null;
          parameter += 1;
        } else if (value === 'NULL') {
          row[column] = null;
        } else {
          row[column] = Number(value);
        }
      });
      // every column the table declares is written, the unlisted ones as null
      for (const column of this.columnsOf(table)) {
        if (!(column in row)) {
          row[column] = null;
        }
      }
      this.put(table, row);
      return { rows: [], rowsAffected: 1 };
    }
    if (/^SELECT [\sa-z_,]+ FROM [a-z_]+ ORDER BY [a-z_]+ ASC/.test(sql)) {
      const table = sql.slice(sql.indexOf('FROM') + 4).split(' ORDER BY ')[0].trim();
      const wanted = selectedColumns(sql);
      const order = sql.split(' ORDER BY ')[1].split(' ')[0];
      const sorted = this.tableRows(table).sort((left, right) => {
        const byOrder = Number(left.row[order]) - Number(right.row[order]);
        return byOrder !== 0 ? byOrder : left.rowid - right.rowid;
      });
      const single = sql.includes('LIMIT 1');
      const rows = (single ? sorted.slice(0, 1) : sorted).map((entry) =>
        Object.fromEntries(wanted.map((name) => [name, entry.row[name] ?? null])),
      );
      return { rows, rowsAffected: 0 };
    }
    if (/^SELECT [a-z_, ]+ FROM [a-z_]+ WHERE [a-z_]+ = \? LIMIT 1/.test(sql)) {
      const table = sql.slice(sql.indexOf('FROM') + 4).split(' WHERE ')[0].trim();
      const wanted = selectedColumns(sql);
      const column = sql.split(' WHERE ')[1].split(' = ')[0];
      const found = this.tableRows(table).find((entry) => entry.row[column] === params[0]);
      return {
        rows: found === undefined ? [] : [Object.fromEntries(wanted.map((name) => [name, found.row[name] ?? null]))],
        rowsAffected: 0,
      };
    }
    throw new Error(`the stand-in database was asked for SQL it does not answer: ${sql}`);
  }

  columnsOf(table: string): string[] {
    return this.tables.get(table) ?? [];
  }
}

const run: RunResponse = {
  id: 'run-1',
  shift_id: 'shift-1',
  name: 'Hornby morning',
  depot: { lat: -43.55, lon: 172.603 },
  speed_kmh: 30,
  start_at: '2026-10-21T05:00:00.000Z',
};

function stop(id: string, seq: number): StopResponse {
  return { id, location_id: `loc-${id}`, address: `${id} Riccarton Road`, seq, status: 'pending' };
}

const aDay: RunSnapshot = { run, stops: [stop('stop-2', 2), stop('stop-1', 1)] };

function openOn(database: FakeSqlite): OpSqliteRunCache {
  opSqlite.open.mockReturnValue(database);
  return OpSqliteRunCache.open('test.db');
}

describe('the op-sqlite run cache', () => {
  it('answers null before anything is cached', async () => {
    const cache = openOn(new FakeSqlite());

    expect(await cache.read()).toBeNull();
  });

  it('writes the run and its stops and reads them back as the contract answers them', async () => {
    const cache = openOn(new FakeSqlite());

    await cache.write(aDay);

    const snapshot = await cache.read();
    expect(snapshot?.run.id).toBe('run-1');
    expect(snapshot?.run.shift_id).toBe('shift-1');
    expect(snapshot?.run.name).toBe('Hornby morning');
    expect(snapshot?.run.depot).toEqual({ lat: -43.55, lon: 172.603 });
    expect(snapshot?.run.speed_kmh).toBe(30);
    expect(snapshot?.run.start_at).toBe('2026-10-21T05:00:00.000Z');
    expect(snapshot?.stops.map((item) => item.id)).toEqual(['stop-1', 'stop-2']);
    expect(snapshot?.stops[0]?.location_id).toBe('loc-stop-1');
    expect(snapshot?.stops[1]?.address).toBe('stop-2 Riccarton Road');
  });

  it('answers the stops in their sequence, not in the order they were written', async () => {
    const cache = openOn(new FakeSqlite());

    await cache.write(aDay);

    expect((await cache.read())?.stops.map((item) => item.seq)).toEqual([1, 2]);
  });

  it('leaves a field the run answers without absent when it reads back', async () => {
    const cache = openOn(new FakeSqlite());
    const withCapacity: RunSnapshot = {
      run: { ...run, capacity_parcels: 40 },
      stops: [stop('stop-1', 1)],
    };

    await cache.write(withCapacity);
    expect((await cache.read())?.run.capacity_parcels).toBe(40);

    await cache.write({ run, stops: [stop('stop-1', 1)] });
    expect((await cache.read())?.run.capacity_parcels).toBeUndefined();
  });

  it('drops a stop that left the run on the next write', async () => {
    const cache = openOn(new FakeSqlite());
    await cache.write(aDay);

    await cache.write({ run, stops: [stop('stop-1', 1)] });

    expect((await cache.read())?.stops.map((item) => item.id)).toEqual(['stop-1']);
  });

  it('keeps a mark, answers it by its stop, and takes it off', async () => {
    const cache = openOn(new FakeSqlite());
    const mark: DeliveredMark = {
      stopId: 'stop-1',
      sequence: 1,
      at: 1_800_000_000_000,
      eventId: 'delivered-stop-1',
    };

    await cache.markDelivered(mark);
    expect(await cache.markOf('stop-1')).toEqual(mark);
    expect(await cache.markOf('stop-2')).toBeNull();

    await cache.undoDelivered('stop-1');
    expect(await cache.markOf('stop-1')).toBeNull();
  });

  it('answers the marks of the run in delivery order', async () => {
    const cache = openOn(new FakeSqlite());
    await cache.markDelivered({ stopId: 'stop-2', sequence: 2, at: 1_800_000_002_000, eventId: 'b' });
    await cache.markDelivered({ stopId: 'stop-1', sequence: 1, at: 1_800_000_001_000, eventId: 'a' });

    expect((await cache.deliveredMarks()).map((mark) => mark.stopId)).toEqual(['stop-1', 'stop-2']);
  });

  it('leaves nothing for the next courier when the run closes', async () => {
    const cache = openOn(new FakeSqlite());
    await cache.write(aDay);
    await cache.markDelivered({ stopId: 'stop-1', sequence: 1, at: 1_800_000_000_000, eventId: 'a' });

    await cache.clear();

    expect(await cache.read()).toBeNull();
    expect(await cache.deliveredMarks()).toEqual([]);
  });
});
