/**
 * The op-sqlite event store (src/sync/opSqliteEventStore.ts).
 *
 * The real module is native (JSI + SQLCipher) and cannot be required under
 * jest, so `@op-engineering/op-sqlite` is mocked here with a stand-in that
 * answers the SQL this store issues the way SQLite answers it. What is
 * asserted is therefore this store's own decisions: the shape it migrates an
 * installed table to (BUG-087), the instant it normalises a stamp to and the
 * order it answers (BUG-088), the one connection it keeps (BUG-089), and the
 * refused and forgotten rows it keeps out of the pending list. The SQLite
 * engine itself is proven on the device, by the compatibility screen, and by
 * the live E2E job.
 */
jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));

const opSqlite = jest.requireMock<{ open: jest.Mock }>('@op-engineering/op-sqlite');

import { OpSqliteEventStore } from '../opSqliteEventStore';
import type { DeliveryEvent } from '../types';

/** One row of a table as the stand-in keeps it. */
type Row = Record<string, string | number | null>;

/** The answer op-sqlite hands back: the rows and the affected count. */
interface Answer {
  rows: Row[];
  rowsAffected: number;
}

/** The column list a CREATE statement declares. */
function declaredColumns(sql: string): string[] {
  const body = sql.slice(sql.indexOf('(') + 1, sql.lastIndexOf(')'));
  return body.split(',').map((entry) => entry.trim().split(/\s+/)[0] ?? '');
}

/** The instant a stored stamp is, for an ordering answer. */
function instantOf(row: Row): number {
  return Date.parse(String(row.occurred_at));
}

/**
 * The stand-in database: the statements this store issues, modelled.
 *
 * It is deliberately small. It answers `PRAGMA user_version`, the schema
 * statements the migration issues, the INSERT/UPDATE/DELETE of the event log
 * and the three SELECTs, and it fails a test that issues anything else.
 */
class FakeSqlite {
  version = 0;

  readonly tables = new Map<string, string[]>();

  readonly rows = new Map<string, Map<string, Row>>();

  readonly executed: string[] = [];

  closed = false;

  constructor(install?: { version: number; columns: readonly string[] }) {
    if (install !== undefined) {
      this.version = install.version;
      this.tables.set('delivery_events', [...install.columns]);
      this.rows.set('delivery_events', new Map());
    }
  }

  /** The columns a table has after everything this store asked for. */
  columnsOf(table: string): string[] {
    return this.tables.get(table) ?? [];
  }

  /** One stored row, by its event id. */
  rowOf(eventId: string): Row | undefined {
    return this.rows.get('delivery_events')?.get(eventId);
  }

  /** Where in the run of statements a statement was first issued. */
  positionOf(statement: string): number {
    return this.executed.findIndex((sql) => sql.includes(statement));
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
    const table = this.rows.get('delivery_events') ?? new Map<string, Row>();

    if (/^PRAGMA user_version$/.test(sql)) {
      return { rows: [{ user_version: this.version }], rowsAffected: 0 };
    }
    if (/^PRAGMA user_version = /.test(sql)) {
      this.version = Number(sql.slice(sql.lastIndexOf('=') + 1).trim());
      return { rows: [], rowsAffected: 0 };
    }
    if (/^PRAGMA table_info/.test(sql)) {
      return { rows: this.columnsOf('delivery_events').map((name) => ({ name })), rowsAffected: 0 };
    }
    if (/^CREATE TABLE IF NOT EXISTS/.test(sql)) {
      const name = sql.replace('CREATE TABLE IF NOT EXISTS ', '').split('(')[0].trim();
      if (!this.tables.has(name)) {
        this.tables.set(name, declaredColumns(sql));
        this.rows.set(name, new Map());
      }
      return { rows: [], rowsAffected: 0 };
    }
    if (/^CREATE INDEX IF NOT EXISTS/.test(sql)) {
      return { rows: [], rowsAffected: 0 };
    }
    if (/^ALTER TABLE delivery_events ADD COLUMN/.test(sql)) {
      const column = sql.split('ADD COLUMN ')[1].split(' ')[0];
      this.tables.get('delivery_events')?.push(column);
      return { rows: [], rowsAffected: 0 };
    }
    if (/^INSERT OR IGNORE INTO delivery_events/.test(sql)) {
      const head = sql.slice(sql.indexOf('(') + 1, sql.indexOf(')'));
      const body = sql.slice(sql.indexOf('(', sql.indexOf('VALUES')) + 1, sql.lastIndexOf(')'));
      const columns = head.split(',').map((entry) => entry.trim());
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
      if (!table.has(String(row.id))) {
        table.set(String(row.id), row);
        this.rows.set('delivery_events', table);
        return { rows: [], rowsAffected: 1 };
      }
      return { rows: [], rowsAffected: 0 };
    }
    if (/^UPDATE delivery_events SET synced = 1/.test(sql)) {
      const ids = sql.slice(sql.indexOf('(') + 1, sql.lastIndexOf(')')).split(',').length;
      params.slice(0, ids).forEach((id) => {
        const row = table.get(String(id));
        if (row !== undefined) {
          row.synced = 1;
        }
      });
      return { rows: [], rowsAffected: ids };
    }
    if (/^UPDATE delivery_events SET refused_at/.test(sql)) {
      const row = table.get(String(params[1]));
      if (row !== undefined && row.synced === 0) {
        row.refused_at = params[0];
        return { rows: [], rowsAffected: 1 };
      }
      return { rows: [], rowsAffected: 0 };
    }
    if (/^DELETE FROM delivery_events WHERE id = \? AND synced = 0/.test(sql)) {
      const row = table.get(String(params[0]));
      if (row !== undefined && row.synced === 0) {
        table.delete(String(params[0]));
        return { rows: [], rowsAffected: 1 };
      }
      return { rows: [], rowsAffected: 0 };
    }
    if (/^SELECT count\(\*\) AS total/.test(sql)) {
      const total = [...table.values()].filter((row) => row.synced === 0 && row.refused_at === null)
        .length;
      return { rows: [{ total }], rowsAffected: 0 };
    }
    if (/^SELECT id, stop_id, kind, utterance, safe_place, lat, lon, accuracy_m, occurred_at/.test(sql)) {
      const selected = [
        'id',
        'stop_id',
        'kind',
        'utterance',
        'safe_place',
        'lat',
        'lon',
        'accuracy_m',
        'occurred_at',
      ];
      const waiting = [...table.values()]
        .filter((row) => row.synced === 0 && row.refused_at === null)
        .sort((left, right) => instantOf(left) - instantOf(right))
        .slice(0, Number(params[0]));
      return {
        rows: waiting.map((row) => Object.fromEntries(selected.map((name) => [name, row[name] ?? null]))),
        rowsAffected: 0,
      };
    }
    throw new Error(`the stand-in database was asked for SQL it does not answer: ${sql}`);
  }
}

/** The columns an install from before the event log had its current shape. */
const OLD_COLUMNS = ['id', 'stop_id', 'kind', 'occurred_at', 'synced'] as const;

function event(id: string, occurredAt = '2026-10-21T02:00:00.000Z'): DeliveryEvent {
  return { id, stopId: 'stop-1', kind: 'delivered', occurredAt };
}

/** A store over a stand-in the test controls, opened and torn down with it. */
const opened: OpSqliteEventStore[] = [];

/** Opens a store on a stand-in and records it for the tear-down. */
function openStoreOn(database: FakeSqlite, name: string): OpSqliteEventStore {
  opSqlite.open.mockReturnValue(database);
  const store = OpSqliteEventStore.open(name);
  opened.push(store);
  return store;
}

async function storeOver(database: FakeSqlite, name = 'test.db'): Promise<OpSqliteEventStore> {
  const store = openStoreOn(database, name);
  await store.append(event('warm-up')); // the readiness runs on the first write
  await store.forget('warm-up');
  database.executed.length = 0;
  return store;
}

afterEach(async () => {
  for (const store of opened.splice(0)) {
    await store.close();
  }
  opSqlite.open.mockReset();
});

describe('the op-sqlite event store', () => {
  it('brings an installed table to the current shape before the first write', async () => {
    const database = new FakeSqlite({ version: 0, columns: OLD_COLUMNS });
    const store = openStoreOn(database, 'installed.db');

    await store.append(event('a'));
    await store.append(event('b'));
    const pending = await store.pending(10);

    expect(pending.map((item) => item.id)).toEqual(['a', 'b']);
    expect(database.columnsOf('delivery_events')).toContain('refused_at');
    expect(database.version).toBe(1);
  });

  it('adds every missing column before the new-shape insert runs', async () => {
    const database = new FakeSqlite({ version: 0, columns: OLD_COLUMNS });
    const store = openStoreOn(database, 'migrating.db');

    await store.append(event('a'));

    const firstInsert = database.positionOf('INSERT OR IGNORE INTO delivery_events');
    const lastAlter = database.executed
      .map((sql, index) => (sql.includes('ALTER TABLE delivery_events') ? index : -1))
      .reduce((latest, index) => Math.max(latest, index), -1);
    expect(lastAlter).toBeGreaterThan(-1);
    expect(lastAlter).toBeLessThan(firstInsert);
  });

  it('refuses a stamp that carries no timezone', async () => {
    const store = await storeOver(new FakeSqlite());

    await expect(store.append(event('naive', '2026-10-21T02:00:00'))).rejects.toThrow('timezone');
    expect(await store.pendingCount()).toBe(0);
  });

  it('stores one instant in UTC whatever offset the phone wrote it in', async () => {
    const database = new FakeSqlite();
    const store = await storeOver(database);

    await store.append(event('chch', '2026-10-21T15:00:00.000+13:00'));

    expect(database.rowOf('chch')?.occurred_at).toBe('2026-10-21T02:00:00.000Z');
  });

  it('answers pending in instant order, not in the order the text sorts in', async () => {
    const store = await storeOver(new FakeSqlite());

    await store.append(event('zulu', '2026-10-21T02:00:00.000Z'));
    await store.append(event('chicago', '2026-10-21T01:00:00.000-05:00'));

    expect((await store.pending(10)).map((item) => item.id)).toEqual(['zulu', 'chicago']);
  });

  it('keeps a refused event out of the pending list without losing it', async () => {
    const database = new FakeSqlite();
    const store = await storeOver(database);
    await store.append(event('refused'));

    await store.quarantine([event('refused')]);

    expect(await store.pendingCount()).toBe(0);
    expect(database.rowOf('refused')).toBeDefined();
  });

  it('takes an event the courier undid back out of the log while it is unsent', async () => {
    const database = new FakeSqlite();
    const store = await storeOver(database);
    await store.append(event('undone'));

    await store.forget('undone');

    expect(await store.pendingCount()).toBe(0);
    expect(database.rowOf('undone')).toBeUndefined();
  });

  it('leaves an event the server has already stored when it is taken back', async () => {
    const database = new FakeSqlite();
    const store = await storeOver(database);
    await store.append(event('sent'));

    await store.markSynced(['sent']);
    await store.forget('sent');

    expect(database.rowOf('sent')).toBeDefined();
  });

  it('reads one row back as an event with its absent fields absent', async () => {
    const store = await storeOver(new FakeSqlite());

    await store.append({ ...event('a'), lat: -43.532, accuracyM: 8 });

    const [stored] = await store.pending(1);
    expect(stored?.lat).toBe(-43.532);
    expect(stored?.accuracyM).toBe(8);
    expect(stored?.utterance).toBeUndefined();
    expect(stored?.safePlace).toBeUndefined();
  });

  it('opens one connection for a name and keeps it', () => {
    const database = new FakeSqlite();
    opSqlite.open.mockReturnValue(database);

    const first = OpSqliteEventStore.open('shared.db');
    const second = OpSqliteEventStore.open('shared.db');
    opened.push(first, second);

    expect(second).toBe(first);
    expect(opSqlite.open).toHaveBeenCalledTimes(1);
  });

  it('opens a different connection for a different name', () => {
    const one = new FakeSqlite();
    const two = new FakeSqlite();
    opSqlite.open.mockImplementation((options: { name: string }) =>
      options.name === 'one.db' ? one : two,
    );

    const first = OpSqliteEventStore.open('one.db');
    const second = OpSqliteEventStore.open('two.db');
    opened.push(first, second);

    expect(second).not.toBe(first);
    expect(opSqlite.open).toHaveBeenCalledTimes(2);
  });

  it('closes the connection it opened and opens a new one on the next call', async () => {
    const database = new FakeSqlite();
    opSqlite.open.mockReturnValue(database);
    const store = OpSqliteEventStore.open('once.db');

    await store.close();
    const again = OpSqliteEventStore.open('once.db');
    opened.push(again);

    expect(database.closed).toBe(true);
    expect(again).not.toBe(store);
    expect(opSqlite.open).toHaveBeenCalledTimes(2);
  });
});
