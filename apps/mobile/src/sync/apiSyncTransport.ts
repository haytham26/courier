/**
 * The outbox's transport on the wire (A1 slice 3).
 *
 * The audit's A1: the app does not speak to the server at all, so a delivery
 * recorded on the phone stays on the phone. This is the wire half - the seam
 * between the outbox's `SyncTransport` (one `send`) and the slice-1 client's
 * own `postDeliveryEvents`, which already spells the contract (the event
 * mapping, the batch's ids, the shift in the path).
 *
 * The shape that matters is the answer. The batch endpoint's 200 carries what
 * the server took and the ids it refused; the outbox then confirms exactly
 * those ids and repairs the rest (ADR-014 §3, and BUG-076: a partial accept
 * must not confirm the whole batch). A failure the server answered with a
 * status for is a refusal, and a refusal is thrown so the outbox's own retry
 * and backoff decide what happens next - the transport never decides a
 * delivery is "sent" when the server said no.
 */
import type { CourierApiClient } from '@/lib/api-client';

import { SyncRefusal } from './syncService';
import type { SyncTransport } from './types';
import type { DeliveryEvent } from './types';

/** How the transport reads the client's slice-1 seam. */
type EventsPoster = Pick<CourierApiClient, 'postDeliveryEvents'>;

/**
 * The API's own answer, which carries the accepted count and the refused ids.
 *
 * `conflicts` is optional in the contract: a server that refused everything
 * may answer without the key, and the outbox still needs the ids.
 */
interface BatchAnswer {
  accepted?: number;
  cursor?: number;
  conflicts?: string[];
}

/** Builds the outbox's transport over the slice-1 client. */
export function apiSyncTransport(client: EventsPoster): SyncTransport {
  return {
    async send(shiftId: string, events: DeliveryEvent[]) {
      const answer = await client.postDeliveryEvents(shiftId, events);

      if (answer.status === 'ok') {
        const body: BatchAnswer | null = answer.data;
        return {
          accepted: body?.accepted ?? 0,
          cursor: typeof body?.cursor === 'number' ? body.cursor : 0,
          conflicts: Array.isArray(body?.conflicts) ? body.conflicts : [],
        };
      }

      // The batch's own ids, so the refusal the outbox catches names them: a
      // refusal that points at nothing cannot quarantine what it refused.
      const eventIds = events.map((event) => event.id);

      // A failure the server answered with a status for: the batch was
      // refused, and the outbox has to know the difference between "no"
      // (this) and "nobody answered" (the transport's own throw, which the
      // caller's retry handles).
      if (answer.status === 'server' || answer.status === 'unmappable') {
        throw new SyncRefusal(eventIds, answer.message);
      }

      // The session is gone, or the network is: nothing was sent, so the
      // outbox keeps the batch and tries again when there is signal.
      throw new SyncRefusal(eventIds, sentenceFor(answer.status));
    },
  };
}

/** What the courier reads for a batch that never reached the server. */
function sentenceFor(status: 'unauthorized' | 'offline'): string {
  if (status === 'unauthorized') {
    return 'Your session is no longer valid, so this delivery was not sent. Sign in again.';
  }
  return 'There was no signal, so this delivery will send when the network comes back.';
}
