/**
 * The door memory, online and offline.
 *
 * With a network the note goes straight to the server. Without one it waits
 * in the queue and is sent when the phone is back online, so a courier never
 * loses what they wrote about a door.
 */
import { HttpClient } from '@/api/httpClient';
import { EventLog } from '@/sync/eventLog';
import { FixedNetworkMonitor } from '@/sync/network';
import { MemoryKeyValueStore } from '@/sync/storage';
import { SyncService } from '@/sync/syncService';
import { HttpSyncTransport } from '@/sync/transport';
import { ApiDoorMemoryService } from '../doorMemoryService';

interface Recorded {
  url: string;
  body: string | undefined;
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function makeService(fetchImpl: (url: string, init?: RequestInit) => Promise<Response>) {
  const store = new MemoryKeyValueStore();
  const http = new HttpClient({ baseUrl: 'http://api.test', fetchImpl });
  const log = new EventLog(store);
  const monitor = new FixedNetworkMonitor(true);
  const sync = new SyncService(log, new HttpSyncTransport(() => http), monitor);
  return { service: new ApiDoorMemoryService(http, sync), sync, monitor, log };
}

describe('the door memory', () => {
  it('reads the memory of a stop', async () => {
    const { service } = makeService(async () =>
      jsonResponse({
        address_key: '45 papanui road merivale',
        note: 'Leave it behind the pot',
        safe_place: 'side gate',
        updated_at: '2026-10-21T08:30:00Z',
      }),
    );

    const result = await service.get('2');

    expect(result.memory?.safe_place).toBe('side gate');
    expect(result.memory?.note).toBe('Leave it behind the pot');
    expect(result.pending).toBe(false);
    expect(result.error).toBeNull();
  });

  it('has nothing to say about an address nobody has written about', async () => {
    const { service } = makeService(async () => jsonResponse({ detail: 'No door memory' }, 404));

    const result = await service.get('2');

    expect(result.memory).toBeNull();
    expect(result.pending).toBe(false);
    expect(result.error).toBeNull();
  });

  it('writes the note straight to the server when there is a network', async () => {
    const recorded: Recorded[] = [];
    const { service } = makeService(async (url, init) => {
      recorded.push({ url, body: init?.body as string | undefined });
      return jsonResponse({
        address_key: '45 papanui road merivale',
        note: 'Leave it behind the pot',
        safe_place: 'side gate',
        updated_at: '2026-10-21T08:30:00Z',
      });
    });

    const result = await service.save('2', { note: 'Leave it behind the pot', safePlace: 'side gate' });

    expect(result.pending).toBe(false);
    expect(result.memory?.safe_place).toBe('side gate');
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.url).toBe('http://api.test/stops/2/door-memory');
    expect(JSON.parse(recorded[0]?.body ?? '{}')).toEqual({
      note: 'Leave it behind the pot',
      safe_place: 'side gate',
    });
  });

  it('queues the note when the phone has no network', async () => {
    const { service, log } = makeService(async () => {
      throw new TypeError('Network request failed');
    });

    const result = await service.save('2', { note: 'The dog barks', safePlace: 'shed' });

    expect(result.pending).toBe(true);
    expect(result.error).toBeNull();
    expect(result.memory?.note).toBe('The dog barks');

    const events = await log.list();
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('add_location_note');
    expect(events[0]?.payload).toEqual({
      stop_id: '2',
      note: 'The dog barks',
      safe_place: 'shed',
    });
  });

  it('sends the queued note when the network is back', async () => {
    const recorded: Recorded[] = [];
    let online = false;
    const { service, sync, monitor } = makeService(async (url, init) => {
      if (!online) {
        throw new TypeError('Network request failed');
      }
      recorded.push({ url, body: init?.body as string | undefined });
      return jsonResponse({
        address_key: '45 papanui road merivale',
        note: 'The dog barks',
        safe_place: 'shed',
        updated_at: '2026-10-21T08:30:00Z',
      });
    });

    await service.save('2', { note: 'The dog barks', safePlace: 'shed' });
    expect(recorded).toHaveLength(0);

    online = true;
    monitor.setOnline(true);
    await sync.flush();

    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.url).toBe('http://api.test/stops/2/door-memory');
    expect(await sync.pendingCount()).toBe(0);
  });

  it('shows the last note it had when the server does not answer', async () => {
    let online = true;
    const { service } = makeService(async () => {
      if (!online) {
        throw new TypeError('Network request failed');
      }
      return jsonResponse({
        address_key: '45 papanui road merivale',
        note: 'Leave it behind the pot',
        safe_place: 'side gate',
        updated_at: '2026-10-21T08:30:00Z',
      });
    });

    await service.get('2');
    online = false;
    const result = await service.get('2');

    expect(result.isStale).toBe(true);
    expect(result.memory?.note).toBe('Leave it behind the pot');
    expect(result.error).not.toBeNull();
  });
});
