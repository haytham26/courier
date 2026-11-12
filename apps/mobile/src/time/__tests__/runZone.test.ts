/**
 * The run's own zone (A11, QA steps 05 and 28).
 *
 * The QA inspector read "22:00 - 00:00" and "23:30 - 02:00" for windows that
 * mean 09:00 - 11:00 and 10:30 - 13:00: the app rendered a UTC stamp on the
 * device's clock, and a Christchurch run is a Pacific/Auckland day whether
 * the phone is set there or not. The zone is pinned here, with the real
 * changeover dates, so the rule cannot drift with a device setting.
 */

import {
  RUN_ZONE,
  clockInRunZone,
  clockSentenceInRunZone,
  isRunZoneDaylight,
  runZoneOffsetMinutes,
  windowInRunZone,
} from '../runZone';

describe("the run's zone (Pacific/Auckland)", () => {
  it('is UTC+13 inside the southern summer and UTC+12 outside it', () => {
    // The 2026 summer: 02:00 NZST on the last Sunday of September 2026 is
    // 2026-09-26T14:00Z; 03:00 NZDT on the first Sunday of April 2027 is
    // 2027-04-03T14:00Z (the NZ rule, the Time Act 1974).
    expect(new Date('2026-09-26T13:59:00Z').getTime()).toBeLessThan(
      new Date('2026-09-26T14:00:00Z').getTime(),
    );
    expect(runZoneOffsetMinutes(new Date('2026-10-31T09:00:00Z'))).toBe(13 * 60);
    expect(runZoneOffsetMinutes(new Date('2026-01-15T09:00:00Z'))).toBe(13 * 60);
    expect(runZoneOffsetMinutes(new Date('2026-07-15T09:00:00Z'))).toBe(12 * 60);
    expect(isRunZoneDaylight(new Date('2026-09-26T13:59:59Z'))).toBe(false);
    expect(isRunZoneDaylight(new Date('2026-09-26T14:00:00Z'))).toBe(true);
    expect(isRunZoneDaylight(new Date('2027-04-03T13:59:59Z'))).toBe(true);
    expect(isRunZoneDaylight(new Date('2027-04-03T14:00:00Z'))).toBe(false);
  });

  it('reads the E2E day\'s windows as the courier meant them', () => {
    // The mock run's own morning window: authored so it reads 09:00 - 11:00.
    expect(windowInRunZone('2026-10-30T20:00:00.000Z', '2026-10-30T22:00:00.000Z')).toBe(
      '09:00 - 11:00',
    );
    // The second window: 10:30 - 13:00 the same day.
    expect(windowInRunZone('2026-10-30T21:30:00.000Z', '2026-11-01T00:00:00.000Z')).toBe(
      '10:30 - 13:00',
    );
  });

  it('does not read the device\'s clock', () => {
    // A UTC device reads the same run-zone time: the rule is the run\'s, not
    // the phone\'s (the QA inspector ran in Pacific/Auckland, but the CI AVDs
    // run in UTC and must see the same numbers).
    const tz = process.env.TZ;
    process.env.TZ = 'UTC';
    try {
      expect(clockInRunZone('2026-10-30T20:00:00.000Z')).toBe('09:00');
      process.env.TZ = 'America/New_York';
      expect(clockInRunZone('2026-10-30T20:00:00.000Z')).toBe('09:00');
    } finally {
      if (tz === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = tz;
      }
    }
  });

  it('reads the moment of a finished run as a sentence', () => {
    // 14:31 NZ on 2026-10-31 (the QA inspector's step 28 shape).
    expect(clockSentenceInRunZone(new Date('2026-10-31T01:31:00Z'))).toBe('2:31 pm');
    expect(clockSentenceInRunZone(new Date('2026-10-31T01:00:00Z'))).toBe('2:00 pm');
    expect(clockSentenceInRunZone(new Date('2026-10-31T13:05:00Z'))).toBe('2:05 am');
  });

  it('names its zone', () => {
    expect(RUN_ZONE).toBe('Pacific/Auckland');
  });
});
