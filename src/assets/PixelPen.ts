/**
 * PixelPen.ts — tiny helper for drawing original pixel-art textures
 * procedurally at boot time (master directive §52: original assets,
 * documented origin, no downloaded copyrighted material).
 */
import Phaser from 'phaser';

export class PixelPen {
  constructor(private ctx: CanvasRenderingContext2D) {}

  /** Set a single pixel. */
  px(x: number, y: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }

  /** Fill a rectangle. */
  rect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  }

  /** Fill the background with a base color (for opaque tiles). */
  fill(color: string, w: number, h: number, ox = 0, oy = 0): void {
    this.rect(ox, oy, w, h, color);
  }

  /**
   * Radial falloff from inner color to transparent, used ONLY for soft
   * light pools (lantern glows) and the screen vignette. Drawn as
   * concentric alpha steps so it stays stable on Canvas and WebGL alike.
   */
  radial(cx: number, cy: number, radius: number, inner: string): void {
    const steps = Math.max(6, Math.floor(radius / 4));
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(inner.slice(i, i + 2), 16));
    for (let i = steps; i >= 1; i--) {
      const t = i / steps;
      const a = (1 - t) * (1 - t); // quadratic falloff
      const rr = Math.round(radius * t);
      this.ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
}

export interface MadeTexture {
  pen: PixelPen;
  /** Call after drawing to upload the canvas into the GPU texture. */
  refresh: () => void;
}

/** Create an empty canvas texture and a pen bound to its 2D context. */
export function makeCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
): MadeTexture {
  const existing = scene.textures.exists(key);
  if (existing) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, width, height);
  if (!tex) throw new Error(`Could not create canvas texture: ${key}`);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  return {
    pen: new PixelPen(ctx),
    refresh: () => tex.refresh(),
  };
}
