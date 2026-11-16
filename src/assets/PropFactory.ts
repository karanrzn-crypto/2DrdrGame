/**
 * PropFactory.ts — buildings, props and UI icons, all original procedural
 * pixel art. Each prop declares its collision box so visual size and
 * gameplay geometry stay consistent (master directive §19).
 */
import Phaser from 'phaser';
import { PAL } from './Palette';
import { makeCanvasTexture, PixelPen } from './PixelPen';

export interface PropSpec {
  key: string;
  w: number;
  h: number;
  /** Collision box width/height in px (0 = no body). */
  bodyW: number;
  bodyH: number;
  /** Gap between the prop's base line and the bottom of its collision box. */
  bodyGap: number;
}

function buildingBase(pen: PixelPen, w: number, h: number): void {
  pen.rect(1, h - 2, w - 2, 2, PAL.woodDark);
  pen.rect(1, h - 5, w - 2, 3, PAL.wallPlankDark);
}

function planks(pen: PixelPen, x: number, y: number, w: number, h: number): void {
  pen.rect(x, y, w, h, PAL.wallPlank);
  for (let px = x + 3; px < x + w; px += 4) {
    pen.rect(px, y, 1, h, PAL.wallPlankDark);
  }
}

function windowAt(pen: PixelPen, x: number, y: number, w = 12, h = 12): void {
  pen.rect(x - 1, y - 1, w + 2, h + 2, PAL.woodDark);
  pen.rect(x, y, w, h, PAL.waterDark);
  pen.rect(x + Math.floor(w / 2) - 1, y, 1, h, PAL.woodDark);
  pen.rect(x, y + Math.floor(h / 2) - 1, w, 1, PAL.woodDark);
  pen.rect(x, y, w, 1, PAL.stoneLight);
}

function doorAt(pen: PixelPen, x: number, y: number, w: number, h: number): void {
  pen.rect(x - 1, y - 1, w + 2, h + 1, PAL.woodDark);
  pen.rect(x, y, w, h, PAL.wood);
  pen.rect(x, y, w, 2, PAL.woodLight);
  pen.rect(x + w - 3, y + Math.floor(h / 2), 2, 2, PAL.copper);
}

const saloon = (pen: PixelPen): void => {
  const w = 96, h = 84;
  // false front (stepped parapet)
  pen.rect(6, 6, 84, 14, PAL.roofRust);
  pen.rect(16, 0, 64, 6, PAL.roofRust);
  pen.rect(16, 0, 64, 1, PAL.roofRustDark);
  pen.rect(6, 6, 84, 2, PAL.roofRustDark);
  // sign band (Persian sign text is drawn over this by WorldBuilder)
  pen.rect(20, 10, 56, 8, PAL.woodDark);
  pen.rect(20, 10, 56, 1, PAL.copper);
  // roof
  pen.rect(2, 20, 92, 12, PAL.roofBrown);
  for (let ry = 22; ry < 32; ry += 3) pen.rect(2, ry, 92, 1, PAL.roofBrownDark);
  // walls
  planks(pen, 4, 32, 88, 46);
  buildingBase(pen, w, h);
  // porch shadow line
  pen.rect(4, 32, 88, 2, PAL.woodDark);
  // door + windows
  doorAt(pen, 41, 50, 14, 32);
  windowAt(pen, 14, 40);
  windowAt(pen, 70, 40);
  // lamp beside the door
  pen.rect(58, 48, 2, 4, PAL.iron);
  pen.px(59, 47, PAL.copper);
  pen.px(59, 52, PAL.copperDark);
};

const store = (pen: PixelPen): void => {
  const w = 80, h = 72;
  pen.rect(4, 0, 72, 8, PAL.roofSlateDark);
  pen.rect(4, 8, 72, 2, PAL.roofSlate);
  // striped awning
  for (let ax = 4; ax < 76; ax += 8) {
    pen.rect(ax, 10, 4, 8, PAL.woodLight);
    pen.rect(ax + 4, 10, 4, 8, PAL.wood);
  }
  pen.rect(4, 18, 72, 1, PAL.woodDark);
  planks(pen, 4, 19, 72, 47);
  buildingBase(pen, w, h);
  doorAt(pen, 34, 42, 13, 26);
  windowAt(pen, 10, 32, 16, 14);
  windowAt(pen, 54, 32, 16, 14);
};

const sheriff = (pen: PixelPen): void => {
  const w = 64, h = 64;
  pen.rect(4, 0, 56, 6, PAL.roofRustDark);
  pen.rect(4, 6, 56, 2, PAL.roofRust);
  planks(pen, 4, 8, 56, 50);
  buildingBase(pen, w, h);
  doorAt(pen, 26, 34, 13, 24);
  windowAt(pen, 8, 28, 11, 11);
  windowAt(pen, 45, 28, 11, 11);
  // copper badge above the door
  pen.rect(30, 18, 5, 5, PAL.copper);
  pen.px(32, 20, PAL.parchment);
};

const house = (roof: string, roofDark: string) => (pen: PixelPen): void => {
  const w = 64, h = 54;
  // two-slope gable roof (drawn as stacked bands)
  for (let ry = 0; ry <= 16; ry += 2) {
    const half = 4 + ry * 1.6;
    const cx = 32;
    pen.rect(Math.floor(cx - half), ry, Math.floor(half * 2), 2, ry % 4 === 0 ? roof : roofDark);
  }
  planks(pen, 4, 20, 56, 28);
  buildingBase(pen, w, h);
  doorAt(pen, 28, 26, 11, 22);
  windowAt(pen, 10, 26, 9, 9);
  windowAt(pen, 45, 26, 9, 9);
  // chimney
  pen.rect(44, 6, 6, 10, PAL.stoneDark);
  pen.rect(44, 6, 6, 2, PAL.stone);
};

const well = (pen: PixelPen): void => {
  pen.rect(2, 16, 16, 10, PAL.stone);
  pen.rect(3, 17, 14, 7, PAL.waterDark);
  pen.rect(4, 18, 12, 4, PAL.water);
  pen.rect(2, 24, 16, 2, PAL.stoneDark);
  pen.rect(2, 4, 3, 12, PAL.woodDark);
  pen.rect(15, 4, 3, 12, PAL.woodDark);
  pen.rect(1, 3, 18, 2, PAL.wood);
  pen.rect(1, 3, 18, 1, PAL.woodLight);
  pen.px(10, 6, PAL.parchmentDark); // rope
  pen.rect(8, 8, 4, 4, PAL.woodDark); // bucket
};

const trough = (pen: PixelPen): void => {
  pen.rect(0, 2, 24, 10, PAL.wood);
  pen.rect(0, 2, 24, 2, PAL.woodLight);
  pen.rect(0, 10, 24, 2, PAL.woodDark);
  pen.rect(2, 4, 20, 5, PAL.water);
  pen.rect(2, 4, 20, 1, PAL.waterLight);
};

const barrel = (pen: PixelPen): void => {
  pen.rect(1, 0, 8, 15, PAL.wood);
  pen.rect(1, 0, 2, 15, PAL.woodLight);
  pen.rect(7, 0, 2, 15, PAL.woodDark);
  pen.rect(1, 2, 8, 1, PAL.iron);
  pen.rect(1, 7, 8, 1, PAL.iron);
  pen.rect(1, 12, 8, 1, PAL.iron);
  pen.rect(2, 0, 6, 1, PAL.woodDark);
};

const crate = (pen: PixelPen): void => {
  pen.rect(0, 0, 13, 13, PAL.wood);
  pen.rect(0, 0, 13, 1, PAL.woodLight);
  pen.rect(0, 0, 1, 13, PAL.woodLight);
  pen.rect(0, 12, 13, 1, PAL.woodDark);
  pen.rect(12, 0, 1, 13, PAL.woodDark);
  for (let i = 0; i < 13; i++) pen.px(i, i, PAL.woodDark);
};

const hitch = (pen: PixelPen): void => {
  pen.rect(2, 0, 3, 12, PAL.woodDark);
  pen.rect(23, 0, 3, 12, PAL.woodDark);
  pen.rect(0, 2, 26, 2, PAL.wood);
  pen.rect(0, 3, 26, 1, PAL.woodDark);
};

const sign = (pen: PixelPen): void => {
  pen.rect(5, 8, 2, 14, PAL.woodDark);
  pen.rect(0, 0, 12, 9, PAL.woodLight);
  pen.rect(0, 0, 12, 1, PAL.woodDark);
  pen.rect(0, 8, 12, 1, PAL.woodDark);
  pen.rect(0, 0, 1, 9, PAL.woodDark);
  pen.rect(11, 0, 1, 9, PAL.woodDark);
};

const treeBig = (pen: PixelPen): void => {
  pen.rect(12, 26, 4, 14, PAL.trunk);
  pen.rect(12, 38, 6, 2, PAL.trunk); // root flare
  pen.rect(4, 10, 20, 16, PAL.foliageDark);
  pen.rect(7, 4, 14, 10, PAL.foliageDark);
  pen.rect(6, 8, 16, 14, PAL.foliage);
  pen.rect(10, 2, 8, 8, PAL.foliage);
  pen.rect(9, 6, 5, 4, PAL.foliageLight);
  pen.rect(15, 12, 4, 3, PAL.foliageLight);
  pen.px(6, 20, PAL.foliageDark);
  pen.px(20, 16, PAL.foliageDark);
};

const treeSmall = (pen: PixelPen): void => {
  pen.rect(8, 16, 3, 12, PAL.trunk);
  pen.rect(4, 6, 12, 10, PAL.foliageDark);
  pen.rect(5, 3, 10, 8, PAL.foliage);
  pen.rect(7, 2, 5, 3, PAL.foliageLight);
};

const cactusBig = (pen: PixelPen): void => {
  pen.rect(6, 0, 5, 30, PAL.cactus);
  pen.rect(6, 0, 1, 30, PAL.cactusDark);
  pen.rect(10, 0, 1, 30, PAL.cactusDark);
  pen.rect(1, 10, 4, 3, PAL.cactus);
  pen.rect(1, 5, 3, 8, PAL.cactus);
  pen.rect(1, 5, 1, 8, PAL.cactusDark);
  pen.rect(12, 14, 4, 3, PAL.cactus);
  pen.rect(13, 17, 3, 6, PAL.cactus);
  pen.px(8, 1, PAL.foliageLight);
  pen.px(8, 0, PAL.copper); // a small bloom
};

const cactusSmall = (pen: PixelPen): void => {
  pen.rect(4, 0, 4, 18, PAL.cactus);
  pen.rect(4, 0, 1, 18, PAL.cactusDark);
  pen.rect(8, 6, 4, 2, PAL.cactus);
  pen.rect(10, 8, 2, 5, PAL.cactus);
  pen.px(6, 1, PAL.foliageLight);
};

const rockBig = (pen: PixelPen): void => {
  pen.rect(1, 8, 18, 6, PAL.stone);
  pen.rect(3, 4, 13, 4, PAL.stone);
  pen.rect(6, 2, 7, 2, PAL.stone);
  pen.rect(7, 3, 3, 1, PAL.stoneLight);
  pen.rect(2, 13, 16, 1, PAL.stoneDark);
  pen.rect(4, 10, 3, 1, PAL.stoneDark);
  pen.rect(12, 11, 3, 2, PAL.stoneDark);
};

const rockSmall = (pen: PixelPen): void => {
  pen.rect(1, 5, 11, 5, PAL.stone);
  pen.rect(3, 2, 7, 3, PAL.stone);
  pen.rect(4, 3, 3, 1, PAL.stoneLight);
  pen.rect(1, 9, 11, 1, PAL.stoneDark);
};

const bush = (pen: PixelPen): void => {
  pen.rect(2, 3, 10, 6, PAL.bush);
  pen.rect(4, 1, 6, 3, PAL.bush);
  pen.rect(2, 8, 10, 2, PAL.foliageDark);
  pen.px(5, 2, PAL.foliageLight);
  pen.px(9, 4, PAL.foliageLight);
};

const dust = (pen: PixelPen): void => {
  pen.px(0, 1, '#cbb894');
  pen.px(1, 0, '#cbb894');
  pen.px(2, 2, '#b8a67f');
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

/** Every prop: visual size + collision geometry. */
export const PROPS: Record<string, PropSpec> = {
  saloon:      { key: 'prop-saloon',   w: 96, h: 84, bodyW: 88, bodyH: 40, bodyGap: 0 },
  store:       { key: 'prop-store',    w: 80, h: 72, bodyW: 72, bodyH: 34, bodyGap: 0 },
  sheriff:     { key: 'prop-sheriff',  w: 64, h: 64, bodyW: 56, bodyH: 30, bodyGap: 0 },
  houseA:      { key: 'prop-house-a',  w: 64, h: 54, bodyW: 56, bodyH: 26, bodyGap: 0 },
  houseB:      { key: 'prop-house-b',  w: 64, h: 54, bodyW: 56, bodyH: 26, bodyGap: 0 },
  well:        { key: 'prop-well',     w: 20, h: 26, bodyW: 16, bodyH: 10, bodyGap: 0 },
  trough:      { key: 'prop-trough',   w: 24, h: 12, bodyW: 22, bodyH: 6,  bodyGap: 2 },
  barrel:      { key: 'prop-barrel',   w: 10, h: 15, bodyW: 9,  bodyH: 10, bodyGap: 1 },
  crate:       { key: 'prop-crate',    w: 13, h: 13, bodyW: 12, bodyH: 10, bodyGap: 1 },
  hitch:       { key: 'prop-hitch',    w: 28, h: 12, bodyW: 26, bodyH: 6,  bodyGap: 3 },
  sign:        { key: 'prop-sign',     w: 12, h: 22, bodyW: 8,  bodyH: 6,  bodyGap: 0 },
  tree_big:    { key: 'prop-tree-big',   w: 28, h: 40, bodyW: 12, bodyH: 8, bodyGap: 0 },
  tree_small:  { key: 'prop-tree-small', w: 20, h: 28, bodyW: 10, bodyH: 6, bodyGap: 0 },
  cactus_big:  { key: 'prop-cactus-big', w: 16, h: 30, bodyW: 8,  bodyH: 10, bodyGap: 0 },
  cactus_small:{ key: 'prop-cactus-sm',  w: 12, h: 18, bodyW: 6,  bodyH: 8,  bodyGap: 0 },
  rock_big:    { key: 'prop-rock-big',   w: 20, h: 14, bodyW: 18, bodyH: 11, bodyGap: 0 },
  rock_small:  { key: 'prop-rock-small', w: 13, h: 10, bodyW: 11, bodyH: 8,  bodyGap: 0 },
  bush:        { key: 'prop-bush',       w: 14, h: 10, bodyW: 0,  bodyH: 0,  bodyGap: 0 },
};

const DRAWERS: Record<string, (pen: PixelPen) => void> = {
  saloon, store, sheriff,
  houseA: house(PAL.roofBrown, PAL.roofBrownDark),
  houseB: house(PAL.roofSlate, PAL.roofSlateDark),
  well, trough, barrel, crate, hitch, sign,
  tree_big: treeBig, tree_small: treeSmall,
  cactus_big: cactusBig, cactus_small: cactusSmall,
  rock_big: rockBig, rock_small: rockSmall,
  bush,
};

/** Build every prop texture + the shadow, dust and UI-icon textures. */
export function buildAllProps(scene: Phaser.Scene): void {
  for (const [type, spec] of Object.entries(PROPS)) {
    const draw = DRAWERS[type];
    if (!draw) continue;
    const { pen, refresh } = makeCanvasTexture(scene, spec.key, spec.w, spec.h);
    draw(pen);
    refresh();
  }
  // soft shadow blob
  const sh = makeCanvasTexture(scene, 'shadow', 14, 5);
  sh.pen.rect(3, 0, 8, 1, 'rgba(16,10,4,0.5)');
  sh.pen.rect(1, 1, 12, 2, 'rgba(16,10,4,0.5)');
  sh.pen.rect(4, 3, 6, 1, 'rgba(16,10,4,0.5)');
  sh.refresh();
  // 1x1 invisible texture for static collision bodies
  const solid = makeCanvasTexture(scene, 'solid-px', 1, 1);
  solid.pen.px(0, 0, 'rgba(0,0,0,0)');
  solid.refresh();
  // particles + UI icons
  const d = makeCanvasTexture(scene, 'dust', 3, 3); dust(d.pen); d.refresh();
  const c = makeCanvasTexture(scene, 'icon-coin', 8, 8); coin(c.pen); c.refresh();
  const h = makeCanvasTexture(scene, 'icon-heart', 8, 8); heart(h.pen); h.refresh();
}
