/**
 * PropFactory.ts — props, flora, critters and effect textures, all original
 * procedural pixel art. Each prop declares its collision box so visual size
 * and gameplay geometry stay consistent (master directive §19).
 *
 * v2 visual overhaul: irregular silhouettes everywhere, per-object shading
 * that agrees with the western-sun direction, four tree species, three
 * cacti, story props (wagon, lamppost, bench, sacks, log), ambient critters
 * (grazing sheep, a horse at the hitch rail, a campfire) and the glow /
 * vignette / rain textures used by the atmosphere system.
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
  // posts + mini roof
  pen.rect(3, 2, 3, 14, PAL.woodDark);
  pen.rect(16, 2, 3, 14, PAL.woodDark);
  for (let ry = 0; ry < 6; ry++) {
    const half = 3 + Math.round((ry / 6) * 8);
    pen.rect(11 - half, ry, half * 2, 1, ry % 2 === 0 ? PAL.roofBrown : PAL.roofBrownDark);
  }
  pen.rect(10, 6, 2, 1, PAL.parchmentDark); // rope
  pen.rect(8, 8, 5, 5, PAL.woodDark);       // bucket
  pen.rect(9, 9, 3, 2, PAL.wood);
};

const trough = (pen: PixelPen): void => {
  pen.rect(0, 2, 26, 11, PAL.wood);
  pen.rect(0, 2, 26, 2, PAL.woodLight);
  pen.rect(0, 11, 26, 2, PAL.woodDark);
  pen.rect(2, 4, 22, 6, PAL.waterDark);
  pen.rect(2, 4, 22, 4, PAL.water);
  pen.rect(3, 4, 8, 1, PAL.waterShine);
  // legs + braces
  pen.rect(2, 13, 3, 1, PAL.woodDark);
  pen.rect(21, 13, 3, 1, PAL.woodDark);
  pen.rect(6, 12, 1, 2, PAL.woodDark);
  pen.rect(19, 12, 1, 2, PAL.woodDark);
};

const barrel = (pen: PixelPen): void => {
  pen.rect(1, 0, 9, 16, PAL.wood);
  pen.rect(1, 1, 2, 14, PAL.woodLight);
  pen.rect(8, 1, 2, 14, PAL.woodDark);
  // stave seams
  pen.rect(4, 0, 1, 16, PAL.woodDark);
  pen.rect(6, 0, 1, 16, PAL.woodDark);
  // hoops
  pen.rect(1, 2, 9, 1, PAL.ironDark);
  pen.rect(1, 7, 9, 1, PAL.iron);
  pen.rect(1, 13, 9, 1, PAL.ironDark);
  pen.rect(1, 2, 9, 1, PAL.ironLight);
  pen.rect(2, 0, 7, 1, PAL.woodDark); // top rim
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
  pen.px(2, 2, PAL.ironDark); // nails
  pen.px(11, 11, PAL.ironDark);
};

const sack = (pen: PixelPen): void => {
  pen.rect(2, 2, 9, 8, PAL.parchmentDark);
  pen.rect(2, 2, 9, 1, PAL.parchment);
  pen.rect(3, 8, 7, 2, PAL.dirtDark);
  pen.rect(4, 0, 4, 2, PAL.parchment); // tied top
  pen.rect(5, 1, 2, 1, PAL.woodDark);
  pen.px(4, 4, PAL.dirtDark); // stitch hint
  pen.px(8, 6, PAL.dirtDark);
};

const bench = (pen: PixelPen): void => {
  pen.rect(0, 1, 18, 3, PAL.woodLight);
  pen.rect(0, 4, 18, 1, PAL.woodDark);
  pen.rect(1, 5, 2, 4, PAL.woodDark);
  pen.rect(15, 5, 2, 4, PAL.woodDark);
  pen.rect(0, 3, 18, 1, PAL.wood);
};

const hitch = (pen: PixelPen): void => {
  pen.rect(2, 0, 3, 14, PAL.woodGrayDark);
  pen.rect(25, 0, 3, 14, PAL.woodGrayDark);
  pen.rect(0, 3, 30, 2, PAL.woodGray);
  pen.rect(0, 4, 30, 1, PAL.woodGrayDark);
  // rope loop
  pen.rect(11, 5, 1, 5, PAL.parchmentDark);
  pen.rect(15, 5, 1, 5, PAL.parchmentDark);
  pen.rect(11, 9, 5, 1, PAL.parchmentDark);
};

const lamppost = (pen: PixelPen): void => {
  pen.rect(5, 6, 2, 20, PAL.ironDark);
  pen.rect(5, 6, 1, 20, PAL.ironLight);
  pen.rect(3, 26, 6, 2, PAL.ironDark); // base
  pen.rect(4, 28, 4, 2, PAL.iron);
  // lantern head
  pen.rect(3, 0, 6, 7, PAL.ironDark);
  pen.rect(4, 1, 4, 5, PAL.lampGlow);
  pen.px(5, 2, PAL.glassLight);
  pen.rect(3, 7, 6, 1, PAL.copperDark);
  pen.rect(6, 0, 1, 2, PAL.ironDark); // hanger
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
  // wheels: one whole, one broken
  const wheel = (cx: number, cy: number, rad: number): void => {
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2;
      pen.px(cx + Math.round(Math.cos(ang) * rad), cy + Math.round(Math.sin(ang) * rad), PAL.trunkDark);
    }
    pen.rect(cx - 1, cy - 1, 2, 2, PAL.ironDark);
  };
  wheel(10, 18, 5);
  wheel(26, 18, 5);
  // spokes hint
  pen.rect(10, 14, 1, 9, PAL.trunkDark);
  pen.rect(6, 18, 9, 1, PAL.trunkDark);
  // broken: fallen side + scattered spokes
  pen.rect(31, 19, 6, 1, PAL.trunkDark);
  pen.rect(32, 21, 4, 1, PAL.trunkDark);
  if (r() < 1) pen.px(34, 17, PAL.trunkDark);
  // shafts
  pen.rect(30, 8, 8, 1, PAL.woodDark);
  pen.rect(36, 6, 2, 3, PAL.woodDark);
  // hay cargo
  pen.rect(8, 2, 12, 2, PAL.dryGrass);
  pen.px(14, 1, PAL.dryGrassDark);
};

const log = (pen: PixelPen): void => {
  pen.rect(0, 3, 22, 6, PAL.trunk);
  pen.rect(0, 3, 22, 1, PAL.woodLight);
  pen.rect(0, 8, 22, 1, PAL.trunkDark);
  // cut ends
  pen.rect(0, 2, 2, 8, PAL.deadWoodDark);
  pen.rect(20, 2, 2, 8, PAL.deadWoodDark);
  pen.rect(0, 4, 2, 2, PAL.deadWood);
  // branch stub
  pen.rect(8, 0, 2, 3, PAL.trunkDark);
};

const sign = (pen: PixelPen): void => {
  pen.rect(6, 10, 2, 16, PAL.woodGrayDark);
  pen.rect(6, 10, 1, 16, PAL.woodGray);
  pen.rect(0, 0, 14, 11, PAL.woodPale);
  pen.rect(0, 0, 14, 1, PAL.wallPlankLight);
  pen.rect(0, 10, 14, 1, PAL.woodDark);
  pen.rect(0, 0, 1, 11, PAL.woodDark);
  pen.rect(13, 0, 1, 11, PAL.woodDark);
  pen.px(2, 2, PAL.ironDark);
  pen.px(11, 8, PAL.ironDark);
  // braces
  pen.rect(1, 11, 2, 2, PAL.woodGrayDark);
  pen.rect(11, 11, 2, 2, PAL.woodGrayDark);
};

// ---------------------------------------------------------------------------
// flora — four tree species, three cacti, three bushes
// ---------------------------------------------------------------------------

function pine(pen: PixelPen): void {
  const r = rng(101);
  // trunk
  pen.rect(13, 34, 4, 12, PAL.trunk);
  pen.rect(13, 34, 1, 12, PAL.trunkDark);
  pen.rect(12, 44, 6, 2, PAL.trunkDark); // root flare
  // layered canopy (3 tiers, irregular)
  const tier = (cx: number, top: number, halfW: number, hgt: number): void => {
    for (let ry = 0; ry < hgt; ry += 2) {
      const t = ry / hgt;
      const half = 1 + Math.round((halfW - 1) * t);
      const col = ry % 4 === 0 ? PAL.pineLight : ry % 4 === 2 ? PAL.pine : PAL.pineDark;
      pen.rect(cx - half + (r() < 0.3 ? 1 : 0), top + ry, half * 2 - (r() < 0.2 ? 1 : 0), 2, col);
    }
    pen.rect(cx - 1, top - 1, 3, 2, PAL.pineLight);
  };
  tier(15, 0, 6, 10);
  tier(15, 9, 9, 12);
  tier(15, 20, 13, 14);
  // shadowed bottom edge + snow of light on the west side
  pen.rect(4, 33, 22, 1, PAL.pineDark);
  pen.rect(2, 30, 4, 2, PAL.pineDark);
  pen.rect(9, 12, 2, 6, PAL.pineLight);
  pen.rect(7, 24, 2, 5, PAL.pineLight);
}

function oak(pen: PixelPen): void {
  const r = rng(102);
  pen.rect(15, 30, 4, 14, PAL.trunk);
  pen.rect(15, 30, 1, 14, PAL.trunkDark);
  pen.rect(18, 36, 4, 3, PAL.trunkDark); // limb
  pen.rect(14, 42, 6, 2, PAL.trunkDark);
  // irregular broad canopy from blobs
  const blob = (x: number, y: number, w: number, h: number, col: string): void => {
    pen.rect(x + 1, y, w - 2, h, col);
    pen.rect(x, y + 1, w, h - 2, col);
  };
  blob(6, 8, 22, 14, PAL.foliageDark);
  blob(10, 2, 16, 10, PAL.foliageDark);
  blob(2, 14, 12, 10, PAL.foliage);
  blob(20, 14, 12, 10, PAL.foliage);
  blob(8, 12, 20, 12, PAL.foliage);
  blob(12, 4, 12, 8, PAL.foliage);
  // west-side highlights (sun from W-SW)
  blob(8, 6, 8, 8, PAL.foliageLight);
  pen.rect(4, 16, 4, 4, PAL.foliageLight);
  pen.rect(24, 10, 4, 2, PAL.oliveLight);
  // east-side shade + scattered leaf specks
  specks(pen, r, [[26, 20], [28, 16], [27, 24], [7, 26]], PAL.foliageDark);
  pen.rect(5, 27, 24, 1, PAL.foliageDark);
}

function specks(pen: PixelPen, r: () => number, pts: Array<[number, number]>, col: string): void {
  for (const [x, y] of pts) if (r() < 0.9) pen.px(x, y, col);
}

function treeDead(pen: PixelPen): void {
  // gnarled snag — a couple of bare limbs, no foliage
  pen.rect(10, 14, 3, 26, PAL.deadWoodDark);
  pen.rect(10, 14, 1, 26, PAL.deadWood);
  pen.rect(12, 40, 4, 2, PAL.deadWoodDark);
  // limbs
  pen.rect(6, 12, 6, 2, PAL.deadWoodDark);
  pen.rect(4, 6, 2, 8, PAL.deadWoodDark);
  pen.rect(5, 6, 3, 1, PAL.deadWood);
  pen.rect(12, 8, 6, 2, PAL.deadWoodDark);
  pen.rect(17, 3, 2, 7, PAL.deadWoodDark);
  pen.rect(13, 8, 4, 1, PAL.deadWood);
  pen.rect(6, 20, 4, 1, PAL.deadWoodDark);
  // woodpecker hole (storytelling)
  pen.rect(10, 22, 2, 3, PAL.trunkDark);
}

function treeSmall(pen: PixelPen): void {
  pen.rect(9, 18, 3, 12, PAL.trunk);
  pen.rect(9, 18, 1, 12, PAL.trunkDark);
  pen.rect(8, 28, 5, 2, PAL.trunkDark);
  // irregular little canopy
  pen.rect(3, 8, 15, 9, PAL.foliageDark);
  pen.rect(5, 3, 10, 7, PAL.foliage);
  pen.rect(7, 1, 6, 4, PAL.foliage);
  pen.rect(5, 5, 5, 4, PAL.foliageLight);
  pen.rect(13, 11, 4, 3, PAL.foliageDark);
  pen.px(4, 15, PAL.foliageDark);
}

function saguaro(pen: PixelPen): void {
  // classic two-armed saguaro with ribs and a bloom
  pen.rect(6, 0, 6, 34, PAL.cactus);
  pen.rect(6, 0, 1, 34, PAL.cactusDark);
  pen.rect(11, 0, 1, 34, PAL.cactusDark);
  pen.rect(8, 0, 1, 34, PAL.cactusLight); // rib highlight
  // left arm (up)
  pen.rect(1, 10, 5, 3, PAL.cactus);
  pen.rect(1, 4, 3, 9, PAL.cactus);
  pen.rect(1, 4, 1, 9, PAL.cactusDark);
  pen.px(2, 4, PAL.cactusLight);
  // right arm (lower)
  pen.rect(12, 18, 5, 3, PAL.cactus);
  pen.rect(14, 21, 3, 8, PAL.cactus);
  pen.rect(16, 21, 1, 8, PAL.cactusDark);
  pen.px(14, 21, PAL.cactusLight);
  // spines hint
  for (let y = 2; y < 32; y += 5) pen.px(10, y, PAL.pineDark);
  // bloom
  pen.rect(7, 0, 3, 2, PAL.cactusBloom);
  pen.px(8, 0, PAL.copperLight);
}

function cactusPear(pen: PixelPen): void {
  // prickly pear pads
  pen.rect(6, 4, 7, 9, PAL.cactus);
  pen.rect(6, 4, 1, 9, PAL.cactusDark);
  pen.rect(3, 7, 5, 6, PAL.cactus);
  pen.rect(3, 7, 1, 6, PAL.cactusDark);
  pen.rect(11, 2, 5, 6, PAL.cactus);
  pen.rect(15, 2, 1, 6, PAL.cactusDark);
  pen.rect(9, 10, 6, 3, PAL.cactusDark);
  for (let i = 0; i < 6; i++) pen.px(7 + i * 2, 6 + (i % 3), PAL.pineDark);
  pen.px(13, 2, PAL.cactusBloom);
}

function cactusAgave(pen: PixelPen): void {
  // spiky rosette
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
}

const bushSage = (pen: PixelPen): void => {
  pen.rect(2, 4, 12, 6, PAL.sage);
  pen.rect(4, 2, 8, 4, PAL.sage);
  pen.rect(2, 9, 12, 2, PAL.sageDark);
  pen.rect(4, 3, 4, 3, PAL.sageLight);
  pen.px(11, 5, PAL.sageLight);
  pen.px(5, 8, PAL.sageDark);
  pen.px(9, 10, PAL.deadWoodDark); // twig
};

const bushDry = (pen: PixelPen): void => {
  // brittle dry scrub
  pen.rect(2, 5, 11, 5, PAL.dryGrassDark);
  pen.rect(4, 3, 6, 4, PAL.dryGrass);
  pen.rect(2, 9, 11, 2, PAL.dryGrassDark);
  pen.rect(5, 1, 1, 4, PAL.deadWoodDark);
  pen.rect(8, 2, 1, 3, PAL.deadWoodDark);
  pen.px(7, 4, PAL.dryGrassLight);
};

const bushFlower = (pen: PixelPen): void => {
  bushSage(pen);
  pen.px(5, 3, PAL.copper);
  pen.px(9, 2, PAL.cactusBloom);
  pen.px(12, 6, PAL.copperLight);
  pen.px(7, 6, PAL.parchment);
};

const tumbleweed = (pen: PixelPen): void => {
  // loose tangled ball (rotates while rolling — animation in the scene)
  const r = rng(105);
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
};

// ---------------------------------------------------------------------------
// rocks
// ---------------------------------------------------------------------------

const rockBig = (pen: PixelPen): void => {
  pen.rect(1, 8, 20, 7, PAL.stone);
  pen.rect(3, 4, 15, 4, PAL.stone);
  pen.rect(6, 2, 8, 2, PAL.stone);
  pen.rect(7, 3, 4, 1, PAL.stoneLight);
  pen.rect(3, 5, 4, 1, PAL.stoneLight);
  pen.rect(1, 14, 20, 1, PAL.stoneDark);
  pen.rect(4, 10, 3, 1, PAL.stoneDark);
  pen.rect(13, 11, 4, 2, PAL.stoneDark);
  pen.rect(9, 7, 2, 3, PAL.stoneDark); // crack
  pen.px(2, 9, PAL.gravelDark);
};

const rockSmall = (pen: PixelPen): void => {
  pen.rect(1, 5, 12, 5, PAL.stone);
  pen.rect(3, 2, 8, 3, PAL.stone);
  pen.rect(4, 3, 3, 1, PAL.stoneLight);
  pen.rect(1, 9, 12, 1, PAL.stoneDark);
  pen.px(6, 6, PAL.stoneDark);
};

// ---------------------------------------------------------------------------
// critters (multi-frame sheets)
// ---------------------------------------------------------------------------

/** Sheep, 2 frames: head up / grazing. */
const sheep = (pen: PixelPen): void => {
  for (let f = 0; f < 2; f++) {
    const ox = f * 18;
    // wool body (lumpy)
    pen.rect(ox + 3, 4, 11, 7, PAL.wool);
    pen.rect(ox + 2, 5, 13, 5, PAL.wool);
    pen.rect(ox + 5, 3, 7, 2, PAL.wool);
    pen.rect(ox + 3, 9, 11, 2, PAL.woolDark);
    pen.px(ox + 5, 4, PAL.woolShade);
    pen.px(ox + 11, 6, PAL.woolShade);
    // legs
    pen.rect(ox + 4, 11, 2, 3, PAL.faceDark);
    pen.rect(ox + 11, 11, 2, 3, PAL.faceDark);
    // head
    if (f === 0) {
      pen.rect(ox + 13, 3, 4, 4, PAL.faceDark);
      pen.px(ox + 16, 4, PAL.wool);
    } else {
      pen.rect(ox + 13, 8, 4, 4, PAL.faceDark); // grazing
      pen.rect(ox + 12, 10, 2, 2, PAL.faceDark);
    }
    // tail
    pen.px(ox + 2, 6, PAL.woolDark);
  }
};

/** Horse, 2 frames: standing / tail flick. */
const horse = (pen: PixelPen): void => {
  for (let f = 0; f < 2; f++) {
    const ox = f * 28;
    // body
    pen.rect(ox + 5, 7, 16, 8, PAL.horseCoat);
    pen.rect(ox + 5, 13, 16, 2, PAL.horseCoatDark);
    pen.rect(ox + 7, 6, 12, 2, PAL.horseCoat);
    // legs
    pen.rect(ox + 6, 15, 2, 7, PAL.horseCoatDark);
    pen.rect(ox + 11, 15, 2, 7, PAL.horseCoat);
    pen.rect(ox + 16, 15, 2, 7, PAL.horseCoatDark);
    pen.rect(ox + 20, 15, 2, 7, PAL.horseCoat);
    // neck + head
    pen.rect(ox + 18, 2, 3, 7, PAL.horseCoat);
    pen.rect(ox + 18, 2, 1, 7, PAL.horseCoatDark);
    pen.rect(ox + 20, 0, 5, 4, PAL.horseCoat);
    pen.rect(ox + 23, 2, 2, 2, PAL.horseCoatDark); // muzzle
    pen.px(ox + 21, 1, PAL.ironDark); // eye
    // mane
    pen.rect(ox + 17, 1, 1, 8, PAL.horseMane);
    pen.rect(ox + 20, 0, 1, 3, PAL.horseMane);
    // saddle blanket
    pen.rect(ox + 8, 6, 7, 3, PAL.horseBlanket);
    pen.rect(ox + 8, 6, 7, 1, PAL.bandana);
    // tail (frame 1: flicked)
    if (f === 0) pen.rect(ox + 3, 6, 2, 8, PAL.horseMane);
    else { pen.rect(ox + 2, 5, 2, 9, PAL.horseMane); pen.px(ox + 4, 14, PAL.horseMane); }
    // ears
    pen.px(ox + 20, 0, PAL.horseMane);
    pen.px(ox + 23, 0, PAL.horseMane);
  }
};

/** Campfire, 3 frames of flame over a stone-log ring. */
const campfire = (pen: PixelPen): void => {
  for (let f = 0; f < 3; f++) {
    const ox = f * 16;
    // stone ring
    for (const [sx, sy] of [[2, 12], [5, 13], [9, 13], [12, 12], [1, 10], [13, 10]] as Array<[number, number]>) {
      pen.rect(ox + sx, sy, 2, 2, PAL.stone);
      pen.px(ox + sx, sy, PAL.stoneLight);
    }
    // crossed logs
    pen.rect(ox + 4, 10, 8, 2, PAL.trunk);
    pen.rect(ox + 6, 9, 4, 1, PAL.trunkDark);
    pen.rect(ox + 5, 11, 2, 1, PAL.trunkDark);
    // flames vary per frame
    const h = f === 1 ? 7 : f === 2 ? 5 : 6;
    pen.rect(ox + 6, 12 - h, 4, h, PAL.flameMid);
    pen.rect(ox + 7, 12 - h - 1, 2, 2, PAL.flameEdge);
    pen.rect(ox + 7, 12 - Math.floor(h / 2), 2, Math.floor(h / 2), PAL.flameCore);
    pen.px(ox + 6, 12 - h, PAL.flameCore);
    pen.px(ox + 9, 13 - h, PAL.flameEdge);
    // embers
    pen.px(ox + 5, 12, PAL.ember);
    pen.px(ox + 10, 11 + (f % 2), PAL.ember);
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
  pen.px(0, 1, 'rgba(185,179,166,0.85)');
  pen.px(1, 0, 'rgba(185,179,166,0.85)');
  pen.px(1, 1, 'rgba(143,138,127,0.7)');
  pen.px(2, 2, 'rgba(185,179,166,0.5)');
};

const rainTex = (pen: PixelPen): void => {
  pen.rect(0, 0, 1, 5, 'rgba(181,197,214,0.75)');
  pen.rect(0, 5, 1, 2, 'rgba(181,197,214,0.35)');
};

const moteTex = (pen: PixelPen): void => {
  pen.px(0, 0, 'rgba(232,217,176,0.8)');
  pen.px(1, 0, 'rgba(232,217,176,0.4)');
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

/** Every prop: texture key, visual size, collision geometry, behavior hints. */
export const PROPS: Record<string, PropSpec> = {
  // buildings (sizes match BUILDINGS art; lights/smoke/sign come from BUILDINGS)
  saloon:  { key: 'prop-saloon',  w: 112, h: 92, bodyW: 100, bodyH: 46, bodyGap: 0, signDy: 12 },
  store:   { key: 'prop-store',   w: 88,  h: 76, bodyW: 80,  bodyH: 40, bodyGap: 0, signDy: 24 },
  sheriff: { key: 'prop-sheriff', w: 72,  h: 68, bodyW: 64,  bodyH: 38, bodyGap: 0, signDy: 30 },
  bank:    { key: 'prop-bank',    w: 80,  h: 64, bodyW: 72,  bodyH: 36, bodyGap: 0, signDy: 26 },
  houseA:  { key: 'prop-house-a', w: 68,  h: 58, bodyW: 56,  bodyH: 34, bodyGap: 0 },
  houseB:  { key: 'prop-house-b', w: 68,  h: 58, bodyW: 56,  bodyH: 34, bodyGap: 0 },
  stable:  { key: 'prop-stable',  w: 84,  h: 60, bodyW: 76,  bodyH: 32, bodyGap: 0 },

  // town props
  well:     { key: 'prop-well',     w: 22, h: 30, bodyW: 16, bodyH: 10, bodyGap: 0 },
  trough:   { key: 'prop-trough',   w: 26, h: 15, bodyW: 24, bodyH: 8,  bodyGap: 2 },
  barrel:   { key: 'prop-barrel',   w: 11, h: 16, bodyW: 9,  bodyH: 10, bodyGap: 1 },
  crate:    { key: 'prop-crate',    w: 14, h: 14, bodyW: 12, bodyH: 10, bodyGap: 1 },
  sack:     { key: 'prop-sack',     w: 12, h: 10, bodyW: 10, bodyH: 6,  bodyGap: 1 },
  bench:    { key: 'prop-bench',    w: 18, h: 9,  bodyW: 16, bodyH: 5,  bodyGap: 2 },
  hitch:    { key: 'prop-hitch',    w: 30, h: 15, bodyW: 28, bodyH: 6,  bodyGap: 3 },
  sign:     { key: 'prop-sign',     w: 14, h: 26, bodyW: 8,  bodyH: 4,  bodyGap: 0 },
  lamppost: {
    key: 'prop-lamppost', w: 12, h: 30, bodyW: 4, bodyH: 4, bodyGap: 0,
    lights: [{ x: 6, y: 4, r: 40, color: PAL.lampGlow, flicker: 0.06 }],
  },
  wagon: { key: 'prop-wagon', w: 40, h: 24, bodyW: 30, bodyH: 12, bodyGap: 2 },
  log:   { key: 'prop-log',   w: 22, h: 10, bodyW: 20, bodyH: 6,  bodyGap: 1 },

  // flora (sway enabled for the big ones)
  tree_pine:    { key: 'prop-tree-pine',  w: 30, h: 46, bodyW: 10, bodyH: 7, bodyGap: 0, sway: true },
  tree_oak:     { key: 'prop-tree-oak',   w: 34, h: 44, bodyW: 12, bodyH: 7, bodyGap: 0, sway: true },
  tree_dead:    { key: 'prop-tree-dead',  w: 24, h: 42, bodyW: 8,  bodyH: 5, bodyGap: 0, sway: true },
  tree_small:   { key: 'prop-tree-small', w: 22, h: 30, bodyW: 8,  bodyH: 5, bodyGap: 0, sway: true },
  cactus_saguaro: { key: 'prop-cactus-sag', w: 18, h: 34, bodyW: 8,  bodyH: 9, bodyGap: 0, sway: true },
  cactus_pear:    { key: 'prop-cactus-pear', w: 18, h: 14, bodyW: 11, bodyH: 6, bodyGap: 0 },
  cactus_agave:   { key: 'prop-cactus-agave', w: 16, h: 14, bodyW: 10, bodyH: 5, bodyGap: 0 },
  bush_sage:   { key: 'prop-bush-sage',   w: 16, h: 11, bodyW: 0, bodyH: 0, bodyGap: 0, sway: true },
  bush_dry:    { key: 'prop-bush-dry',    w: 14, h: 11, bodyW: 0, bodyH: 0, bodyGap: 0, sway: true },
  bush_flower: { key: 'prop-bush-flower', w: 16, h: 11, bodyW: 0, bodyH: 0, bodyGap: 0, sway: true },

  // rocks
  rock_big:   { key: 'prop-rock-big',   w: 22, h: 16, bodyW: 20, bodyH: 10, bodyGap: 0 },
  rock_small: { key: 'prop-rock-small', w: 14, h: 10, bodyW: 12, bodyH: 8,  bodyGap: 0 },

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
    lights: [{ x: 8, y: 10, r: 44, color: PAL.flameMid, flicker: 0.3 }],
  },
  tumbleweed: { key: 'prop-tumbleweed', w: 12, h: 12, bodyW: 0, bodyH: 0, bodyGap: 0 },
};

const DRAWERS: Record<string, (pen: PixelPen) => void> = {
  well, trough, barrel, crate, sack, bench, hitch, sign, lamppost, wagon, log,
  tree_pine: pine, tree_oak: oak, tree_dead: treeDead, tree_small: treeSmall,
  cactus_saguaro: saguaro, cactus_pear: cactusPear, cactus_agave: cactusAgave,
  bush_sage: bushSage, bush_dry: bushDry, bush_flower: bushFlower,
  rock_big: rockBig, rock_small: rockSmall,
  sheep, horse, campfire, tumbleweed,
};

/**
 * Build every prop texture, the ambient-anim sheets, and the effect
 * textures (shadow, dust, smoke, rain, mote, glow, vignette, UI icons).
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
      // register numbered frames + the looping animation
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
  const g = makeCanvasTexture(scene, 'glow', 96, 96);
  g.pen.radial(48, 48, 46, PAL.lampGlow);
  g.refresh();
  // fire glow (warmer)
  const f = makeCanvasTexture(scene, 'glow-fire', 96, 96);
  f.pen.radial(48, 48, 46, PAL.flameMid);
  f.refresh();

  // soft dark blob for drifting cloud shadows
  const cl = makeCanvasTexture(scene, 'cloud', 160, 100);
  cl.pen.radial(80, 50, 76, PAL.ironDark);
  cl.refresh();

  // screen-space vignette: transparent center, darkened edges (4 bands)
  const v = makeCanvasTexture(scene, 'vignette', 480, 270);
  const bands = 34;
  for (let i = 0; i < bands; i++) {
    const t = i / bands;                 // 0 = innermost band, 1 = screen edge
    const a = (t * t * 0.62).toFixed(3); // quadratic: subtle until the rim
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
