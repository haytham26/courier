/**
 * The end-of-day summary reads the run the phone holds (A3, QA step 28).
 *
 * The QA inspector's step 28: the Summary screen showed the reference mockup's
 * own numbers - $438.20 earned, 206 delivered, 92 km, and the three carriers'
 * split - for a run of five stops with two done. The founder's brief is that
 * the app invents nothing on a driver's screen, and D60 says earnings are not
 * in the trial, so this suite pins what the summary really answers.
 */

import { NOT_TRACKED, summaryForRun, trackedLabel } from '../runSummary';

/** Five stops, the shape of the run the QA inspector walked. */
const FIVE_STOPS = [
  { id: '1', status: 'pending' },
  { id: '2', status: 'delivered' },
  { id: '3', status: 'pending' },
  { id: '4', status: 'failed' },
  { id: '5', status: 'pending' },
];

describe("the end-of-day summary of the run the phone holds (A3)", () => {
  it('counts the deliveries THIS phone recorded, not the reference day', () => {
    const summary = summaryForRun(FIVE_STOPS, [{ stopId: '2' }], new Date('2026-10-31T01:31:00Z'));

    // One delivery and one failure were made minutes before the restart; the
    // run's own stops say the same, and the summary says the same.
    expect(summary.delivered).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.skipped).toBe(0);
    expect(summary.remaining).toBe(3);
  });

  it('answers "not tracked yet" for the money and the kilometres (D60)', () => {
    const summary = summaryForRun(FIVE_STOPS, [{ stopId: '2' }], new Date('2026-10-31T01:31:00Z'));

    // The QA inspector's $438.20, 92 km and the three carriers were the
    // reference's numbers. Earnings are D60: not in the trial, so the screen
    // says so instead of showing a number the phone never earned.
    expect(summary.earnedCents).toBeNull();
    expect(summary.drivenKm).toBeNull();
    expect(summary.carriers).toEqual([]);
    expect(trackedLabel(summary.earnedCents, (cents) => `$${(cents / 100).toFixed(2)}`)).toBe(
      NOT_TRACKED,
    );
    expect(trackedLabel(summary.drivenKm, (km) => `${km} km`)).toBe(NOT_TRACKED);
  });

  it("finishes at the run's own moment, in the run's zone", () => {
    // The QA inspector's step 28 read "2:31 pm" for a run that was still going
    // at 1:27 pm. The finish is the clock, read in the run's zone.
    const summary = summaryForRun(FIVE_STOPS, [], new Date('2026-10-31T01:31:00Z'));

    expect(summary.finishedAt).toBe('2:31 pm');
  });

  it('shows no week bars for a day with no earlier days on this phone', () => {
    const summary = summaryForRun(FIVE_STOPS, [], new Date('2026-10-31T01:31:00Z'));

    expect(summary.bars).toEqual([]);
  });

  it('carries the design lab\'s own week when the lab asks for it', () => {
    const bars = [{ letter: 'W', fraction: 21 / 70 }];
    const summary = summaryForRun(FIVE_STOPS, [], new Date('2026-10-31T01:31:00Z'), { bars });

    expect(summary.bars).toEqual(bars);
  });

  it('says nothing happened for an empty run, rather than a number', () => {
    const summary = summaryForRun([], [], new Date('2026-10-31T01:31:00Z'));

    expect(summary.delivered).toBe(0);
    expect(summary.failed).toBe(0);
    expect(summary.remaining).toBe(0);
    expect(summary.earnedCents).toBeNull();
  });
});
