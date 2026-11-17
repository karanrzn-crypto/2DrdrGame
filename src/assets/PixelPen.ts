/**
 * PixelPen.ts — tiny helper for drawing original pixel-art textures
 * procedurally at boot time (original assets, documented origin, no
 * downloaded copyrighted material).
 *
 * v3 adds the organic toolkit that gives the rebuild its hand-painted feel:
 * ellipses, jittered blobs, wavy strokes, dithered blends and — most
 * importantly — an automatic 1px outline pass that wraps every prop and
 * character silhouette in the shared ink color so the world reads crisply
 * at 3x zoom.
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

  /** Filled ellipse (axis-aligned). */
  ellipse(cx: number, cy: number, rx: number, ry: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Irregular organic blob: an ellipse whose radius wobbles with a seeded
   * noise — canopies, dirt patches, pond margins, stone slabs.
   */
  blob(
    cx: number, cy: number, rx: number, ry: number, color: string,
    rng: () => number, wobble = 0.22,
  ): void {
    const steps = 26;
    const offs: number[] = [];
    for (let i = 0; i < steps; i++) offs.push(1 + (rng() * 2 - 1) * wobble);
    // smooth the offsets once so the edge is lumpy but not jagged
    const sm = offs.map((o, i) => (offs[(i + steps - 1) % steps] + o * 2 + offs[(i + 1) % steps]) / 4);
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const a = (i % steps) / steps * Math.PI * 2;
      const t = sm[i % steps];
      const x = cx + Math.cos(a) * rx * t;
      const y = cy + Math.sin(a) * ry * t;
      if (i === 0) this.ctx.moveTo(x, y); else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  /** Horizontal wavy stroke (wind ripples, crack lines) with a seeded RNG. */
  wavyH(x: number, y: number, w: number, amp: number, color: string, rng: () => number): void {
    let px = x;
    let py = y;
    for (let i = 0; i < w; i++) {
      this.px(px, Math.round(py), color);
      px += 1;
      py += rng() < 0.4 ? (rng() < 0.5 ? -1 : 1) : 0;
      if (py < y - amp) py = y - amp;
      if (py > y + amp) py = y + amp;
    }
  }

  /** Scatter n single pixels of a color inside a rect. */
  speckle(x: number, y: number, w: number, h: number, color: string, n: number, rng: () => number): void {
    for (let i = 0; i < n; i++) {
      this.px(x + rng() * w, y + rng() * h, color);
    }
  }

  /**
   * Radial falloff from inner color to transparent, used ONLY for soft
   * light pools (lantern glows), cloud shadows and the screen vignette.
   * Drawn as concentric alpha steps so it stays stable on Canvas and
   * WebGL alike.
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

  /**
   * Automatic 1px outline: strokes every transparent pixel that touches an
   * opaque one (4-neighbourhood) with `color`. This is what makes props and
   * characters pop from the painted ground at 3x zoom.
   */
  outline(color: string): void {
    const { width: w, height: h } = this.ctx.canvas;
    const img = this.ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const at = (x: number, y: number): number => (y * w + x) * 4 + 3;
    const marks: number[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const a = d[at(x, y)];
        const solid = a > 40;
        if (solid) continue;
        const n = y > 0 && d[at(x, y - 1)] > 40;
        const s = y < h - 1 && d[at(x, y + 1)] > 40;
        const e = x < w - 1 && d[at(x + 1, y)] > 40;
        const west = x > 0 && d[at(x - 1, y)] > 40;
        if (n || s || e || west) marks.push(y * w + x);
      }
    }
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
    for (const idx of marks) {
      d[idx * 4] = r;
      d[idx * 4 + 1] = g;
      d[idx * 4 + 2] = b;
      d[idx * 4 + 3] = 255;
    }
    this.ctx.putImageData(img, 0, 0);
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
