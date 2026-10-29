/**
 * The tests of the event log and the sync service.
 *
 * The store and the transport are fakes: the logic is what matters here, and
 * it must hold on a phone with no network. The answers of the server are
 * ADR-014's own: a batch the server answers partly (the accepted count and
 * the refused ids) and a batch it refuses whole (the 422 that names the
 * offending events).
 */
import { EventLog } from '../eventLog';
import { retryBackoffMs, SyncRefusal, SyncService } from '../syncService';
import type { DeliveryEvent, EventStore, SyncResult, SyncTransport } from '../types';

class FakeStore implements EventStore {
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
        .filter(
          (event) =>
            !this.synced.has(event.id) && !this.quarantined.some((quarantined) => quarantined.id === event.id),
        )
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
    return Promise.resolve(
      this.events.filter(
        (event) =>
          !this.synced.has(event.id) && !this.quarantined.some((quarantined) => quarantined.id === event.id),
      ).length,
    );
  }
}

class FakeTransport implements SyncTransport {
  readonly batches: DeliveryEvent[][] = [];

  failure: Error | null = null;

  refusal: SyncRefusal | null = null;

  accepted = Number.POSITIVE_INFINITY;

  conflicts: string[] = [];

  send(_shiftId: string, events: DeliveryEvent[]): Promise<SyncResult> {
    if (this.refusal !== null) {
      return Promise.reject(this.refusal);
    }
    if (this.failure !== null) {
      return Promise.reject(this.failure);
    }
    this.batches.push(events);
    return Promise.resolve({
      accepted: Math.min(this.accepted, events.length),
      cursor: events.length,
      conflicts: this.conflicts,
    });
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

  it('keeps a quarantined event in the log but out of the pending list', async () => {
    const store = new FakeStore();
    const log = new EventLog(store);
    await log.record(event('a'));

    await log.quarantine(await log.nextBatch());

    expect(await log.pendingCount()).toBe(0);
    expect(store.events).toHaveLength(1);
    expect(store.quarantined.map((item) => item.id)).toEqual(['a']);
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

  it('keeps the events when the network fails, and says so in the log', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
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
      expect(String(warn.mock.calls[0]?.[0])).toContain('network');
    } finally {
      warn.mockRestore();
    }
  });

  it('sends every batch and stops at the first failure', async () => {
    const store = new FakeStore();
    const transport = new FakeTransport();
    const log = new EventLog(store);
    await log.record(event('a'));
    await log.record(event('b'));
    let calls = 0;
    const flakyTransport: SyncTransport = {
      send(shiftId, events) {
        calls += 1;
        if (calls === 2) {
          return Promise.reject(new Error('no network'));
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

  it('confirms only the events the server accepted (BUG-076)', async () => {
    const store = new FakeStore();
    const transport = new FakeTransport();
    transport.accepted = 1;
    transport.conflicts = ['b'];
    const log = new EventLog(store);
    const service = new SyncService(log, transport);
    await log.record(event('a'));
    await log.record(event('b'));

    const outcome = await service.sync('shift-1');

    expect(outcome.sent).toBe(2);
    expect(outcome.accepted).toBe(1);
    expect(await log.pendingCount()).toBe(1);
    expect((await log.nextBatch(10)).map((item) => item.id)).toEqual(['b']);
  });

  it('answers the refused event ids so the conflict answer can be rendered (BUG-076)', async () => {
    const transport = new FakeTransport();
    transport.accepted = 1;
    transport.conflicts = ['b'];
    const log = new EventLog(new FakeStore());
    const service = new SyncService(log, transport);
    await log.record(event('a'));
    await log.record(event('b'));

    const outcome = await service.sync('shift-1');

    expect(outcome.conflicts).toEqual(['b']);
  });

  it('never confirms more events than the batch carried', async () => {
    const store = new FakeStore();
    const transport = new FakeTransport();
    transport.accepted = 7;
    const log = new EventLog(store);
    const service = new SyncService(log, transport);
    await log.record(event('a'));

    const outcome = await service.sync('shift-1');

    expect(outcome.accepted).toBe(1);
    expect(await log.pendingCount()).toBe(0);
  });

  it('keeps the offending events out of the send path without losing them (BUG-086)', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const store = new FakeStore();
      const transport = new FakeTransport();
      transport.refusal = new SyncRefusal(['b'], 'the API refused the batch');
      const log = new EventLog(store);
      const service = new SyncService(log, transport);
      await log.record(event('a'));
      await log.record(event('b'));

      const outcome = await service.sync('shift-1');

      expect(outcome.failed).toBe(true);
      expect(await log.pendingCount()).toBe(1);
      expect((await log.nextBatch(10)).map((item) => item.id)).toEqual(['a']);
      expect(store.quarantined.map((item) => item.id)).toEqual(['b']);
      expect(store.events).toHaveLength(2);
    } finally {
      warn.mockRestore();
    }
  });

  it('answers the refused ids when the server refuses the batch (BUG-086)', async () => {
    const transport = new FakeTransport();
    transport.refusal = new SyncRefusal(['a', 'b'], 'the clock is outside the bound');
    const log = new EventLog(new FakeStore());
    const service = new SyncService(log, transport);
    await log.record(event('a'));
    await log.record(event('b'));

    const outcome = await service.sync('shift-1');

    expect(outcome.conflicts).toEqual(['a', 'b']);
    expect(outcome.quarantined).toEqual(['a', 'b']);
    expect(outcome.accepted).toBe(0);
  });

  it('warns to the console with the refused ids (BUG-086)', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const transport = new FakeTransport();
      transport.refusal = new SyncRefusal(['a'], 'the clock is outside the bound');
      const log = new EventLog(new FakeStore());
      const service = new SyncService(log, transport);
      await log.record(event('a'));

      await service.sync('shift-1');

      expect(warn).toHaveBeenCalled();
      expect(String(warn.mock.calls[0]?.[0])).toContain('a');
    } finally {
      warn.mockRestore();
    }
  });

  it('keeps a refusal that names no event of this batch out of the log', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const transport = new FakeTransport();
      transport.refusal = new SyncRefusal(['someone-else'], 'the clock is outside the bound');
      const log = new EventLog(new FakeStore());
      const service = new SyncService(log, transport);
      await log.record(event('a'));

      const outcome = await service.sync('shift-1');

      expect(outcome.failed).toBe(true);
      expect(outcome.quarantined).toEqual([]);
      expect(await log.pendingCount()).toBe(1);
    } finally {
      warn.mockRestore();
    }
  });

  it('answers how long the caller must wait after a network failure', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const log = new EventLog(new FakeStore());
      const transport = new FakeTransport();
      transport.failure = new Error('no network');
      const service = new SyncService(log, transport);
      await log.record(event('a'));

      const first = await service.sync('shift-1');
      const second = await service.sync('shift-1');

      expect(first.retryAfterMs).toBe(1000);
      expect(second.retryAfterMs).toBe(2000);
      expect(await log.pendingCount()).toBe(1);
    } finally {
      warn.mockRestore();
    }
  });

  it('answers no wait when the batch reached the server', async () => {
    const log = new EventLog(new FakeStore());
    const service = new SyncService(log, new FakeTransport());
    await log.record(event('a'));

    const outcome = await service.sync('shift-1');

    expect(outcome.retryAfterMs).toBe(0);
  });

  it('holds the pending/confirm window against a write that lands inside it (BUG-089)', async () => {
    const store = new FakeStore();
    const log = new EventLog(store);
    let onBatchTaken: (events: DeliveryEvent[]) => void = () => {};
    const entered = new Promise<DeliveryEvent[]>((resolve) => {
      onBatchTaken = resolve;
    });
    let releaseSend: () => void = () => {};
    const sendSettled = new Promise<void>((resolve) => {
      releaseSend = resolve;
    });
    const transport: SyncTransport = {
      send(_shiftId, events) {
        onBatchTaken(events);
        return sendSettled.then(() => ({ accepted: events.length, cursor: events.length, conflicts: [] }));
      },
    };
    const service = new SyncService(log, transport);
    await log.record(event('a'));

    const syncing = service.sync('shift-1');
    expect((await entered).map((item) => item.id)).toEqual(['a']);
    const landing = log.record(event('b'));

    expect(store.events.map((item) => item.id)).toEqual(['a']);

    releaseSend();
    await syncing;
    await landing;

    // 'a' is confirmed by the window; 'b' landed after it, so it waits for the
    // next one - the one thing a second handle would have got wrong.
    expect(store.events.map((item) => item.id)).toEqual(['a', 'b']);
    expect(await log.pendingCount()).toBe(1);
  });
});

describe('the backoff of a failing phone', () => {
  it('doubles for every consecutive failure and stops at the ceiling', () => {
    expect(retryBackoffMs(0)).toBe(0);
    expect(retryBackoffMs(1)).toBe(1000);
    expect(retryBackoffMs(2)).toBe(2000);
    expect(retryBackoffMs(3)).toBe(4000);
    expect(retryBackoffMs(1000)).toBe(60000);
  });
});
