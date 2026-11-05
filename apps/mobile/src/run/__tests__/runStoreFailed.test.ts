/**
 * The failed delivery, written through the run store (queue 4b, ADR-023).
 *
 * The audit's finding: the app had no way to say why a delivery failed. The
 * stop status says "failed" and the courier's words sit in an utterance the
 * office cannot query, so the one thing the office needs to know about a
 * failed delivery - why - was the one thing that never left the phone.
 *
 * The store's own write path now records it: the event carries the reason,
 * so the outbox sends it and the server's own rule is satisfied.
 */
import { EventLog } from '@/sync/eventLog';
import type { DeliveryEvent, EventStore } from '@/sync/types';

import { RunStore } from '../runStore';
import type { DeliveredMark, RunApi, RunCache, RunSnapshot } from '../types';

/** The API, answered by the test. */
class FakeApi implements RunApi {
  seedAnswer = { status: 'server' as const, code: 500, message: 'not answered yet' };
  runAnswer = { status: 'ok' as const, data: {
    id: 'run-1', shift_id: 'shift-1', name: 'Hornby morning',
    depot: { lat: -43.55, lon: 172.603 }, speed_kmh: 30, start_at: '2026-10-21T05:00:00.000Z',
  } };
  stopsAnswer = { status: 'ok' as const, data: [
    { id: 'stop-1', location_id: 'loc-1', address: '12 Riccarton Road, Riccarton', seq: 1, status: 'pending' as const, type: 'delivery' as const },
    { id: 'stop-2', location_id: 'loc-2', address: '45 Papanui Road, Merivale', seq: 2, status: 'pending' as const, type: 'delivery' as const },
  ] };
  seedDemoRun() { return Promise.resolve(this.seedAnswer); }
  getRun() { return Promise.resolve(this.runAnswer); }
  getStops() { return Promise.resolve(this.stopsAnswer); }
}

/** The event log's storage, in memory. */
class FakeEventStore implements EventStore {
  readonly events: DeliveryEvent[] = [];
  append(event: DeliveryEvent) {
    if (!this.events.some((stored) => stored.id === event.id)) this.events.push(event);
    return Promise.resolve();
  }
  pending() { return Promise.resolve(this.events); }
  markSynced() { return Promise.resolve(); }
  quarantine() { return Promise.resolve(); }
  forget(id: string) {
    const at = this.events.findIndex((e) => e.id === id);
    if (at >= 0) this.events.splice(at, 1);
    return Promise.resolve();
  }
  pendingCount() { return Promise.resolve(this.events.length); }
}

/** The run cache, in memory. */
class FakeCache implements RunCache {
  snapshot: RunSnapshot | null = null;
  readonly marks: DeliveredMark[] = [];
  read() { return Promise.resolve(this.snapshot); }
  write(snapshot: RunSnapshot) { this.snapshot = snapshot; return Promise.resolve(); }
  markDelivered(mark: DeliveredMark) { this.marks.push(mark); return Promise.resolve(); }
  undoDelivered(stopId: string) {
    const at = this.marks.findIndex((m) => m.stopId === stopId);
    if (at >= 0) this.marks.splice(at, 1);
    return Promise.resolve();
  }
  markOf(stopId: string) { return Promise.resolve(this.marks.find((m) => m.stopId === stopId) ?? null); }
  deliveredMarks() { return Promise.resolve([...this.marks]); }
  clear() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}

function aStore() {
  const cache = new FakeCache();
  const events = new FakeEventStore();
  return {
    store: new RunStore({ client: new FakeApi(), cache, events: new EventLog(events), reason: 'dev' }),
    cache,
    events,
  };
}

describe('a failed delivery and its reason', () => {
  it('records the event with the reason the courier chose', async () => {
    const { store, events } = aStore();

    await store.markFailed({ id: 'stop-1', sequence: 1 }, { reason: 'no_access' });

    expect(events.events).toHaveLength(1);
    const [written] = events.events;
    expect(written.kind).toBe('failed');
    expect(written.reason).toBe('no_access');
    expect(written.stopId).toBe('stop-1');
  });

  it('carries the courier\u2019s own sentence when they say it more precisely', async () => {
    const { store, events } = aStore();

    await store.markFailed(
      { id: 'stop-1', sequence: 1 },
      { reason: 'the gate code was changed' },
    );

    expect(events.events[0]?.reason).toBe('the gate code was changed');
  });

  it('refuses a failed mark with no reason at all', async () => {
    const { store, events } = aStore();

    // The server's own rule (ADR-023): a failed outcome without its reason is
    // refused there with a 422, which takes the WHOLE batch with it. The
    // phone refuses it first, and names why, rather than sending a parcel
    // nobody can ask about.
    await expect(store.markFailed({ id: 'stop-1', sequence: 1 }, { reason: '   ' }))
      .rejects.toThrow(/a failed delivery carries its reason/);
    expect(events.events).toHaveLength(0);
  });

  it('keeps one event for the same stop, whichever way it was said', async () => {
    const { store, events } = aStore();

    await store.markFailed({ id: 'stop-1', sequence: 1 }, { reason: 'no_access' });
    await store.markFailed({ id: 'stop-1', sequence: 1 }, { reason: 'door_locked' });

    // The run holds one fact: the courier's first answer stands, the way a
    // delivered stop cannot be delivered twice.
    expect(events.events).toHaveLength(1);
    expect(events.events[0]?.reason).toBe('no_access');
  });

  it('leaves a delivered stop delivered when the stop is marked failed', async () => {
    const { store, events } = aStore();
    await store.markDelivered({ id: 'stop-1', sequence: 1 });

    // A delivery already made is a delivery the office will hear about: the
    // failed write does not take its place.
    await store.markFailed({ id: 'stop-1', sequence: 1 }, { reason: 'no_access' });

    expect(events.events).toHaveLength(1);
    expect(events.events[0]?.kind).toBe('delivered');
  });
});
