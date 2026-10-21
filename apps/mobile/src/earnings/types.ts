/**
 * What the courier earned on a shift.
 *
 * The money is a string from end to end: the server sends "412.60" and the
 * app shows "$412.60". No float ever touches a wage.
 */

/** What one stop earned. */
export interface EarningsBreakdown {
  stop_id: string;
  amount: string;
  kind: string;
}

/** The money of one shift. */
export interface Earnings {
  currency: string;
  delivered: number;
  failed: number;
  skipped: number;
  gross: string;
  gst: string;
  net: string;
  rate: string;
  breakdown: EarningsBreakdown[];
}

/** A stop the courier could not deliver. */
export interface FailedStop {
  stop_id: string;
  kind: string;
  reason: string | null;
  occurred_at: string;
}

/** The end-of-day summary of one shift. */
export interface EarningsSummary {
  shift_id: string;
  date: string;
  currency: string;
  delivered: number;
  failed: number;
  skipped: number;
  gross: string;
  gst: string;
  net: string;
  average_delivery_seconds: number | null;
  success_rate: number;
  failed_stops: FailedStop[];
}

/**
 * What the screen shows.
 *
 * `isStale` says the value is the last one the app saw, not a fresh one: the
 * app says so instead of pretending the number is current.
 */
export interface EarningsResult<T> {
  value: T | null;
  isStale: boolean;
  /** When the value was last taken from the server (null when never). */
  updatedAt: string | null;
  /** The plain-English reason something went wrong, when it did. */
  error: string | null;
}
