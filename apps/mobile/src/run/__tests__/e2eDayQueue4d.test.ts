/**
 * The mock day the E2E build answers with, and the run's own break window and
 * finish point (queue 4d, the trial's #12 and #14, ADR-022's app half).
 *
 * The audit's finding, the same shape as queue 4a's: the E2E day answered a
 * run without its `break_window` or `finish`, so the courier-facing break and
 * finish surfaces could never be proven on the emulator - the run's own
 * values were thrown away before any screen could read them. The mock run
 * now carries both, the way the server's own seeded day answers them, and
 * the app reads them the same way it reads a real one.
 */
import { e2eDay } from '../dayForThisBuild';

import { windowInRunZone } from '@/time/runZone';

/**
 * The break window the mock run carries, in the contract's own stamps.
 *
 * A11: the stamps are authored so the break READS 12:00 - 13:00 in the run's
 * zone (Pacific/Auckland), the way the founder's brief says the day is. The
 * QA inspector read "01:00 - 02:00" for it (step 05) because the stamps were
 * UTC wall-clock numbers, and the rows now render in the run's zone.
 */
const THE_BREAK = { start: '2026-10-30T23:00:00.000Z', end: '2026-10-31T00:00:00.000Z' };

describe("the mock day's break window and finish point (queue 4d)", () => {
  it('answers the break window the run carries', () => {
    const run = e2eDay();

    expect(run.run.break_window).toEqual(THE_BREAK);
  });

  it('reads the break window as the run planned it, in the run\u2019s own zone', () => {
    const run = e2eDay();
    const window = run.run.break_window;

    expect(windowInRunZone(window!.start, window!.end)).toBe('12:00 - 13:00');
  });

  it('answers the finish point as the depot, the way the seeded day does', () => {
    const run = e2eDay();

    expect(run.run.finish).toEqual(run.run.depot);
  });

  it('keeps the stops answering as the flows assert them', () => {
    const run = e2eDay();

    expect(run.stops.map((stop) => stop.id)).toEqual(['1', '2', '3', '4', '5']);
  });
});
