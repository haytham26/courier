/**
 * Tests for shared utilities
 */

import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  formatDistance,
  formatDuration,
  generateId,
  deepClone,
  parseNZPhone,
  formatNZPhone,
  isInCanterbury,
  normalizeString,
  formatAddress,
} from '../utils';

describe('haversineDistance', () => {
  it('calculates distance between two points', () => {
    // Christchurch Cathedral to Cathedral Square (approximately 0m)
    const dist = haversineDistance(-43.531, 172.636, -43.531, 172.636);
    expect(dist).toBeLessThan(1);
  });
  
  it('calculates known distance', () => {
    // Approximate distance from Cathedral Square to Riccarton Mall ~2.8km
    const dist = haversineDistance(-43.531, 172.636, -43.538, 172.603);
    expect(dist).toBeGreaterThan(2500);
    expect(dist).toBeLessThan(3500);
  });
});

describe('formatDistance', () => {
  it('formats meters', () => {
    expect(formatDistance(50)).toBe('50m');
    expect(formatDistance(999)).toBe('999m');
  });
  
  it('formats kilometers', () => {
    expect(formatDistance(1000)).toBe('1.0km');
    expect(formatDistance(1500)).toBe('1.5km');
    expect(formatDistance(10000)).toBe('10.0km');
  });
});

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(30)).toBe('30s');
    expect(formatDuration(59)).toBe('59s');
  });
  
  it('formats minutes', () => {
    expect(formatDuration(60)).toBe('1m');
    expect(formatDuration(125)).toBe('2m');
    expect(formatDuration(3599)).toBe('59m');
  });
  
  it('formats hours', () => {
    expect(formatDuration(3600)).toBe('1h');
    expect(formatDuration(5400)).toBe('1h 30m');
    expect(formatDuration(7200)).toBe('2h');
  });
});

describe('generateId', () => {
  it('generates unique ids', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });
  
  it('generates ids with expected format', () => {
    const id = generateId();
    expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
  });
});

describe('deepClone', () => {
  it('clones objects deeply', () => {
    const original = { a: 1, b: { c: 2 } };
    const cloned = deepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.b).not.toBe(original.b);
  });
  
  it('handles arrays', () => {
    const original = [1, [2, 3], { a: 4 }];
    const cloned = deepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned[1]).not.toBe(original[1]);
  });
});

describe('parseNZPhone', () => {
  it('parses mobile numbers', () => {
    expect(parseNZPhone('021 123 4567')).toBe('+64211234567');
    expect(parseNZPhone('+64 21 123 4567')).toBe('+64211234567');
    expect(parseNZPhone('0211234567')).toBe('+64211234567');
  });
  
  it('parses landline numbers', () => {
    expect(parseNZPhone('03 123 4567')).toBe('+6431234567');
    expect(parseNZPhone('+64 3 123 4567')).toBe('+6431234567');
    expect(parseNZPhone('031234567')).toBe('+6431234567');
  });
  
  it('returns null for invalid', () => {
    expect(parseNZPhone('123')).toBeNull();
    expect(parseNZPhone('')).toBeNull();
    expect(parseNZPhone('abc')).toBeNull();
  });
});

describe('formatNZPhone', () => {
  it('formats mobile', () => {
    expect(formatNZPhone('+64211234567')).toBe('021 123 4567');
  });
  
  it('formats landline', () => {
    expect(formatNZPhone('+6431234567')).toBe('03 123 4567');
  });
  
  it('returns original for invalid', () => {
    expect(formatNZPhone('invalid')).toBe('invalid');
  });
});

describe('isInCanterbury', () => {
  it('returns true for Christchurch', () => {
    expect(isInCanterbury(-43.531, 172.636)).toBe(true);
  });
  
  it('returns true for Ashburton', () => {
    expect(isInCanterbury(-43.9, 171.75)).toBe(true);
  });
  
  it('returns true for Timaru', () => {
    expect(isInCanterbury(-44.4, 171.25)).toBe(true);
  });
  
  it('returns false for Auckland', () => {
    expect(isInCanterbury(-36.85, 174.76)).toBe(false);
  });
  
  it('returns false for Wellington', () => {
    expect(isInCanterbury(-41.29, 174.78)).toBe(false);
  });
});

describe('normalizeString', () => {
  it('lowercases and trims', () => {
    expect(normalizeString('  HELLO WORLD  ')).toBe('hello world');
  });
  
  it('collapses multiple spaces', () => {
    expect(normalizeString('hello    world')).toBe('hello world');
  });
});

describe('formatAddress', () => {
  it('formats complete address', () => {
    const addr = {
      unit: 'B',
      number: '42',
      street: 'Main North Rd',
      suburb: 'Papanui',
      city: 'Christchurch',
      postcode: '8053',
      complete: true,
      confidence: 1,
      raw: '42B Main North Rd, Papanui',
    };
    expect(formatAddress(addr)).toBe('B, 42 Main North Rd, Papanui, Christchurch, 8053');
  });
  
  it('formats without unit', () => {
    const addr = {
      number: '14',
      street: 'Harewood Rd',
      suburb: 'Bishopdale',
      complete: true,
      confidence: 1,
      raw: '14 Harewood Rd',
    };
    expect(formatAddress(addr)).toBe('14 Harewood Rd, Bishopdale');
  });
});