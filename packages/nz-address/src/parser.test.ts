/**
 * Tests for NZ Address parser
 */

import { describe, it, expect } from 'vitest';
import { parse, parseMultiple, applySpokenFixes } from './parser';
import { SPOKEN_FIXES } from './constants';

describe('applySpokenFixes', () => {
  it('applies Riccarton fixes', () => {
    expect(applySpokenFixes('rick a ton')).toBe('Riccarton');
    expect(applySpokenFixes('rickerton')).toBe('Riccarton');
    expect(applySpokenFixes('42 rick a ton road')).toBe('42 Riccarton road');
  });
  
  it('applies Papanui fixes', () => {
    expect(applySpokenFixes('papa newey')).toBe('Papanui');
    expect(applySpokenFixes('pap a new e')).toBe('Papanui');
  });
  
  it('applies Mairehau fixes', () => {
    expect(applySpokenFixes('my ree howe')).toBe('Mairehau');
    expect(applySpokenFixes('why my ree')).toBe('Waimairi');
  });
  
  it('handles case insensitivity', () => {
    expect(applySpokenFixes('RICK A TON')).toBe('Riccarton');
    expect(applySpokenFixes('RiCkErToN')).toBe('Riccarton');
  });
});

describe('parse', () => {
  it('parses standard address with unit', () => {
    const result = parse('2/14 Harewood Rd, Bishopdale');
    expect(result.unit).toBe('2');
    expect(result.number).toBe('14');
    expect(result.street).toBe('Harewood Rd');
    expect(result.suburb).toBe('Bishopdale');
    expect(result.complete).toBe(true);
  });
  
  it('parses address with suffix', () => {
    const result = parse('42B Main North Rd, Papanui');
    expect(result.unit).toBeUndefined();
    expect(result.number).toBe('42');
    expect(result.street).toContain('Main North Rd');
    expect(result.street).toContain('B');
    expect(result.suburb).toBe('Papanui');
    expect(result.complete).toBe(true);
  });
  
  it('parses spoken address with number words', () => {
    const result = parse('forty two B main north road papa newey');
    expect(result.number).toBe('42');
    expect(result.street).toContain('Main North Rd');
    expect(result.suburb).toBe('Papanui');
    expect(result.complete).toBe(true);
  });
  
  it('parses one four two as 142', () => {
    const result = parse('one four two Riccarton road rick a ton');
    expect(result.number).toBe('142');
    expect(result.street).toContain('Riccarton Rd');
    expect(result.complete).toBe(true);
  });
  
  it('handles incomplete address', () => {
    const result = parse('Smith Street');
    expect(result.complete).toBe(false);
    expect(result.confidence).toBeLessThan(0.7);
  });
  
  it('parses with street type variations', () => {
    const result = parse('100 High Street, Christchurch');
    expect(result.street).toBe('High St');
    expect(result.complete).toBe(true);
  });
  
  it('parses avenue', () => {
    const result = parse('50 Memorial Avenue, Burnside');
    expect(result.street).toBe('Memorial Ave');
    expect(result.suburb).toBe('Burnside');
  });
  
  it('parses drive', () => {
    const result = parse('25 Waimairi Drive, Waimairi');
    expect(result.street).toBe('Waimairi Dr');
    expect(result.suburb).toBe('Waimairi');
  });
  
  it('preserves raw input', () => {
    const raw = '42B Main North Rd, Papanui';
    const result = parse(raw);
    expect(result.raw).toBe(raw);
  });
  
  it('assigns city and region for Canterbury', () => {
    const result = parse('42 Main North Rd, Papanui');
    expect(result.city).toBe('Christchurch');
    expect(result.region).toBe('Canterbury');
  });
});

describe('parseMultiple', () => {
  it('parses multiple lines', () => {
    const input = `42 Main North Rd, Papanui
14 Harewood Rd, Bishopdale
2/100 High St, Central`;
    
    const results = parseMultiple(input);
    expect(results).toHaveLength(3);
    expect(results[0]?.suburb).toBe('Papanui');
    expect(results[1]?.suburb).toBe('Bishopdale');
    expect(results[2]?.unit).toBe('2');
  });
  
  it('skips empty lines', () => {
    const input = `42 Main North Rd, Papanui

14 Harewood Rd, Bishopdale`;
    const results = parseMultiple(input);
    expect(results).toHaveLength(2);
  });
});

describe('SPOKEN_FIXES coverage', () => {
  it('covers key Christchurch suburbs', () => {
    const keySuburbs = [
      'Riccarton', 'Papanui', 'Waimairi', 'Mairehau', 'Shirley',
      'Addington', 'Hoon Hay', 'Sockburn', 'Fendalton', 'Ilam',
      'Riccarton', 'Hornby', 'Bishopdale', 'Burnside', 'Avonhead',
    ];
    
    for (const suburb of keySuburbs) {
      const hasFix = Object.values(SPOKEN_FIXES).includes(suburb);
      expect(hasFix).toBe(true);
    }
  });
});