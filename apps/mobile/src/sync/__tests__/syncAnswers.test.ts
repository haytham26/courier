/**
 * ADR-014's answers, in words the courier reads (A1 slice 3).
 *
 * The outbox's own answer carries three things a courier has to know: the
 * events the server refused (a divergent replay, §1), the ones it kept out of
 * the send path (§3), and how long the phone waits before it asks again. A
 * courier shown "all good" while three deliveries are quarantined is being
 * lied to, so these tests assert the words, not the plumbing.
 *
 * The words are the app's own, in plain New Zealand English: the plural of
 * "delivery" is "deliveries" (the first draft of this sentence said
 * "deliverys", and this test is what caught it).
 */
import { act, renderHook } from '@testing-library/react-native';

import {
  NO_ANSWERS,
  reportSyncAnswers,
  resetSyncAnswers,
  syncAnswersNow,
  useSyncAnswers,
} from '../syncAnswers';
import type { SyncOutcome } from '../syncService';

/** One outbox answer, in the service's own shape. */
function outcome(overrides: Partial<SyncOutcome> = {}): SyncOutcome {
  return {
    sent: 0,
    accepted: 0,
    cursor: 0,
    failed: false,
    conflicts: [],
    quarantined: [],
    retryAfterMs: 0,
    ...overrides,
  };
}

describe("ADR-014's answers, in the courier's own words (A1 slice 3)", () => {
  beforeEach(() => {
    resetSyncAnswers();
  });

  it('says nothing after a clean send, because there is nothing to say', () => {
    reportSyncAnswers(outcome({ sent: 2, accepted: 2 }));

    expect(syncAnswersNow().message).toBeNull();
  });

  it('names one refused delivery, in the singular the sentence reads', () => {
    reportSyncAnswers(
      outcome({ sent: 1, accepted: 0, failed: true, conflicts: ['delivered-1'], quarantined: ['delivered-1'] }),
    );

    const answers = syncAnswersNow();
    expect(answers.conflicts).toEqual(['delivered-1']);
    expect(answers.quarantined).toEqual(['delivered-1']);
    expect(answers.message).toBe(
      '1 delivery could not be sent and is kept on this phone. The office can see it and will sort it out.',
    );
  });

  it('counts the refused deliveries in the plural, not "deliverys"', () => {
    reportSyncAnswers(
      outcome({ sent: 3, accepted: 0, failed: true, conflicts: ['a', 'b'], quarantined: ['a', 'b'] }),
    );

    expect(syncAnswersNow().message).toBe(
      '2 deliveries could not be sent and are kept on this phone. The office can see them and will sort them out.',
    );
  });

  it('names a divergent replay as the server already having the delivery (ADR-014 1)', () => {
    reportSyncAnswers(outcome({ sent: 2, accepted: 1, conflicts: ['delivered-2'] }));

    expect(syncAnswersNow().message).toBe(
      'The server already has one of these deliveries, so it was not sent twice.',
    );
  });

  it('says a delivery with no signal waits on the phone and sends later', () => {
    reportSyncAnswers(outcome({ sent: 1, accepted: 0, failed: true, retryAfterMs: 1000 }));

    const answers = syncAnswersNow();
    expect(answers.message).toBe(
      'There was no signal, so the delivery waits on this phone and sends when the network comes back.',
    );
    expect(answers.retryAfterMs).toBe(1000);
  });

  it('is read by a screen that mounts after the report happened', () => {
    reportSyncAnswers(outcome({ sent: 1, failed: true, conflicts: ['x'], quarantined: ['x'] }));

    const { result } = renderHook(() => useSyncAnswers());

    expect(result.current).toEqual(syncAnswersNow());
    expect(result.current.message).toMatch(/could not be sent/);
  });

  it('tells a mounted screen when the answers change, and stops on unmount', () => {
    const { result, unmount } = renderHook(() => useSyncAnswers());
    expect(result.current).toEqual(NO_ANSWERS);

    act(() => {
      reportSyncAnswers(outcome({ sent: 1, failed: true, conflicts: ['y'], quarantined: ['y'] }));
    });
    expect(result.current.quarantined).toEqual(['y']);

    unmount();
    // The unmounted screen is not written to, and nothing throws.
    act(() => {
      reportSyncAnswers(outcome({ sent: 1, failed: true }));
    });
    expect(result.current.quarantined).toEqual(['y']);
  });

  it('starts a new session with nothing to say', () => {
    reportSyncAnswers(outcome({ sent: 1, failed: true, quarantined: ['z'] }));
    resetSyncAnswers();

    expect(syncAnswersNow()).toEqual(NO_ANSWERS);
  });
});
