/**
 * The sync service: the event log talks to the API when the phone has a
 * network.
 *
 * The order matters: the batch is only confirmed after the server has stored
 * it, so a dropped connection leaves the events in the log for the next try.
 * The server's answers are ADR-014's own, and two filed defects are closed
 * where this module touches them:
 *
 *   - **BUG-076**: a partial accept (`{accepted: 1}` for a two-event batch)
 *     confirms only what the server took; the refused ids come back to the
 *     caller, so the courier-facing conflict answer can be rendered.
 *   - **BUG-086**: a refusal (`422` for the whole batch, the offending events
 *     named) is not a network failure. The offending events are quarantined -
 *     kept, never re-offered - and the refusal is logged, instead of one
 *     catch swallowing every error class and re-offering the head forever.
 *
 * A network failure leaves the events in the log and answers how long the
 * caller must wait before trying again; the outbox (the transport's caller)
 * decides when that is.
 */
import { errorMessage } from '@/lib/errors';

import type { EventLog } from './eventLog';
import { DEFAULT_BATCH_SIZE } from './eventLog';
import type { DeliveryEvent, SyncResult, SyncTransport } from './types';

/** The wait between one attempt and the next: one second, doubled, capped. */
const BACKOFF_BASE_MS = 1000;

const BACKOFF_CEILING_MS = 60_000;

export interface SyncOutcome {
  sent: number;
  accepted: number;
  cursor: number;
  failed: boolean;
  /** The event ids the server refused (ADR-014 §1: a divergent replay). */
  conflicts: string[];
  /** The ids kept out of the send path by a refusal, preserved for review. */
  quarantined: string[];
  /** How long the caller must wait before trying again. */
  retryAfterMs: number;
}

/** A refusal the server answered with (ADR-014 §3: the whole batch, the offending events named). */
export class SyncRefusal extends Error {
  constructor(
    readonly eventIds: readonly string[],
    message: string,
  ) {
    super(message);
    this.name = 'SyncRefusal';
  }
}

/** How long a phone backs off, given the consecutive failures so far. */
export function retryBackoffMs(consecutiveFailures: number): number {
  if (consecutiveFailures <= 0) {
    return 0;
  }
  return Math.min(
    BACKOFF_BASE_MS * 2 ** (consecutiveFailures - 1),
    BACKOFF_CEILING_MS,
  );
}

export class SyncService {
  private failures = 0;

  constructor(
    private readonly log: EventLog,
    private readonly transport: SyncTransport,
    private readonly batchSize: number = DEFAULT_BATCH_SIZE,
  ) {}

  /**
   * Sends the waiting events, one batch at a time.
   *
   * A failure stops the run: the events stay in the log and the next call
   * picks them up again.
   */
  async sync(shiftId: string): Promise<SyncOutcome> {
    return this.log.window(async () => {
      const batch = await this.log.nextBatch(this.batchSize);
      if (batch.length === 0) {
        return this.answer({ sent: 0, accepted: 0, cursor: 0, failed: false });
      }

      let result: SyncResult;
      try {
        result = await this.transport.send(shiftId, batch);
      } catch (error) {
        return this.refused(batch, error);
      }

      // Only what the server took is confirmed: a refused event stays in the
      // log and its id comes back to the caller (BUG-076).
      const accepted = Math.min(Math.max(result.accepted, 0), batch.length);
      await this.log.confirm(batch.slice(0, accepted));
      this.failures = 0;
      return this.answer({
        sent: batch.length,
        accepted,
        cursor: result.cursor,
        failed: false,
        conflicts: result.conflicts,
      });
    });
  }

  /** Sends every waiting batch. Stops at the first failure. */
  async syncAll(shiftId: string): Promise<SyncOutcome[]> {
    const outcomes: SyncOutcome[] = [];
    for (;;) {
      const outcome = await this.sync(shiftId);
      outcomes.push(outcome);
      if (outcome.failed || outcome.sent === 0) {
        return outcomes;
      }
    }
  }

  /** A refusal is kept for the courier; a network failure is retried later. */
  private async refused(batch: DeliveryEvent[], error: unknown): Promise<SyncOutcome> {
    if (error instanceof SyncRefusal) {
      const offenders = batch.filter((event) => error.eventIds.includes(event.id));
      await this.log.quarantine(offenders);
      const ids = offenders.map((event) => event.id);
      console.warn(
        `sync: the API refused the batch and ${String(offenders.length)} of its events are kept for review` +
          `${ids.length === 0 ? '' : ` (${ids.join(', ')})`} - ${error.message}`,
      );
      return this.answer({
        sent: batch.length,
        accepted: 0,
        cursor: 0,
        failed: true,
        conflicts: [...error.eventIds],
        quarantined: ids,
      });
    }

    this.failures += 1;
    console.warn(
      `sync: the network failed, the ${String(batch.length)} events stay in the log - ${errorMessage(error)}`,
    );
    return this.answer({
      sent: 0,
      accepted: 0,
      cursor: 0,
      failed: true,
      retryAfterMs: retryBackoffMs(this.failures),
    });
  }

  private answer(outcome: {
    sent: number;
    accepted: number;
    cursor: number;
    failed: boolean;
    conflicts?: string[];
    quarantined?: string[];
    retryAfterMs?: number;
  }): SyncOutcome {
    return {
      sent: outcome.sent,
      accepted: outcome.accepted,
      cursor: outcome.cursor,
      failed: outcome.failed,
      conflicts: outcome.conflicts ?? [],
      quarantined: outcome.quarantined ?? [],
      retryAfterMs: outcome.retryAfterMs ?? 0,
    };
  }
}

export type { DeliveryEvent };
