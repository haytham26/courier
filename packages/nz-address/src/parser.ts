/**
 * NZ Address Parser
 * Ported from Python nz_address.py
 * Deterministic parsing with spoken fixes for Māori names
 */

import type { ParsedAddress } from './types';
import {
  SPOKEN_FIXES,
  NUMBER_WORDS,
  STREET_SUFFIXES,
  CANTERBURY_SUBURBS,
  NZ_CITIES,
} from './constants';

/**
 * Normalize input text for parsing
 */
function normalizeInput(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[,.]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Convert number words to digits
 * Handles both word sequences like "one four two" -> "142" and compound like "forty two" -> "42"
 */
function wordsToNumber(words: string[]): string {
  // First check if it's a compound number like "forty two"
  const joined = words.join(' ');
  const compoundNumbers: Record<string, number> = {
    'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
    'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
  };
  
  // Check for compound numbers (e.g., "forty two", "twenty one")
  for (const [word, value] of Object.entries(compoundNumbers)) {
    if (joined.startsWith(word + ' ')) {
      const rest = joined.substring(word.length + 1);
      const restNum = wordsToNumber(rest.split(' '));
      return (value + parseInt(restNum || '0', 10)).toString();
    }
  }
  
  // Handle simple digit concatenation: "one four two" -> "142"
  let result = '';
  for (const word of words) {
    const num = NUMBER_WORDS[word];
    if (num !== undefined) {
      result += num;
    } else if (/^\d+$/.test(word)) {
      result += word;
    } else {
      // Not a number word, stop
      break;
    }
  }
  
  return result;
}

/**
 * Apply spoken fixes to a string (exported for testing)
 */
export function applySpokenFixes(text: string): string {
  let result = text;
  for (const [spoken, correct] of Object.entries(SPOKEN_FIXES)) {
    const regex = new RegExp(`\\b${spoken}\\b`, 'gi');
    result = result.replace(regex, correct);
  }
  return result;
}

/**
 * Capitalize first letter of each word (Title Case)
 */
function toTitleCase(str: string): string {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Parse street part (before comma or before suburb)
 * Returns { unit, number, suffix, streetName, streetType, remainingTokens }
 */
function parseStreetPart(tokens: string[]): {
  unit: string | undefined;
  number: string;
  suffix: string | undefined;
  streetName: string;
  streetType: string;
  remainingTokens: string[];
} {
  let remaining = [...tokens];
  
  // Extract unit from beginning
  let unit: string | undefined;
  if (remaining.length > 0) {
    const firstToken = remaining[0];
    if (firstToken) {
      // Check for "X/Y" format (e.g., "2/14" - unit 2, number 14)
      if (firstToken.includes('/')) {
        const parts = firstToken.split('/');
        const part0 = parts[0];
        const part1 = parts[1];
        if (parts.length === 2 && part0 && part1 && /^\d+$/.test(part0) && /^\d+$/.test(part1)) {
          unit = part0;
          // The second part is the street number
          remaining[0] = part1;
        }
      }
      // Check for "unit X" pattern
      else if (firstToken === 'unit' && remaining.length > 1) {
        const unitToken = remaining[1];
        if (unitToken) {
          unit = unitToken;
        }
        remaining = remaining.slice(2);
      }
    }
  }
  
  // Find the LAST street type suffix (search from end)
  let streetTypeIndex = -1;
  let streetType = '';
  for (let i = remaining.length - 1; i >= 0; i--) {
    const token = remaining[i];
    if (!token) continue;
    const suffix = STREET_SUFFIXES[token];
    if (suffix) {
      streetTypeIndex = i;
      streetType = suffix;
      break;
    }
  }
  
  let streetName = '';
  let number = '';
  let suffix: string | undefined;
  let afterStreetTokens: string[] = [];
  
  if (streetTypeIndex >= 0) {
    // Tokens before street type = number + street name
    const beforeStreetType = remaining.slice(0, streetTypeIndex);
    afterStreetTokens = remaining.slice(streetTypeIndex + 1);
    
    // Extract number and suffix from beginning of beforeStreetType
    if (beforeStreetType.length > 0) {
      const firstToken = beforeStreetType[0];
      if (firstToken) {
        // Pattern: digits followed by optional letter (e.g., "42B", "14a")
        const match = firstToken.match(/^(\d+)([a-z])?$/);
        if (match && match[1]) {
          number = match[1];
          suffix = match[2];
          const streetNameTokens = beforeStreetType.slice(1);
          streetName = streetNameTokens.join(' ');
        } else {
          // Pattern: number words - collect consecutive number words/digits
          const numberWords: string[] = [];
          let i = 0;
          while (i < beforeStreetType.length) {
            const token = beforeStreetType[i];
            if (!token) break;
            if (NUMBER_WORDS[token] !== undefined || /^\d+$/.test(token)) {
              numberWords.push(token);
              i++;
            } else {
              break;
            }
          }
          
          if (numberWords.length > 0) {
            number = wordsToNumber(numberWords);
            // Check if next token is a single letter (suffix)
            const nextToken = beforeStreetType[i];
            if (nextToken && /^[a-z]$/.test(nextToken)) {
              suffix = nextToken;
              i++;
            }
            const streetNameTokens = beforeStreetType.slice(i);
            streetName = streetNameTokens.join(' ');
          } else {
            // No number found, all tokens are street name
            streetName = beforeStreetType.join(' ');
          }
        }
      } else {
        streetName = '';
      }
    }
  } else {
    // No recognized street type - try to extract number from beginning
    if (remaining.length > 0) {
      const firstToken = remaining[0];
      if (firstToken) {
        const match = firstToken.match(/^(\d+)([a-z])?$/);
        if (match && match[1]) {
          number = match[1];
          suffix = match[2];
          const streetNameTokens = remaining.slice(1);
          streetName = streetNameTokens.join(' ');
          afterStreetTokens = [];
        } else {
          // Try number words
          const numberWords: string[] = [];
          let i = 0;
          while (i < remaining.length) {
            const token = remaining[i];
            if (!token) break;
            if (NUMBER_WORDS[token] !== undefined || /^\d+$/.test(token)) {
              numberWords.push(token);
              i++;
            } else {
              break;
            }
          }
          
          if (numberWords.length > 0) {
            number = wordsToNumber(numberWords);
            const nextToken = remaining[i];
            if (nextToken && /^[a-z]$/.test(nextToken)) {
              suffix = nextToken;
              i++;
            }
            const streetNameTokens = remaining.slice(i);
            streetName = streetNameTokens.join(' ');
            afterStreetTokens = [];
          } else {
            // No number, all tokens are street name (will be resolved as suburb later)
            streetName = remaining.join(' ');
            afterStreetTokens = [];
          }
        }
      } else {
        streetName = '';
        afterStreetTokens = [];
      }
    }
  }
  
  return {
    unit,
    number,
    suffix,
    streetName: toTitleCase(streetName),
    streetType,
    remainingTokens: afterStreetTokens,
  };
}

/**
 * Find best matching suburb from text
 */
function findSuburb(text: string): { suburb: string; confidence: number } {
  const normalized = text.toLowerCase().trim();
  
  if (!normalized) {
    return { suburb: '', confidence: 0 };
  }
  
  // Try exact matches first (longest first for better matching)
  const sortedSuburbs = [...CANTERBURY_SUBURBS].sort((a, b) => b.length - a.length);
  for (const suburb of sortedSuburbs) {
    if (normalized.includes(suburb.toLowerCase())) {
      return { suburb, confidence: 1.0 };
    }
  }
  
  // Try spoken fixes (values are already correct spellings)
  for (const correct of Object.values(SPOKEN_FIXES)) {
    if (normalized.includes(correct.toLowerCase())) {
      return { suburb: correct, confidence: 0.9 };
    }
  }
  
  // Try NZ cities
  for (const city of NZ_CITIES) {
    if (normalized.includes(city.toLowerCase())) {
      return { suburb: city, confidence: 0.8 };
    }
  }
  
  // Fallback: use the text as suburb
  const suburb = normalized.replace(/\b\w/g, c => c.toUpperCase());
  return { suburb, confidence: 0.3 };
}

/**
 * Main parse function
 * Parses a raw address string into a ParsedAddress
 */
export function parse(raw: string): ParsedAddress {
  const normalized = normalizeInput(raw);
  const withFixes = applySpokenFixes(normalized);
  const tokens = withFixes.split(' ').filter(t => t.length > 0);
  
  // Check for comma-separated format
  const commaIndex = raw.indexOf(',');
  let streetTokens = tokens;
  let suburbTokens: string[] = [];
  
  if (commaIndex >= 0) {
    // Split by comma - normalize both parts separately
    const beforeComma = raw.substring(0, commaIndex);
    const afterComma = raw.substring(commaIndex + 1);
    
    const beforeNormalized = normalizeInput(beforeComma);
    const afterNormalized = normalizeInput(afterComma);
    
    const beforeWithFixes = applySpokenFixes(beforeNormalized);
    const afterWithFixes = applySpokenFixes(afterNormalized);
    
    streetTokens = beforeWithFixes.split(' ').filter(t => t.length > 0);
    suburbTokens = afterWithFixes.split(' ').filter(t => t.length > 0);
  }
  
  // Parse street part
  const { unit, number, suffix, streetName, streetType, remainingTokens } = parseStreetPart(streetTokens);
  
  // Combine remaining street tokens with suburb tokens for suburb parsing
  const allSuburbTokens = [...remainingTokens, ...suburbTokens];
  const suburbText = allSuburbTokens.join(' ');
  
  // Parse suburb
  const { suburb, confidence: suburbConfidence } = findSuburb(suburbText);
  
  // Build street
  const streetParts = [streetName, streetType].filter(Boolean);
  if (suffix) {
    streetParts.push(suffix.toUpperCase());
  }
  const street = streetParts.join(' ');
  
  // Determine city/region from suburb
  let city: string | undefined;
  let region: string | undefined;
  
  if (NZ_CITIES.some(c => c.toLowerCase() === suburb.toLowerCase())) {
    city = suburb;
  } else {
    city = 'Christchurch'; // Default for Canterbury
    region = 'Canterbury';
  }
  
  // Calculate overall confidence
  const hasNumber = number.length > 0;
  const hasStreet = street.length > 0;
  const hasSuburb = suburb.length > 0;
  
  let confidence = 0;
  if (hasNumber) confidence += 0.3;
  if (hasStreet) confidence += 0.4;
  if (hasSuburb) confidence += 0.3 * suburbConfidence;
  
  const complete = hasNumber && hasStreet && hasSuburb;
  
  const result: ParsedAddress = {
    unit,
    number,
    street,
    suburb,
    city,
    region,
    complete,
    confidence,
    raw,
  };
  
  return result;
}

/**
 * Parse multiple addresses from a multi-line string
 */
export function parseMultiple(text: string): ParsedAddress[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(parse);
}

/**
 * Validate address against LINZ data (placeholder for pg_trgm integration)
 */
export function validateWithLinz(address: ParsedAddress): {
  valid: boolean;
  linz_address_id?: string;
  corrected?: ParsedAddress;
  confidence: number;
} {
  // TODO: Integrate with PostgreSQL pg_trgm fuzzy matching
  // This would query the LINZ address database
  return {
    valid: address.complete,
    confidence: address.confidence,
  };
}