/**
 * The end-of-day summary of a run (screen 10, `10-summary.html`).
 *
 * The reference's numbers are the founder's mock day: the earned amount, the
 * seven bars, the three counts and the per-carrier split. They are named as a
 * mock here on purpose - the app invents nothing on a driver's screen
 * (MASTER_EXECUTION §13.2). The real day arrives with the runs API (ADR-010, the
 * backend squad) through the sync layer, and the wiring replaces this module's
 * source, not the screen: by then the runs API's own numbers (the delivered
 * count, the POD events, the map-matched kilometres) are the honest ones.
 *
 * The bars are a week, oldest first, as fractions of the tallest: the screen
 * draws them with the accent and the reference's quiet 22 percent, so the
 * tallest bar is always full height and the week always reads at a glance.
 */

/** One carrier's line of the split. */
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

/** The summary of one finished day. */
export interface DaySummary {
  /** When the day finished, the way a driver says it. */
  finishedAt: string;
  /** What the day earned, in cents. */
  earnedCents: number;
  bars: readonly DayBar[];
  /** Stops delivered. */
  delivered: number;
  /** Stops where nobody was home. */
  notHome: number;
  /** Kilometres driven, map-matched; one decimal when it is not a whole number. */
  drivenKm: number;
  carriers: readonly CarrierLine[];
}

/**
 * The reference's mock day. Every field is the founder's number from
 * `10-summary.html`; the source of the real day is the runs API (above).
 */
export const REFERENCE_DAY: DaySummary = {
  finishedAt: '2:31 pm',
  earnedCents: 43820,
  bars: [
    { letter: 'W', fraction: 21 / 70 },
    { letter: 'T', fraction: 36 / 70 },
    { letter: 'F', fraction: 31 / 70 },
    { letter: 'S', fraction: 49 / 70 },
    { letter: 'M', fraction: 43 / 70 },
    { letter: 'T', fraction: 56 / 70 },
    { letter: 'T', fraction: 41 / 70 },
  ],
  delivered: 206,
  notHome: 8,
  drivenKm: 92,
  carriers: [
    { name: 'NZ Post', cents: 21240 },
    { name: 'Aramex', cents: 14180 },
    { name: 'NZ Couriers', cents: 8400 },
  ],
};

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
