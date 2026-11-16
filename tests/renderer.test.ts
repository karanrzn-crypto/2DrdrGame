/**
 * renderer.test.ts — the pure renderer-choice decision used at boot
 * (src/boot/RendererProbe.chooseRenderer). The DOM/WebGL probes
 * themselves are verified in a real browser (docs/TESTING.md, boot matrix).
 */
import { describe, expect, it } from 'vitest';
import { chooseRenderer } from '../src/boot/RendererProbe';

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
