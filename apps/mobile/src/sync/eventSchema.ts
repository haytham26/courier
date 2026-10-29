/**
 * The schema of the event log: the shape its table is at, and the path an
 * installed database takes to it.
 *
 * The decisions here are pure so they can be proven without the phone. Two
 * filed defects live in them:
 *
 *   - **BUG-087**: `CREATE TABLE IF NOT EXISTS` is a no-op on a table that is
 *     already there, so a shape that grows a column never lands on an upgraded
 *     install and the new-shape INSERT throws `no such column`. The fix is a
 *     versioned shape and the columns an installed table is missing.
 *   - **BUG-088**: `occurred_at` is an instant, not a text. A stamp with no
 *     timezone is not an instant the server accepts, and stamps written in
 *     different offsets do not sort lexicographically in instant order.
 *
 * The SQL here is issued by the op-sqlite store; what SQLite does with it is
 * proven on the device, not here.
 */

/** The types a column of these tables can be. */
export type ColumnType = 'TEXT' | 'INTEGER' | 'REAL';

/** One column of a table: its name, its type, its extra constraints. */
export type Column = readonly [name: string, type: ColumnType, extra?: string];

/** A table the log keeps: its name, its columns, and the version of the shape. */
export interface TableShape {
  readonly table: string;
  readonly columns: readonly Column[];
  readonly version: number;
}

/** The slice of a database the schema statements need. */
export interface SqlExecutor {
  execute(sql: string, params?: (string | number | null)[]): Promise<{
    rows: readonly Record<string, unknown>[];
  }>;
}

/** The shape an installed table is migrated to: the current code's CREATE. */
export function createTableStatement(shape: TableShape): string {
  const body = shape.columns
    .map(([name, type, extra]) => `        ${name} ${type}${extra === undefined ? '' : ` ${extra}`}`)
    .join(',\n');
  return `CREATE TABLE IF NOT EXISTS ${shape.table} (\n${body}\n      )`;
}

/**
 * What an installed table needs before the current shape can be written.
 *
 * The plan is computed against the columns the table really has, so a table
 * that predates a column gains it, and a table that is already at the current
 * shape is left alone. The version answered with is the shape's, so a
 * database is never migrated twice.
 */
export function migrationPlan(
  shape: TableShape,
  currentVersion: number,
  existingColumns: readonly string[],
): { statements: string[]; version: number } {
  const installed = new Set(existingColumns);
  const statements = shape.columns
    .filter(([name]) => !installed.has(name))
    .map(([name, type]) => `ALTER TABLE ${shape.table} ADD COLUMN ${name} ${type}`);
  return { statements, version: Math.max(shape.version, currentVersion) };
}

/** A stamp must say where it was taken: the API refuses a naive one. */
const TIMEZONE_SUFFIX = /(?:Z|[+-]\d{2}:?\d{2})$/;

/**
 * One delivery moment as an aware instant in UTC.
 *
 * The server requires an aware datetime (the API's own gate), and the log
 * orders by the instant: a naive stamp is refused rather than guessed at, and
 * an offset is rolled into UTC so that one moment is one text and the text
 * order is the instant order.
 */
export function normaliseOccurredAt(value: string): string {
  const stamp = value.trim();
  if (stamp.length === 0) {
    throw new Error('occurred_at is empty, and the log cannot order an empty moment');
  }
  if (!TIMEZONE_SUFFIX.test(stamp)) {
    throw new Error(`occurred_at must carry a timezone, and this stamp has none: ${stamp}`);
  }
  const instant = Date.parse(stamp);
  if (!Number.isFinite(instant)) {
    throw new Error(`occurred_at is not a moment the log can read: ${stamp}`);
  }
  return new Date(instant).toISOString();
}

/** The version one table of a database is at. */
export async function userVersionOf(database: SqlExecutor): Promise<number> {
  const result = await database.execute('PRAGMA user_version');
  return Number(result.rows[0]?.user_version ?? 0);
}

/** The columns one table of a database really has. */
export async function columnsOf(database: SqlExecutor, table: string): Promise<string[]> {
  const result = await database.execute(`PRAGMA table_info(${table})`);
  return result.rows.map((row) => dbText(row, 'name'));
}

/**
 * Reads one TEXT column of a row.
 *
 * op-sqlite hands the rows back as records of untyped scalars; the columns of
 * these tables are written by the stores alone, so a non-text value there
 * means the database is corrupt and the run of reads must fail loudly.
 */
export function dbText(row: Record<string, unknown>, column: string): string {
  const value = row[column];
  if (typeof value !== 'string') {
    throw new Error(`the column ${column} of the row is not the text it must be`);
  }
  return value;
}

/** Reads one nullable REAL/INTEGER column: sqlite's NULL means "not recorded". */
export function dbNumber(row: Record<string, unknown>, column: string): number | undefined {
  const value = row[column];
  return typeof value === 'number' ? value : undefined;
}

/**
 * Brings one table of an installed database to the shape the code writes
 * (BUG-087): the CREATE is a no-op on a table that is already there, so the
 * missing columns are added, and the version is bumped, before the first
 * new-shape statement runs.
 */
export async function migrateTable(database: SqlExecutor, shape: TableShape): Promise<void> {
  await database.execute(createTableStatement(shape));
  const version = await userVersionOf(database);
  const installed = await columnsOf(database, shape.table);
  const plan = migrationPlan(shape, version, installed);
  for (const statement of plan.statements) {
    await database.execute(statement);
  }
  if (plan.version !== version) {
    await database.execute(`PRAGMA user_version = ${plan.version}`);
  }
}
