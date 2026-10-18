/**
 * NZ Address Parser
 * Ported from Python nz_address.py
 * Deterministic parsing with spoken fixes for Māori names
 */
import { SPOKEN_FIXES, NUMBER_WORDS, UNIT_INDICATORS, STREET_SUFFIXES, CANTERBURY_SUBURBS, NZ_CITIES, NZ_REGIONS, POSTCODE_PREFIXES } from './constants';
/**
 * Normalize input text for parsing
 */
function normalizeInput(text) {
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
function wordsToNumber(words) {
    // First check if it's a compound number like "forty two"
    const joined = words.join(' ');
    const compoundNumbers = {
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
        }
        else if (/^\d+$/.test(word)) {
            result += word;
        }
        else {
            // Not a number word, stop
            break;
        }
    }
    return result;
}
/**
 * Apply spoken fixes to a string (exported for testing)
 */
export function applySpokenFixes(text) {
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
function toTitleCase(str) {
    return str
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}
/**
 * Parse street part (before comma or before suburb)
 * Returns { unit, number, suffix, streetName, streetType, remainingTokens }
 */
function parseStreetPart(tokens) {
    let remaining = [...tokens];
    // Extract unit from beginning
    let unit;
    if (remaining.length > 0) {
        // Check for "X/Y" format (e.g., "2/14" - unit 2, number 14)
        if (remaining[0].includes('/')) {
            const parts = remaining[0].split('/');
            if (parts.length === 2 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
                unit = parts[0];
                // The second part is the street number
                remaining[0] = parts[1];
            }
        }
        // Check for "unit X" pattern
        else if (remaining[0] === 'unit' && remaining.length > 1) {
            unit = remaining[1];
            remaining = remaining.slice(2);
        }
    }
    // Find the LAST street type suffix (search from end)
    let streetTypeIndex = -1;
    let streetType = '';
    for (let i = remaining.length - 1; i >= 0; i--) {
        const suffix = STREET_SUFFIXES[remaining[i]];
        if (suffix) {
            streetTypeIndex = i;
            streetType = suffix;
            break;
        }
    }
    let streetName = '';
    let number = '';
    let suffix;
    let afterStreetTokens = [];
    if (streetTypeIndex >= 0) {
        // Tokens before street type = number + street name
        const beforeStreetType = remaining.slice(0, streetTypeIndex);
        afterStreetTokens = remaining.slice(streetTypeIndex + 1);
        // Extract number and suffix from beginning of beforeStreetType
        if (beforeStreetType.length > 0) {
            const firstToken = beforeStreetType[0];
            // Pattern: digits followed by optional letter (e.g., "42B", "14a")
            const match = firstToken.match(/^(\d+)([a-z])?$/);
            if (match) {
                number = match[1] ?? '';
                suffix = match[2];
                const streetNameTokens = beforeStreetType.slice(1);
                streetName = streetNameTokens.join(' ');
            }
            else {
                // Pattern: number words - collect consecutive number words/digits
                const numberWords = [];
                let i = 0;
                while (i < beforeStreetType.length && (NUMBER_WORDS[beforeStreetType[i]] !== undefined || /^\d+$/.test(beforeStreetType[i]))) {
                    numberWords.push(beforeStreetType[i]);
                    i++;
                }
                if (numberWords.length > 0) {
                    number = wordsToNumber(numberWords);
                    // Check if next token is a single letter (suffix)
                    if (i < beforeStreetType.length && /^[a-z]$/.test(beforeStreetType[i])) {
                        suffix = beforeStreetType[i];
                        i++;
                    }
                    const streetNameTokens = beforeStreetType.slice(i);
                    streetName = streetNameTokens.join(' ');
                }
                else {
                    // No number found, all tokens are street name
                    streetName = beforeStreetType.join(' ');
                }
            }
        }
    }
    else {
        // No recognized street type - try to extract number from beginning
        if (remaining.length > 0) {
            const firstToken = remaining[0];
            const match = firstToken.match(/^(\d+)([a-z])?$/);
            if (match) {
                number = match[1] ?? '';
                suffix = match[2];
                const streetNameTokens = remaining.slice(1);
                streetName = streetNameTokens.join(' ');
                afterStreetTokens = [];
            }
            else {
                // Try number words
                const numberWords = [];
                let i = 0;
                while (i < remaining.length && (NUMBER_WORDS[remaining[i]] !== undefined || /^\d+$/.test(remaining[i]))) {
                    numberWords.push(remaining[i]);
                    i++;
                }
                if (numberWords.length > 0) {
                    number = wordsToNumber(numberWords);
                    if (i < remaining.length && /^[a-z]$/.test(remaining[i])) {
                        suffix = remaining[i];
                        i++;
                    }
                    const streetNameTokens = remaining.slice(i);
                    streetName = streetNameTokens.join(' ');
                    afterStreetTokens = [];
                }
                else {
                    // No number, all tokens are street name (will be resolved as suburb later)
                    streetName = remaining.join(' ');
                    afterStreetTokens = [];
                }
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
function findSuburb(text) {
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
export function parse(raw) {
    const normalized = normalizeInput(raw);
    const withFixes = applySpokenFixes(normalized);
    const tokens = withFixes.split(' ').filter(t => t.length > 0);
    // Check for comma-separated format
    const commaIndex = raw.indexOf(',');
    let streetTokens = tokens;
    let suburbTokens = [];
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
    let city;
    let region;
    if (NZ_CITIES.some(c => c.toLowerCase() === suburb.toLowerCase())) {
        city = suburb;
    }
    else {
        city = 'Christchurch'; // Default for Canterbury
        region = 'Canterbury';
    }
    // Calculate overall confidence
    const hasNumber = number.length > 0;
    const hasStreet = street.length > 0;
    const hasSuburb = suburb.length > 0;
    let confidence = 0;
    if (hasNumber)
        confidence += 0.3;
    if (hasStreet)
        confidence += 0.4;
    if (hasSuburb)
        confidence += 0.3 * suburbConfidence;
    const complete = hasNumber && hasStreet && hasSuburb;
    const result = {
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
export function parseMultiple(text) {
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(parse);
}
/**
 * Validate address against LINZ data (placeholder for pg_trgm integration)
 */
export async function validateWithLinz(address) {
    // TODO: Integrate with PostgreSQL pg_trgm fuzzy matching
    // This would query the LINZ address database
    return {
        valid: address.complete,
        confidence: address.confidence,
    };
}
//# sourceMappingURL=parser.js.map