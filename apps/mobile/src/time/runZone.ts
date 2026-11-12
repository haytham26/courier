/**
 * The run's own zone (A11, the QA report's step 05).
 *
 * A Christchurch courier's day is a Pacific/Auckland day. The phone in the
 * van may be in any zone - the QA inspector ran the app in Pacific/Auckland,
 * but a phone set to UTC or to another zone must show the RUN's times, not the
 * device's: the QA inspector read "22:00 - 00:00" for a window that means
 * 09:00 - 11:00 because the device's clock was used with a UTC stamp, and the
 * founder's brief names the run's zone explicitly.
 *
 * The offset is computed, not read from `Intl`: Hermes' `Intl` is not
 * available in every build of this app, and a zone rule is two lines of
 * arithmetic that a test can pin against the real changeover dates. New
 * Zealand daylight saving runs from 02:00 NZST on the LAST Sunday of
 * September to 03:00 NZDT on the FIRST Sunday of April (the Time Act 1974,
 * as the current rule stands).
 */

/** The run's zone, named for the logs and for the tests. */
export const RUN_ZONE = 'Pacific/Auckland';

/** Standard time: UTC+12. */
const STANDARD_OFFSET_MINUTES = 12 * 60;
/** Daylight time: UTC+13. */
const DAYLIGHT_OFFSET_MINUTES = 13 * 60;

/** The FIRST Sunday of a month, as a UTC-date anchor. */
function firstSundayOf(year: number, month: number): Date {
  // month is 0-based; day 0 of Date.UTC is the month before its 1st.
  const first = new Date(Date.UTC(year, month, 1));
  return new Date(Date.UTC(year, month, 1 + ((7 - first.getUTCDay()) % 7)));
}

/** The LAST Sunday of a month, as a UTC-date anchor. */
function lastSundayOf(year: number, month: number): Date {
  // Day 0 of next month is this month's last day.
  const last = new Date(Date.UTC(year, month + 1, 0));
  return new Date(Date.UTC(year, month, last.getUTCDate() - last.getUTCDay()));
}

/**
 * The last Sunday of September's 02:00 NZST, as the UTC instant it begins.
 *
 * The wall clock is 02:00 and the zone is UTC+12, so the instant is the
 * previous UTC day at 14:00: Date.UTC builds the wall clock as if it were
 * UTC, and the offset is taken back off it.
 */
function daylightStartUtc(year: number): number {
  const last = lastSundayOf(year, 8); // the last Sunday of September
  return Date.UTC(last.getUTCFullYear(), 8, last.getUTCDate(), 2, 0) -
    STANDARD_OFFSET_MINUTES * 60 * 1000;
}

/** The first Sunday of April's 03:00 NZDT, as the UTC instant it ends. */
function daylightEndUtc(year: number): number {
  const first = firstSundayOf(year, 3); // the first Sunday of April
  return Date.UTC(first.getUTCFullYear(), 3, first.getUTCDate(), 3, 0) -
    DAYLIGHT_OFFSET_MINUTES * 60 * 1000;
}

/**
 * Whether the instant is inside New Zealand daylight time.
 *
 * The southern summer spans a new year, so the year of the JANUARY side of a
 * summer is the year the rule reads: January 2027 is inside the summer that
 * began in September 2026.
 */
export function isRunZoneDaylight(at: Date): boolean {
  const instant = at.getTime();
  const janYear = at.getUTCFullYear();
  const summerStart = daylightStartUtc(janYear - 1);
  const summerEnd = daylightEndUtc(janYear);
  if (instant >= summerStart && instant < summerEnd) {
    return true;
  }
  const lateSummerStart = daylightStartUtc(janYear);
  const lateSummerEnd = daylightEndUtc(janYear + 1);
  return instant >= lateSummerStart && instant < lateSummerEnd;
}

/** The run zone's offset from UTC, in minutes, at that instant. */
export function runZoneOffsetMinutes(at: Date): number {
  return isRunZoneDaylight(at) ? DAYLIGHT_OFFSET_MINUTES : STANDARD_OFFSET_MINUTES;
}

/** The instant as the run zone's own wall-clock fields. */
export function runZoneParts(at: Date): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  weekday: string;
} {
  const shifted = new Date(at.getTime() + runZoneOffsetMinutes(at) * 60 * 1000);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
    weekday: weekdays[shifted.getUTCDay()],
  };
}

/** One moment the run stamped, as the courier reads it in the run's zone. */
export function clockInRunZone(stamp: string | number | Date): string {
  const at = stamp instanceof Date ? stamp : new Date(stamp);
  if (Number.isNaN(at.getTime())) {
    return typeof stamp === 'string' ? stamp : '';
  }
  const parts = runZoneParts(at);
  return `${String(parts.hours).padStart(2, '0')}:${String(parts.minutes).padStart(2, '0')}`;
}

/** A window the run stamped, as the courier reads it: "09:00 - 11:00". */
export function windowInRunZone(start: string, end: string): string {
  return `${clockInRunZone(start)} - ${clockInRunZone(end)}`;
}

/**
 * The moment as a sentence the run's own day ends at: "2:31 pm".
 *
 * The QA inspector's step 28 read "Finished at 2:31 pm" for a run that was
 * still going at 1:27 pm - the reference day's own string. The run's own
 * finish is the clock, read in the run's zone.
 */
export function clockSentenceInRunZone(at: Date): string {
  const parts = runZoneParts(at);
  const hour12 = parts.hours % 12 === 0 ? 12 : parts.hours % 12;
  const suffix = parts.hours < 12 ? 'am' : 'pm';
  return `${hour12}:${String(parts.minutes).padStart(2, '0')} ${suffix}`;
}
