/**
 * The run store (src/run/runStore.ts): the one fact the phone answers with.
 *
 * The API is a fake and the cache is a fake, so what is asserted is this
 * store's own contract: it seeds the day when nothing is on the phone, reads
 * the run and its stops through the slice-1 client, answers the cache offline
 * and the network's answer online, records every mark into the local event
 * log, and closes the day without leaving it for the next courier. The API's
 * behaviour is the server's own suite; the op-sqlite part is the store's
 * adapter test.
 */
import type { DemoRun, RunResponse, StopResponse } from '@courier/shared/src/generated/api';

import type { ApiOutcome } from '@/lib/api-client';

import { EventLog } from '@/sync/eventLog';
import type { DeliveryEvent, EventStore } from '@/sync/types';

import { RunStore, seedReasonForBuild } from '../runStore';
import type { DeliveredMark, RunApi, RunCache, RunSnapshot, SeedReason } from '../types';

/** The API, answered by the test. */
class FakeApi implements RunApi {
  seeded: SeedReason[] = [];

  readRunIds: string[] = [];

  readStopsFor: string[] = [];

  seedAnswer: ApiOutcome<DemoRun> = { status: 'server', code: 500, message: 'not answered yet' };

  runAnswer: ApiOutcome<RunResponse> = aRun('Hornby morning');

  stopsAnswer: ApiOutcome<StopResponse[]> = {
    status: 'ok',
    data: [
      {
        id: 'stop-1',
        location_id: 'loc-1',
        address: '12 Riccarton Road, Riccarton',
        seq: 1,
        status: 'pending',
        lat: -43.532,
        lon: 172.599,
        parcels: 2,
      },
      {
        id: 'stop-2',
        location_id: 'loc-2',
        address: '45 Papanui Road, Merivale',
        seq: 2,
        status: 'pending',
      },
    ],
  };

  seedDemoRun(reason?: SeedReason): Promise<ApiOutcome<DemoRun>> {
    this.seeded.push(reason ?? 'e2e');
    return Promise.resolve(this.seedAnswer);
  }

  getRun(runId: string): Promise<ApiOutcome<RunResponse>> {
    this.readRunIds.push(runId);
    return Promise.resolve(this.runAnswer);
  }

  getStops(shiftId: string): Promise<ApiOutcome<StopResponse[]>> {
    this.readStopsFor.push(shiftId);
    return Promise.resolve(this.stopsAnswer);
  }
}

/** The event log's storage, in memory: the real EventLog sits above it. */
class FakeEventStore implements EventStore {
  readonly events: DeliveryEvent[] = [];

  readonly synced = new Set<string>();

  readonly quarantined: DeliveryEvent[] = [];

  append(event: DeliveryEvent): Promise<void> {
    if (!this.events.some((stored) => stored.id === event.id)) {
      this.events.push(event);
    }
    return Promise.resolve();
  }

  pending(limit: number): Promise<DeliveryEvent[]> {
    return Promise.resolve(
      this.events
        .filter((event) => !this.synced.has(event.id) && !this.quarantined.some((q) => q.id === event.id))
        .slice(0, limit),
    );
  }

  markSynced(ids: string[]): Promise<void> {
    ids.forEach((id) => this.synced.add(id));
    return Promise.resolve();
  }

  quarantine(events: DeliveryEvent[]): Promise<void> {
    events.forEach((event) => this.quarantined.push(event));
    return Promise.resolve();
  }

  forget(id: string): Promise<void> {
    if (!this.synced.has(id)) {
      const index = this.events.findIndex((event) => event.id === id);
      if (index >= 0) {
        this.events.splice(index, 1);
      }
    }
    return Promise.resolve();
  }

  pendingCount(): Promise<number> {
    return this.pending(Number.MAX_SAFE_INTEGER).then((pending) => pending.length);
  }
}

/** The run cache, in memory. */
class FakeCache implements RunCache {
  snapshot: RunSnapshot | null = null;

  readonly marks: DeliveredMark[] = [];

  cleared = 0;

  read(): Promise<RunSnapshot | null> {
    return Promise.resolve(this.snapshot);
  }

  write(snapshot: RunSnapshot): Promise<void> {
    this.snapshot = snapshot;
    return Promise.resolve();
  }

  markDelivered(mark: DeliveredMark): Promise<void> {
    this.marks.push(mark);
    return Promise.resolve();
  }

  undoDelivered(stopId: string): Promise<void> {
    const index = this.marks.findIndex((mark) => mark.stopId === stopId);
    if (index >= 0) {
      this.marks.splice(index, 1);
    }
    return Promise.resolve();
  }

  markOf(stopId: string): Promise<DeliveredMark | null> {
    return Promise.resolve(this.marks.find((mark) => mark.stopId === stopId) ?? null);
  }

  deliveredMarks(): Promise<DeliveredMark[]> {
    return Promise.resolve([...this.marks]);
  }

  clear(): Promise<void> {
    this.snapshot = null;
    this.marks.length = 0;
    this.cleared += 1;
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.closed += 1;
    return Promise.resolve();
  }

  closed = 0;
}

/** A run the API answers with, named. */
function aRun(name: string): ApiOutcome<RunResponse> {
  return {
    status: 'ok',
    data: {
      id: 'run-1',
      shift_id: 'shift-1',
      name,
      depot: { lat: -43.55, lon: 172.603 },
      speed_kmh: 30,
      start_at: '2026-10-21T05:00:00.000Z',
    },
  };
}

/** A store over fakes the test controls, with a fixed clock. */
function aStore(
  api = new FakeApi(),
  overrides: { cache?: FakeCache; events?: FakeEventStore } = {},
): { store: RunStore; api: FakeApi; cache: FakeCache; events: FakeEventStore; log: EventLog; at: number } {
  const cache = overrides.cache ?? new FakeCache();
  const events = overrides.events ?? new FakeEventStore();
  const at = Date.parse('2026-10-21T06:00:00.000Z');
  return {
    store: new RunStore({
      client: api,
      cache,
      events: new EventLog(events),
      reason: 'dev',
      clock: () => at,
    }),
    api,
    cache,
    events,
    log: new EventLog(events),
    at,
  };
}

/** The seeded day the API answers with. */
const SEEDED: ApiOutcome<DemoRun> = {
  status: 'ok',
  data: {
    run_id: 'run-1',
    shift_id: 'shift-1',
    stops: [{ id: 'stop-1', address: '12 Riccarton Road, Riccarton', lat: -43.532, lon: 172.599 }],
  },
};

describe('the seed reason', () => {
  it('seeds e2e on the E2E build and dev on every other', () => {
    expect(seedReasonForBuild('1')).toBe('e2e');
    expect(seedReasonForBuild(undefined)).toBe('dev');
    expect(seedReasonForBuild('')).toBe('dev');
    expect(seedReasonForBuild('true')).toBe('dev');
  });
});

describe('loading the run', () => {
  it('seeds the day with the reason this build configured when nothing is cached', async () => {
    const { store, api } = aStore();
    api.seedAnswer = SEEDED;

    const load = await store.load();

    expect(api.seeded).toEqual(['dev']);
    expect(load.status).toBe('ok');
    if (load.status !== 'ok') {
      return;
    }
    expect(load.source).toBe('network');
    expect(load.snapshot.run.id).toBe('run-1');
    expect(api.readRunIds).toEqual(['run-1']);
    expect(api.readStopsFor).toEqual(['shift-1']);
  });

  it('answers the stops of the shift in their sequence', async () => {
    const { store, api } = aStore();
    api.seedAnswer = SEEDED;

    const load = await store.load();

    if (load.status !== 'ok') {
      throw new Error('the day did not load');
    }
    expect(load.snapshot.stops.map((stop) => stop.id)).toEqual(['stop-1', 'stop-2']);
    expect(load.snapshot.stops[0]?.location_id).toBe('loc-1');
  });

  it('answers the cache and makes no network call once the day is on the phone', async () => {
    const { store, api, cache } = aStore();
    api.seedAnswer = SEEDED;
    await store.load();
    api.seeded.length = 0;
    api.readRunIds.length = 0;
    api.readStopsFor.length = 0;

    const load = await store.load();

    expect(load.status).toBe('ok');
    if (load.status !== 'ok') {
      return;
    }
    expect(load.source).toBe('cache');
    expect(api.seeded).toEqual([]);
    expect(api.readRunIds).toEqual([]);
    expect(cache.snapshot?.run.id).toBe('run-1');
  });

  it('replaces the cached day with the network answer on a refresh', async () => {
    const { store, api, cache } = aStore();
    api.seedAnswer = SEEDED;
    await store.load();
    api.runAnswer = aRun('Hornby afternoon');

    const load = await store.refresh();

    expect(load.status).toBe('ok');
    if (load.status !== 'ok') {
      return;
    }
    expect(load.source).toBe('network');
    expect(load.snapshot.run.name).toBe('Hornby afternoon');
    expect(cache.snapshot?.run.name).toBe('Hornby afternoon');
  });

  it('answers the cached day with the failure when the network is gone', async () => {
    const { store, api, cache } = aStore();
    api.seedAnswer = SEEDED;
    await store.load();
    api.runAnswer = { status: 'offline' };

    const load = await store.refresh();

    expect(load.status).toBe('offline');
    if (load.status !== 'offline') {
      return;
    }
    expect(load.snapshot?.run.id).toBe('run-1');
    expect(cache.snapshot?.run.id).toBe('run-1');
  });

  it('answers the failure with no day when the network is gone on the first launch', async () => {
    const { store, api } = aStore();
    api.seedAnswer = { status: 'offline' };
    api.runAnswer = { status: 'offline' };

    const load = await store.load();

    expect(load.status).toBe('offline');
    if (load.status !== 'offline') {
      return;
    }
    expect(load.snapshot).toBeNull();
  });

  it("carries the server's own sentence when the seed is refused", async () => {
    const { store, api } = aStore();
    api.seedAnswer = { status: 'server', code: 404, message: 'the demo seed is closed' };

    const load = await store.load();

    expect(load.status).toBe('server');
    if (load.status !== 'server') {
      return;
    }
    expect(load.message).toBe('the demo seed is closed');
    expect(load.snapshot).toBeNull();
  });

  it('answers unauthorized when the session is gone', async () => {
    const { store, api } = aStore();
    api.seedAnswer = { status: 'unauthorized' };

    const load = await store.load();

    expect(load.status).toBe('unauthorized');
  });
});

describe('the write path of the run store', () => {
  it('records a delivery event in the log and a mark on the run', async () => {
    const { store, cache, log, at } = aStore();

    await store.markDelivered({ id: 'stop-1', sequence: 1 });

    const pending = await log.nextBatch(10);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.kind).toBe('delivered');
    expect(pending[0]?.stopId).toBe('stop-1');
    expect(pending[0]?.occurredAt).toBe(new Date(at).toISOString());
    expect(cache.marks).toEqual([
      { stopId: 'stop-1', sequence: 1, at, eventId: pending[0]?.id },
    ]);
  });

  it('keeps one event for a stop that is marked twice', async () => {
    const { store, log } = aStore();

    await store.markDelivered({ id: 'stop-1', sequence: 1 });
    await store.markDelivered({ id: 'stop-1', sequence: 1 });

    expect(await log.pendingCount()).toBe(1);
  });

  it('takes the mark off the run and the unsent event back out of the log on undo', async () => {
    const { store, cache, log } = aStore();
    await store.markDelivered({ id: 'stop-1', sequence: 1 });

    await store.undoDelivered('stop-1');

    expect(cache.marks).toEqual([]);
    expect(await log.pendingCount()).toBe(0);
  });

  it('answers the marks of the run in delivery order, also to a store that starts cold', async () => {
    const { store, cache } = aStore();
    await store.markDelivered({ id: 'stop-1', sequence: 1 });
    await store.markDelivered({ id: 'stop-2', sequence: 2 });

    const marks = await store.deliveredMarks();
    expect(marks.map((mark) => mark.stopId)).toEqual(['stop-1', 'stop-2']);

    const cold = new RunStore({
      client: new FakeApi(),
      cache,
      events: new EventLog(new FakeEventStore()),
      reason: 'dev',
    });
    expect((await cold.deliveredMarks()).map((mark) => mark.stopId)).toEqual(['stop-1', 'stop-2']);
  });

  it('closes the run without leaving it for the next courier', async () => {
    const { store, cache, log } = aStore();
    await store.markDelivered({ id: 'stop-1', sequence: 1 });

    await store.close();

    expect(cache.cleared).toBe(1);
    expect(cache.closed).toBe(1);
    expect(await log.pendingCount()).toBe(1);
  });
});
