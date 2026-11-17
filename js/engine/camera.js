/**
 * camera.js — دوربین دنبال‌کننده با لرزش نرم و گیره به مرز دنیا.
 * رندر پیکسل‌پرفکت: مختصات دوربین به پیکسل گرد می‌شود.
 */
import { clamp } from '../util.js';

export class Camera {
  constructor(viewW, viewH, worldW, worldH) {
    this.viewW = viewW;
    this.viewH = viewH;
    this.worldW = worldW;
    this.worldH = worldH;
    this.x = 0;
    this.y = 0;
  }

  resize(viewW, viewH, worldW, worldH) {
    this.viewW = viewW; this.viewH = viewH;
    if (worldW != null) this.worldW = worldW;
    if (worldH != null) this.worldH = worldH;
  }

  /** دنبال کردن نرم نقطهٔ هدف. */
  follow(tx, ty, dt) {
    const k = Math.min(1, dt * 8);
    this.x += (tx - this.viewW / 2 - this.x) * k;
    this.y += (ty - this.viewH / 2 - this.y) * k;
    this.clampToWorld();
  }

  /** پرش فوری (تله‌پورت). */
  snapTo(tx, ty) {
    this.x = tx - this.viewW / 2;
    this.y = ty - this.viewH / 2;
    this.clampToWorld();
  }

  clampToWorld() {
    if (this.worldW > this.viewW) this.x = clamp(this.x, 0, this.worldW - this.viewW);
    else this.x = (this.worldW - this.viewW) / 2;
    if (this.worldH > this.viewH) this.y = clamp(this.y, 0, this.worldH - this.viewH);
    else this.y = (this.worldH - this.viewH) / 2;
  }

  /** مختصات گردشده برای رندر تیز. */
  get rx() { return Math.round(this.x); }
  get ry() { return Math.round(this.y); }
}
