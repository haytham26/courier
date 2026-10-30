/**
 * The app's construction site for the outbox (A1 slice 3).
 *
 * The audit's interlock: until this lands, no production module constructs
 * `SyncService` or any API transport, so the events the phone records never
 * leave it - the app shows a courier a day that syncs nothing. This is the
 * seam the root layout opens per signed-in session, the same way it opens the
 * run store: one service, one event log, one client, all scoped to the session.
 *
 * The client is the slice-1 one, so the token and the base URL come from the
 * same place every other API call comes from; the transport over it is
 * `apiSyncTransport`, which is the wire half of `events:batch`. The event log
 * is the phone's own op-sqlite handle, so a delivery that cannot send now is
 * still there after a cold start (ADR-014).
 */
import { CourierApiClient } from '@/lib/api-client';

import { OpSqliteEventStore } from './opSqliteEventStore';
import { EventLog } from './eventLog';
import { SyncService } from './syncService';
import { apiSyncTransport } from './apiSyncTransport';

/** One outbox for one session: the log the phone keeps and the wire that sends it. */
export function syncForThisSession(): { service: SyncService; release: () => Promise<void> } {
  const eventStore = OpSqliteEventStore.open();
  const log = new EventLog(eventStore);
  const client = new CourierApiClient();

  return {
    service: new SyncService(log, apiSyncTransport(client)),
    release: async () => {
      await eventStore.close();
    },
  };
}
