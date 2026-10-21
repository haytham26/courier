/**
 * The door memory: what the courier taught the app about an address.
 */

/** The memory as the server has it. */
export interface DoorMemoryResponse {
  address_key: string;
  note: string | null;
  safe_place: string | null;
  updated_at: string;
}

/**
 * What the screen shows: the server's memory with the phone's own note on
 * top. The address key is null while the note is still only on the phone.
 */
export interface DoorMemory {
  address_key: string | null;
  note: string | null;
  safe_place: string | null;
  updated_at: string | null;
}

export interface DoorMemoryState {
  /** The memory the courier sees, or null when there is none yet. */
  memory: DoorMemory | null;
  /** The phone holds the note; the server has not taken it yet. */
  pending: boolean;
  /** The server did not answer; this is the last known memory. */
  isStale: boolean;
  /** The plain-English reason something went wrong, when it did. */
  error: string | null;
}

export interface SaveDoorMemoryInput {
  note: string | null;
  safePlace: string | null;
}
