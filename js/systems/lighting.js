/**
 * lighting.js — نورپردازی روز/شب (§7): تینت محیطی با گذار نرم + چراغ‌ها.
 * تکنیک: لایهٔ تاریکی با «سوراخ‌کردن» نورها (destination-out) — پیکسل‌ها
 * تار نمی‌شوند و وضوح پیکسل‌آرت حفظ می‌شود.
 */

/* رنگ‌های محیطی در لحظه‌های کلیدی شبانه‌روز [h*60] → [r,g,b,α] */
const KEYS = [
  [0, 16, 24, 58, 0.52],
  [4 * 60, 16, 24, 58, 0.52],
  [5 * 60, 40, 36, 66, 0.40],
  [6 * 60 + 30, 255, 170, 110, 0.16],
  [7 * 60, 255, 210, 150, 0.07],
  [9 * 60, 0, 0, 0, 0.0],
  [16 * 60, 0, 0, 0, 0.0],
  [17 * 60 + 30, 255, 150, 70, 0.14],
  [18 * 60 + 30, 255, 120, 60, 0.26],
  [19 * 60 + 30, 40, 44, 84, 0.40],
  [20 * 60, 16, 24, 58, 0.52],
  [24 * 60, 16, 24, 58, 0.52],
];

export class Lighting {
  constructor(viewW, viewH) {
    this.viewW = viewW;
    this.viewH = viewH;
    this.dark = document.createElement('canvas');
    this.dark.width = viewW; this.dark.height = viewH;
    this.dctx = this.dark.getContext('2d');
  }

  resize(w, h) {
    this.viewW = w; this.viewH = h;
    this.dark.width = w; this.dark.height = h;
  }

  /** شدت تاریکی [0..1] — چراغ‌ها بالای 0.28 روشن می‌شوند. */
  static darknessAt(minutes) {
    for (let i = 0; i < KEYS.length - 1; i++) {
      const [t0, ...c0] = KEYS[i];
      const [t1, ...c1] = KEYS[i + 1];
      if (minutes >= t0 && minutes <= t1) {
        const k = (minutes - t0) / Math.max(1, t1 - t0);
        return c0[3] + (c1[3] - c0[3]) * k;
      }
    }
    return 0;
  }

  /**
   * رندر نور روی بوم اصلی.
   * lights: [{x,y,r,warm,fl}] — مختصات دنیا؛ cam مختصات دوربین.
   */
  render(ctx, minutes, lights, cam) {
    let cr = 0, cg = 0, cb = 0, ca = 0;
    for (let i = 0; i < KEYS.length - 1; i++) {
      const [t0, r0, g0, b0, a0] = KEYS[i];
      const [t1, r1, g1, b1, a1] = KEYS[i + 1];
      if (minutes >= t0 && minutes <= t1) {
        const k = (minutes - t0) / Math.max(1, t1 - t0);
        cr = r0 + (r1 - r0) * k; cg = g0 + (g1 - g0) * k;
        cb = b0 + (b1 - b0) * k; ca = a0 + (a1 - a0) * k;
        break;
      }
    }
    if (ca < 0.02 && !lights.length) return;

    const d = this.dctx;
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, this.viewW, this.viewH);
    d.fillStyle = `rgba(${cr | 0},${cg | 0},${cb | 0},${ca})`;
    d.fillRect(0, 0, this.viewW, this.viewH);

    // سوراخ‌کردن نورها
    d.globalCompositeOperation = 'destination-out';
    for (const L of lights) {
      const sx = L.x - cam.rx, sy = L.y - cam.ry;
      if (sx < -L.r || sy < -L.r || sx > this.viewW + L.r || sy > this.viewH + L.r) continue;
      const fl = L.fl ? 0.86 + Math.sin(L.fl * 0.013 + L.x) * 0.14 : 1;
      const g = d.createRadialGradient(sx, sy, L.r * 0.18, sx, sy, L.r * fl);
      g.addColorStop(0, 'rgba(0,0,0,0.92)');
      g.addColorStop(0.55, 'rgba(0,0,0,0.55)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g;
      d.beginPath();
      d.arc(sx, sy, L.r * fl, 0, Math.PI * 2);
      d.fill();
    }
    d.globalCompositeOperation = 'source-over';

    ctx.drawImage(this.dark, 0, 0);

    // درخشش گرم روی نورها (افزایشی و ملایم)
    ctx.globalCompositeOperation = 'lighter';
    for (const L of lights) {
      if (!L.warm) continue;
      const sx = L.x - cam.rx, sy = L.y - cam.ry;
      if (sx < -L.r || sy < -L.r || sx > this.viewW + L.r || sy > this.viewH + L.r) continue;
      const fl = L.fl ? 0.82 + Math.sin(L.fl * 0.011 + L.y) * 0.18 : 1;
      const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, L.r * 0.7 * fl);
      g.addColorStop(0, `rgba(255,190,110,${0.30 * ca * 2 + 0.06})`);
      g.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, L.r * 0.7 * fl, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
