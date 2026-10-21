/**
 * The offline queue.
 *
 * The courier taps "save" in a dead spot: the note waits on the phone and
 * goes to the server when the network is back. Nothing is lost, and nothing
 * on the screen waits for the server.
 */
import { EventLog } from '../eventLog';
import { createAddLocationNoteEvent } from '../events';
import { FixedNetworkMonitor } from '../network';
import { MemoryKeyValueStore } from '../storage';
import { SyncService } from '../syncService';
import { NetworkError } from '@/api/httpClient';
import type { SyncEvent } from '../events';
import type { SyncTransport } from '../transport';

function makeSyncService() {
  const store = new MemoryKeyValueStore();
  const sent: SyncEvent[] = [];
  const monitor = new FixedNetworkMonitor(true);
  const transport: SyncTransport = {
    send: async (event) => {
      if (!monitor.current()) {
        throw new NetworkError('No connection.');
      }
      sent.push(event);
    },
  };
  const service = new SyncService(new EventLog(store), transport, monitor);
  return { service, sent, monitor, store };
}

describe('the event log', () => {
  it('keeps the events until the server takes them', async () => {
    const { service, sent } = makeSyncService();
    const event = createAddLocationNoteEvent({
      stopId: '2',
      note: 'Leave it behind the pot',
      safePlace: 'side gate',
    });

    await service.enqueue(event);

    expect(await service.pendingCount()).toBe(1);
    expect(sent).toHaveLength(0);

    await service.flush();

    expect(sent).toHaveLength(1);
    expect(sent[0]?.type).toBe('add_location_note');
    expect(await service.pendingCount()).toBe(0);
  });

  it('keeps the event when the server does not take it', async () => {
    const { service, sent, monitor } = makeSyncService();
    monitor.setOnline(false);

    await service.enqueue(
      createAddLocationNoteEvent({ stopId: '2', note: 'Gate code 1234', safePlace: null }),
    );

    const result = await service.flush();

    expect(result.sent).toBe(0);
    expect(result.pending).toBe(1);
    expect(await service.pendingCount()).toBe(1);
    expect(sent).toHaveLength(0);
  });

  it('sends the queue by itself when the network comes back', async () => {
    const { service, sent, monitor } = makeSyncService();
    const stop = service.start();

    await service.enqueue(
      createAddLocationNoteEvent({ stopId: '3', note: 'The dog barks', safePlace: 'shed' }),
    );
    expect(sent).toHaveLength(0);

    monitor.setOnline(true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(sent).toHaveLength(1);
    expect(await service.pendingCount()).toBe(0);
    stop();
  });

  it('does not lose an event it cannot read back', async () => {
    const { service, store } = makeSyncService();
    await store.set('sync.event-log.v1', 'not json at all');

    expect(await service.pendingCount()).toBe(0);
  });
});
