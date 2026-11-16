/**
 * visiblecheck.test.ts — the pure visible-output verdict used after the
 * World scene starts (src/boot/VisibleCheck.visibleOutputDead +
 * hexToRgb). The DOM-touching sampler (countVisiblePixels) is verified in
 * a real browser: docs/TESTING.md, boot matrix v3.
 */
import { describe, expect, it } from 'vitest';
import {
  visibleOutputDead,
  hexToRgb,
  rectInViewport,
  VISIBLE_CHECK,
  type SampleResult,
} from '../src/boot/VisibleCheck';

const TOTAL = VISIBLE_CHECK.SAMPLE_W * VISIBLE_CHECK.SAMPLE_H;

const ok = (visible: number): SampleResult => ({
  visible,
  total: TOTAL,
  ratio: visible / TOTAL,
  status: 'ok',
  detail: 'visible ' + visible + '/' + TOTAL,
});

const skipped = (why = 'sampler unavailable'): SampleResult => ({
  visible: 0,
  total: 0,
  ratio: 0,
  status: 'skipped',
  detail: why,
});

describe('hexToRgb', () => {
  it('parses the game clear color #14100b', () => {
    expect(hexToRgb('#14100b')).toEqual({ r: 20, g: 16, b: 11 });
  });

  it('accepts uppercase and whitespace, rejects malformed input safely', () => {
    expect(hexToRgb(' #14100B ')).toEqual({ r: 20, g: 16, b: 11 });
    expect(hexToRgb('14100b')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#xyz')).toEqual({ r: 0, g: 0, b: 0 });
  });
});

describe('visibleOutputDead — dead pipeline (the field bug #6 signature)', () => {
  it('every sample equals the clear color → dead', () => {
    const v = visibleOutputDead([ok(0), ok(0), ok(2)]);
    expect(v.dead).toBe(true);
  });

  it('a single healthy sample among dead ones → alive', () => {
    expect(visibleOutputDead([ok(0), ok(Math.floor(TOTAL / 2))]).dead).toBe(false);
  });

  it('exactly at the threshold → alive (>= MIN_VISIBLE_RATIO)', () => {
    expect(visibleOutputDead([ok(Math.ceil(TOTAL * VISIBLE_CHECK.MIN_VISIBLE_RATIO))]).dead)
      .toBe(false);
  });

  it('just below the threshold → dead', () => {
    expect(visibleOutputDead([ok(Math.floor(TOTAL * VISIBLE_CHECK.MIN_VISIBLE_RATIO) - 1)]).dead)
      .toBe(true);
  });
});

describe('visibleOutputDead — fail-open policy (never kill a healthy boot)', () => {
  it('sampler could not run at all → alive (watchdog covers hangs)', () => {
    const v = visibleOutputDead([skipped(), skipped(), skipped()]);
    expect(v.dead).toBe(false);
    expect(v.detail).toContain('no usable samples');
  });

  it('no samples yet → alive', () => {
    expect(visibleOutputDead([]).dead).toBe(false);
  });

  it('skipped samples do not mask a dead verdict', () => {
    const v = visibleOutputDead([skipped(), ok(0), ok(1)]);
    expect(v.dead).toBe(true);
    expect(v.detail).toContain('sampler unavailable');
  });
});

describe('rectInViewport — field bug #7 (canvas pushed below the viewport)', () => {
  const VW = 1280;
  const VH = 577;

  it('canvas fully below the viewport (the live-site signature) → NOT in viewport', () => {
    // measured on the deployed site: rect 254,577 1026x577
    expect(rectInViewport({ top: 577, bottom: 1154, left: 254, right: 1280, width: 1026, height: 577 }, VW, VH))
      .toBe(false);
  });

  it('canvas fully above the viewport → NOT in viewport', () => {
    expect(rectInViewport({ top: -600, bottom: -23, left: 0, right: 1026, width: 1026, height: 577 }, VW, VH))
      .toBe(false);
  });

  it('canvas fully to the side of the viewport → NOT in viewport', () => {
    expect(rectInViewport({ top: 0, bottom: 577, left: 1300, right: 2326, width: 1026, height: 577 }, VW, VH))
      .toBe(false);
  });

  it('canvas partially visible (letterboxed FIT) → in viewport', () => {
    expect(rectInViewport({ top: 0, bottom: 577, left: 127, right: 1153, width: 1026, height: 577 }, VW, VH))
      .toBe(true);
  });

  it('zero-sized or unreadable canvas → NOT in viewport', () => {
    expect(rectInViewport({ top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }, VW, VH)).toBe(false);
  });

  it('degenerate viewport → NOT in viewport', () => {
    expect(rectInViewport({ top: 0, bottom: 577, left: 127, right: 1153, width: 1026, height: 577 }, 0, 0))
      .toBe(false);
  });
});
