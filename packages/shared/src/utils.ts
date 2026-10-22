/**
 * Shared utilities for Courier Copilot
 */

import type { ParsedAddress } from './types';

/**
 * Haversine distance between two points in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Generate a unique ID (client-side for offline-first)
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 30000, shouldRetry = () => true } = options;
  
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }
      
      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Parse NZ phone number to standard format
 */
export function parseNZPhone(phone: string): string | null {
  const cleaned = phone.replace(/\D/g, '');
  
  // NZ mobile: 02X XXX XXXX or +64 2X XXX XXXX
  if (cleaned.startsWith('642') && cleaned.length === 11) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('02') && cleaned.length === 10) {
    return `+64${cleaned.substring(1)}`;
  }
  
  // NZ landline: 0X XXX XXXX or +64 X XXX XXXX
  if (cleaned.startsWith('64') && cleaned.length >= 10 && cleaned.length <= 11) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('0') && cleaned.length >= 9 && cleaned.length <= 10) {
    return `+64${cleaned.substring(1)}`;
  }
  
  return null;
}

/**
 * Format NZ phone for display
 */
export function formatNZPhone(phone: string): string {
  const parsed = parseNZPhone(phone);
  if (!parsed) return phone;
  
  // +64 2X XXX XXXX or +64 X XXX XXXX
  const national = parsed.substring(3); // Remove +64
  if (national.startsWith('2')) {
    return `0${national.replace(/(\d{2})(\d{3})(\d{4})/, '$1 $2 $3')}`;
  }
  return `0${national.replace(/(\d)(\d{3})(\d{4})/, '$1 $2 $3')}`;
}

/**
 * Simple debounce
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };
}

/**
 * Simple throttle
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limitMs);
    }
  };
}

/**
 * Check if coordinates are within Canterbury bounds
 */
export function isInCanterbury(lat: number, lon: number): boolean {
  return (
    lat >= -44.5 &&
    lat <= -42.8 &&
    lon >= 170.5 &&
    lon <= 173.5
  );
}

/**
 * Normalize string for comparison (lowercase, trim, remove extra spaces)
 */
export function normalizeString(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Format address for display
 */
export function formatAddress(address: ParsedAddress): string {
  const parts = [];
  if (address.unit) parts.push(address.unit);
  parts.push(`${address.number} ${address.street}`);
  parts.push(address.suburb);
  if (address.city) parts.push(address.city);
  if (address.postcode) parts.push(address.postcode);
  return parts.join(', ');
}