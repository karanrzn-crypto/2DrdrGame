/**
 * util.js — ابزارهای مشترک: RNG قطعی، نویز، فرمت فارسی، ریاضی.
 * همهٔ تولید دنیا قطعی است (seed ثابت) تا دنیا بین اجراها یکسان بماند.
 */

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** هش دوبعدی برای نویز مقدار-گرید (بدون جدول). */
function hash2(ix, iy, seed) {
  let h = (ix * 374761393 + iy * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smooth(t) { return t * t * (3 - 2 * t); }

/** نویز مقدار دوبعدی در [0,1]. */
export function vnoise(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  const u = smooth(fx), v = smooth(fy);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** fbm — چند اکتاو نویز، خروجی حدود [0,1]. */
export function fbm(x, y, seed = 0, oct = 3) {
  let v = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) {
    v += vnoise(x * f, y * f, seed + i * 101) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return v / norm;
}

export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function clamp01(v) { return clamp(v, 0, 1); }
export function lerp(a, b, t) { return a + (b - a) * t; }

/* ---------- فرمت فارسی ---------- */
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** ارقام لاتین → فارسی. */
export function toFa(value) {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** پول: ‎$۳۵‎ */
export function faMoney(n) { return '$' + toFa(n); }

/** فاصلهٔ نقطه تا پاره‌خط [x1,y1]-[x2,y2]. */
export function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
  t = clamp01(t);
  const cx = x1 + dx * t, cy = y1 + dy * t;
  return Math.hypot(px - cx, py - cy);
}
