/**
 * ADR-014's answers, in words the courier reads (A1 slice 3).
 *
 * The outbox's own answer carries three things a courier has to know: the
 * events the server refused (a divergent replay, ADR-014 §1), the ones it kept
 * out of the send path because it refused them (ADR-014 §3), and how long the
 * phone should wait before it asks again. None of that is the phone's private
 * business: a courier who is told "signed in, all good" while three deliveries
 * are quarantined is being lied to, and the lie is invisible until a customer
 * rings.
 *
 * This is the courier-facing half of the same answer: the outbox reports what
 * happened, and a screen that shows the run shows it too. The hook subscribes,
 * so a screen does not poll and there is no second copy of the truth.
 */
import { useEffect, useState } from 'react';

import type { SyncOutcome } from './syncService';

/** What a screen needs in order to tell the courier the truth. */
export interface SyncAnswers {
  /** The event ids the server refused: a delivery the phone holds and the server already has. */
  conflicts: string[];
  /** The ids kept out of the send path by a refusal, preserved for review. */
  quarantined: string[];
  /** Whether the last send answered without a network. */
  failed: boolean;
  /** How long the phone waits before it asks again. */
  retryAfterMs: number;
  /** The plain sentence the courier reads, or null when there is nothing to say. */
  message: string | null;
}

/** The sentence for a set of answers, or null when there is nothing worth saying. */
function sentence(answers: SyncAnswers): string | null {
  if (answers.quarantined.length > 0) {
    const count = answers.quarantined.length;
    const one = count === 1;
    return (
      `${String(count)} ${one ? 'delivery' : 'deliveries'} could not be sent and ` +
      `${one ? 'is' : 'are'} kept on this phone. The office can see ${one ? 'it' : 'them'} ` +
      `and will sort ${one ? 'it' : 'them'} out.`
    );
  }
  if (answers.conflicts.length > 0) {
    return `The server already has ${answers.conflicts.length === 1 ? 'one of these deliveries' : `${String(answers.conflicts.length)} of these deliveries`}, so ${answers.conflicts.length === 1 ? 'it was' : 'they were'} not sent twice.`;
  }
  if (answers.failed) {
    return 'There was no signal, so the delivery waits on this phone and sends when the network comes back.';
  }
  return null;
}

/** The answers of one outbox report, in the shape a screen reads. */
function read(outcome: SyncOutcome): SyncAnswers {
  return {
    conflicts: outcome.conflicts,
    quarantined: outcome.quarantined,
    failed: outcome.failed,
    retryAfterMs: outcome.retryAfterMs,
    message: sentence({
      conflicts: outcome.conflicts,
      quarantined: outcome.quarantined,
      failed: outcome.failed,
      retryAfterMs: outcome.retryAfterMs,
      message: null,
    }),
  };
}

/** Nothing to say yet: the empty answers a screen shows before the first send. */
export const NO_ANSWERS: SyncAnswers = {
  conflicts: [],
  quarantined: [],
  failed: false,
  retryAfterMs: 0,
  message: null,
};

/**
 * The one outbox's answers, and the screens that read them.
 *
 * There is one outbox per session (the construction site's), so this holds one
 * set of answers; a screen that mounts after the last report still reads it,
 * because the answers outlive the screen that showed them.
 */
let current: SyncAnswers = NO_ANSWERS;
const listeners = new Set<(answers: SyncAnswers) => void>();

/** The outbox reports what the server answered. */
export function reportSyncAnswers(outcome: SyncOutcome): void {
  current = read(outcome);
  for (const listener of listeners) {
    listener(current);
  }
}

/** The answers as they stand (for a test, or a screen that reads outside React). */
export function syncAnswersNow(): SyncAnswers {
  return current;
}

/** The answers as they change, so a screen shows what the courier must know. */
export function useSyncAnswers(): SyncAnswers {
  const [answers, setAnswers] = useState<SyncAnswers>(current);

  useEffect(() => {
    listeners.add(setAnswers);
    setAnswers(current);
    return () => {
      listeners.delete(setAnswers);
    };
  }, []);

  return answers;
}

/** The answers start clean when a session ends (the outbox's answers are its own). */
export function resetSyncAnswers(): void {
  current = NO_ANSWERS;
  for (const listener of listeners) {
    listener(current);
  }
}
