/**
 * The stand-in op-sqlite database the scale harness drives the app's own
 * stores over (test support, never imported by product code — the same
 * posture as `src/voice/testing/`).
 *
 * The scale lanes (the founder directive 2026-11-10, item 5) drive the app's
 * OWN run cache and event log, not fakes of their behaviour, and they KILL the
 * app mid-delivery and mid-sync. A kill only means something if the phone's
 * own storage survives it, so this module answers the SQL the two stores
 * issue the way SQLite answers it, and keeps the rows in memory across a
 * `closeAsync()` — which is what a file on the phone does when the process
 * that held it dies.
 *
 * What is asserted through it is therefore the app's own: the migration the
 * stores ask for (BUG-087's shape), `INSERT OR IGNORE` keeping one row per
 * event id, the pending list's ordering by the instant (BUG-088), the
 * confirm/forget/quarantine columns, and the run cache's one-day replacement.
 * The SQLite engine itself is proven on the device (the E2E job's A1 leg) and
 * is not claimed here.
 *
 * The mock of `@op-engineering/op-sqlite` in the scale tests hands one
 * instance of this class out per database NAME and keeps it in a registry, so
 * a store that closes and reopens reads the very same rows — the phone's own
 * file, in a test run.
 */

/** One stored row, as the stand-in keeps it. */
export type Row = Record<string, string | number | null>;

/** The answer op-sqlite hands back. */
export interface Answer {
  rows: Row[];
  rowsAffected: number;
}

/** One table of the stand-in: its columns and its rows, in write order. */
interface Table {
  columns: string[];
  /** The rows, keyed by their primary key value, with their write position. */
  rows: Map<string, { row: Row; at: number }>;
}

/** Splits a comma list that may carry no nested commas at all. */
function splitList(text: string): string[] {
  return text
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** The column definitions of a CREATE body: `name TYPE extra` per column. */
function declaredColumns(body: string): string[] {
  return splitList(body).map((definition) => definition.split(/\s+/)[0] ?? '');
}

export class FakeSqlite {
  /** `PRAGMA user_version`: the shape the database has been migrated to. */
  version = 0;

  private readonly tables = new Map<string, Table>();

  /** Every statement this stand-in was asked for, in order (the harness reads it). */
  readonly executed: string[] = [];

  private writes = 0;

  private closed = false;

  /** The table, created on the first statement that needs it. */
  private tableOf(name: string): Table {
    const table = this.tables.get(name);
    if (table === undefined) {
      throw new Error(`the stand-in database has no table ${name}`);
    }
    return table;
  }

  /** op-sqlite's slice of the API this stand-in has to answer. */
  execute(sql: string, params: (string | number | null)[] = []): Promise<Answer> {
    // The answer is computed synchronously and handed back as a promise:
    // the stores await it, and a statement this stand-in cannot answer THROWS
    // here, which their own try/catch reads as a failed operation.
    return Promise.resolve(this.answerOf(sql, params));
  }

  /** The answer for one statement: the SQLite this stand-in models. */
  private answerOf(sql: string, params: (string | number | null)[]): Answer {
    const statement = sql.replace(/\s+/g, ' ').trim();
    this.executed.push(statement);
    if (this.closed) {
      throw new Error('the stand-in database was closed under a statement');
    }

    if (/^PRAGMA user_version$/.test(statement)) {
      return { rows: [{ user_version: this.version }], rowsAffected: 0 };
    }
    const versionWrite = /^PRAGMA user_version = (\d+)$/.exec(statement);
    if (versionWrite !== null) {
      this.version = Number(versionWrite[1]);
      return { rows: [], rowsAffected: 0 };
    }
    const tableInfo = /^PRAGMA table_info\((\w+)\)$/.exec(statement);
    if (tableInfo !== null) {
      const table = this.tables.get(tableInfo[1] ?? '');
      return { rows: (table?.columns ?? []).map((name) => ({ name })), rowsAffected: 0 };
    }
    const created = /^CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*)\)$/.exec(statement);
    if (created !== null) {
      const name = created[1] ?? '';
      if (!this.tables.has(name)) {
        this.tables.set(name, { columns: declaredColumns(created[2] ?? ''), rows: new Map() });
      }
      return { rows: [], rowsAffected: 0 };
    }
    if (/^CREATE INDEX IF NOT EXISTS/.test(statement)) {
      return { rows: [], rowsAffected: 0 };
    }
    const altered = /^ALTER TABLE (\w+) ADD COLUMN (\w+) (\w+)/.exec(statement);
    if (altered !== null) {
      const table = this.tableOf(altered[1] ?? '');
      const column = altered[2] ?? '';
      if (!table.columns.includes(column)) {
        table.columns.push(column);
        for (const entry of table.rows.values()) {
          entry.row[column] = null;
        }
      }
      return { rows: [], rowsAffected: 0 };
    }

    const inserted =
      /^INSERT OR (IGNORE|REPLACE) INTO (\w+) \(([^)]*)\) VALUES \(([\s\S]*)\)$/.exec(statement);
    if (inserted !== null) {
      return this.insert(
        inserted[2] ?? '',
        splitList(inserted[3] ?? ''),
        inserted[4] ?? '',
        inserted[1] === 'IGNORE',
        params,
      );
    }

    const confirmed = /^UPDATE (\w+) SET synced = 1 WHERE id IN \(([^)]*)\)$/.exec(statement);
    if (confirmed !== null) {
      const table = this.tableOf(confirmed[1] ?? '');
      const ids = params.slice(0, splitList(confirmed[2] ?? '').length).map(String);
      let affected = 0;
      for (const id of ids) {
        const entry = table.rows.get(id);
        if (entry !== undefined) {
          entry.row.synced = 1;
          affected += 1;
        }
      }
      return { rows: [], rowsAffected: affected };
    }
    if (
      /^UPDATE delivery_events SET refused_at = \? WHERE id = \? AND synced = 0$/.test(statement)
    ) {
      const table = this.tableOf('delivery_events');
      const entry = table.rows.get(String(params[1]));
      if (entry !== undefined && entry.row.synced === 0) {
        entry.row.refused_at = params[0];
        return { rows: [], rowsAffected: 1 };
      }
      return { rows: [], rowsAffected: 0 };
    }

    const cleared = /^DELETE FROM (\w+)$/.exec(statement);
    if (cleared !== null) {
      const table = this.tableOf(cleared[1] ?? '');
      const affected = table.rows.size;
      table.rows.clear();
      return { rows: [], rowsAffected: affected };
    }
    if (/^DELETE FROM delivery_events WHERE id = \? AND synced = 0$/.test(statement)) {
      const table = this.tableOf('delivery_events');
      const entry = table.rows.get(String(params[0]));
      if (entry !== undefined && entry.row.synced === 0) {
        table.rows.delete(String(params[0]));
        return { rows: [], rowsAffected: 1 };
      }
      return { rows: [], rowsAffected: 0 };
    }
    if (/^DELETE FROM run_state_marks WHERE stop_id = \?$/.test(statement)) {
      const table = this.tableOf('run_state_marks');
      const entry = table.rows.get(String(params[0]));
      if (entry !== undefined) {
        table.rows.delete(String(params[0]));
        return { rows: [], rowsAffected: 1 };
      }
      return { rows: [], rowsAffected: 0 };
    }

    const selected =
      /^SELECT ([\s\S]+?) FROM (\w+)(?: WHERE ([\s\S]+?))?(?: ORDER BY ([\s\S]+?))?(?: LIMIT (\?|\d+))?$/.exec(
        statement,
      );
    if (selected !== null) {
      return this.select(selected, params);
    }

    throw new Error(`the stand-in database was asked for SQL it does not answer: ${statement}`);
  }

  /** Writes one row, honouring the IGNORE/REPLACE of its INSERT. */
  private insert(
    table: string,
    columns: string[],
    valuesBody: string,
    ignore: boolean,
    params: (string | number | null)[],
  ): Answer {
    const target = this.tableOf(table);
    const values = splitList(valuesBody);
    const row: Row = {};
    let parameter = 0;
    columns.forEach((column, index) => {
      const value = values[index];
      if (value === '?') {
        row[column] = params[parameter] ?? null;
        parameter += 1;
      } else if (value === 'NULL') {
        row[column] = null;
      } else if (/^-?\d+(\.\d+)?$/.test(value)) {
        row[column] = Number(value);
      } else {
        row[column] = value.replace(/^'|'$/g, '');
      }
    });
    const key = String(row[this.keyOf(target)]);
    const existing = target.rows.get(key);
    if (existing !== undefined) {
      if (ignore) {
        return { rows: [], rowsAffected: 0 };
      }
      target.rows.delete(key);
    }
    this.writes += 1;
    target.rows.set(key, { row, at: this.writes });
    return { rows: [], rowsAffected: 1 };
  }

  /** The column a row is keyed by: its declared PRIMARY KEY, else its first. */
  private keyOf(table: Table): string {
    return table.columns[0] ?? 'id';
  }

  /** Reads rows back, with the WHERE, ORDER BY and LIMIT the stores ask for. */
  private select(match: RegExpExecArray, params: (string | number | null)[]): Answer {
    const columns = splitList(match[1] ?? '');
    const table = this.tableOf(match[2] ?? '');
    const where = match[3] ?? '';
    const order = match[4] ?? '';

    let entries = [...table.rows.values()];
    // The WHERE clause's parameters are bound ONCE, in the order the placeholders
    // appear, and every row is read against that same binding: the first row of
    // a table must be able to fail a predicate without consuming the parameter
    // the second row needs.
    let ordinal = 0;
    const predicates = (where.length === 0 ? [] : where.split(' AND ')).map((term) => {
      const predicate = thePredicate(term, ordinal);
      if (predicate.kind === 'value' && predicate.bound) {
        ordinal += 1;
      }
      return predicate;
    });
    const bound = new Map<number, string | number | null>();
    let parameter = 0;
    for (const predicate of predicates) {
      if (predicate.kind === 'value' && predicate.bound) {
        bound.set(predicate.index, params[parameter] ?? null);
        parameter += 1;
      }
    }
    if (predicates.length > 0) {
      entries = entries.filter((entry) =>
        predicates.every((predicate) => theTerm(entry.row, predicate, bound)),
      );
    }

    if (order.length > 0) {
      const keys = order.split(',').map((term) => {
        const moment = /^julianday\((\w+)\)(?: (ASC|DESC))?$/.exec(term.trim());
        if (moment !== null) {
          return { column: moment[1] ?? '', direction: moment[2] ?? 'ASC', instant: true };
        }
        const plain = /^(\w+)(?: (ASC|DESC))?$/.exec(term.trim());
        if (plain === null) {
          throw new Error(`the stand-in database cannot answer the ORDER BY term: ${term}`);
        }
        return { column: plain[1] ?? '', direction: plain[2] ?? 'ASC', instant: false };
      });
      const before = entries.map((entry) => entry);
      entries.sort((left, right) => {
        for (const key of keys) {
          const leftValue = key.instant
            ? Date.parse(String(left.row[key.column]))
            : left.row[key.column];
          const rightValue = key.instant
            ? Date.parse(String(right.row[key.column]))
            : right.row[key.column];
          if (key.column === 'rowid') {
            const compared = left.at - right.at;
            if (compared !== 0) {
              return key.direction === 'DESC' ? -compared : compared;
            }
            continue;
          }
          if (leftValue === rightValue) {
            continue;
          }
          const compared =
            typeof leftValue === 'number' && typeof rightValue === 'number'
              ? leftValue - rightValue
              : String(leftValue).localeCompare(String(rightValue));
          return key.direction === 'DESC' ? -compared : compared;
        }
        return before.indexOf(left) - before.indexOf(right);
      });
    }

    const counted = /^count\(\*\) AS total$/.test(columns[0] ?? '');
    if (counted) {
      return { rows: [{ total: entries.length }], rowsAffected: 0 };
    }

    const limitTerm = match[5];
    const limited =
      limitTerm === undefined
        ? entries.length
        : limitTerm === '?'
          ? Number(params[parameter] ?? entries.length)
          : Number(limitTerm);
    return {
      rows: entries
        .slice(0, limited)
        .map((entry) => Object.fromEntries(columns.map((name) => [name, entry.row[name] ?? null]))),
      rowsAffected: 0,
    };
  }

  /** op-sqlite's close: the handle is dropped, the rows are not. */
  closeAsync(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }

  /** Opens it again, the way a new process does: the same file, the same rows. */
  reopen(): void {
    this.closed = false;
  }
}

/**
 * The registry the scale tests' mock of `@op-engineering/op-sqlite` reads:
 * one database per name, kept across close and reopen, so a kill of the app's
 * process is a close and a cold start is a reopen.
 */
const DATABASES = new Map<string, FakeSqlite>();

/** The database of one name, opened on the first ask and reused after it. */
export function theDatabaseOf(name: string): FakeSqlite {
  let database = DATABASES.get(name);
  if (database === undefined) {
    database = new FakeSqlite();
    DATABASES.set(name, database);
    return database;
  }
  database.reopen();
  return database;
}

/** The databases the stand-in holds, for a test that wants to look. */
export function theDatabases(): Map<string, FakeSqlite> {
  return DATABASES;
}

/** One term of a WHERE clause: the column, and what it must equal. */
type Predicate =
  | { kind: 'value'; index: number; column: string; bound: boolean }
  | { kind: 'null'; column: string };

/**
 * Parses one AND term of a WHERE clause.
 *
 * The `ordinal` is the position this statement's placeholders take in the
 * parameter list, counted across the clause in the order the terms appear.
 */
function thePredicate(term: string, ordinal: number): Predicate {
  const equality = /^(\w+) = (\?|\d+|NULL)$/.exec(term.trim());
  if (equality !== null) {
    const column = equality[1] ?? '';
    const wanted = equality[2] ?? '';
    if (wanted === '?') {
      return { kind: 'value', index: ordinal, column, bound: true };
    }
    if (wanted === 'NULL') {
      return { kind: 'null', column };
    }
    return { kind: 'value', index: Number(wanted), column, bound: false };
  }
  const isNull = /^(\w+) IS NULL$/.exec(term.trim());
  if (isNull !== null) {
    return { kind: 'null', column: isNull[1] ?? '' };
  }
  throw new Error(`the stand-in database cannot answer the WHERE term: ${term}`);
}

/** Whether one row satisfies one term, with the statement's own binding. */
function theTerm(
  row: Row,
  predicate: Predicate,
  bound: Map<number, string | number | null>,
): boolean {
  const actual = row[predicate.column];
  if (predicate.kind === 'null') {
    return actual === null;
  }
  if (!predicate.bound) {
    return actual === predicate.index;
  }
  return actual === bound.get(predicate.index);
}
