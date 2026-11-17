/**
 * PropFactory.ts — props, flora, critters and effect textures, all original
 * procedural pixel art. Each prop declares its collision box so visual size
 * and gameplay geometry stay consistent.
 *
 * v3 rebuild: irregular organic silhouettes with the automatic ink outline
 * (props read crisply against the painted ground), bigger multi-value tree
 * canopies, western landmark props (water tower, spinning windmill blades),
 * storytelling props (ruin clutter, ribcage, skull, lost boots), fence-adjacent
 * farm props (hay pile, crate stack, log seat) and pond reeds. The glow /
 * vignette / sun-wash / particle textures used by the atmosphere system are
 * built here too.
 */
import Phaser from 'phaser';
import { PAL } from './Palette';
import { makeCanvasTexture, PixelPen } from './PixelPen';
import { BUILDINGS } from './Buildings';
import type { LightAnchor } from './Buildings';

export interface PropSpec {
  key: string;
  w: number;
  h: number;
  /** Collision box width/height in px (0 = no body). */
  bodyW: number;
  bodyH: number;
  /** Gap between the prop's base line and the bottom of its collision box. */
  bodyGap: number;
  /** Night-light anchors (canvas coords → world via dx = x - w/2, dy = y - h). */
  lights?: LightAnchor[];
  /** Wind sway: rotation tween around the base. */
  sway?: boolean;
  /** Ambient animation sheet (frames laid out horizontally). */
  anim?: { frameW: number; frames: number; frameRate: number; key: string; repeat: number };
  /** Second spinning layer (windmill blades): sprite, offset, animation. */
  spinner?: { key: string; dx: number; dy: number; anim: string };
  /** Y offset (from canvas top) where the scene renders sign text. */
  signDy?: number;
  /** Chimney smoke anchors (canvas coords). */
  smoke?: Array<[number, number]>;
}

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

// ---------------------------------------------------------------------------
// small wooden / metal props
// ---------------------------------------------------------------------------

const well = (pen: PixelPen): void => {
  // stone ring with inner water
  pen.rect(2, 14, 18, 12, PAL.stoneDeep);
  pen.rect(3, 15, 16, 9, PAL.stone);
  pen.rect(5, 16, 12, 5, PAL.waterDark);
  pen.rect(6, 17, 10, 3, PAL.water);
  pen.rect(6, 17, 4, 1, PAL.waterShine);
  pen.rect(2, 25, 18, 2, PAL.stoneDark);
  pen.rect(2, 26, 6, 1, withA(PAL.stoneLight, 0.8));
  // posts + mini roof with shingle rows
  pen.rect(3, 2, 3, 14, PAL.woodDark);
  pen.rect(16, 2, 3, 14, PAL.woodDark);
  for (let ry = 0; ry < 6; ry++) {
    const half = 3 + Math.round((ry / 6) * 8);
    pen.rect(11 - half, ry, half * 2, 1, ry % 2 === 0 ? PAL.roofBrown : PAL.roofBrownDark);
  }
  pen.rect(10, 6, 2, 1, PAL.parchmentDark); // rope
  pen.rect(8, 8, 5, 5, PAL.woodDark);       // bucket
  pen.rect(9, 9, 3, 2, PAL.wood);
  pen.outline(PAL.outline);
  pen.rect(6, 17, 4, 1, PAL.waterShine);    // shine survives the outline
};

const trough = (pen: PixelPen): void => {
  pen.rect(0, 2, 26, 11, PAL.wood);
  pen.rect(0, 2, 26, 2, PAL.woodLight);
  pen.rect(0, 11, 26, 2, PAL.woodDark);
  pen.rect(2, 4, 22, 6, PAL.waterDark);
  pen.rect(2, 4, 22, 4, PAL.water);
  pen.rect(3, 4, 8, 1, PAL.waterShine);
  pen.rect(2, 13, 3, 1, PAL.woodDark);
  pen.rect(21, 13, 3, 1, PAL.woodDark);
  pen.rect(6, 12, 1, 2, PAL.woodDark);
  pen.rect(19, 12, 1, 2, PAL.woodDark);
  pen.outline(PAL.outline);
  pen.rect(3, 4, 8, 1, PAL.waterShine);
};

const barrel = (pen: PixelPen): void => {
  pen.rect(1, 0, 9, 16, PAL.wood);
  pen.rect(1, 1, 2, 14, PAL.woodLight);
  pen.rect(8, 1, 2, 14, PAL.woodDark);
  pen.rect(4, 0, 1, 16, PAL.woodDark);
  pen.rect(6, 0, 1, 16, PAL.woodDark);
  pen.rect(1, 2, 9, 1, PAL.ironDark);
  pen.rect(1, 7, 9, 1, PAL.iron);
  pen.rect(1, 13, 9, 1, PAL.ironDark);
  pen.rect(1, 2, 9, 1, PAL.ironLight);
  pen.rect(2, 0, 7, 1, PAL.woodDark);
  pen.outline(PAL.outline);
};

const crate = (pen: PixelPen): void => {
  pen.rect(0, 0, 14, 14, PAL.wood);
  pen.rect(0, 0, 14, 1, PAL.woodLight);
  pen.rect(0, 0, 1, 14, PAL.woodLight);
  pen.rect(0, 13, 14, 1, PAL.woodDark);
  pen.rect(13, 0, 1, 14, PAL.woodDark);
  pen.rect(0, 4, 14, 1, PAL.woodDark);
  pen.rect(0, 9, 14, 1, PAL.woodDark);
  for (let i = 0; i < 14; i++) pen.px(i, i, PAL.woodDark);
  pen.px(2, 2, PAL.ironDark);
  pen.px(11, 11, PAL.ironDark);
  pen.outline(PAL.outline);
};

const crateStack = (pen: PixelPen): void => {
  crate(pen); // bottom crate
  // second crate offset on top
  pen.rect(4, -2, 12, 12, PAL.woodLight);
  pen.rect(4, -2, 12, 1, PAL.parchmentDark);
  pen.rect(4, 9, 12, 1, PAL.woodDark);
  pen.rect(15, -2, 1, 12, PAL.woodDark);
  pen.rect(4, 1, 12, 1, PAL.woodDark);
  pen.px(5, -1, PAL.ironDark);
  pen.outline(PAL.outline);
};

const sack = (pen: PixelPen): void => {
  pen.rect(2, 2, 9, 8, PAL.parchmentDark);
  pen.rect(2, 2, 9, 1, PAL.parchment);
  pen.rect(3, 8, 7, 2, PAL.dirtDark);
  pen.rect(4, 0, 4, 2, PAL.parchment);
  pen.rect(5, 1, 2, 1, PAL.woodDark);
  pen.px(4, 4, PAL.dirtDark);
  pen.px(8, 6, PAL.dirtDark);
  pen.outline(PAL.outline);
};

const haypile = (pen: PixelPen): void => {
  const r = rng(31);
  pen.blob(13, 8, 12, 5, PAL.dryGrassDark, r, 0.18);
  pen.blob(12, 6, 10, 4, PAL.dryGrass, r, 0.2);
  pen.blob(11, 4, 6, 3, PAL.dryGrassLight, r, 0.25);
  // pitchfork stuck in the pile
  pen.rect(20, 0, 1, 9, PAL.woodGrayDark);
  pen.rect(19, 0, 3, 2, PAL.ironDark);
  for (let i = 0; i < 10; i++) {
    pen.px(3 + r() * 20, 3 + r() * 8, r() < 0.5 ? PAL.dryGrass : PAL.dryGrassDark);
  }
  pen.outline(PAL.outline);
};

const bench = (pen: PixelPen): void => {
  pen.rect(0, 1, 18, 3, PAL.woodLight);
  pen.rect(0, 4, 18, 1, PAL.woodDark);
  pen.rect(1, 5, 2, 4, PAL.woodDark);
  pen.rect(15, 5, 2, 4, PAL.woodDark);
  pen.rect(0, 3, 18, 1, PAL.wood);
  pen.outline(PAL.outline);
};

const hitch = (pen: PixelPen): void => {
  pen.rect(2, 0, 3, 14, PAL.woodGrayDark);
  pen.rect(25, 0, 3, 14, PAL.woodGrayDark);
  pen.rect(0, 3, 30, 2, PAL.woodGray);
  pen.rect(0, 4, 30, 1, PAL.woodGrayDark);
  pen.rect(11, 5, 1, 5, PAL.parchmentDark);
  pen.rect(15, 5, 1, 5, PAL.parchmentDark);
  pen.rect(11, 9, 5, 1, PAL.parchmentDark);
  pen.outline(PAL.outline);
};

const lamppost = (pen: PixelPen): void => {
  pen.rect(5, 6, 2, 20, PAL.ironDark);
  pen.rect(5, 6, 1, 20, PAL.ironLight);
  pen.rect(3, 26, 6, 2, PAL.ironDark);
  pen.rect(4, 28, 4, 2, PAL.iron);
  pen.rect(3, 0, 6, 7, PAL.ironDark);
  pen.rect(4, 1, 4, 5, PAL.lampGlow);
  pen.px(5, 2, PAL.glassLight);
  pen.rect(3, 7, 6, 1, PAL.copperDark);
  pen.rect(6, 0, 1, 2, PAL.ironDark);
  pen.outline(PAL.outline);
  pen.rect(4, 1, 4, 5, PAL.lampGlow); // glass stays bright after outline
  pen.px(5, 2, PAL.glassLight);
};

const wagon = (pen: PixelPen): void => {
  const r = rng(7);
  // box
  pen.rect(4, 4, 26, 10, PAL.wood);
  for (let rx = 4; rx < 30; rx += 5) pen.rect(rx, 4, 1, 10, PAL.woodDark);
  pen.rect(4, 4, 26, 1, PAL.woodLight);
  pen.rect(4, 13, 26, 2, PAL.woodDark);
  // seat
  pen.rect(6, 0, 10, 4, PAL.woodLight);
  pen.rect(6, 3, 10, 1, PAL.woodDark);
  // wheels
  const wheel = (cx: number, cy: number, rad: number): void => {
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2;
      pen.px(cx + Math.round(Math.cos(ang) * rad), cy + Math.round(Math.sin(ang) * rad), PAL.trunkDark);
    }
    pen.rect(cx - 1, cy - 1, 2, 2, PAL.ironDark);
  };
  wheel(10, 18, 5);
  wheel(26, 18, 5);
  pen.rect(10, 14, 1, 9, PAL.trunkDark);
  pen.rect(6, 18, 9, 1, PAL.trunkDark);
  // broken spokes beside it
  pen.rect(31, 19, 6, 1, PAL.trunkDark);
  pen.rect(32, 21, 4, 1, PAL.trunkDark);
  if (r() < 1) pen.px(34, 17, PAL.trunkDark);
  // shafts + hay cargo
  pen.rect(30, 8, 8, 1, PAL.woodDark);
  pen.rect(36, 6, 2, 3, PAL.woodDark);
  pen.rect(8, 2, 12, 2, PAL.dryGrass);
  pen.px(14, 1, PAL.dryGrassDark);
  pen.outline(PAL.outline);
};

const wagon2 = (pen: PixelPen): void => {
  wagon(pen);
  // extra load: barrels strapped in the bed
  pen.rect(16, 2, 7, 8, PAL.wood);
  pen.rect(16, 2, 1, 8, PAL.woodLight);
  pen.rect(22, 2, 1, 8, PAL.woodDark);
  pen.rect(16, 4, 7, 1, PAL.ironDark);
  pen.rect(16, 8, 7, 1, PAL.ironDark);
  pen.outline(PAL.outline);
};

const log = (pen: PixelPen): void => {
  pen.rect(0, 3, 22, 6, PAL.trunk);
  pen.rect(0, 3, 22, 1, PAL.woodLight);
  pen.rect(0, 8, 22, 1, PAL.trunkDark);
  pen.rect(0, 2, 2, 8, PAL.deadWoodDark);
  pen.rect(20, 2, 2, 8, PAL.deadWoodDark);
  pen.rect(0, 4, 2, 2, PAL.deadWood);
  pen.rect(8, 0, 2, 3, PAL.trunkDark);
  pen.outline(PAL.outline);
};

const logseat = (pen: PixelPen): void => {
  log(pen);
  // de-barked seat area + a tin mug left behind
  pen.rect(6, 4, 8, 4, PAL.deadWood);
  pen.rect(7, 5, 6, 2, PAL.deadWoodDark);
  pen.rect(16, 1, 4, 4, PAL.ironLight);
  pen.rect(17, 0, 2, 1, PAL.ironDark);
  pen.outline(PAL.outline);
  pen.rect(16, 1, 4, 4, PAL.ironLight);
};

const sign = (pen: PixelPen): void => {
  // wide town-name board on a stout post
  pen.rect(20, 10, 3, 18, PAL.woodGrayDark);
  pen.rect(20, 10, 1, 18, PAL.woodGray);
  pen.rect(0, 0, 44, 12, PAL.woodPale);
  pen.rect(0, 0, 44, 1, PAL.wallPlankLight);
  pen.rect(0, 11, 44, 1, PAL.woodDark);
  pen.rect(0, 0, 1, 12, PAL.woodDark);
  pen.rect(43, 0, 1, 12, PAL.woodDark);
  pen.px(2, 2, PAL.ironDark);
  pen.px(41, 9, PAL.ironDark);
  pen.rect(18, 12, 3, 2, PAL.woodGrayDark);
  pen.rect(24, 12, 3, 2, PAL.woodGrayDark);
  pen.outline(PAL.outline);
};

const stump = (pen: PixelPen): void => {
  const r = rng(141);
  pen.blob(7, 5, 6, 3.6, PAL.trunk, r, 0.15);
  pen.blob(7, 4.6, 4.6, 2.6, PAL.deadWoodDark, r, 0.2);
  pen.blob(7, 4.4, 3.6, 2, PAL.deadWood, r, 0.25);
  // axe left in the stump
  pen.rect(10, 0, 1, 6, PAL.woodGrayDark);
  pen.rect(9, 0, 3, 2, PAL.ironLight);
  pen.outline(PAL.outline);
};

const boots = (pen: PixelPen): void => {
  // a pair of worn boots left by the road
  pen.rect(1, 2, 3, 4, PAL.leather);
  pen.rect(0, 5, 5, 2, PAL.leatherDark);
  pen.rect(5, 1, 3, 5, PAL.leather);
  pen.rect(4, 5, 5, 2, PAL.leatherDark);
  pen.px(1, 2, PAL.leatherLight);
  pen.px(5, 1, PAL.leatherLight);
  pen.outline(PAL.outline);
};

const ribcage = (pen: PixelPen): void => {
  // sun-bleached cattle ribcage
  pen.rect(2, 4, 12, 2, PAL.parchmentDark);      // spine
  for (const rx of [3, 6, 9, 12]) {
    pen.rect(rx, 1, 1, 8, PAL.parchmentDark);
    pen.rect(rx, 1, 1, 2, PAL.parchment);
  }
  pen.rect(1, 3, 2, 6, PAL.parchmentDark);
  pen.outline(PAL.outline);
};

const skull = (pen: PixelPen): void => {
  pen.rect(2, 2, 6, 4, PAL.parchmentDark);
  pen.rect(3, 1, 4, 1, PAL.parchmentDark);
  pen.rect(3, 6, 2, 2, PAL.parchmentDark); // horn stubs
  pen.rect(7, 6, 2, 1, PAL.parchmentDark);
  pen.px(3, 3, PAL.ink);
  pen.px(6, 3, PAL.ink);
  pen.outline(PAL.outline);
};

const reed = (pen: PixelPen): void => {
  const r = rng(151);
  for (let i = 0; i < 5; i++) {
    const bx = 1 + r() * 9;
    const h = 9 + r() * 8;
    const bend = r() < 0.5 ? -1 : 1;
    for (let s = 0; s < h; s++) {
      pen.px(bx + bend * (s / h) * 2, 17 - s, s > h - 3 ? PAL.reedDark : PAL.reed);
    }
    if (r() < 0.6) pen.rect(Math.floor(bx + bend * 2), 17 - h - 1, 1, 2, PAL.dryGrassDark); // seed head
  }
  pen.outline(PAL.outline);
};

// ---------------------------------------------------------------------------
// flora
// ---------------------------------------------------------------------------

function pine(pen: PixelPen): void {
  const r = rng(101);
  pen.rect(14, 36, 4, 12, PAL.trunk);
  pen.rect(14, 36, 1, 12, PAL.trunkDark);
  pen.rect(13, 46, 6, 2, PAL.trunkDark);
  const tier = (cx: number, top: number, halfW: number, hgt: number): void => {
    for (let ry = 0; ry < hgt; ry += 2) {
      const t = ry / hgt;
      const half = 1 + Math.round((halfW - 1) * t);
      const jx = r() < 0.35 ? (r() < 0.5 ? 1 : -1) : 0;
      const col = ry % 4 === 0 ? PAL.pineLight : ry % 4 === 2 ? PAL.pine : PAL.pineDark;
      pen.rect(cx - half + jx, top + ry, half * 2 + (r() < 0.2 ? 1 : 0), 2, col);
    }
    pen.rect(cx - 1, top - 1, 3, 2, PAL.pineLight);
  };
  tier(16, 0, 5, 9);
  tier(16, 8, 9, 12);
  tier(16, 19, 13, 16);
  // ragged bottom edge + west-side light
  pen.rect(4, 34, 24, 2, PAL.pineDark);
  for (let i = 0; i < 6; i++) {
    pen.px(6 + r() * 20, 35 + r() * 2, PAL.pineDark);
  }
  pen.rect(8, 12, 2, 7, PAL.pineLight);
  pen.rect(5, 25, 3, 6, PAL.pineLight);
  pen.speckle(6, 20, 22, 16, PAL.pineDark, 14, r);
  pen.outline(PAL.outline);
}

function oak(pen: PixelPen): void {
  const r = rng(102);
  pen.rect(17, 32, 5, 14, PAL.trunk);
  pen.rect(17, 32, 1, 14, PAL.trunkDark);
  pen.rect(21, 38, 5, 3, PAL.trunkDark); // limb
  pen.rect(16, 44, 7, 2, PAL.trunkDark);
  const blob = (x: number, y: number, w: number, h: number, col: string): void => {
    pen.rect(x + 1, y, w - 2, h, col);
    pen.rect(x, y + 1, w, h - 2, col);
  };
  blob(7, 8, 26, 16, PAL.foliageDark);
  blob(11, 2, 18, 11, PAL.foliageDark);
  blob(3, 15, 13, 11, PAL.foliage);
  blob(23, 15, 13, 11, PAL.foliage);
  blob(9, 13, 23, 13, PAL.foliage);
  blob(13, 4, 14, 9, PAL.foliage);
  // west-side highlights
  blob(9, 6, 9, 9, PAL.foliageLight);
  pen.rect(4, 17, 5, 5, PAL.foliageLight);
  pen.rect(25, 11, 5, 3, PAL.oliveLight);
  // leaf specks + east shade
  pen.speckle(6, 8, 28, 20, PAL.foliageDeep, 16, r);
  pen.speckle(8, 6, 24, 18, PAL.foliageLight, 10, r);
  pen.rect(6, 29, 28, 1, PAL.foliageDeep);
  pen.outline(PAL.outline);
}

function treeDead(pen: PixelPen): void {
  pen.rect(10, 14, 3, 28, PAL.deadWoodDark);
  pen.rect(10, 14, 1, 28, PAL.deadWood);
  pen.rect(12, 42, 4, 2, PAL.deadWoodDark);
  pen.rect(6, 12, 6, 2, PAL.deadWoodDark);
  pen.rect(4, 6, 2, 8, PAL.deadWoodDark);
  pen.rect(5, 6, 3, 1, PAL.deadWood);
  pen.rect(12, 8, 6, 2, PAL.deadWoodDark);
  pen.rect(17, 3, 2, 7, PAL.deadWoodDark);
  pen.rect(13, 8, 4, 1, PAL.deadWood);
  pen.rect(6, 20, 4, 1, PAL.deadWoodDark);
  pen.rect(10, 22, 2, 3, PAL.trunkDark); // woodpecker hole
  pen.outline(PAL.outline);
}

function treeSmall(pen: PixelPen): void {
  pen.rect(9, 18, 3, 12, PAL.trunk);
  pen.rect(9, 18, 1, 12, PAL.trunkDark);
  pen.rect(8, 28, 5, 2, PAL.trunkDark);
  pen.rect(3, 8, 15, 9, PAL.foliageDark);
  pen.rect(5, 3, 10, 7, PAL.foliage);
  pen.rect(7, 1, 6, 4, PAL.foliage);
  pen.rect(5, 5, 5, 4, PAL.foliageLight);
  pen.rect(13, 11, 4, 3, PAL.foliageDark);
  pen.px(4, 15, PAL.foliageDark);
  pen.outline(PAL.outline);
}

function saguaro(pen: PixelPen): void {
  const r = rng(103);
  pen.blob(10, 33, 8, 3, withA(PAL.trunkDark, 0.5), r, 0.3); // root base
  pen.rect(6, 0, 7, 34, PAL.cactus);
  pen.rect(6, 0, 1, 34, PAL.cactusDark);
  pen.rect(12, 0, 1, 34, PAL.cactusDark);
  pen.rect(8, 0, 1, 34, PAL.cactusLight);
  pen.rect(1, 10, 5, 3, PAL.cactus);
  pen.rect(1, 4, 3, 9, PAL.cactus);
  pen.rect(1, 4, 1, 9, PAL.cactusDark);
  pen.px(2, 4, PAL.cactusLight);
  pen.rect(13, 18, 5, 3, PAL.cactus);
  pen.rect(15, 21, 3, 8, PAL.cactus);
  pen.rect(17, 21, 1, 8, PAL.cactusDark);
  pen.px(15, 21, PAL.cactusLight);
  for (let y = 2; y < 32; y += 5) pen.px(11, y, PAL.pineDark);
  pen.rect(7, 0, 3, 2, PAL.cactusBloom);
  pen.px(8, 0, PAL.copperLight);
  pen.outline(PAL.outline);
  pen.rect(7, 0, 3, 2, PAL.cactusBloom);
}

function cactusPear(pen: PixelPen): void {
  pen.rect(6, 4, 7, 9, PAL.cactus);
  pen.rect(6, 4, 1, 9, PAL.cactusDark);
  pen.rect(3, 7, 5, 6, PAL.cactus);
  pen.rect(3, 7, 1, 6, PAL.cactusDark);
  pen.rect(11, 2, 5, 6, PAL.cactus);
  pen.rect(15, 2, 1, 6, PAL.cactusDark);
  pen.rect(9, 10, 6, 3, PAL.cactusDark);
  for (let i = 0; i < 6; i++) pen.px(7 + i * 2, 6 + (i % 3), PAL.pineDark);
  pen.px(13, 2, PAL.cactusBloom);
  pen.outline(PAL.outline);
}

function cactusAgave(pen: PixelPen): void {
  const blades: Array<[number, number, number]> = [
    [8, 0, 2], [5, 2, 1], [11, 2, 1], [3, 5, 1], [13, 5, 1],
    [6, 4, 2], [10, 4, 2], [4, 8, 1], [12, 8, 1],
  ];
  for (const [x, y, w] of blades) {
    pen.rect(x, y + 4, w, 12 - y, PAL.cactus);
    pen.rect(x, y + 4, 1, 12 - y, PAL.cactusDark);
    pen.px(x + (w > 1 ? 1 : 0), y + 4, PAL.cactusLight);
  }
  pen.rect(4, 13, 10, 2, PAL.cactusDark);
  pen.outline(PAL.outline);
}

const bushSage = (pen: PixelPen): void => {
  const r = rng(104);
  pen.blob(8, 7, 8, 4.4, PAL.sage, r, 0.22);
  pen.blob(7, 5.4, 5.4, 3, PAL.sageLight, r, 0.25);
  pen.blob(9, 8.6, 6.4, 3, PAL.sageDark, r, 0.25);
  pen.px(12, 6, PAL.sageLight);
  pen.px(5, 8, PAL.sageDark);
  pen.px(9, 10, PAL.deadWoodDark);
  pen.outline(PAL.outline);
};

const bushDry = (pen: PixelPen): void => {
  const r = rng(105);
  pen.blob(7, 7, 7, 4, PAL.dryGrassDark, r, 0.25);
  pen.blob(7, 5.6, 5, 2.8, PAL.dryGrass, r, 0.25);
  pen.rect(5, 1, 1, 4, PAL.deadWoodDark);
  pen.rect(8, 2, 1, 3, PAL.deadWoodDark);
  pen.px(7, 4, PAL.dryGrassLight);
  pen.outline(PAL.outline);
};

const bushFlower = (pen: PixelPen): void => {
  bushSage(pen);
  pen.px(5, 3, PAL.copper);
  pen.px(9, 2, PAL.cactusBloom);
  pen.px(12, 6, PAL.copperLight);
  pen.px(7, 6, PAL.parchment);
};

const tumbleweed = (pen: PixelPen): void => {
  const r = rng(106);
  for (let a = 0; a < 26; a++) {
    const ang = (a / 26) * Math.PI * 2;
    const rad = 3 + Math.floor(r() * 3);
    const x = 6 + Math.round(Math.cos(ang) * rad);
    const y = 6 + Math.round(Math.sin(ang) * rad);
    pen.px(x, y, PAL.tumble);
  }
  for (let i = 0; i < 10; i++) {
    pen.px(3 + Math.floor(r() * 7), 3 + Math.floor(r() * 7), PAL.tumbleDark);
  }
  pen.px(6, 6, PAL.deadWoodDark);
  pen.outline(PAL.outline);
};

// ---------------------------------------------------------------------------
// rocks
// ---------------------------------------------------------------------------

const rockBig = (pen: PixelPen): void => {
  const r = rng(107);
  pen.blob(11, 9, 10, 6.4, PAL.stone, r, 0.14);
  pen.blob(9, 6.6, 6, 3.6, PAL.stoneLight, r, 0.18);
  pen.rect(1, 14, 20, 1, PAL.stoneDark);
  pen.rect(4, 10, 3, 1, PAL.stoneDark);
  pen.rect(13, 11, 4, 2, PAL.stoneDark);
  pen.rect(9, 7, 2, 3, PAL.stoneDark);
  pen.speckle(3, 4, 16, 10, PAL.gravelDark, 8, r);
  pen.px(2, 9, PAL.gravelDark);
  pen.outline(PAL.outline);
};

const rockSmall = (pen: PixelPen): void => {
  const r = rng(108);
  pen.blob(7, 6, 6.4, 4, PAL.stone, r, 0.16);
  pen.blob(6, 4.6, 3.6, 2.2, PAL.stoneLight, r, 0.2);
  pen.rect(1, 9, 12, 1, PAL.stoneDark);
  pen.px(6, 6, PAL.stoneDark);
  pen.outline(PAL.outline);
};

// ---------------------------------------------------------------------------
// critters (multi-frame sheets)
// ---------------------------------------------------------------------------

const sheep = (pen: PixelPen): void => {
  for (let f = 0; f < 2; f++) {
    const ox = f * 18;
    const r = rng(109 + f);
    pen.blob(ox + 9, 7, 7.4, 4.4, PAL.wool, r, 0.18);
    pen.blob(ox + 9, 5.6, 5.4, 3, PAL.wool, r, 0.2);
    pen.rect(ox + 4, 10, 11, 2, PAL.woolDark);
    pen.px(ox + 5, 4, PAL.woolShade);
    pen.px(ox + 11, 6, PAL.woolShade);
    pen.rect(ox + 4, 11, 2, 3, PAL.faceDark);
    pen.rect(ox + 11, 11, 2, 3, PAL.faceDark);
    if (f === 0) {
      pen.rect(ox + 14, 3, 4, 4, PAL.faceDark);
      pen.px(ox + 17, 4, PAL.wool);
    } else {
      pen.rect(ox + 14, 8, 4, 4, PAL.faceDark);
      pen.rect(ox + 13, 10, 2, 2, PAL.faceDark);
    }
    pen.px(ox + 2, 6, PAL.woolDark);
    pen.outline(PAL.outline);
    if (f === 0) pen.px(ox + 15, 4, PAL.parchmentDark); // eye survives outline
    else pen.px(ox + 16, 9, PAL.parchmentDark);
  }
};

const horse = (pen: PixelPen): void => {
  for (let f = 0; f < 2; f++) {
    const ox = f * 28;
    pen.rect(ox + 5, 7, 16, 8, PAL.horseCoat);
    pen.rect(ox + 5, 13, 16, 2, PAL.horseCoatDark);
    pen.rect(ox + 7, 6, 12, 2, PAL.horseCoat);
    pen.rect(ox + 6, 15, 2, 7, PAL.horseCoatDark);
    pen.rect(ox + 11, 15, 2, 7, PAL.horseCoat);
    pen.rect(ox + 16, 15, 2, 7, PAL.horseCoatDark);
    pen.rect(ox + 20, 15, 2, 7, PAL.horseCoat);
    pen.rect(ox + 18, 2, 3, 7, PAL.horseCoat);
    pen.rect(ox + 18, 2, 1, 7, PAL.horseCoatDark);
    pen.rect(ox + 20, 0, 5, 4, PAL.horseCoat);
    pen.rect(ox + 23, 2, 2, 2, PAL.horseCoatDark);
    pen.rect(ox + 17, 1, 1, 8, PAL.horseMane);
    pen.rect(ox + 20, 0, 1, 3, PAL.horseMane);
    pen.rect(ox + 9, 6, 5, 3, PAL.horseBlanket);
    pen.rect(ox + 9, 6, 5, 1, PAL.bandana);
    if (f === 0) pen.rect(ox + 3, 6, 2, 8, PAL.horseMane);
    else { pen.rect(ox + 2, 5, 2, 9, PAL.horseMane); pen.px(ox + 4, 14, PAL.horseMane); }
    pen.px(ox + 20, 0, PAL.horseMane);
    pen.px(ox + 23, 0, PAL.horseMane);
    pen.outline(PAL.outline);
    pen.px(ox + 21, 1, PAL.ironDark); // eye
  }
};

const campfire = (pen: PixelPen): void => {
  for (let f = 0; f < 3; f++) {
    const ox = f * 16;
    const r = rng(110 + f);
    for (const [sx, sy] of [[2, 12], [5, 13], [9, 13], [12, 12], [1, 10], [13, 10]] as Array<[number, number]>) {
      pen.rect(ox + sx, sy, 2, 2, PAL.stone);
      pen.px(ox + sx, sy, PAL.stoneLight);
    }
    pen.rect(ox + 4, 10, 8, 2, PAL.trunk);
    pen.rect(ox + 6, 9, 4, 1, PAL.trunkDark);
    pen.rect(ox + 5, 11, 2, 1, PAL.trunkDark);
    pen.outline(PAL.outline);
    // flames drawn AFTER the outline so fire never gets a dark rim
    const h = f === 1 ? 7 : f === 2 ? 5 : 6;
    pen.rect(ox + 6, 12 - h, 4, h, PAL.flameMid);
    pen.rect(ox + 7, 12 - h - 1, 2, 2, PAL.flameEdge);
    pen.rect(ox + 7, 12 - Math.floor(h / 2), 2, Math.floor(h / 2), PAL.flameCore);
    pen.px(ox + 6, 12 - h, PAL.flameCore);
    pen.px(ox + 9, 13 - h, PAL.flameEdge);
    pen.px(ox + 5, 12, PAL.ember);
    pen.px(ox + 10, 11 + (f % 2), PAL.ember);
    void r;
  }
};

/** Windmill blades — 8 rotation frames drawn with ray-stepping. */
const windmillBlades = (pen: PixelPen): void => {
  const cx = 22;
  const cy = 22;
  for (let f = 0; f < 8; f++) {
    const ox = f * 44;
    const baseA = (f / 8) * Math.PI * 2;
    for (let s = 0; s < 6; s++) {
      const a = baseA + (s / 6) * Math.PI * 2;
      for (let t = 3; t <= 20; t++) {
        const x = Math.round(cx + Math.cos(a) * t);
        const y = Math.round(cy + Math.sin(a) * t);
        pen.rect(ox + x, y, 1, 2, PAL.woodGrayDark); // 2px-thick ray
        // sail cloth on the outer half — bright canvas against the sky
        if (t > 8 && t < 20) {
          for (const off of [0.13, 0.2]) {
            const px2 = Math.round(ox + cx + Math.cos(a + off) * t);
            const py2 = Math.round(cy + Math.sin(a + off) * t);
            pen.px(px2, py2, t % 3 === 0 ? PAL.parchmentDark : PAL.parchment);
          }
        }
      }
    }
    pen.rect(ox + cx - 2, cy - 2, 5, 5, PAL.woodDark);
    pen.rect(ox + cx - 1, cy - 1, 3, 3, PAL.copper);
  }
};

// ---------------------------------------------------------------------------
// effect textures
// ---------------------------------------------------------------------------

const dustTex = (pen: PixelPen): void => {
  pen.px(0, 1, 'rgba(203,184,148,0.9)');
  pen.px(1, 0, 'rgba(203,184,148,0.9)');
  pen.px(2, 2, 'rgba(184,166,127,0.8)');
};

const smokeTex = (pen: PixelPen): void => {
  pen.px(0, 1, 'rgba(187,181,168,0.85)');
  pen.px(1, 0, 'rgba(187,181,168,0.85)');
  pen.px(1, 1, 'rgba(145,140,129,0.7)');
  pen.px(2, 2, 'rgba(187,181,168,0.5)');
};

const rainTex = (pen: PixelPen): void => {
  pen.rect(0, 0, 1, 5, 'rgba(181,197,214,0.75)');
  pen.rect(0, 5, 1, 2, 'rgba(181,197,214,0.35)');
};

const moteTex = (pen: PixelPen): void => {
  pen.px(0, 0, 'rgba(233,218,178,0.8)');
  pen.px(1, 0, 'rgba(233,218,178,0.4)');
};

const coin = (pen: PixelPen): void => {
  pen.rect(1, 0, 6, 8, PAL.copper);
  pen.rect(0, 1, 8, 6, PAL.copper);
  pen.px(1, 1, PAL.copperDark);
  pen.px(6, 6, PAL.copperDark);
  pen.px(2, 2, PAL.stoneLight);
};

const heart = (pen: PixelPen): void => {
  pen.rect(1, 1, 2, 2, PAL.health);
  pen.rect(5, 1, 2, 2, PAL.health);
  pen.rect(0, 2, 8, 3, PAL.health);
  pen.rect(1, 5, 6, 1, PAL.health);
  pen.rect(2, 6, 4, 1, PAL.health);
  pen.rect(3, 7, 2, 1, PAL.health);
  pen.px(1, 2, '#e0705c');
};

// ---------------------------------------------------------------------------
// prop registry
// ---------------------------------------------------------------------------

export const PROPS: Record<string, PropSpec> = {
  // buildings (sizes match BUILDINGS art; lights/smoke/sign come from BUILDINGS)
  saloon:  { key: 'prop-saloon',  w: 112, h: 92, bodyW: 100, bodyH: 46, bodyGap: 0, signDy: 12 },
  store:   { key: 'prop-store',   w: 88,  h: 76, bodyW: 80,  bodyH: 40, bodyGap: 0, signDy: 24 },
  sheriff: { key: 'prop-sheriff', w: 72,  h: 68, bodyW: 64,  bodyH: 38, bodyGap: 0, signDy: 30 },
  bank:    { key: 'prop-bank',    w: 80,  h: 64, bodyW: 72,  bodyH: 36, bodyGap: 0, signDy: 26 },
  gunsmith: { key: 'prop-gunsmith', w: 48, h: 52, bodyW: 42, bodyH: 26, bodyGap: 0, signDy: 22 },
  houseA:  { key: 'prop-house-a', w: 68,  h: 58, bodyW: 56,  bodyH: 34, bodyGap: 0 },
  houseB:  { key: 'prop-house-b', w: 68,  h: 58, bodyW: 56,  bodyH: 34, bodyGap: 0 },
  stable:  { key: 'prop-stable',  w: 84,  h: 60, bodyW: 76,  bodyH: 32, bodyGap: 0 },
  watertower: { key: 'prop-watertower', w: 48, h: 64, bodyW: 32, bodyH: 10, bodyGap: 0 },
  windmill: {
    key: 'prop-windmill', w: 40, h: 72, bodyW: 14, bodyH: 8, bodyGap: 0,
    spinner: { key: 'prop-windmill-blades', dx: 0, dy: -62, anim: 'anim-windmill' },
  },
  ruin: { key: 'prop-ruin', w: 64, h: 44, bodyW: 56, bodyH: 14, bodyGap: 0 },

  // town props
  well:      { key: 'prop-well',     w: 22, h: 30, bodyW: 16, bodyH: 10, bodyGap: 0 },
  trough:    { key: 'prop-trough',   w: 26, h: 15, bodyW: 24, bodyH: 8,  bodyGap: 2 },
  barrel:    { key: 'prop-barrel',   w: 11, h: 16, bodyW: 9,  bodyH: 10, bodyGap: 1 },
  crate:     { key: 'prop-crate',    w: 14, h: 14, bodyW: 12, bodyH: 10, bodyGap: 1 },
  crateStack: { key: 'prop-crate-stack', w: 20, h: 22, bodyW: 18, bodyH: 14, bodyGap: 0 },
  sack:      { key: 'prop-sack',     w: 12, h: 10, bodyW: 10, bodyH: 6,  bodyGap: 1 },
  bench:     { key: 'prop-bench',    w: 18, h: 9,  bodyW: 16, bodyH: 5,  bodyGap: 2 },
  hitch:     { key: 'prop-hitch',    w: 30, h: 15, bodyW: 28, bodyH: 6,  bodyGap: 3 },
  sign:      { key: 'prop-sign',     w: 44, h: 30, bodyW: 8,  bodyH: 4,  bodyGap: 0 },
  lamppost: {
    key: 'prop-lamppost', w: 12, h: 30, bodyW: 4, bodyH: 4, bodyGap: 0,
    lights: [{ x: 6, y: 4, r: 46, color: PAL.lampGlow, flicker: 0.06 }],
  },
  wagon:  { key: 'prop-wagon',  w: 40, h: 24, bodyW: 30, bodyH: 12, bodyGap: 2 },
  wagon2: { key: 'prop-wagon2', w: 40, h: 24, bodyW: 30, bodyH: 12, bodyGap: 2 },
  log:    { key: 'prop-log',    w: 22, h: 10, bodyW: 20, bodyH: 6,  bodyGap: 1 },
  logseat: { key: 'prop-logseat', w: 22, h: 10, bodyW: 20, bodyH: 6, bodyGap: 1 },
  stump:  { key: 'prop-stump',  w: 14, h: 10, bodyW: 10, bodyH: 5,  bodyGap: 0 },
  haypile: { key: 'prop-haypile', w: 26, h: 14, bodyW: 22, bodyH: 8, bodyGap: 0 },

  // storytelling props (walkable decals)
  ribcage: { key: 'prop-ribcage', w: 18, h: 12, bodyW: 0, bodyH: 0, bodyGap: 0 },
  skull:   { key: 'prop-skull',   w: 10, h: 8,  bodyW: 0, bodyH: 0, bodyGap: 0 },
  boots:   { key: 'prop-boots',   w: 10, h: 8,  bodyW: 0, bodyH: 0, bodyGap: 0 },
  reed:    { key: 'prop-reed',    w: 12, h: 18, bodyW: 0, bodyH: 0, bodyGap: 0, sway: true },

  // flora
  tree_pine:    { key: 'prop-tree-pine',  w: 32, h: 48, bodyW: 10, bodyH: 7, bodyGap: 0, sway: true },
  tree_oak:     { key: 'prop-tree-oak',   w: 40, h: 46, bodyW: 12, bodyH: 7, bodyGap: 0, sway: true },
  tree_dead:    { key: 'prop-tree-dead',  w: 26, h: 44, bodyW: 8,  bodyH: 5, bodyGap: 0, sway: true },
  tree_small:   { key: 'prop-tree-small', w: 22, h: 30, bodyW: 8,  bodyH: 5, bodyGap: 0, sway: true },
  cactus_saguaro: { key: 'prop-cactus-sag', w: 20, h: 36, bodyW: 8,  bodyH: 9, bodyGap: 0, sway: true },
  cactus_pear:    { key: 'prop-cactus-pear', w: 18, h: 14, bodyW: 11, bodyH: 6, bodyGap: 0 },
  cactus_agave:   { key: 'prop-cactus-agave', w: 16, h: 14, bodyW: 10, bodyH: 5, bodyGap: 0 },
  bush_sage:   { key: 'prop-bush-sage',   w: 16, h: 12, bodyW: 0, bodyH: 0, bodyGap: 0, sway: true },
  bush_dry:    { key: 'prop-bush-dry',    w: 14, h: 11, bodyW: 0, bodyH: 0, bodyGap: 0, sway: true },
  bush_flower: { key: 'prop-bush-flower', w: 16, h: 12, bodyW: 0, bodyH: 0, bodyGap: 0, sway: true },

  // rocks
  rock_big:   { key: 'prop-rock-big',   w: 22, h: 16, bodyW: 20, bodyH: 10, bodyGap: 0 },
  rock_small: { key: 'prop-rock-small', w: 14, h: 11, bodyW: 12, bodyH: 8,  bodyGap: 0 },

  // critters + effects
  sheep: {
    key: 'prop-sheep', w: 18, h: 14, bodyW: 0, bodyH: 0, bodyGap: 0,
    anim: { frameW: 18, frames: 2, frameRate: 1.6, key: 'anim-sheep', repeat: -1 },
  },
  horse: {
    key: 'prop-horse', w: 28, h: 24, bodyW: 0, bodyH: 0, bodyGap: 0,
    anim: { frameW: 28, frames: 2, frameRate: 1.2, key: 'anim-horse', repeat: -1 },
  },
  campfire: {
    key: 'prop-campfire', w: 16, h: 16, bodyW: 10, bodyH: 6, bodyGap: 1,
    anim: { frameW: 16, frames: 3, frameRate: 7, key: 'anim-campfire', repeat: -1 },
    lights: [{ x: 8, y: 10, r: 48, color: PAL.flameMid, flicker: 0.3 }],
  },
  tumbleweed: { key: 'prop-tumbleweed', w: 12, h: 12, bodyW: 0, bodyH: 0, bodyGap: 0 },
};

const DRAWERS: Record<string, (pen: PixelPen) => void> = {
  well, trough, barrel, crate, crateStack, sack, bench, hitch, sign, lamppost,
  wagon, wagon2, log, logseat, stump, haypile, boots, ribcage, skull, reed,
  tree_pine: pine, tree_oak: oak, tree_dead: treeDead, tree_small: treeSmall,
  cactus_saguaro: saguaro, cactus_pear: cactusPear, cactus_agave: cactusAgave,
  bush_sage: bushSage, bush_dry: bushDry, bush_flower: bushFlower,
  rock_big: rockBig, rock_small: rockSmall,
  sheep, horse, campfire, tumbleweed,
};

/**
 * Build every prop texture, the ambient-anim sheets, and the effect
 * textures (shadow, dust, smoke, rain, mote, glow, vignette, sun-wash).
 */
export function buildAllProps(scene: Phaser.Scene): void {
  // buildings first (textures drawn from the BUILDINGS art registry)
  for (const [type, art] of Object.entries(BUILDINGS)) {
    const spec = PROPS[type];
    if (!spec) continue;
    const { pen, refresh } = makeCanvasTexture(scene, spec.key, art.w, art.h);
    art.draw(pen);
    refresh();
  }

  for (const [type, spec] of Object.entries(PROPS)) {
    const draw = DRAWERS[type];
    if (!draw) continue;
    const totalW = spec.anim ? spec.anim.frameW * spec.anim.frames : spec.w;
    const { pen, refresh } = makeCanvasTexture(scene, spec.key, totalW, spec.h);
    draw(pen);
    refresh();
    if (spec.anim) {
      const tex = scene.textures.get(spec.key);
      for (let i = 0; i < spec.anim.frames; i++) {
        if (!tex.has(i.toString())) {
          tex.add(i.toString(), 0, i * spec.anim.frameW, 0, spec.anim.frameW, spec.h);
        }
      }
      if (!scene.anims.exists(spec.anim.key)) {
        scene.anims.create({
          key: spec.anim.key,
          frames: scene.anims.generateFrameNumbers(spec.key, {
            frames: Array.from({ length: spec.anim.frames }, (_, i) => i),
          }),
          frameRate: spec.anim.frameRate,
          repeat: spec.anim.repeat,
        });
      }
    }
  }

  // windmill blades sheet (spinner layer)
  const wb = makeCanvasTexture(scene, 'prop-windmill-blades', 8 * 44, 44);
  windmillBlades(wb.pen);
  wb.refresh();
  const wbTex = scene.textures.get('prop-windmill-blades');
  for (let i = 0; i < 8; i++) {
    wbTex.add(i.toString(), 0, i * 44, 0, 44, 44);
  }
  if (!scene.anims.exists('anim-windmill')) {
    scene.anims.create({
      key: 'anim-windmill',
      frames: scene.anims.generateFrameNumbers('prop-windmill-blades', {
        frames: [0, 1, 2, 3, 4, 5, 6, 7],
      }),
      frameRate: 10,
      repeat: -1,
    });
  }

  // soft shadow blob (scaled per object in the scene)
  const sh = makeCanvasTexture(scene, 'shadow', 14, 5);
  sh.pen.rect(3, 0, 8, 1, 'rgba(16,10,4,0.5)');
  sh.pen.rect(1, 1, 12, 2, 'rgba(16,10,4,0.5)');
  sh.pen.rect(4, 3, 6, 1, 'rgba(16,10,4,0.5)');
  sh.refresh();

  // 1x1 invisible texture for static collision bodies
  const solid = makeCanvasTexture(scene, 'solid-px', 1, 1);
  solid.pen.px(0, 0, 'rgba(0,0,0,0)');
  solid.refresh();

  // particle textures
  const d = makeCanvasTexture(scene, 'dust', 3, 3); dustTex(d.pen); d.refresh();
  const s = makeCanvasTexture(scene, 'smoke', 4, 3); smokeTex(s.pen); s.refresh();
  const rn = makeCanvasTexture(scene, 'rain', 1, 7); rainTex(rn.pen); rn.refresh();
  const m = makeCanvasTexture(scene, 'mote', 2, 1); moteTex(m.pen); m.refresh();

  // lantern glow (radial light pool)
  const g = makeCanvasTexture(scene, 'glow', 112, 112);
  g.pen.radial(56, 56, 54, PAL.lampGlow);
  g.refresh();
  // fire glow (warmer)
  const f = makeCanvasTexture(scene, 'glow-fire', 112, 112);
  f.pen.radial(56, 56, 54, PAL.flameMid);
  f.refresh();

  // soft dark blobs for drifting cloud shadows (cluster of 3)
  const cl = makeCanvasTexture(scene, 'cloud', 200, 120);
  cl.pen.radial(70, 60, 62, PAL.ironDark);
  cl.pen.radial(120, 50, 52, PAL.ironDark);
  cl.pen.radial(150, 75, 44, PAL.ironDark);
  cl.refresh();

  // water shimmer streak (additive over the pond)
  const wm = makeCanvasTexture(scene, 'shimmer', 26, 3);
  wm.pen.rect(0, 1, 18, 1, 'rgba(160,200,220,0.55)');
  wm.pen.rect(20, 1, 6, 1, 'rgba(160,200,220,0.3)');
  wm.refresh();

  // golden-hour sun wash: horizontal gradient, warm from one side
  const sw = makeCanvasTexture(scene, 'sunwash', 480, 270);
  for (let x = 0; x < 480; x++) {
    const t = 1 - x / 480;                     // strong at the left edge
    const a = (t * t * 0.5).toFixed(3);
    sw.pen.rect(x, 0, 1, 270, `rgba(255,150,60,${a})`);
  }
  sw.refresh();

  // screen-space vignette: transparent center, darkened edges
  const v = makeCanvasTexture(scene, 'vignette', 480, 270);
  const bands = 34;
  for (let i = 0; i < bands; i++) {
    const t = i / bands;
    const a = (t * t * 0.58).toFixed(3);
    const col = `rgba(10,7,3,${a})`;
    v.pen.rect(0, i, 480, 1, col);
    v.pen.rect(0, 269 - i, 480, 1, col);
    v.pen.rect(i, 0, 1, 270, col);
    v.pen.rect(479 - i, 0, 1, 270, col);
  }
  v.refresh();

  // UI icons
  const c = makeCanvasTexture(scene, 'icon-coin', 8, 8); coin(c.pen); c.refresh();
  const h = makeCanvasTexture(scene, 'icon-heart', 8, 8); heart(h.pen); h.refresh();
}
