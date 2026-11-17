/**
 * UIArt.ts — procedural Western interface art: parchment panels in wooden
 * frames with brass rivets, a leather health strap, a wooden keycap.
 * The v3 UI replaces all default-looking rectangles with this coherent
 * "wanted-poster / saloon-board" language (all text stays Persian).
 */
import Phaser from 'phaser';
import { PAL } from '../assets/Palette';
import { makeCanvasTexture, PixelPen } from '../assets/PixelPen';

function rng(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function withA(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/** Parchment sheet with mottling, burnished edges, corner shading. */
function parchment(pen: PixelPen, x: number, y: number, w: number, h: number, seed: number): void {
  const r = rng(seed);
  pen.rect(x, y, w, h, PAL.parchment);
  // horizontal fiber bands
  for (let fy = y; fy < y + h; fy += 3) {
    pen.rect(x, fy, w, 1, withA(PAL.parchmentDark, 0.25));
  }
  // mottling
  for (let i = 0; i < (w * h) / 90; i++) {
    pen.px(x + r() * w, y + r() * h, withA(PAL.parchmentDeep, 0.5));
  }
  // burnished edge (darker rim)
  pen.rect(x, y, w, 2, withA(PAL.parchmentDeep, 0.55));
  pen.rect(x, y + h - 2, w, 2, withA(PAL.parchmentDeep, 0.55));
  pen.rect(x, y, 2, h, withA(PAL.parchmentDeep, 0.55));
  pen.rect(x + w - 2, y, 2, h, withA(PAL.parchmentDeep, 0.55));
}

/** Wooden frame: planks + inner brass line + corner rivets. */
function woodFrame(pen: PixelPen, x: number, y: number, w: number, h: number, t = 5): void {
  pen.rect(x, y, w, h, PAL.woodUiDark);
  // plank seams
  for (let sy = y + t; sy < y + h - t; sy += 7) {
    pen.rect(x + t, sy, w - 2 * t, 1, withA(PAL.woodUi, 0.8));
  }
  pen.rect(x + 1, y + 1, w - 2, 1, PAL.woodUiLight);
  // inner brass line
  pen.rect(x + t - 1, y + t - 1, w - 2 * t + 2, 1, PAL.brassUi);
  pen.rect(x + t - 1, y + h - t, w - 2 * t + 2, 1, PAL.brassUi);
  pen.rect(x + t - 1, y + t - 1, 1, h - 2 * t + 2, PAL.brassUi);
  pen.rect(x + w - t, y + t - 1, 1, h - 2 * t + 2, PAL.brassUi);
  // corner rivets
  for (const [rx, ry] of [[x + 2, y + 2], [x + w - 4, y + 2], [x + 2, y + h - 4], [x + w - 4, y + h - 4]]) {
    pen.rect(rx, ry, 2, 2, PAL.ironDark);
    pen.px(rx, ry, PAL.brassUi);
  }
}

/** A framed parchment panel of a given size. */
function panel(w: number, h: number, seed: number): (pen: PixelPen) => void {
  return (pen) => {
    woodFrame(pen, 0, 0, w, h, Math.min(6, Math.floor(h / 8)));
    parchment(pen, 6, 6, w - 12, h - 12, seed);
  };
}

/** Leather health strap with a brass buckle frame. */
function healthStrap(pen: PixelPen): void {
  pen.rect(0, 0, 130, 24, PAL.leatherDark);
  pen.rect(0, 0, 130, 2, PAL.leatherLight);
  pen.rect(0, 22, 130, 2, PAL.leatherDark);
  // stitching
  for (let x = 6; x < 124; x += 5) pen.px(x, 20, withA(PAL.parchmentDark, 0.5));
  // inner slot where the fill bar goes
  pen.rect(8, 6, 114, 12, PAL.ink);
  pen.rect(8, 6, 114, 1, withA(PAL.ironDark, 0.9));
  // buckle
  pen.rect(2, 8, 5, 8, PAL.brassUi);
  pen.rect(3, 9, 3, 6, PAL.leatherDark);
}

/** Wooden keycap with the letter E. */
function keycap(pen: PixelPen): void {
  pen.rect(0, 0, 20, 20, PAL.woodUi);
  pen.rect(0, 0, 20, 2, PAL.woodUiLight);
  pen.rect(0, 18, 20, 2, PAL.woodUiDark);
  pen.rect(0, 0, 2, 20, PAL.woodUiLight);
  pen.rect(18, 0, 2, 20, PAL.woodUiDark);
  pen.rect(4, 4, 12, 12, PAL.parchmentDark);
  pen.rect(4, 4, 12, 1, PAL.parchment);
  // E glyph
  pen.rect(7, 6, 6, 2, PAL.ink);
  pen.rect(7, 6, 2, 8, PAL.ink);
  pen.rect(7, 9, 5, 2, PAL.ink);
  pen.rect(7, 12, 6, 2, PAL.ink);
}

/** Build every UI texture. */
export function buildAllUI(scene: Phaser.Scene): void {
  const dialogue = makeCanvasTexture(scene, 'ui-dialogue', 700, 116);
  panel(700, 116, 4001)(dialogue.pen);
  dialogue.refresh();

  const pause = makeCanvasTexture(scene, 'ui-pause', 460, 230);
  panel(460, 230, 4002)(pause.pen);
  pause.refresh();

  const banner = makeCanvasTexture(scene, 'ui-banner', 520, 110);
  panel(520, 110, 4003)(banner.pen);
  banner.refresh();

  const chipClock = makeCanvasTexture(scene, 'ui-chip-clock', 196, 36);
  panel(196, 36, 4004)(chipClock.pen);
  chipClock.refresh();

  const chipMoney = makeCanvasTexture(scene, 'ui-chip-money', 118, 36);
  panel(118, 36, 4005)(chipMoney.pen);
  chipMoney.refresh();

  const strap = makeCanvasTexture(scene, 'ui-health', 130, 24);
  healthStrap(strap.pen);
  strap.refresh();

  const key = makeCanvasTexture(scene, 'ui-keycap', 20, 20);
  keycap(key.pen);
  key.refresh();
}
