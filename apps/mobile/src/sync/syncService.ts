/**
 * The sync service: the event log talks to the API when the phone has a
 * network.
 *
 * The order matters: the batch is only confirmed after the server has stored
 * it, so a dropped connection leaves the events in the log for the next try.
 */
import { EventLog, DEFAULT_BATCH_SIZE } from './eventLog';
import type { DeliveryEvent, SyncResult, SyncTransport } from './types';

export interface SyncOutcome {
  sent: number;
  accepted: number;
  cursor: number;
  failed: boolean;
}

export class SyncService {
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
    const batch = await this.log.nextBatch(this.batchSize);
    if (batch.length === 0) {
      return { sent: 0, accepted: 0, cursor: 0, failed: false };
    }
    let result: SyncResult;
    try {
      result = await this.transport.send(shiftId, batch);
    } catch {
      return { sent: 0, accepted: 0, cursor: 0, failed: true };
    }
    await this.log.confirm(batch);
    return {
      sent: batch.length,
      accepted: result.accepted,
      cursor: result.cursor,
      failed: false,
    };
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
}

export type { DeliveryEvent };
