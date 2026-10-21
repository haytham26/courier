/**
 * The sync service: the queue of actions the phone took while it was out of
 * coverage, and the pump that empties it when the network is back.
 *
 * The screens never wait for it. A courier taps "save" and the note is on
 * the phone; the queue takes it to the server later.
 */
import { NetworkError } from '@/api/httpClient';
import type { EventLog } from './eventLog';
import type { SyncEvent } from './events';
import type { NetworkMonitor } from './network';
import type { SyncTransport } from './transport';

export interface FlushResult {
  /** How many events the server took. */
  sent: number;
  /** How many events are still waiting. */
  pending: number;
  /** The plain-English reason the queue stopped, when it stopped. */
  error: string | null;
}

export interface SyncStatus {
  /** How many actions are waiting for the network. */
  pending: number;
  /** Whether the phone has a network right now. */
  online: boolean;
  /** When the queue was last emptied (null when it never was). */
  lastSyncedAt: string | null;
}

type StatusListener = (status: SyncStatus) => void;

export class SyncService {
  private readonly log: EventLog;
  private readonly transport: SyncTransport;
  private readonly network: NetworkMonitor;
  private readonly listeners = new Set<StatusListener>();
  private lastSyncedAt: string | null = null;
  private flushing = false;

  constructor(log: EventLog, transport: SyncTransport, network: NetworkMonitor) {
    this.log = log;
    this.transport = transport;
    this.network = network;
  }

  /** Puts an event in the queue. */
  async enqueue(event: SyncEvent): Promise<void> {
    await this.log.append(event);
    await this.publish();
  }

  /** How many actions are waiting for the network. */
  async pendingCount(): Promise<number> {
    return this.log.count();
  }

  /** The events still waiting for the network, oldest first. */
  async pendingEvents(): Promise<SyncEvent[]> {
    return this.log.list();
  }

  /** The state the offline chip shows. */
  async status(): Promise<SyncStatus> {
    return {
      pending: await this.pendingCount(),
      online: await this.network.isOnline(),
      lastSyncedAt: this.lastSyncedAt,
    };
  }

  /**
   * Sends everything in the queue, oldest first.
   *
   * The queue stops at the first event that does not get through, so the
   * events keep their order and nothing is lost.
   */
  async flush(): Promise<FlushResult> {
    if (this.flushing) {
      return { sent: 0, pending: await this.pendingCount(), error: null };
    }
    this.flushing = true;
    try {
      const events = await this.log.list();
      let sent = 0;
      for (const event of events) {
        try {
          await this.transport.send(event);
        } catch (error) {
          const reason = error instanceof NetworkError ? error.message : 'The queue did not go through.';
          return { sent, pending: events.length - sent, error: reason };
        }
        await this.log.remove(event.id);
        sent += 1;
      }
      if (sent > 0) {
        this.lastSyncedAt = new Date().toISOString();
      }
      await this.publish();
      return { sent, pending: events.length - sent, error: null };
    } finally {
      this.flushing = false;
    }
  }

  /**
   * Empties the queue as soon as the network is back.
   *
   * Returns the function that stops watching.
   */
  start(): () => void {
    return this.network.subscribe((online) => {
      if (online) {
        void this.flush();
      }
    });
  }

  /** Watches for changes (the offline chip and the screens). */
  subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    void this.publish();
    return () => this.listeners.delete(listener);
  }

  private async publish(): Promise<void> {
    const status = await this.status();
    for (const listener of this.listeners) {
      listener(status);
    }
  }
}
