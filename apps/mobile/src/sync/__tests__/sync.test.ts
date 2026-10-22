/**
 * The tests of the event log and the sync service.
 *
 * The store and the transport are fakes: the logic is what matters here, and
 * it must hold on a phone with no network.
 */
import { EventLog } from '../eventLog';
import { SyncService } from '../syncService';
import type { DeliveryEvent, EventStore, SyncResult, SyncTransport } from '../types';

class FakeStore implements EventStore {
  readonly events: DeliveryEvent[] = [];
  readonly synced = new Set<string>();

  append(event: DeliveryEvent): Promise<void> {
    if (!this.events.some((stored) => stored.id === event.id)) {
      this.events.push(event);
    }
    return Promise.resolve();
  }

  pending(limit: number): Promise<DeliveryEvent[]> {
    return Promise.resolve(
      this.events.filter((event) => !this.synced.has(event.id)).slice(0, limit),
    );
  }

  markSynced(ids: string[]): Promise<void> {
    ids.forEach((id) => this.synced.add(id));
    return Promise.resolve();
  }

  pendingCount(): Promise<number> {
    return Promise.resolve(
      this.events.filter((event) => !this.synced.has(event.id)).length,
    );
  }
}

class FakeTransport implements SyncTransport {
  readonly batches: DeliveryEvent[][] = [];
  failure: Error | null = null;

  send(_shiftId: string, events: DeliveryEvent[]): Promise<SyncResult> {
    if (this.failure) {
      return Promise.reject(this.failure);
    }
    this.batches.push(events);
    return Promise.resolve({ accepted: events.length, cursor: events.length });
  }
}

function event(id: string, occurredAt = '2026-10-21T02:00:00.000Z'): DeliveryEvent {
  return {
    id,
    stopId: 'stop-1',
    kind: 'delivered',
    occurredAt,
  };
}

describe('EventLog', () => {
  it('keeps the event and hands it back as pending', async () => {
    const store = new FakeStore();
    const log = new EventLog(store);

    await log.record(event('a'));

    expect(await log.pendingCount()).toBe(1);
    expect((await log.nextBatch())[0]?.id).toBe('a');
  });

  it('ignores the same event twice', async () => {
    const store = new FakeStore();
    const log = new EventLog(store);

    await log.record(event('a'));
    await log.record(event('a'));

    expect(await log.pendingCount()).toBe(1);
  });

  it('refuses an event without an id or a stop', async () => {
    const log = new EventLog(new FakeStore());

    await expect(log.record({ ...event('a'), id: '' })).rejects.toThrow('id');
    await expect(log.record({ ...event('a'), stopId: '' })).rejects.toThrow('stop');
  });

  it('sends the oldest events first and keeps the batch size', async () => {
    const store = new FakeStore();
    const log = new EventLog(store);
    await log.record(event('a', '2026-10-21T01:00:00.000Z'));
    await log.record(event('b', '2026-10-21T02:00:00.000Z'));
    await log.record(event('c', '2026-10-21T03:00:00.000Z'));

    const batch = await log.nextBatch(2);

    expect(batch.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('confirms the events the server has stored', async () => {
    const store = new FakeStore();
    const log = new EventLog(store);
    await log.record(event('a'));

    await log.confirm(await log.nextBatch());

    expect(await log.pendingCount()).toBe(0);
  });
});

describe('SyncService', () => {
  it('sends the waiting events and confirms them', async () => {
    const store = new FakeStore();
    const transport = new FakeTransport();
    const log = new EventLog(store);
    const service = new SyncService(log, transport);
    await log.record(event('a'));

    const outcome = await service.sync('shift-1');

    expect(outcome.sent).toBe(1);
    expect(outcome.accepted).toBe(1);
    expect(outcome.failed).toBe(false);
    expect(transport.batches[0]?.[0]?.id).toBe('a');
    expect(await log.pendingCount()).toBe(0);
  });

  it('keeps the events when the network fails', async () => {
    const store = new FakeStore();
    const transport = new FakeTransport();
    transport.failure = new Error('no network');
    const log = new EventLog(store);
    const service = new SyncService(log, transport);
    await log.record(event('a'));

    const outcome = await service.sync('shift-1');

    expect(outcome.failed).toBe(true);
    expect(outcome.sent).toBe(0);
    expect(await log.pendingCount()).toBe(1);
  });

  it('sends every batch and stops at the first failure', async () => {
    const store = new FakeStore();
    const transport = new FakeTransport();
    const log = new EventLog(store);
    await log.record(event('a'));
    await log.record(event('b'));
    let calls = 0;
    const flakyTransport: SyncTransport = {
      async send(shiftId, events) {
        calls += 1;
        if (calls === 2) {
          throw new Error('no network');
        }
        return transport.send(shiftId, events);
      },
    };
    const flakyService = new SyncService(log, flakyTransport, 1);

    const outcomes = await flakyService.syncAll('shift-1');

    expect(outcomes.length).toBe(2);
    expect(outcomes[0]?.failed).toBe(false);
    expect(outcomes[1]?.failed).toBe(true);
    expect(await log.pendingCount()).toBe(1);
  });

  it('does nothing when there is nothing to send', async () => {
    const service = new SyncService(new EventLog(new FakeStore()), new FakeTransport());

    const outcome = await service.sync('shift-1');

    expect(outcome.sent).toBe(0);
    expect(outcome.failed).toBe(false);
  });
});
