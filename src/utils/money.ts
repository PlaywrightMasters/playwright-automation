/** Parses UI prices such as "$1,234.50" into a number. */
export function parsePrice(text: string): number {
  const cleaned = text.replace(/[^0-9.-]/g, '');
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) {
    throw new Error(`Cannot parse a price from "${text}"`);
  }
  return value;
}

/** Rounds to cents to compare currency values without float noise. */
export function toCents(value: number): number {
  return Math.round(value * 100);
}

export function isSortedAscending(values: readonly number[]): boolean {
  return values.every((value, i) => i === 0 || values[i - 1]! <= value);
}

export function isSortedDescending(values: readonly number[]): boolean {
  return values.every((value, i) => i === 0 || values[i - 1]! >= value);
}
