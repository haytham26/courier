/**
 * The events the app queues while the courier is out of coverage.
 *
 * An event is written once and never changed, so replaying it is safe: the
 * server ignores an event it has already seen.
 */
import { createUuid } from '@/lib/uuid';

/** What the courier taught the app about a door. */
export interface AddLocationNotePayload {
  stop_id: string;
  note: string | null;
  safe_place: string | null;
}

export interface AddLocationNoteEvent {
  id: string;
  type: 'add_location_note';
  created_at: string;
  payload: AddLocationNotePayload;
}

/** Every event the event log holds. */
export type SyncEvent = AddLocationNoteEvent;

export interface AddLocationNoteInput {
  stopId: string;
  note: string | null;
  safePlace: string | null;
  id?: string;
  createdAt?: string;
}

/** The event that carries a door note to the server. */
export function createAddLocationNoteEvent(input: AddLocationNoteInput): AddLocationNoteEvent {
  return {
    id: input.id ?? createUuid(),
    type: 'add_location_note',
    created_at: input.createdAt ?? new Date().toISOString(),
    payload: {
      stop_id: input.stopId,
      note: input.note,
      safe_place: input.safePlace,
    },
  };
}

function isAddLocationNoteEvent(value: unknown): value is AddLocationNoteEvent {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const event = value as Partial<AddLocationNoteEvent>;
  if (typeof event.id !== 'string' || event.type !== 'add_location_note') {
    return false;
  }
  const payload = event.payload;
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }
  return (
    typeof payload.stop_id === 'string' &&
    (payload.note === null || typeof payload.note === 'string') &&
    (payload.safe_place === null || typeof payload.safe_place === 'string')
  );
}

/** Reads an event back from the log; anything unreadable is dropped. */
export function parseSyncEvent(value: unknown): SyncEvent | null {
  return isAddLocationNoteEvent(value) ? value : null;
}
