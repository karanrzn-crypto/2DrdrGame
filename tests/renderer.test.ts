/**
 * renderer.test.ts — the pure renderer decisions used at boot
 * (src/boot/RendererProbe.chooseRenderer + retryRenderer). The DOM/WebGL
 * probes themselves are verified in a real browser (docs/TESTING.md,
 * boot matrix).
 */
import { describe, expect, it } from 'vitest';
import { chooseRenderer, retryRenderer } from '../src/boot/RendererProbe';

describe('chooseRenderer', () => {
  it('healthy GPU → Phaser AUTO (WebGL)', () => {
    expect(chooseRenderer({ webglDraws: true, canvas2dDraws: true })).toBe('auto');
  });

  it('WebGL draws but 2D broken (pathological) → still AUTO', () => {
    expect(chooseRenderer({ webglDraws: true, canvas2dDraws: false })).toBe('auto');
  });

  it('silent-WebGL death (context OK, draws nothing) → Canvas fallback', () => {
    expect(chooseRenderer({ webglDraws: false, canvas2dDraws: true })).toBe('canvas');
  });

  it('no usable output at all → none (error panel path)', () => {
    expect(chooseRenderer({ webglDraws: false, canvas2dDraws: false })).toBe('none');
  });
});

describe('retryRenderer', () => {
  it('attempt 0 keeps the probe-based choice', () => {
    expect(retryRenderer('auto', 0)).toBe('auto');
    expect(retryRenderer('canvas', 0)).toBe('canvas');
    expect(retryRenderer('none', 0)).toBe('none');
  });

  it('failed AUTO (WebGL) boot → one Canvas retry (the field-bug fix)', () => {
    expect(retryRenderer('auto', 1)).toBe('canvas');
  });

  it('failed Canvas boot has nothing to fall back to → none', () => {
    expect(retryRenderer('canvas', 1)).toBe('none');
  });

  it('no second retry after the Canvas retry also failed → none', () => {
    expect(retryRenderer('auto', 2)).toBe('none');
    expect(retryRenderer('auto', 3)).toBe('none');
  });
});
