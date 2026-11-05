/**
 * The mock day the E2E build answers with, and the run's own facts (queue 4.2).
 *
 * The audit's finding: the E2E day hardcoded `priority: false` for every stop,
 * so a courier-facing priority surface could never be proven on the emulator -
 * the run's own value was thrown away before any screen could read it. The
 * day's own stops carry the run's own priority and the run's own time window,
 * and the app reads them the same way it reads a real one.
 */
import { e2eDay } from '../dayForThisBuild';
import { mockStops } from '@/maps/stops';

/** The stop of the mock list that the run itself calls a priority stop. */
function thePriorityStop() {
  return mockStops.find((stop) => stop.priority === true);
}

/** The stop of the mock list that the run itself gives a time window. */
function theWindowStop() {
  return mockStops.find((stop) => stop.window !== undefined);
}

describe("the mock day's own facts (queue 4a)", () => {
  it('answers the run\u2019s own priority for the stop the run calls a priority one', () => {
    const run = e2eDay();
    const priorityStop = thePriorityStop();

    // The mock list carries a priority stop, so the day answers one: the
    // surface the courier reads is the surface the run owns.
    expect(priorityStop).toBeDefined();
    const answered = run.stops.find((stop) => stop.id === priorityStop?.id);
    expect(answered?.priority).toBe(true);
  });

  it('answers the run\u2019s own time window in the contract\u2019s own fields', () => {
    const run = e2eDay();
    const windowStop = theWindowStop();

    expect(windowStop).toBeDefined();
    const answered = run.stops.find((stop) => stop.id === windowStop?.id);
    // The contract's own names, in ISO: the server answers them this way and
    // the app reads them this way.
    expect(answered?.window_start).toBe(windowStop?.window?.start);
    expect(answered?.window_end).toBe(windowStop?.window?.end);
  });

  it('leaves a stop the run gave no window without one', () => {
    const run = e2eDay();
    const plainer = mockStops.find((stop) => stop.window === undefined);

    expect(plainer).toBeDefined();
    const answered = run.stops.find((stop) => stop.id === plainer?.id);
    expect(answered?.window_start).toBeUndefined();
    expect(answered?.window_end).toBeUndefined();
  });
});
