/**
 * The drive's numbers.
 *
 * The driving screen is a glance surface, so every number it shows is
 * computed, tested here, and never invented. The real mock run pins the
 * same-stop contract: the stop the drive heads for is the stop Today's
 * sheet reads.
 */
import type { Stop } from '../stops';
import { mockStops } from '../stops';

import {
  DRIVE_ORIGIN,
  DRIVE_ORIGIN_LNGLAT,
  activeOf,
  formatDistance,
  haversineMeters,
  hourMinuteOf,
  nextOf,
  positionOf,
  streetLine,
} from '../drive';

describe('the distance between two places', () => {
  it('is one degree of latitude', () => {
    expect(haversineMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111195, -2);
  });

  it('is one degree of longitude at the equator', () => {
    expect(haversineMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(111195, -2);
  });

  it('is zero for the same place', () => {
    expect(haversineMeters(DRIVE_ORIGIN, DRIVE_ORIGIN)).toBe(0);
  });

  it('reads the same both ways', () => {
    const there = { lat: -43.518, lng: 172.625 };
    expect(haversineMeters(DRIVE_ORIGIN, there)).toBeCloseTo(haversineMeters(there, DRIVE_ORIGIN), 6);
  });
});

describe('the distance in words', () => {
  it('counts whole metres under a kilometre', () => {
    expect(formatDistance(0)).toBe('0 m');
    expect(formatDistance(120.4)).toBe('120 m');
    expect(formatDistance(999.9)).toBe('1000 m');
  });

  it('turns to kilometres at a kilometre', () => {
    expect(formatDistance(1000)).toBe('1.0 km');
    expect(formatDistance(1873.4)).toBe('1.9 km');
  });

  it('refuses to invent a number', () => {
    expect(formatDistance(Number.NaN)).toBe('—');
    expect(formatDistance(-5)).toBe('—');
  });
});

describe('the minute of a delivery', () => {
  it('reads the local clock at the mark, zero-padded, 24 hours', () => {
    // The local Date constructor pins the wall time whatever the machine's
    // zone is, so the read is deterministic everywhere.
    expect(hourMinuteOf(new Date(2026, 9, 23, 10, 43).getTime())).toBe('10:43');
    expect(hourMinuteOf(new Date(2026, 9, 23, 6, 5).getTime())).toBe('06:05');
    expect(hourMinuteOf(new Date(2026, 9, 23, 23, 59).getTime())).toBe('23:59');
  });

  it('refuses to invent a minute', () => {
    expect(hourMinuteOf(Number.NaN)).toBe('—');
    expect(hourMinuteOf(-1)).toBe('—');
  });
});

describe('the street line of an address', () => {
  it('drops the plain number', () => {
    expect(streetLine('45 Papanui Road')).toBe('Papanui Road');
  });

  it('drops the unit slash', () => {
    expect(streetLine('2/14 Riccarton Road')).toBe('Riccarton Road');
  });

  it('drops the lettered number', () => {
    expect(streetLine('14A Forfar Street')).toBe('Forfar Street');
  });

  it('drops the ranged number', () => {
    expect(streetLine('10-12 Blenheim Road')).toBe('Blenheim Road');
  });

  it('keeps a name with no number whole', () => {
    expect(streetLine('Waimakariri')).toBe('Waimakariri');
  });

  it('keeps a bare number whole', () => {
    expect(streetLine('214')).toBe('214');
  });
});

describe('the stop the drive heads for', () => {
  it('is the first one still on the run', () => {
    expect(activeOf(mockStops)?.address).toBe('45 Papanui Road');
  });

  it('moves on when the slide delivers', () => {
    expect(activeOf(mockStops, ['2'])?.address).toBe('120 Blenheim Road');
  });

  it('leaves delivered, skipped and failed statuses behind', () => {
    const done: Stop = { ...mockStops[0], status: 'delivered' };
    const skipped: Stop = { ...mockStops[1], status: 'skipped' };
    const failed: Stop = { ...mockStops[2], status: 'failed' };
    const kept: Stop = { ...mockStops[3], status: 'pending' };
    expect(activeOf([done, skipped, failed, kept])?.id).toBe(kept.id);
  });

  it('comes to an end', () => {
    expect(activeOf(mockStops, mockStops.map((stop) => stop.id))).toBeNull();
    expect(activeOf([])).toBeNull();
  });
});

describe('the stop after the one the drive is on', () => {
  it('follows the run order, past the delivered', () => {
    expect(nextOf(mockStops, 2)?.address).toBe('120 Blenheim Road');
  });

  it('is nothing past the last stop', () => {
    expect(nextOf(mockStops, 5)).toBeNull();
  });
});

describe('the pieces the screen glues', () => {
  it('positions a stop in degrees', () => {
    expect(positionOf(mockStops[1])).toEqual({ lat: -43.518, lng: 172.625 });
  });

  it("sits the origin on the map's home centre", () => {
    expect(DRIVE_ORIGIN).toEqual({ lat: -43.533, lng: 172.636 });
    expect(DRIVE_ORIGIN_LNGLAT).toEqual([172.636, -43.533]);
  });
});
