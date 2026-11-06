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

/** The break window the mock run carries, in the contract's own stamps. */
const THE_BREAK = { start: '2026-10-31T12:00:00.000Z', end: '2026-10-31T13:00:00.000Z' };

describe("the mock day's break window and finish point (queue 4d)", () => {
  it('answers the break window the run carries', () => {
    const run = e2eDay();

    expect(run.run.break_window).toEqual(THE_BREAK);
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
