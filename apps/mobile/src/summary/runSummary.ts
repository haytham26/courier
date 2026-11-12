/**
 * The end-of-day summary of the run the phone actually holds (A3).
 *
 * The QA inspector's step 28: the Summary screen answered "Finished at 2:31 pm,
 * Earned today $438.20, 206 delivered, 8 not home, 92 km, NZ Post $212.40,
 * Aramex $141.80, NZ Couriers $84.00" for a run of FIVE stops with two done.
 * Every one of those numbers was the reference mockup's own - the founder's
 * brief says the app invents nothing on a driver's screen (MASTER_EXECUTION
 * §13.2), and D60 says earnings are not in the trial at all.
 *
 * This module reads the run's own state and says "not tracked yet" for what
 * the phone does not track, rather than inventing a number:
 *
 *   - delivered / failed / skipped come from the run's own stops and marks;
 *   - the finish moment is the clock, in the run's own zone (A11);
 *   - earnings, the map-matched kilometres and the per-carrier split are D60:
 *     the runs API will carry them, and until then the screen says so.
 *
 * The week's bars stay with the reference's own shape for the DESIGN lab only;
 * a driver's screen shows what the phone knows about TODAY.
 */
import { clockSentenceInRunZone } from '@/time/runZone';

/** One carrier's line of the split: D60, not tracked in the trial. */
export interface CarrierLine {
  name: string;
  /** The amount in cents, so the formatting is never a string surgery. */
  cents: number;
}

/** One weekday's bar of the week. */
export interface DayBar {
  /** The weekday letter the reference spells (W, T, F, S, M, T, T). */
  letter: string;
  /** The bar's fraction of the tallest bar, 0 to 1. */
  fraction: number;
}

/** What a run's own end of day says. */
export interface RunSummary {
  /** When the day finished, the way a driver says it, in the run's zone. */
  finishedAt: string;
  /** The stops the run marked delivered on THIS phone. */
  delivered: number;
  /** The stops the run marked failed, with the reason the courier chose. */
  failed: number;
  /** The stops the run skipped. */
  skipped: number;
  /** The stops the run has still to do. */
  remaining: number;
  /**
   * Kilometres driven, map-matched.
   *
   * `null` until the runs API carries them (D60): the phone tracks no
   * distance today, and a screen that shows one would be inventing it.
   */
  drivenKm: number | null;
  /**
   * What the day earned, in cents.
   *
   * `null` because earnings are D60 - not in the trial, and never a number
   * the app makes up.
   */
  earnedCents: number | null;
  /** The per-carrier split: D60, so empty rather than invented. */
  readonly carriers: readonly CarrierLine[];
  /**
   * The week's bars, for the design lab. A driver's screen has no earlier days
   * on this phone, so the bars stay empty there and the screen says so.
   */
  readonly bars: readonly DayBar[];
}

/** One stop as the summary reads it: the run's own status is the fact. */
export interface SummarisedStop {
  id: string;
  status: string;
}

/** One delivery the run made, as the run state records it. */
export interface SummarisedMark {
  stopId: string;
}

/**
 * The end-of-day summary of the run the phone holds.
 *
 * The delivered count is the run's OWN marks (what this phone recorded, which
 * is also what the outbox owes the server), not the snapshot's statuses: a
 * stop the server called delivered before this phone saw it is not this
 * courier's work.
 */
export function summaryForRun(
  stops: readonly SummarisedStop[],
  marks: readonly SummarisedMark[],
  now: Date,
  options: { bars?: readonly DayBar[]; carriers?: readonly CarrierLine[] } = {},
): RunSummary {
  const marked = new Set(marks.map((mark) => mark.stopId));
  const delivered = stops.filter((stop) => marked.has(stop.id)).length;
  const failed = stops.filter((stop) => stop.status === 'failed').length;
  const skipped = stops.filter((stop) => stop.status === 'skipped').length;
  const done = delivered + failed + skipped;
  return {
    finishedAt: clockSentenceInRunZone(now),
    delivered,
    failed,
    skipped,
    remaining: Math.max(0, stops.length - done),
    drivenKm: null,
    earnedCents: null,
    carriers: options.carriers ?? [],
    bars: options.bars ?? [],
  };
}

/** Money the way a New Zealand driver reads it: a dollar sign and two decimals. */
export function formatMoney(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${dollars.toFixed(2)}`;
}

/** Kilometres with a unit, whole when they are whole. */
export function formatKm(km: number): string {
  return Number.isInteger(km) ? `${km} km` : `${km.toFixed(1)} km`;
}

/** The tallest bar of a week, so a week always fills its 70 pt band. */
export function barHeightFraction(bars: readonly DayBar[]): number {
  const tallest = bars.reduce((tallestSoFar, bar) => Math.max(tallestSoFar, bar.fraction), 0);
  return tallest > 0 ? tallest : 1;
}

/** What the screen says for a number the phone does not track (D60). */
export const NOT_TRACKED = 'Not tracked yet';

/** Whether a number the phone does not track is the honest answer for this run. */
export function trackedLabel(value: number | null, format: (value: number) => string): string {
  return value === null ? NOT_TRACKED : format(value);
}
