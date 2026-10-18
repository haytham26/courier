/**
 * NZ Address Parser
 * Ported from Python nz_address.py
 * Deterministic parsing with spoken fixes for Māori names
 */
import type { ParsedAddress } from './types';
/**
 * Apply spoken fixes to a string (exported for testing)
 */
export declare function applySpokenFixes(text: string): string;
/**
 * Main parse function
 * Parses a raw address string into a ParsedAddress
 */
export declare function parse(raw: string): ParsedAddress;
/**
 * Parse multiple addresses from a multi-line string
 */
export declare function parseMultiple(text: string): ParsedAddress[];
/**
 * Validate address against LINZ data (placeholder for pg_trgm integration)
 */
export declare function validateWithLinz(address: ParsedAddress): Promise<{
    valid: boolean;
    linz_address_id?: string;
    corrected?: ParsedAddress;
    confidence: number;
}>;
//# sourceMappingURL=parser.d.ts.map