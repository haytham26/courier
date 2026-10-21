/**
 * The event log: the actions the courier took while the phone had no network.
 *
 * The log is append-only. An event is written when the courier does
 * something, and it is removed only once the server has taken it. Nothing in
 * here talks to the network, so a screen never waits for the server.
 */
import { parseSyncEvent, type SyncEvent } from './events';
import type { KeyValueStore } from './storage';

const LOG_KEY = 'sync.event-log.v1';

export class EventLog {
  private readonly store: KeyValueStore;
  private readonly key: string;

  constructor(store: KeyValueStore, key: string = LOG_KEY) {
    this.store = store;
    this.key = key;
  }

  /** Adds an event to the end of the log. */
  async append(event: SyncEvent): Promise<void> {
    const events = await this.list();
    events.push(event);
    await this.store.set(this.key, JSON.stringify(events));
  }

  /** Every event still waiting to be sent, oldest first. */
  async list(): Promise<SyncEvent[]> {
    const raw = await this.store.get(this.key);
    if (raw === null) {
      return [];
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => parseSyncEvent(entry))
      .filter((entry): entry is SyncEvent => entry !== null);
  }

  /** Takes one event out of the log (the server has it now). */
  async remove(id: string): Promise<void> {
    const events = await this.list();
    const kept = events.filter((event) => event.id !== id);
    if (kept.length === events.length) {
      return;
    }
    await this.store.set(this.key, JSON.stringify(kept));
  }

  /** How many actions are still waiting to be sent. */
  async count(): Promise<number> {
    return (await this.list()).length;
  }

  /** Throws the log away (only the tests and "clear everything" use it). */
  async clear(): Promise<void> {
    await this.store.remove(this.key);
  }
}
