/**
 * The app's construction site for the outbox (A1 slice 3).
 *
 * The audit's interlock: until this lands, no production module constructs
 * `SyncService` or any API transport, so the events the phone records never
 * leave it - the app shows a courier a day that syncs nothing. This is the
 * seam the run store opens beside itself: one service, one event log, one
 * client, all scoped to the session.
 *
 * The client is the slice-1 one, so the token and the base URL come from the
 * same place every other API call comes from; the transport over it is
 * `apiSyncTransport`, which is the wire half of `events:batch`. The event log
 * is the phone's own op-sqlite handle, so a delivery that cannot send now is
 * still there after a cold start (ADR-014).
 *
 * The log is handed back with the service, because the run store records into
 * the very same log: what the store writes as a mark is what the outbox sends,
 * and two logs on one phone is two truths about one shift.
 */
import { CourierApiClient } from '@/lib/api-client';

import { OpSqliteEventStore } from './opSqliteEventStore';
import { EventLog } from './eventLog';
import { SyncService } from './syncService';
import { apiSyncTransport } from './apiSyncTransport';

/** One outbox for one session: the log the phone keeps and the wire that sends it. */
export interface SessionOutbox {
  service: SyncService;
  /** The log the marks are recorded in: the same one the outbox sends. */
  events: EventLog;
  /** The session is over: the phone's log is closed with it. */
  release: () => Promise<void>;
}

/** Builds the session's outbox: the phone's own log, and the API's own wire. */
export function syncForThisSession(): SessionOutbox {
  const eventStore = OpSqliteEventStore.open();
  const events = new EventLog(eventStore);
  const client = new CourierApiClient();

  return {
    service: new SyncService(events, apiSyncTransport(client)),
    events,
    release: async () => {
      await eventStore.close();
    },
  };
}
