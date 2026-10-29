/**
 * The delivery event: the truth the courier's phone records while offline.
 *
 * The id is generated on the phone, so the same event can be replayed safely:
 * the server stores it once.
 */
export type DeliveryEventKind =
  | 'delivered'
  | 'failed'
  | 'skipped'
  | 'note'
  | 'arrived'
  | 'safe_place';

export interface DeliveryEvent {
  id: string;
  stopId: string;
  kind: DeliveryEventKind;
  utterance?: string;
  safePlace?: string;
  lat?: number;
  lon?: number;
  accuracyM?: number;
  /** An aware instant (UTC, ISO-8601): the log orders by it (BUG-088). */
  occurredAt: string;
}

export interface EventStore {
  /** Stores an event. The same id twice keeps the first one. */
  append(event: DeliveryEvent): Promise<void>;
  /** The events that have not reached the server yet, oldest first. */
  pending(limit: number): Promise<DeliveryEvent[]>;
  /** Marks the events as delivered by the server. */
  markSynced(ids: string[]): Promise<void>;
  /**
   * Keeps events out of the send path without losing them (ADR-014 §3): a
   * refusal is preserved for the courier's review, never re-offered.
   */
  quarantine(events: DeliveryEvent[]): Promise<void>;
  /**
   * Takes an event back out of the log while the server has not stored it:
   * a delivery the courier undid before the phone managed to tell the server
   * never reaches it. A stored event cannot be taken back by the phone.
   */
  forget(id: string): Promise<void>;
  /** How many events are still waiting. */
  pendingCount(): Promise<number>;
}

/** The body the API answers with. */
export interface SyncResult {
  accepted: number;
  cursor: number;
  /** The event ids the server refused: the courier-facing conflict answer. */
  conflicts: string[];
}

/** The transport that talks to the API. */
export interface SyncTransport {
  send(shiftId: string, events: DeliveryEvent[]): Promise<SyncResult>;
}
