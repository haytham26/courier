/**
 * The event log: the courier's phone is the source of truth while offline.
 *
 * Nothing here talks to the network. The log accepts an event, keeps it until
 * the server confirms it, and hands the waiting events to the sync service.
 *
 * The log also holds the writer lock of the event store (BUG-089): one write
 * cannot land inside another's window, and the window the sync service runs
 * its pending/confirm in is one that the log hands out. Without it, an event
 * recorded between a batch being taken and its confirmation would be handled
 * by both at once.
 */
import type { DeliveryEvent, EventStore } from './types';

export const DEFAULT_BATCH_SIZE = 50;

export class EventLog {
  private writer: Promise<void> = Promise.resolve();

  constructor(private readonly store: EventStore) {}

  /** Records an event. The same id twice is ignored. */
  async record(event: DeliveryEvent): Promise<void> {
    if (!event.id) {
      throw new Error('a delivery event needs an id');
    }
    if (!event.stopId) {
      throw new Error('a delivery event needs a stop');
    }
    await this.exclusively(() => this.store.append(event));
  }

  /** The batch to send next, oldest first. */
  async nextBatch(limit: number = DEFAULT_BATCH_SIZE): Promise<DeliveryEvent[]> {
    if (limit <= 0) {
      return [];
    }
    return this.store.pending(limit);
  }

  /**
   * Marks the events the server has stored. Runs inside the caller's window,
   * so it takes no lock of its own.
   */
  async confirm(events: DeliveryEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }
    await this.store.markSynced(events.map((event) => event.id));
  }

  /**
   * Keeps refused events out of the send path without losing them. Like
   * `confirm`, this is the window's own operation: the sync service's
   * refusal path runs inside the window it holds.
   */
  async quarantine(events: DeliveryEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }
    await this.store.quarantine(events);
  }

  /** Takes an event back out of the log while the server has not stored it. */
  async forget(id: string): Promise<void> {
    await this.exclusively(() => this.store.forget(id));
  }

  /** How many events are still waiting to reach the server. */
  async pendingCount(): Promise<number> {
    return this.store.pendingCount();
  }

  /**
   * The log's writer lock: the work runs to the exclusion of every other
   * write. The sync service takes it for the window in which it reads a batch
   * and confirms what the server stored, so nothing is written by another
   * path between the two.
   */
  async window<T>(window: () => Promise<T>): Promise<T> {
    return this.exclusively(window);
  }

  /** Serialises one write behind the last one, whatever that one did. */
  private exclusively<T>(work: () => Promise<T>): Promise<T> {
    const previous = this.writer;
    const run: Promise<T> = previous.then(work, work);
    this.writer = run.then<void, void>(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}
