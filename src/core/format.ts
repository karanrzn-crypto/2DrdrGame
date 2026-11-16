/**
 * format.ts — helpers for Persian text presentation (pure, no Phaser).
 * The game's user-facing language is Persian (design decision, Phase 0).
 */
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** Convert Latin digits inside a value to Persian digits. */
export function toFa(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** Format money as "$12" with Persian digits. */
export function faMoney(n: number): string {
  return '$' + toFa(n);
}
