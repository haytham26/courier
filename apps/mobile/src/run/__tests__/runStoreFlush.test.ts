/**
 * The delivery leaves the phone when it can (A1 slice 3, the outbox's trigger).
 *
 * The store records every mark into the event log, which is server-bound but
 * inert until something flushes it. The audit's A1 is the app does not sync;
 * recording without sending is half of it.
 *
 * The contract: after the store writes the delivery, it asks the outbox to
 * send what it can. The flush is the outbox's own (`SyncService.syncAll`), so
 * a store with no outbox (the marks-only construction, or a test) records and
 * carries on, and a store with one sends.
 */
import { RunStore } from '../runStore';
import { EventLog } from '@/sync/eventLog';
import type { DeliveredMark, RunApi, RunCache, RunSnapshot } from '../types';
import type { DeliveryEvent, EventStore } from '@/sync/types';

/** An event store that keeps what it was given. */
class FakeStore implements EventStore {
  recorded: DeliveryEvent[] = [];
  append(event: DeliveryEvent): Promise<void> {
    this.recorded.push(event);
    return Promise.resolve();
  }
  pending(): Promise<DeliveryEvent[]> {
    return Promise.resolve(this.recorded.filter((event) => !this.sent.includes(event.id)));
  }
  confirm(ids: readonly string[]): Promise<void> {
    this.sent.push(...ids);
    return Promise.resolve();
  }
  markSynced(ids: readonly string[]): Promise<void> {
    this.sent.push(...ids);
    return Promise.resolve();
  }
  quarantine(events: DeliveryEvent[]): Promise<void> {
    this.quarantined.push(...events.map((event) => event.id));
    return Promise.resolve();
  }
  pendingCount(): Promise<number> {
    return Promise.resolve(this.recorded.filter((event) => !this.sent.includes(event.id)).length);
  }
  forget(id: string): Promise<void> {
    this.recorded = this.recorded.filter((event) => event.id !== id);
    return Promise.resolve();
  }
  close(): Promise<void> {
    return Promise.resolve();
  }
  private sent: string[] = [];
  private quarantined: string[] = [];
}

/** The one delivery the courier makes in these tests. */
const stop = { id: 'stop-1', sequence: 1 };

/**
 * The day the phone holds: a shift with a stop on it.
 *
 * A mark cannot exist before the day does - the stops a courier marks are the
 * day's own - so the cache answers with one, and the shift the outbox must
 * send under comes from it.
 */
const DAY: RunSnapshot = {
  run: {
    id: 'run-1',
    shift_id: 'shift-1',
    name: 'Northwood AM',
    depot: { lat: -43.532, lon: 172.599 },
    speed_kmh: 40,
    start_at: '2026-10-31T07:30:00.000Z',
  },
  stops: [
    { id: 'stop-1', seq: 1, address: '12 Riccarton Road', status: 'pending', location_id: 'loc-1' },
  ],
};

/** A cache that keeps the day and its marks. */
class FakeCache implements RunCache {
  marks: DeliveredMark[] = [];
  /** The day the phone holds, or null on a first launch with no network. */
  day: RunSnapshot | null = DAY;
  read(): Promise<RunSnapshot | null> {
    return Promise.resolve(this.day);
  }
  write(): Promise<void> {
    return Promise.resolve();
  }
  markDelivered(mark: DeliveredMark): Promise<void> {
    this.marks.push(mark);
    return Promise.resolve();
  }
  undoDelivered(stopId: string): Promise<void> {
    this.marks = this.marks.filter((mark) => mark.stopId !== stopId);
    return Promise.resolve();
  }
  markOf(stopId: string): Promise<DeliveredMark | null> {
    return Promise.resolve(this.marks.find((mark) => mark.stopId === stopId) ?? null);
  }
  deliveredMarks(): Promise<DeliveredMark[]> {
    return Promise.resolve(this.marks);
  }
  clear(): Promise<void> {
    this.marks = [];
    return Promise.resolve();
  }
  async close(): Promise<void> {}
}

/** The API of slice 1, answered by the test. */
class FakeApi implements RunApi {
  seedDemoRun() {
    return Promise.resolve({ status: 'ok', data: { run_id: 'run-1', shift_id: 'shift-1' } } as const);
  }
  getRun() {
    return Promise.resolve({
      status: 'ok',
      data: {
        id: 'run-1',
        shift_id: 'shift-1',
        name: 'Northwood AM',
        depot: { lat: -43.532, lon: 172.599 },
        speed_kmh: 40,
        start_at: '2026-10-31T07:30:00.000Z',
      },
    } as unknown as Awaited<ReturnType<RunApi['getRun']>>);
  }
  getStops() {
    return Promise.resolve({
      status: 'ok',
      data: [
        { id: 'stop-1', seq: 1, address: '12 Riccarton Road', status: 'pending', location_id: 'loc-1' },
      ],
    } as unknown as Awaited<ReturnType<RunApi['getStops']>>);
  }
}

describe("the store's write path leaves the phone when it can (A1 slice 3)", () => {
  it('asks the outbox to send the delivery it just recorded, under the run own shift', async () => {
    const store = new FakeStore();
    const flush = jest.fn(() => Promise.resolve());

    const runStore = new RunStore({
      client: new FakeApi(),
      cache: new FakeCache(),
      events: new EventLog(store),
      reason: 'dev',
      flush,
    } as unknown as ConstructorParameters<typeof RunStore>[0]);

    await runStore.markDelivered(stop);

    // The event is in the log, and the outbox was asked to send it.
    expect(store.recorded).toHaveLength(1);
    expect(flush).toHaveBeenCalledTimes(1);
    // The batch endpoint is the shift's own, so the shift the outbox is given
    // is the run's: a delivery sent under the wrong shift lands in nobody's day.
    expect(flush).toHaveBeenCalledWith('shift-1');
  });

  // A mark before the day has been read cannot happen on a phone (the stops a
  // courier marks are the day's own), but a store that has no day on it must
  // still record and carry on rather than crash: the phone keeps the delivery
  // and sends it when it knows where it goes.
  it('records the delivery with no day on the phone, and asks the outbox nothing', async () => {
    const store = new FakeStore();
    const flush = jest.fn(() => Promise.resolve());
    const cache = new FakeCache();
    cache.day = null;

    const runStore = new RunStore({
      client: new FakeApi(),
      cache,
      events: new EventLog(store),
      reason: 'dev',
      flush,
    } as unknown as ConstructorParameters<typeof RunStore>[0]);

    await expect(runStore.markDelivered(stop)).resolves.toBeUndefined();
    expect(store.recorded).toHaveLength(1);
    expect(flush).not.toHaveBeenCalled();
  });

  // A store with no outbox must keep working: the marks-only construction and
  // the tests both build it, and recording without sending is still better
  // than not recording.
  it('records the delivery with no outbox wired, and carries on', async () => {
    const store = new FakeStore();

    const runStore = new RunStore({
      client: new FakeApi(),
      cache: new FakeCache(),
      events: new EventLog(store),
      reason: 'dev',
    } as unknown as ConstructorParameters<typeof RunStore>[0]);

    await expect(runStore.markDelivered(stop)).resolves.toBeUndefined();
    expect(store.recorded).toHaveLength(1);
  });
});
