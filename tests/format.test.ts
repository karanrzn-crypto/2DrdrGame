/**
 * format.test.ts — Persian presentation helpers (pure).
 */
import { describe, it, expect } from 'vitest';
import { toFa, faMoney } from '../src/core/format';

describe('toFa', () => {
  it('converts Latin digits to Persian digits', () => {
    expect(toFa(123)).toBe('۱۲۳');
    expect(toFa(0)).toBe('۰');
    expect(toFa('07:30')).toBe('۰۷:۳۰');
  });

  it('preserves non-digit characters (letters, signs, separators)', () => {
    expect(toFa('a1b2')).toBe('a۱b۲');
    expect(toFa(-12)).toBe('-۱۲');
    expect(toFa(1.5)).toBe('۱.۵');
    expect(toFa('')).toBe('');
  });
});

describe('faMoney', () => {
  it('prefixes the dollar sign to Persian digits', () => {
    expect(faMoney(25)).toBe('$۲۵');
    expect(faMoney(0)).toBe('$۰');
  });
});
