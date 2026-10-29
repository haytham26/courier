/**
 * The app's construction site for the run store.
 *
 * The audit's interlock is that the store and the sync layer ship into their
 * first production caller here: the root layout opens the phone's own
 * databases, builds the slice-1 client with the session's token, and hands
 * one store to the run state above the screens. Nothing else in the app opens
 * an op-sqlite handle of the run's tables, and nothing else talks to the API.
 *
 * The store is opened synchronously (op-sqlite's `open` is), and its schema
 * statements are issued on the first use; a phone whose encrypted database
 * cannot be opened answers with the in-memory store instead of crashing on
 * the drive screen.
 */
import { CourierApiClient } from '@/lib/api-client';

import { EventLog } from '@/sync/eventLog';
import { OpSqliteEventStore } from '@/sync/opSqliteEventStore';

import { inMemoryMarkStore } from './inMemoryMarkStore';
import { OpSqliteRunCache } from './opSqliteRunCache';
import { RunStore, seedReasonForBuild } from './runStore';
import type { MarkStore } from './types';

/** The one run store of this build, over the app's own databases. */
export function productionRunStore(): RunStore {
  const eventStore = OpSqliteEventStore.open();
  const events = new EventLog(eventStore);
  const cache = OpSqliteRunCache.open();
  return new RunStore({
    client: new CourierApiClient(),
    cache,
    events,
    reason: seedReasonForBuild(process.env.EXPO_PUBLIC_E2E),
    release: async () => {
      await eventStore.close();
    },
  });
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
