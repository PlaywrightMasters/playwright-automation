import { test, expect } from '@playwright/test';
import { isSortedAscending, isSortedDescending, parsePrice, toCents } from '../../src/utils/money';

test.describe('money helpers', { tag: '@unit' }, () => {
  test('parses UI prices', () => {
    expect(parsePrice('$14.15')).toBe(14.15);
    expect(parsePrice(' $1,234.50 ')).toBe(1234.5);
  });

  test('rejects text without a number', () => {
    expect(() => parsePrice('Out of stock')).toThrow('Cannot parse a price');
  });

  test('compares in cents to avoid float noise', () => {
    expect(toCents(0.1 + 0.2)).toBe(toCents(0.3));
    expect(toCents(14.15 * 3)).toBe(4245);
  });

  test('detects sort order', () => {
    expect(isSortedAscending([1, 2, 2, 3])).toBe(true);
    expect(isSortedAscending([2, 1])).toBe(false);
    expect(isSortedDescending([3, 3, 1])).toBe(true);
  });
});
