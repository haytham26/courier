/**
 * Shared utilities for Courier Copilot
 */
import { ParsedAddress } from './types';
/**
 * Haversine distance between two points in meters
 */
export declare function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
/**
 * Format distance for display
 */
export declare function formatDistance(meters: number): string;
/**
 * Format duration for display
 */
export declare function formatDuration(seconds: number): string;
/**
 * Generate a unique ID (client-side for offline-first)
 */
export declare function generateId(): string;
/**
 * Deep clone an object
 */
export declare function deepClone<T>(obj: T): T;
/**
 * Sleep utility for async operations
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Retry with exponential backoff
 */
export declare function retryWithBackoff<T>(fn: () => Promise<T>, options?: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (error: unknown) => boolean;
}): Promise<T>;
/**
 * Parse NZ phone number to standard format
 */
export declare function parseNZPhone(phone: string): string | null;
/**
 * Format NZ phone for display
 */
export declare function formatNZPhone(phone: string): string;
/**
 * Simple debounce
 */
export declare function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delayMs: number): (...args: Parameters<T>) => void;
/**
 * Simple throttle
 */
export declare function throttle<T extends (...args: unknown[]) => unknown>(fn: T, limitMs: number): (...args: Parameters<T>) => void;
/**
 * Check if coordinates are within Canterbury bounds
 */
export declare function isInCanterbury(lat: number, lon: number): boolean;
/**
 * Normalize string for comparison (lowercase, trim, remove extra spaces)
 */
export declare function normalizeString(str: string): string;
/**
 * Format address for display
 */
export declare function formatAddress(address: ParsedAddress): string;
//# sourceMappingURL=utils.d.ts.map