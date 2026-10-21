/**
 * The money.
 *
 * The amounts come from the server as strings and stay strings: a courier's
 * pay is never a float, and an amount the app does not understand is never
 * turned into a number the app made up.
 */
import { formatAmount, formatDuration, formatMoney, formatPercent } from '../money';

describe('the money', () => {
  it('shows the amount with the dollars sign', () => {
    expect(formatMoney('412.60', 'NZD')).toBe('$412.60');
  });

  it('groups the thousands so the number can be read at a glance', () => {
    expect(formatMoney('1234.50', 'NZD')).toBe('$1,234.50');
    expect(formatMoney('1234567.05', 'NZD')).toBe('$1,234,567.05');
  });

  it('shows two decimals even when the server sent one', () => {
    expect(formatAmount('4.5')).toBe('4.50');
    expect(formatAmount('4')).toBe('4.00');
  });

  it('keeps the sign of a negative amount in front of the dollars', () => {
    expect(formatMoney('-12.00', 'NZD')).toBe('-$12.00');
  });

  it('never makes up a number it does not understand', () => {
    expect(formatAmount('n/a')).toBe('n/a');
    expect(formatMoney('n/a', 'NZD')).toBe('n/a');
    expect(formatMoney('', 'NZD')).toBe('');
  });

  it('uses the currency code when there is no sign for it', () => {
    expect(formatMoney('10.00', 'JPY')).toBe('JPY 10.00');
  });

  it('shows the share of deliveries that worked', () => {
    expect(formatPercent(0.9318)).toBe('93%');
    expect(formatPercent(1)).toBe('100%');
    expect(formatPercent(0)).toBe('0%');
  });

  it('shows how long a delivery takes', () => {
    expect(formatDuration(214)).toBe('3 min 34 s');
    expect(formatDuration(45)).toBe('45 s');
    expect(formatDuration(null)).toBe('Not measured yet');
  });
});
