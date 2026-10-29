/**
 * The event log's schema decisions (src/sync/eventSchema.ts): the timestamp
 * the log can order by, and the migration path an installed table takes.
 *
 * Both are pure: the op-sqlite of the phone cannot run here, so the decisions
 * it makes are the unit under test, not the SQLite that applies them.
 */
import { migrationPlan, normaliseOccurredAt, type TableShape } from '../eventSchema';

const EVENT_TABLE: TableShape = {
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

describe('normaliseOccurredAt', () => {
  it('refuses a stamp with no timezone', () => {
    expect(() => normaliseOccurredAt('2026-10-21T02:00:00')).toThrow('timezone');
  });

  it('refuses a stamp that carries no date at all', () => {
    expect(() => normaliseOccurredAt('the other day')).toThrow('occurred_at');
  });

  it('refuses an empty stamp', () => {
    expect(() => normaliseOccurredAt('   ')).toThrow('occurred_at');
  });

  it('answers the same instant in UTC for a zulu stamp', () => {
    expect(normaliseOccurredAt('2026-10-21T02:00:00.000Z')).toBe('2026-10-21T02:00:00.000Z');
  });

  it('rolls a Christchurch offset into UTC', () => {
    expect(normaliseOccurredAt('2026-10-21T15:00:00.000+13:00')).toBe('2026-10-21T02:00:00.000Z');
  });

  it('keeps one instant for the same moment written in two offsets', () => {
    expect(normaliseOccurredAt('2026-10-21T03:00:00.000+01:00')).toBe(
      normaliseOccurredAt('2026-10-21T02:00:00.000Z'),
    );
  });
});

describe('migrationPlan', () => {
  it('answers no statement when the table is at the version it must be', () => {
    const plan = migrationPlan(EVENT_TABLE, 1, EVENT_TABLE.columns.map(([name]) => name));

    expect(plan.statements).toEqual([]);
    expect(plan.version).toBe(1);
  });

  it('adds every column the old shape has not got', () => {
    const oldColumns = ['id', 'stop_id', 'kind', 'occurred_at', 'synced'];

    const plan = migrationPlan(EVENT_TABLE, 0, oldColumns);

    expect(plan.statements).toEqual([
      'ALTER TABLE delivery_events ADD COLUMN utterance TEXT',
      'ALTER TABLE delivery_events ADD COLUMN safe_place TEXT',
      'ALTER TABLE delivery_events ADD COLUMN lat REAL',
      'ALTER TABLE delivery_events ADD COLUMN lon REAL',
      'ALTER TABLE delivery_events ADD COLUMN accuracy_m REAL',
      'ALTER TABLE delivery_events ADD COLUMN refused_at TEXT',
    ]);
    expect(plan.version).toBe(1);
  });

  it('adds a column an old version has not got and nothing else', () => {
    const almostCurrent = EVENT_TABLE.columns
      .map(([name]) => name)
      .filter((name) => name !== 'refused_at');

    const plan = migrationPlan(EVENT_TABLE, 0, almostCurrent);

    expect(plan.statements).toEqual(['ALTER TABLE delivery_events ADD COLUMN refused_at TEXT']);
  });

  it('answers no statement for a table that has every column already', () => {
    const plan = migrationPlan(EVENT_TABLE, 0, EVENT_TABLE.columns.map(([name]) => name));

    expect(plan.statements).toEqual([]);
    expect(plan.version).toBe(1);
  });
});
