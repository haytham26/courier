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

/**
 * Queue 4c (the trial's #21, ADR-024): the mock list carries a pickup, so the
 * E2E day answers the stop's own type - the courier-facing surface is proven
 * on the emulator the same way queue 4a proved the priority, instead of the
 * type being thrown away before any screen could read it.
 */
/** The stop of the mock list the run itself calls a pickup. */
function thePickupStop() {
  return mockStops.find((stop) => stop.type === 'pickup');
}

describe("the mock day's stop types (queue 4c)", () => {
  it("answers the stop's own type for the stop the run calls a pickup", () => {
    const run = e2eDay();
    const pickup = thePickupStop();

    expect(pickup).toBeDefined();
    const answered = run.stops.find((stop) => stop.id === pickup?.id);
    expect(answered?.type).toBe('pickup');
  });

  it('answers delivery for the stops the run calls deliveries', () => {
    const run = e2eDay();
    const deliveries = mockStops.filter((stop) => stop.type === 'delivery');

    expect(deliveries.length).toBeGreaterThan(0);
    for (const stop of deliveries) {
      expect(run.stops.find((entry) => entry.id === stop.id)?.type).toBe('delivery');
    }
  });
});
