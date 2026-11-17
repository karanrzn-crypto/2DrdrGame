import { describe, it, expect } from 'vitest';
import { valueNoise, fbm, mulberry32, rngAt, lerp, clamp01, band } from '../src/world/noise';
import { buildMap, MAP_W, MAP_H, roadCenterYAt, BIOME } from '../src/world/MapData';

describe('noise — determinism', () => {
  it('valueNoise is stable for the same inputs', () => {
    expect(valueNoise(3.2, 4.7, 41)).toBe(valueNoise(3.2, 4.7, 41));
    expect(fbm(1.5, 2.5, 91, 3)).toBe(fbm(1.5, 2.5, 91, 3));
  });

  it('valueNoise stays in [0, 1] across a grid sample', () => {
    for (let y = 0; y < 20; y += 0.7) {
      for (let x = 0; x < 20; x += 0.7) {
        const v = valueNoise(x, y, 5);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('fbm is continuous (no random-looking jumps between samples)', () => {
    let maxJump = 0;
    let prev = fbm(0, 0, 13, 4);
    for (let x = 0; x < 30; x += 0.01) {
      const v = fbm(x, 7.3, 13, 4);
      maxJump = Math.max(maxJump, Math.abs(v - prev));
      prev = v;
    }
    // The top octave legitimately varies fast, but a DIScontinuous field
    // would jump by ~0.3+ per sample. Continuous noise stays far below.
    expect(maxJump).toBeLessThan(0.15);
  });

  it('mulberry32 and rngAt are deterministic', () => {
    const a = mulberry32(1234);
    const b = mulberry32(1234);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
    expect(rngAt(7, 9, 55)()).toBe(rngAt(7, 9, 55)());
  });

  it('math helpers behave', () => {
    expect(lerp(2, 6, 0.5)).toBe(4);
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(band(0.5, 0, 1)).toBe(0.5);
    expect(band(0.5, 0.5, 1)).toBe(0);
  });
});

describe('GroundPlan — painter/collision agreement', () => {
  const map = buildMap();

  it('biome grid covers every tile with a known id', () => {
    expect(map.plan.biome.length).toBe(MAP_W * MAP_H);
    for (let i = 0; i < map.plan.biome.length; i++) {
      expect(map.plan.biome[i]).toBeGreaterThanOrEqual(0);
      expect(map.plan.biome[i]).toBeLessThanOrEqual(BIOME.MEADOW);
    }
  });

  it('road polyline runs across the whole world', () => {
    const pts = map.plan.roadPts;
    expect(pts.length).toBeGreaterThanOrEqual(8);
    expect(pts[0][0]).toBeLessThan(0);
    expect(pts[pts.length - 1][0]).toBeGreaterThan(MAP_W * 16 - 8);
  });

  it('roadCenterYAt interpolates monotonically west→east', () => {
    const y0 = roadCenterYAt(0);
    const y1 = roadCenterYAt(63 * 16);
    expect(y1).toBeGreaterThanOrEqual(y0 - 8); // no wild backwards jumps
    expect(roadCenterYAt(40 * 16)).toBeGreaterThan(0);
  });

  it('every town door has a footpath point on dry land', () => {
    for (const [x, y] of map.plan.doorPx) {
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(MAP_W * 16);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(MAP_H * 16);
    }
  });

  it('fence segments sit on the corral ring the tests know', () => {
    const segs = map.plan.fenceSegs;
    expect(segs.length).toBe(4);
  });
});
