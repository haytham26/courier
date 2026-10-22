/**
 * The event log: the courier's phone is the source of truth while offline.
 *
 * Nothing here talks to the network. The log accepts an event, keeps it until
 * the server confirms it, and hands the waiting events to the sync service.
 */
import type { DeliveryEvent, EventStore } from './types';

export const DEFAULT_BATCH_SIZE = 50;

export class EventLog {
  constructor(private readonly store: EventStore) {}

  /** Records an event. The same id twice is ignored. */
  async record(event: DeliveryEvent): Promise<void> {
    if (!event.id) {
      throw new Error('a delivery event needs an id');
    }
    if (!event.stopId) {
      throw new Error('a delivery event needs a stop');
    }
    await this.store.append(event);
  }

  /** The batch to send next, oldest first. */
  async nextBatch(limit: number = DEFAULT_BATCH_SIZE): Promise<DeliveryEvent[]> {
    if (limit <= 0) {
      return [];
    }
    return this.store.pending(limit);
  }

  /** Marks the events the server has stored. */
  async confirm(events: DeliveryEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }
    await this.store.markSynced(events.map((event) => event.id));
  }

  /** How many events are still waiting to reach the server. */
  async pendingCount(): Promise<number> {
    return this.store.pendingCount();
  }
}
