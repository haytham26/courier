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
  occurredAt: string;
}

export interface EventStore {
  /** Stores an event. The same id twice keeps the first one. */
  append(event: DeliveryEvent): Promise<void>;
  /** The events that have not reached the server yet, oldest first. */
  pending(limit: number): Promise<DeliveryEvent[]>;
  /** Marks the events as delivered by the server. */
  markSynced(ids: string[]): Promise<void>;
  /** How many events are still waiting. */
  pendingCount(): Promise<number>;
}

/** The body the API answers with. */
export interface SyncResult {
  accepted: number;
  cursor: number;
}

/** The transport that talks to the API. */
export interface SyncTransport {
  send(shiftId: string, events: DeliveryEvent[]): Promise<SyncResult>;
}
