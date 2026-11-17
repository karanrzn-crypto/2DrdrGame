/**
 * noise.ts — deterministic value-noise helpers (pure, no Phaser).
 *
 * The v3 world is shaped by smooth coherent noise fields instead of
 * per-tile random picks: biome regions get organic boundaries, the ground
 * painter gets macro light/dark variation, and scatter density comes from
 * the same fields, so clumps of vegetation look grown rather than sprinkled.
 *
 * Everything is seeded and deterministic: the map is identical on every
 * run and every machine (testable in Node).
 */

/** Integer lattice hash — fast, well-distributed, fully deterministic. */
function hash2(ix: number, iy: number, seed: number): number {
  let h = (ix * 374761393 + iy * 668265263 + seed * 1274126177) | 0;
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 1274126177);
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t); // smoothstep
}

/** Single octave of smooth value noise in [0, 1]. */
export function valueNoise(x: number, y: number, seed = 0): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  const top = a + (b - a) * fx;
  const bottom = c + (d - c) * fx;
  return top + (bottom - top) * fy;
}

/** Fractal Brownian motion (summed octaves) in [0, 1]. */
export function fbm(x: number, y: number, seed = 0, octaves = 4, gain = 0.5): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x * freq, y * freq, seed + o * 101) * amp;
    norm += amp;
    amp *= gain;
    freq *= 2;
  }
  return sum / norm;
}

/** Deterministic PRNG (mulberry32) — the project's standard RNG. */
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic RNG bound to a world position (stable per-tile detail). */
export function rngAt(x: number, y: number, seed: number): () => number {
  return mulberry32(((x & 0xffff) * 0x1f1f1f1f) ^ ((y & 0xffff) * 0x8cd33) ^ seed);
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamp into [0, 1]. */
export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Reshape noise around a threshold into a soft 0..1 band. */
export function band(v: number, lo: number, hi: number): number {
  return clamp01((v - lo) / (hi - lo));
}
