/**
 * terrain.js — نقاش زمین با چانک‌های ۲۵۶×۲۵۶.
 * اصول (§1/§3): بدون مرز تایلِ دیده‌شدنی، گذارهای نویزی، سایه‌گذاری پیوسته
 * (نه پوسترِ گسسته)، جادهٔ دوخطهٔ پرکنتراست با رَت چرخ، ساحل شنی،
 * ترک گِل خشک، طبقات ماسای قرمز برای صخره‌ها؛ همهٔ رنگ‌ها از PAL.
 */
import { PAL } from './palette.js';
import { M, TILE, MAP_W, MAP_H } from '../world/world.js';
import { mulberry32, fbm, vnoise, clamp01 } from '../util.js';

const CH = 16; // تایل در هر چانک
const CH_PX = CH * TILE;

function hex(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* سه‌گانهٔ تیره/میانه/روشن برای هر ماده — ترکیب پیوسته */
const GRASS = [hex('#556f34'), hex('#67893f'), hex('#7a9d4c')];
const DRYG = [hex('#8f9a4a'), hex('#9aa553'), hex('#a5b05c')];
const SAND = [hex('#bd8a4f'), hex('#cf9d5e'), hex('#dcb277')];
const RUST = [hex('#b59b6e'), hex('#c9b18a'), hex('#d6c39c')];
const DIRT = [hex('#8a6845'), hex('#a8825a'), hex('#b89064')];
const MESA = [hex('#8c4c30'), hex('#a45c3c'), hex('#b56b4a')];
const ROCKG = [hex('#6e6050'), hex('#8a7a66'), hex('#a3947e')];

const idx = (x, y) => y * MAP_W + x;

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
/** ترکیب سه‌گانه با t پیوسته (میانه را دور می‌زند → گذار نرم). */
function tri(cols, t) {
  return t < 0.5 ? mix(cols[0], cols[1], t * 2) : mix(cols[1], cols[2], (t - 0.5) * 2);
}

export class TerrainPainter {
  constructor(world) {
    this.world = world;
    this.cols = Math.ceil(MAP_W / CH);
    this.rows = Math.ceil(MAP_H / CH);
    this.chunks = new Array(this.cols * this.rows).fill(null);
    this.nearRoad = new Uint8Array(MAP_W * MAP_H);
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      if (world.distRoads(x + 0.5, y + 0.5) < 2.8) this.nearRoad[idx(x, y)] = 1;
    }
  }

  chunk(ccx, ccy) {
    const i = ccy * this.cols + ccx;
    if (!this.chunks[i]) this.chunks[i] = this._paint(ccx, ccy);
    return this.chunks[i];
  }

  _paint(ccx, ccy) {
    const cv = document.createElement('canvas');
    cv.width = CH_PX; cv.height = CH_PX;
    const ctx = cv.getContext('2d');
    const w = this.world;
    const img = ctx.createImageData(CH_PX, CH_PX);
    const data = img.data;
    const x0 = ccx * CH, y0 = ccy * CH;

    /* پرچم سطح تایل: تایل آبی یا همسایهٔ آب (برای لبهٔ پیوستهٔ ساحل) */
    const waterish = new Uint8Array(CH * CH);
    for (let ty = y0; ty < y0 + CH; ty++) {
      for (let tx = x0; tx < x0 + CH; tx++) {
        let wsh = 0;
        for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const mm = w.get(tx + dx, ty + dy);
          if (mm === M.WATER || mm === M.POOL) { wsh = 1; break; }
        }
        waterish[(ty - y0) * CH + (tx - x0)] = wsh;
      }
    }

    /* رنگ خشکی بر اساس مادهٔ تایل (تابع مشترک برای پیکسل‌های ساحل) */
    const landColor = (m, wx, wy, px, py) => {
      const broad = fbm(wx * 0.33, wy * 0.33, 21, 2);
      const fine = vnoise(px * 1.4, py * 1.4, 5);
      let c;
      if (m === M.PLAIN || m === M.MEADOW || m === M.DRY) {
        c = tri(GRASS, 0.15 + broad * 0.7);
        if (m === M.DRY) c = mix(c, tri(DRYG, broad), 0.55);
        if (m === M.MEADOW && broad > 0.6) c = mix(c, tri(DRYG, 0.6), 0.25);
      } else if (m === M.WOODS) {
        c = tri(GRASS, 0.1 + broad * 0.6);
        c = [c[0] * 0.86, c[1] * 0.9, c[2] * 0.84];
      } else if (m === M.BAD) {
        c = tri(SAND, 0.2 + broad * 0.6);
      } else if (m === M.SCRUB) {
        const g2 = tri(GRASS, broad);
        const s2 = tri(SAND, broad);
        c = vnoise(wx * 1.1, wy * 1.1, 31) > 0.52 ? g2 : s2;
      } else if (m === M.RUST) {
        c = tri(RUST, 0.15 + broad * 0.7);
      } else if (m === M.ROCK) {
        const band = (py % 7);
        const base = band < 2 ? MESA[2] : band < 4 ? MESA[1] : MESA[0];
        c = [base[0] * (0.9 + fine * 0.2), base[1] * (0.9 + fine * 0.2), base[2] * (0.9 + fine * 0.2)];
      } else if (m === M.SOIL) {
        c = mix(DIRT[0], DIRT[1], 0.4 + fine * 0.3);
      } else {
        c = mix(DIRT[0], DIRT[2], broad);
      }
      const sh = 0.96 + fine * 0.08;
      return [c[0] * sh, c[1] * sh, c[2] * sh];
    };

    /* ---------- پاس A: رنگ پایهٔ پیوسته + آب با ساحل پیوسته ---------- */
    for (let py = 0; py < CH_PX; py++) {
      const ty = y0 + py / TILE;
      for (let px = 0; px < CH_PX; px++) {
        const tx = x0 + px / TILE;
        const m = w.get(tx | 0, ty | 0);
        const wx = tx + 0.5, wy = ty + 0.5;
        let r, g, b;
        const wsh = waterish[(ty | 0) * CH + (tx | 0) - y0 * CH - x0 * CH];

        if ((m === M.WATER || m === M.POOL) || (wsh && w.waterAt(wx, wy))) {
          // آب: عمق با ماسک پیوسته (ساحل اورگانیک در حد پیکسل)
          if (w.waterAt(wx, wy)) {
            const d = w.waterDepth(wx, wy);
            const c = d > 0.55 ? [46, 82, 97] : d > 0.25 ? [56, 98, 113] : [74, 122, 138];
            const sh = 0.95 + vnoise(px * 0.8, py * 0.8, 9) * 0.1;
            r = c[0] * sh; g = c[1] * sh; b = c[2] * sh;
          } else {
            [r, g, b] = landColor(m, wx, wy, px, py);
          }
        } else if (m === M.BED) {
          const t = clamp01(fbm(wx * 0.9, wy * 0.9, 13, 2) * 1.1 - 0.05);
          [r, g, b] = tri(RUST, t);
        } else {
          [r, g, b] = landColor(m, wx, wy, px, py);
        }

        const o = (py * CH_PX + px) * 4;
        data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    const rng = mulberry32((ccx * 73856093) ^ (ccy * 19349663) ^ 1873);
    const rgbS = (c, amt = 10) => {
      const j = (rng() - 0.5) * 2 * amt;
      return `rgb(${clamp01((c[0] + j) / 255) * 255 | 0},${clamp01((c[1] + j) / 255) * 255 | 0},${clamp01((c[2] + j) / 255) * 255 | 0})`;
    };

    /* ---------- پاس B: عناصر ترکیبی ---------- */

    // موج‌های شن بدلندز (گذر پیوسته روی ماسه)
    for (let ty = y0; ty < y0 + CH; ty++) {
      for (let tx = x0; tx < x0 + CH; tx++) {
        if (w.get(tx, ty) !== M.BAD) continue;
        const bx = (tx - x0) * TILE, by = (ty - y0) * TILE;
        for (let yy = 2 + ((tx * 3) % 4); yy < TILE; yy += 7) {
          ctx.fillStyle = 'rgba(158,112,66,0.30)';
          ctx.fillRect(bx, by + yy + Math.round(Math.sin(tx * 0.8 + yy) * 1.5), TILE, 1);
          if (rng() < 0.5) ctx.fillStyle = 'rgba(226,186,128,0.28)';
          else ctx.fillStyle = 'rgba(158,112,66,0.15)';
          ctx.fillRect(bx, by + yy + 1 + Math.round(Math.sin(tx * 0.8 + yy) * 1.5), TILE, 1);
        }
        if (rng() < 0.25) { ctx.fillStyle = '#8f6b42'; ctx.fillRect(bx + (rng() * 14 | 0), by + (rng() * 14 | 0), 2, 1); }
      }
    }

    // ساحل شنی کنار آب
    for (let ty = y0; ty < y0 + CH; ty++) {
      for (let tx = x0; tx < x0 + CH; tx++) {
        const m = w.get(tx, ty);
        if (m === M.WATER || m === M.POOL || m === M.ROCK) continue;
        let water = false, dirx = 0, diry = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const mm = w.get(tx + dx, ty + dy);
          if (mm === M.WATER || mm === M.POOL) { water = true; dirx = dx; diry = dy; break; }
        }
        if (!water) continue;
        const bx = (tx - x0) * TILE, by = (ty - y0) * TILE;
        const t = 2 + (rng() * 2 | 0);
        ctx.fillStyle = rgbS([194, 160, 109], 8);
        if (dirx === 1) ctx.fillRect(bx, by, t, TILE);
        else if (dirx === -1) ctx.fillRect(bx + TILE - t, by, t, TILE);
        else if (diry === 1) ctx.fillRect(bx, by, TILE, t);
        else if (diry === -1) ctx.fillRect(bx, by + TILE - t, TILE, t);
        for (let i = 0; i < 6; i++) ctx.fillRect(bx + (rng() * TILE | 0), by + (rng() * TILE | 0), 1, 1);
      }
    }

    // جاده‌ها (مبدأ چانک به پیکسل — جاده در مختصات جهانی نقاشی می‌شود)
    const px0 = x0 * TILE, py0 = y0 * TILE;
    this._paintRoad(ctx, w.roadMain, rng, px0, py0, false);
    this._paintRoad(ctx, w.roadNorth, rng, px0, py0, true);
    this._paintRoad(ctx, w.roadSouth, rng, px0, py0, true);

    // مسیر پا از درها به جاده
    ctx.lineCap = 'round';
    for (const [dx, dy] of w.doorPaths) {
      const target = w.nearestRoadPoint(dx, dy);
      if (!target) continue;
      ctx.strokeStyle = 'rgba(140,104,66,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(dx - px0, dy - py0);
      ctx.quadraticCurveTo((dx + target[0]) / 2 - px0 + (rng() - 0.5) * 10, (dy + target[1]) / 2 - py0, target[0] - px0, target[1] - py0);
      ctx.stroke();
    }

    // پلازای سنگ‌فرش
    this._paintRectRegion(ctx, w.plaza, x0, y0, (ctx, bx, by) => {
      const s = 5 + (rng() * 3 | 0);
      for (let y = 0; y < TILE; y += s) {
        const off = ((y / s) % 2) * (s >> 1);
        for (let x = 0; x < TILE; x += s) {
          ctx.fillStyle = rgbS([152, 143, 124], 9);
          ctx.fillRect(bx + x + off, by + y, s - 1, s - 1);
          ctx.fillStyle = 'rgba(255,255,255,0.10)';
          ctx.fillRect(bx + x + off, by + y, s - 1, 1);
          ctx.fillStyle = 'rgba(60,52,40,0.28)';
          ctx.fillRect(bx + x + off, by + y + s - 1, s - 1, 1);
        }
      }
    });

    // تخته‌پیاده‌رو
    this._paintRectRegion(ctx, w.board, x0, y0, (ctx, bx, by) => {
      for (let x = 0; x < TILE; x += 4) {
        ctx.fillStyle = rgbS([138, 106, 68], 8);
        ctx.fillRect(bx + x, by, 3, TILE);
        ctx.fillStyle = 'rgba(46,30,16,0.5)';
        ctx.fillRect(bx + x + 3, by, 1, TILE);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(bx, by + TILE - 1, TILE, 1);
    });

    // خطوط شخم
    for (const plot of w.plotRects) {
      this._paintRectRegion(ctx, plot, x0, y0, (ctx, bx, by) => {
        for (let y = 0; y < TILE; y += 4) {
          ctx.fillStyle = rgbS([107, 78, 48], 8);
          ctx.fillRect(bx, by + y, TILE, 2);
          ctx.fillStyle = rgbS([125, 92, 58], 8);
          ctx.fillRect(bx, by + y + 2, TILE, 2);
          if (rng() < 0.5) { ctx.fillStyle = '#4e3822'; ctx.fillRect(bx + (rng() * 14 | 0), by + y + 1, 1, 1); }
        }
      });
    }

    // خاک کوبیدهٔ چوب‌بستی
    this._paintRectRegion(ctx, w.corralGround, x0, y0, (ctx, bx, by) => {
      ctx.fillStyle = rgbS([160, 126, 86], 9);
      ctx.fillRect(bx, by, TILE, TILE);
      if (rng() < 0.35) { ctx.fillStyle = 'rgba(122,90,58,0.7)'; ctx.fillRect(bx + (rng() * 13 | 0), by + (rng() * 13 | 0), 2, 1); }
    });

    // ترک‌های گِل خشک بستر رودخانه
    for (let ty = y0; ty < y0 + CH; ty++) {
      for (let tx = x0; tx < x0 + CH; tx++) {
        if (w.get(tx, ty) !== M.BED) continue;
        const bx = (tx - x0) * TILE, by = (ty - y0) * TILE;
        const n = 2 + (rng() * 2 | 0);
        for (let i = 0; i < n; i++) {
          let cx = bx + rng() * TILE, cy = by + rng() * TILE;
          ctx.strokeStyle = 'rgba(120,100,70,0.75)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(cx, cy);
          for (let s = 0; s < 3; s++) {
            cx += (rng() - 0.5) * 8; cy += (rng() - 0.5) * 8;
            ctx.lineTo(cx, cy);
          }
          ctx.stroke();
        }
      }
    }

    // جزئیات زیست‌بوم (سبزه/گل/بوتهٔ خشک)
    for (let ty = y0; ty < y0 + CH; ty++) {
      for (let tx = x0; tx < x0 + CH; tx++) {
        const m = w.get(tx, ty);
        if (m === M.WATER || m === M.POOL || m === M.BRIDGE || m === M.PLAZA
          || m === M.BOARD || m === M.SOIL || m === M.ROCK || m === M.BAD
          || this.nearRoad[idx(tx, ty)]) continue;
        const bx = (tx - x0) * TILE, by = (ty - y0) * TILE;
        const n = fbm(tx * 0.2, ty * 0.2, 81, 2);
        if (m === M.PLAIN || m === M.MEADOW || m === M.WOODS || m === M.DRY) {
          const count = 2 + (n * 4 | 0);
          for (let i = 0; i < count; i++) {
            const gx = bx + (rng() * 15 | 0), gy = by + (rng() * 15 | 0);
            if (rng() < 0.7) { ctx.fillStyle = '#4e6a30'; ctx.fillRect(gx, gy, 1, 2); ctx.fillRect(gx + 1, gy + 1, 1, 1); }
            else { ctx.fillStyle = '#83a752'; ctx.fillRect(gx, gy, 1, 2); }
          }
          if ((m === M.MEADOW && rng() < 0.5) || rng() < 0.025) {
            ctx.fillStyle = rng() < 0.5 ? PAL.flowerY : rng() < 0.5 ? PAL.flowerR : PAL.flowerW;
            ctx.fillRect(bx + (rng() * 14 | 0), by + (rng() * 14 | 0), 1, 1);
          }
        } else if (m === M.SCRUB || m === M.RUST) {
          if (rng() < 0.4) { ctx.fillStyle = 'rgba(120,104,58,0.8)'; ctx.fillRect(bx + (rng() * 14 | 0), by + (rng() * 14 | 0), 1, 2); }
          if (m === M.RUST) {
            // ترک‌های گِل خشک روی زمین‌های راست‌واتر
            let cx = bx + rng() * TILE, cy = by + rng() * TILE;
            ctx.strokeStyle = 'rgba(140,118,84,0.7)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(cx, cy);
            for (let s = 0; s < 3; s++) {
              cx += (rng() - 0.5) * 9; cy += (rng() - 0.5) * 9;
              ctx.lineTo(cx, cy);
            }
            ctx.stroke();
          }
        }
      }
    }

    // پل چوبی
    for (let ty = y0; ty < y0 + CH; ty++) {
      for (let tx = x0; tx < x0 + CH; tx++) {
        if (w.get(tx, ty) !== M.BRIDGE) continue;
        const bx = (tx - x0) * TILE, by = (ty - y0) * TILE;
        for (let y = 0; y < TILE; y += 3) {
          ctx.fillStyle = rgbS([122, 92, 58], 8);
          ctx.fillRect(bx, by + y, TILE, 2);
          ctx.fillStyle = 'rgba(30,20,12,0.55)';
          ctx.fillRect(bx, by + y + 2, TILE, 1);
        }
        ctx.fillStyle = '#3e2c1a';
        if (w.get(tx, ty - 1) !== M.BRIDGE) ctx.fillRect(bx, by, TILE, 2);
        if (w.get(tx, ty + 1) !== M.BRIDGE) ctx.fillRect(bx, by + TILE - 2, TILE, 2);
      }
    }

    // دیوار سد سنگی
    this._paintRectRegion(ctx, w.dam, x0, y0, (ctx, bx, by) => {
      for (let y = 0; y < TILE; y += 4) {
        const off = ((y / 4) % 2) * 3;
        for (let x = 0; x < TILE; x += 6) {
          ctx.fillStyle = rgbS([122, 112, 96], 10);
          ctx.fillRect(bx + x + off, by + y, 5, 3);
          ctx.fillStyle = 'rgba(40,34,26,0.7)';
          ctx.fillRect(bx + x + off, by + y + 3, 5, 1);
        }
      }
      ctx.fillStyle = '#a89c8a';
      ctx.fillRect(bx, by, TILE, 1);
    });

    // صخره‌های مرز دنیا: هایلایت لبه + ترک (همهٔ صخره‌ها ماسای قرمز)
    for (let ty = y0; ty < y0 + CH; ty++) {
      for (let tx = x0; tx < x0 + CH; tx++) {
        if (w.get(tx, ty) !== M.ROCK) continue;
        const bx = (tx - x0) * TILE, by = (ty - y0) * TILE;
        if (w.get(tx, ty - 1) !== M.ROCK) {
          ctx.fillStyle = '#c9855e';
          ctx.fillRect(bx, by, TILE, 2);
          ctx.fillStyle = 'rgba(60,30,18,0.45)';
          ctx.fillRect(bx, by + 2, TILE, 3);
        }
        if (w.get(tx - 1, ty) !== M.ROCK) {
          ctx.fillStyle = 'rgba(201,133,94,0.55)';
          ctx.fillRect(bx, by, 1, TILE);
        }
        if (w.get(tx + 1, ty) !== M.ROCK) {
          ctx.fillStyle = 'rgba(60,30,18,0.5)';
          ctx.fillRect(bx + TILE - 1, by, 1, TILE);
        }
        for (let i = 0; i < 2; i++) {
          const cx = bx + (rng() * 14 | 0), cy = by + (rng() * 12 | 0);
          ctx.fillStyle = 'rgba(70,36,24,0.5)';
          ctx.fillRect(cx, cy, 1, 2 + (rng() * 4 | 0));
        }
        if (rng() < 0.3) {
          ctx.fillStyle = 'rgba(255,200,160,0.14)';
          ctx.fillRect(bx + (rng() * 12 | 0), by + (rng() * 12 | 0), 3, 1);
        }
      }
    }

    return cv;
  }

  _paintRectRegion(ctx, r, x0, y0, fn) {
    const rx0 = Math.max(r.x, x0), ry0 = Math.max(r.y, y0);
    const rx1 = Math.min(r.x + r.w, x0 + CH), ry1 = Math.min(r.y + r.h, y0 + CH);
    for (let ty = ry0; ty < ry1; ty++) {
      for (let tx = rx0; tx < rx1; tx++) {
        fn(ctx, (tx - x0) * TILE, (ty - y0) * TILE, tx, ty);
      }
    }
  }

  _paintRoad(ctx, pts, rng, x0, y0, narrow = false) {
    const half = narrow ? 11 : 14;
    const pxA = pts.map(([x, y]) => [x * TILE - x0, y * TILE - y0]);
    const inRange = pxA.some(([x, y]) => x > -half * 2 - 32 && y > -half * 2 - 32
      && x < CH_PX + half * 2 + 32 && y < CH_PX + half * 2 + 32);
    if (!inRange) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // حاشیهٔ محو بیرونی
    ctx.strokeStyle = 'rgba(140,102,62,0.45)';
    ctx.lineWidth = half * 2 + 7;
    this._strokePath(ctx, pxA);
    // بدنهٔ جاده — خاک فشردهٔ تیره‌تر از ماسه
    ctx.strokeStyle = 'rgba(139,104,64,0.95)';
    ctx.lineWidth = half * 2;
    this._strokePath(ctx, pxA);
    // سایش مرکزی روشن
    ctx.strokeStyle = 'rgba(178,140,96,0.55)';
    ctx.lineWidth = half;
    this._strokePath(ctx, pxA);
    // سایهٔ نازک لبه‌ها
    ctx.strokeStyle = 'rgba(88,62,36,0.35)';
    ctx.lineWidth = 2;
    for (const off of [-(half - 1), half - 1]) {
      this._strokePath(ctx, this._offsetPolyline(pxA, off));
    }

    // رَت چرخ: دو خط موازی با گپ طبیعی
    ctx.setLineDash([7, 4]);
    ctx.strokeStyle = 'rgba(104,74,44,0.85)';
    ctx.lineWidth = 2;
    for (const off of (narrow ? [-6, 6] : [-7, 7])) {
      this._strokePath(ctx, this._offsetPolyline(pxA, off));
    }
    ctx.setLineDash([]);

    // سنگ‌ریزه و لکه در لبه‌ها
    for (let i = 0; i < pxA.length - 1; i++) {
      const [ax, ay] = pxA[i], [bx, by] = pxA[i + 1];
      const steps = Math.hypot(bx - ax, by - ay) / 8 | 0;
      for (let s = 0; s < steps; s++) {
        const t = s / Math.max(1, steps);
        const px = ax + (bx - ax) * t, py = ay + (by - ay) * t;
        if (rng() < 0.4) {
          const a = rng() * Math.PI * 2, rr = half + rng() * 5;
          ctx.fillStyle = rng() < 0.5 ? 'rgba(120,88,52,0.8)' : 'rgba(206,170,116,0.7)';
          ctx.fillRect(px + Math.cos(a) * rr, py + Math.sin(a) * rr, 2, 1);
        }
      }
    }
  }

  _strokePath(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }

  _offsetPolyline(pts, off) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
      const dx = next[0] - prev[0], dy = next[1] - prev[1];
      const len = Math.hypot(dx, dy) || 1;
      out.push([pts[i][0] + (-dy / len) * off, pts[i][1] + (dx / len) * off]);
    }
    return out;
  }
}
