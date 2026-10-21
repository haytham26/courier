/**
 * The money.
 *
 * Every amount arrives from the server as a string ("412.60") and leaves the
 * app as a string. The app never turns money into a float: a float cannot
 * hold a cent exactly, and a courier's pay is not allowed to drift.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  NZD: '$',
  AUD: '$',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

const AMOUNT = /^-?\d+(\.\d+)?$/;

interface ParsedAmount {
  negative: boolean;
  whole: string;
  fraction: string;
}

function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * The amount as its three parts, or null when it is not an amount at all.
 *
 * Nothing here is turned into a number: the digits stay digits.
 */
function parseAmount(amount: string): ParsedAmount | null {
  const trimmed = amount.trim();
  if (!AMOUNT.test(trimmed)) {
    return null;
  }
  const negative = trimmed.startsWith('-');
  const parts = (negative ? trimmed.slice(1) : trimmed).split('.');
  const whole = (parts[0] ?? '').replace(/\D/g, '') || '0';
  const fraction = (parts[1] ?? '').replace(/\D/g, '').padEnd(2, '0');
  return { negative, whole, fraction };
}

/**
 * The amount on its own: "1,234.50".
 *
 * An amount the app does not understand is shown exactly as the server sent
 * it, never as a number the app made up.
 */
export function formatAmount(amount: string): string {
  const parsed = parseAmount(amount);
  if (parsed === null) {
    return amount.trim();
  }
  const sign = parsed.negative ? '-' : '';
  return `${sign}${groupDigits(parsed.whole)}.${parsed.fraction}`;
}

/** The amount with its currency: "$1,234.50". */
export function formatMoney(amount: string, currency = 'NZD'): string {
  const parsed = parseAmount(amount);
  if (parsed === null) {
    return amount.trim();
  }
  const code = currency.trim().toUpperCase();
  const symbol = CURRENCY_SYMBOLS[code];
  const sign = parsed.negative ? '-' : '';
  const formatted = `${groupDigits(parsed.whole)}.${parsed.fraction}`;
  return symbol !== undefined ? `${sign}${symbol}${formatted}` : `${sign}${code} ${formatted}`;
}

/** The share of deliveries that worked: 0.9318 becomes "93%". */
export function formatPercent(rate: number): string {
  if (!Number.isFinite(rate)) {
    return 'Not known yet';
  }
  return `${Math.round(rate * 100)}%`;
}

/** The time one delivery takes: 214 becomes "3 min 34 s". */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) {
    return 'Not measured yet';
  }
  const whole = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  if (minutes === 0) {
    return `${rest} s`;
  }
  return `${minutes} min ${rest} s`;
}
