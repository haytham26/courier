/**
 * The outbox's own retry (src/run/outboxRetry.ts).
 *
 * BUG-179: run 41578697363's a1 sync flow waited two minutes for the delivery
 * held offline to send when the network came back, and it never did - the
 * outbox only ever flushed after a mark, so with no further mark nothing asked
 * the wire to send. ADR-014 says the delivery leaves the phone when there is
 * signal; this is that retry: the phone asks the outbox on its own, on a
 * timer, while the session lives.
 */
import { startOutboxRetry } from '../outboxRetry';

describe("the outbox's own retry", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not call the wire before the day has been read (no shift yet)', async () => {
    const flush = jest.fn(() => Promise.resolve());
    const stop = startOutboxRetry({
      shiftOf: () => Promise.resolve(null),
      flush,
      everyMs: 15_000,
    });

    await jest.advanceTimersByTimeAsync(45_000);

    expect(flush).not.toHaveBeenCalled();
    stop();
  });

  it('asks the outbox to send while there is a shift, on the timer', async () => {
    const flush = jest.fn(() => Promise.resolve());
    const stop = startOutboxRetry({
      shiftOf: () => Promise.resolve('shift-1'),
      flush,
      everyMs: 15_000,
    });

    await jest.advanceTimersByTimeAsync(15_000);

    expect(flush).toHaveBeenCalledWith('shift-1');
    await jest.advanceTimersByTimeAsync(30_000);
    expect(flush).toHaveBeenCalledTimes(3);
    stop();
  });

  it('stops when the session releases it', async () => {
    const flush = jest.fn(() => Promise.resolve());
    const stop = startOutboxRetry({
      shiftOf: () => Promise.resolve('shift-1'),
      flush,
      everyMs: 15_000,
    });

    stop();
    await jest.advanceTimersByTimeAsync(60_000);

    expect(flush).not.toHaveBeenCalled();
  });

  // The timer must survive a failed ask: a refusal is the wire's answer, and
  // the next tick tries again rather than the loop dying.
  it('keeps ticking when a flush fails', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const flush = jest
        .fn()
        .mockRejectedValueOnce(new Error('no radio'))
        .mockResolvedValue(undefined);
      const stop = startOutboxRetry({
        shiftOf: () => Promise.resolve('shift-1'),
        flush,
        everyMs: 15_000,
      });

      await jest.advanceTimersByTimeAsync(45_000);

      expect(flush).toHaveBeenCalledTimes(3);
      expect(warn).toHaveBeenCalledWith('sync: the outbox could not send what it holds: no radio');
      stop();
    } finally {
      warn.mockRestore();
    }
  });
});
