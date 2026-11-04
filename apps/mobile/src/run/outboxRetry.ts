/**
 * The outbox's own retry (BUG-179).
 *
 * Run 41578697363's a1 sync flow waited two minutes for the delivery held
 * while there was no network to send once the signal came back, and it never
 * did: the outbox was only ever asked to flush after a mark, so with no
 * further mark nothing asked the wire for anything. ADR-014 says the delivery
 * leaves the phone when there is signal - this is that promise kept on a
 * timer: while the session lives, the phone asks the outbox to send what it
 * holds, and a shift it cannot read (no day yet) simply waits for the next
 * tick.
 *
 * The tick never throws: a refusal or a dead network is the wire's answer, and
 * the next tick tries again. It is started by the app's construction site and
 * stopped with the session, so a phone at rest does not carry a timer.
 */
import { errorMessage } from '@/lib/errors';

/** What the retry needs to know, in one object. */
export interface OutboxRetryDeps {
  /** The shift to send for, or null while the day has not been read. */
  shiftOf: () => Promise<string | null>;
  /** Asks the outbox to send everything it holds for one shift. */
  flush: (shiftId: string) => Promise<void>;
  /** How often the phone asks. */
  everyMs: number;
}

/** Starts the retry; the answer stops it (the session's `release`). */
export function startOutboxRetry(deps: OutboxRetryDeps): () => void {
  let stopped = false;
  const tick = () => {
    void (async () => {
      try {
        const shift = await deps.shiftOf();
        if (stopped || shift === null) {
          return;
        }
        await deps.flush(shift);
      } catch (error) {
        console.warn(`sync: the outbox could not send what it holds: ${errorMessage(error)}`);
      }
    })();
  };
  const handle = setInterval(tick, deps.everyMs);
  return () => {
    stopped = true;
    clearInterval(handle);
  };
}
