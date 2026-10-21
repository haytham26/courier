/**
 * How a queued event reaches the server.
 *
 * Every event type has one way out, and the server is the judge: an event it
 * has already taken is accepted again without changing anything.
 */
import type { HttpClient } from '@/api/httpClient';
import type { SyncEvent } from './events';

export interface SyncTransport {
  /** Sends one event. It throws when the event did not get through. */
  send(event: SyncEvent): Promise<void>;
}

export class HttpSyncTransport implements SyncTransport {
  private readonly getClient: () => HttpClient;

  constructor(getClient: () => HttpClient) {
    this.getClient = getClient;
  }

  async send(event: SyncEvent): Promise<void> {
    if (event.type === 'add_location_note') {
      const { stop_id: stopId, note, safe_place: safePlace } = event.payload;
      await this.getClient().post(`/stops/${encodeURIComponent(stopId)}/door-memory`, {
        note,
        safe_place: safePlace,
      });
    }
  }
}
