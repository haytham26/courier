/**
 * The app's construction site for the run store.
 *
 * The audit's interlock is that the store and the sync layer ship into their
 * first production caller here: the root layout opens the phone's own
 * databases, builds the slice-1 client with the session's token, and hands
 * one store to the run state above the screens. Nothing else in the app opens
 * an op-sqlite handle of the run's tables, and nothing else talks to the API.
 *
 * The outbox is opened with the store, and it is the same log: what the store
 * records as a mark is what the outbox has to send, so there is one log and not
 * two. The store's flush is the outbox's own sync, and the answers it brings
 * back (ADR-014 §1's conflicts, §3's quarantine) go to the courier through
 * `src/sync/syncAnswers` - a delivery that could not send is never hidden.
 *
 * The store is opened synchronously (op-sqlite's `open` is), and its schema
 * statements are issued on the first use; a phone whose encrypted database
 * cannot be opened answers with the in-memory store instead of crashing on
 * the drive screen.
 */
import { CourierApiClient } from '@/lib/api-client';

import { syncForThisSession } from '@/sync/syncForThisSession';
import { reportSyncAnswers } from '@/sync/syncAnswers';

import { inMemoryMarkStore } from './inMemoryMarkStore';
import { OpSqliteRunCache } from './opSqliteRunCache';
import { RunStore, seedReasonForBuild } from './runStore';
import { startOutboxRetry } from './outboxRetry';
import type { MarkStore } from './types';

/**
 * How often the phone asks the outbox to send what it holds (BUG-179).
 *
 * Fifteen seconds: often enough that a courier whose signal comes back sees
 * the delivery go within a quarter of a minute, slow enough that a phone in a
 * dead zone does not spend its battery asking. The app's own backoff still
 * governs the wire's side; this is the ask, not the pace of the network.
 */
const OUTBOX_RETRY_TICK_MS = 15_000;

/** The one run store of this build, over the app's own databases. */
export function productionRunStore(): RunStore {
  // One outbox per session, and its log is the store's own log: the delivery
  // the store records is the delivery the outbox sends (one fact, one log).
  const outbox = syncForThisSession();
  const cache = OpSqliteRunCache.open();

  // The delivery leaves the phone when there is signal. The flush never
  // throws: the events stay in the log, which is the one outcome the design
  // must never lose, and the answers are reported either way.
  const flushOutbox = async (shiftId: string): Promise<void> => {
    for (const outcome of await outbox.service.syncAll(shiftId)) {
      reportSyncAnswers(outcome);
    }
  };

  const store = new RunStore({
    client: new CourierApiClient(),
    cache,
    events: outbox.events,
    reason: seedReasonForBuild(process.env.EXPO_PUBLIC_E2E),
    flush: flushOutbox,
    release: async () => {
      stopOutboxRetry();
      await outbox.release();
      await cache.close();
    },
  });

  // BUG-179: the outbox is asked on its own too, not only after a mark - a
  // delivery recorded while there was no signal sends when the signal comes
  // back, and a courier at a standstill never marks again to make it go.
  const stopOutboxRetry = startOutboxRetry({
    shiftOf: () => store.shiftId(),
    flush: flushOutbox,
    everyMs: OUTBOX_RETRY_TICK_MS,
  });

  return store;
}

/**
 * The run store for this build: the phone's own, or the in-memory marks when
 * op-sqlite cannot be opened.
 */
export function runStoreForThisBuild(): MarkStore {
  try {
    return productionRunStore();
  } catch (error) {
    console.warn(
      `run: op-sqlite could not be opened, the marks stay in memory for this session - ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return inMemoryMarkStore();
  }
}
