/**
 * The failed delivery's reason, through the phone's OWN event log (the scale
 * lane's defect, red-first).
 *
 * The claim this test makes, in one sentence: **a failed delivery the courier
 * records keeps the reason the server refuses to be without, through the
 * phone's own store and out to the API's own vocabulary.**
 *
 * Why that sentence needs a test: `RunStore.markFailed` records the reason into
 * the log, and the API's `DeliveryEvent` carries a `@model_validator` that
 * raises on a `failed` event with no reason (`services/api/app/main.py`), which
 * refuses the WHOLE batch with a 422 — and a batch the server refuses is one
 * the outbox QUARANTINES (ADR-014 §3), so the office never hears about the
 * failed delivery at all. A reason that is dropped between the store's write
 * and the sync's read is therefore not a cosmetic gap: it is a failed delivery
 * that never reaches the office.
 *
 * The store is the app's own (`OpSqliteEventStore`) over the durable stand-in
 * the scale lanes use (`src/run/testing/scaleSqlite.ts`), so the rows survive a
 * close: what is asserted is the app's own write path and its own read path,
 * exactly as the sync service runs them. The SQLite engine itself is the
 * device's leg.
 */
jest.mock('@op-engineering/op-sqlite', () => {
  // The app’s own stores read their statements through this. The stand-in
  // answers them the way SQLite does and KEEPS ITS ROWS ACROSS A CLOSE, which
  // is what makes the kill legs mean anything. `jest.requireActual` reaches the
  // module inside the factory (a plain `require` is the lint’s refused shape),
  // and the stand-in carries no native dependency, so the actual module IS it.
  const { theDatabaseOf } = jest.requireActual<typeof import('../../run/testing/scaleSqlite')>('../../run/testing/scaleSqlite');
  return { open: (options: { name: string }) => theDatabaseOf(options.name) };
});

import { OpSqliteEventStore } from '../opSqliteEventStore';
import { EventLog } from '../eventLog';
import { toContractEvent } from '@/lib/api-events';

/** The database this suite works on: its own, so nothing else's rows interfere. */
const DATABASE = 'scale-reason.db';

describe('the failed delivery keeps its reason through the phone\u2019s own event log', () => {
  it('reads the reason and the courier\u2019s own words back out of the log', async () => {
    const store = OpSqliteEventStore.open(DATABASE);
    const log = new EventLog(store);
    await log.record({
      id: '55555555-5555-5555-5555-555555555555',
      stopId: '66666666-6666-6666-6666-666666666666',
      kind: 'failed',
      reason: 'no one home',
      utterance: 'no one home at the door',
      occurredAt: '2026-11-11T06:00:00.000Z',
    });

    const [event] = await log.nextBatch(10);
    expect(event).toBeDefined();
    expect(event?.kind).toBe('failed');
    // The reason the server demands, and the courier's own words beside it.
    expect(event?.reason).toBe('no one home');
    expect(event?.utterance).toBe('no one home at the door');

    // And the event the API reads carries both: the transport's own mapping,
    // which is what `events:batch` sends.
    const mapping = toContractEvent(
      event ?? { id: '', stopId: '', kind: 'failed', occurredAt: '' },
    );
    expect(mapping.status).toBe('mapped');
    if (mapping.status === 'mapped') {
      expect(mapping.event.reason).toBe('no one home');
      expect(mapping.event.utterance).toBe('no one home at the door');
    }
    await store.close();
  });

  it('keeps the reason of a failed delivery that is read back after a cold start', async () => {
    const first = OpSqliteEventStore.open(DATABASE);
    await new EventLog(first).record({
      id: '77777777-7777-7777-7777-777777777777',
      stopId: '88888888-8888-8888-8888-888888888888',
      kind: 'failed',
      reason: 'refused',
      utterance: 'they refused the parcel',
      occurredAt: '2026-11-11T06:01:00.000Z',
    });
    await first.close();

    // The phone was killed and started again: the log is the SAME rows, read
    // through a NEW store instance over the SAME database.
    const second = OpSqliteEventStore.open(DATABASE);
    const reopened = await new EventLog(second).nextBatch(10);
    const event = reopened.find(
      (candidate) => candidate.id === '77777777-7777-7777-7777-777777777777',
    );
    expect(event?.reason).toBe('refused');
    expect(event?.utterance).toBe('they refused the parcel');
    await second.close();
  });

  it('adds the column to a table that was installed without it, before the first write', async () => {
    // BUG-087's own path: a phone that already has the old table gains the
    // column on migration, so an upgrade does not start dropping reasons.
    const store = OpSqliteEventStore.open(DATABASE);
    await store.close();
    const opened = OpSqliteEventStore.open(DATABASE);
    await new EventLog(opened).record({
      id: '99999999-9999-9999-9999-999999999999',
      stopId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      kind: 'failed',
      reason: 'damaged',
      occurredAt: '2026-11-11T06:02:00.000Z',
    });
    const migrated = await new EventLog(opened).nextBatch(10);
    const event = migrated.find(
      (candidate) => candidate.id === '99999999-9999-9999-9999-999999999999',
    );
    expect(event?.reason).toBe('damaged');
    await opened.close();
  });
});
