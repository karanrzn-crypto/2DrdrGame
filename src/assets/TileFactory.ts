/**
 * TileFactory.ts — builds the world tile sheet procedurally (4x4 grid of
 * 16px tiles). All tiles are original pixel art drawn from Palette.ts.
 * Tile indices live in TileIds.ts (pure, testable without Phaser).
 */
import Phaser from 'phaser';
import { PAL } from './Palette';
import { makeCanvasTexture, PixelPen } from './PixelPen';
import { TILE } from './TileIds';

export { TILE, COLLIDER_TILES } from './TileIds';

export const TILE_SHEET_KEY = 'world-tiles';
export const TILE_COLS = 4;
export const TILE_SIZE = 16;

/** Deterministic speck positions (no Math.random — reproducible art). */
const SPECKS: Array<[number, number]> = [
  [2, 3], [7, 5], [12, 4], [4, 9], [10, 11], [14, 13], [6, 14], [1, 12],
];
const SPECKS2: Array<[number, number]> = [
  [5, 2], [11, 7], [3, 6], [13, 10], [8, 13], [15, 2], [2, 14], [9, 9],
];

function grass(pen: PixelPen, ox: number, oy: number, base: string, dark: string, light: string): void {
  pen.fill(base, TILE_SIZE, TILE_SIZE, ox, oy);
  for (const [sx, sy] of SPECKS) pen.px(ox + sx, oy + sy, dark);
  for (const [sx, sy] of SPECKS2) pen.px(ox + sx, oy + sy, light);
}

function dirt(pen: PixelPen, ox: number, oy: number, base: string, alt: string, dark: string): void {
  pen.fill(base, TILE_SIZE, TILE_SIZE, ox, oy);
  pen.rect(ox + 3, oy + 2, 4, 1, alt);
  pen.rect(ox + 9, oy + 6, 5, 1, alt);
  pen.rect(ox + 1, oy + 11, 4, 1, alt);
  pen.rect(ox + 11, oy + 12, 3, 1, alt);
  for (const [sx, sy] of SPECKS.slice(0, 4)) pen.px(ox + sx, oy + sy, dark);
  pen.px(ox + 7, oy + 9, dark);
}

function sand(pen: PixelPen, ox: number, oy: number, base: string, alt: string, dark: string): void {
  pen.fill(base, TILE_SIZE, TILE_SIZE, ox, oy);
  for (const [sx, sy] of SPECKS) pen.px(ox + sx, oy + sy, alt);
  for (const [sx, sy] of SPECKS2) pen.px(ox + sx, oy + sy, dark);
}

function water(pen: PixelPen, ox: number, oy: number, shift: number): void {
  pen.fill(PAL.water, TILE_SIZE, TILE_SIZE, ox, oy);
  pen.rect(ox, oy + 3 + shift, 6, 1, PAL.waterLight);
  pen.rect(ox + 8, oy + 3 + shift, 8, 1, PAL.waterLight);
  pen.rect(ox + 2, oy + 9 - shift, 7, 1, PAL.waterLight);
  pen.rect(ox + 11, oy + 12, 4, 1, PAL.waterDark);
  pen.rect(ox + 1, oy + 13, 3, 1, PAL.waterDark);
}

function rock(pen: PixelPen, ox: number, oy: number, small: boolean): void {
  // transparent background; a stone boulder sitting on the tile
  if (small) {
    pen.rect(ox + 3, oy + 7, 10, 6, PAL.stone);
    pen.rect(ox + 5, oy + 4, 6, 3, PAL.stone);
    pen.rect(ox + 7, oy + 3, 3, 1, PAL.stoneLight);
    pen.rect(ox + 4, oy + 12, 9, 1, PAL.stoneDark);
    pen.rect(ox + 3, oy + 11, 1, 2, PAL.stoneDark);
    pen.rect(ox + 12, oy + 11, 1, 2, PAL.stoneDark);
  } else {
    pen.rect(ox + 1, oy + 6, 14, 8, PAL.stone);
    pen.rect(ox + 3, oy + 3, 10, 3, PAL.stone);
    pen.rect(ox + 6, oy + 2, 4, 1, PAL.stone);
    pen.rect(ox + 7, oy + 3, 4, 1, PAL.stoneLight);
    pen.rect(ox + 5, oy + 5, 3, 1, PAL.stoneLight);
    pen.rect(ox + 1, oy + 13, 14, 1, PAL.stoneDark);
    pen.rect(ox + 2, oy + 11, 2, 2, PAL.stoneDark);
    pen.rect(ox + 12, oy + 10, 2, 3, PAL.stoneDark);
    pen.rect(ox + 6, oy + 8, 2, 1, PAL.stoneDark);
  }
}

function fenceH(pen: PixelPen, ox: number, oy: number): void {
  pen.rect(ox, oy + 6, TILE_SIZE, 2, PAL.wood);
  pen.rect(ox, oy + 11, TILE_SIZE, 2, PAL.wood);
  pen.rect(ox, oy + 7, TILE_SIZE, 1, PAL.woodDark);
  pen.rect(ox, oy + 12, TILE_SIZE, 1, PAL.woodDark);
  pen.rect(ox + 2, oy + 3, 2, 11, PAL.woodDark);
  pen.rect(ox + 11, oy + 3, 2, 11, PAL.woodDark);
  pen.rect(ox + 2, oy + 3, 1, 11, PAL.woodLight);
  pen.rect(ox + 11, oy + 3, 1, 11, PAL.woodLight);
}

function fenceV(pen: PixelPen, ox: number, oy: number): void {
  pen.rect(ox + 7, oy + 1, 2, 15, PAL.wood);
  pen.rect(ox + 8, oy + 1, 1, 15, PAL.woodDark);
  pen.rect(ox + 3, oy + 5, 10, 2, PAL.wood);
  pen.rect(ox + 3, oy + 10, 10, 2, PAL.wood);
  pen.rect(ox + 3, oy + 6, 10, 1, PAL.woodDark);
  pen.rect(ox + 3, oy + 11, 10, 1, PAL.woodDark);
}

function fencePost(pen: PixelPen, ox: number, oy: number): void {
  pen.rect(ox + 6, oy + 3, 3, 11, PAL.woodDark);
  pen.rect(ox + 6, oy + 3, 1, 11, PAL.wood);
  pen.rect(ox + 5, oy + 2, 5, 2, PAL.wood);
  pen.rect(ox + 5, oy + 2, 5, 1, PAL.woodLight);
}

function flower(pen: PixelPen, ox: number, oy: number): void {
  grass(pen, ox, oy, PAL.grass, PAL.grassSpeck, PAL.grassSpeckLight);
  pen.px(ox + 4, oy + 4, PAL.copper);
  pen.px(ox + 5, oy + 4, PAL.parchment);
  pen.px(ox + 11, oy + 8, PAL.copper);
  pen.px(ox + 7, oy + 12, PAL.parchment);
  pen.px(ox + 12, oy + 13, PAL.copper);
}

function plaza(pen: PixelPen, ox: number, oy: number): void {
  pen.fill(PAL.dirtAlt, TILE_SIZE, TILE_SIZE, ox, oy);
  pen.rect(ox + 2, oy + 3, 5, 4, PAL.stone);
  pen.rect(ox + 9, oy + 7, 5, 4, PAL.stone);
  pen.rect(ox + 4, oy + 11, 4, 3, PAL.stone);
  pen.rect(ox + 2, oy + 6, 5, 1, PAL.stoneDark);
  pen.rect(ox + 9, oy + 10, 5, 1, PAL.stoneDark);
}

/** Draw the full tile sheet onto one canvas texture. */
export function buildTileSheet(scene: Phaser.Scene): void {
  const { pen, refresh } = makeCanvasTexture(
    scene, TILE_SHEET_KEY, TILE_COLS * TILE_SIZE, TILE_COLS * TILE_SIZE,
  );
  const at = (i: number) => ({ ox: (i % TILE_COLS) * TILE_SIZE, oy: Math.floor(i / TILE_COLS) * TILE_SIZE });

  let a = at(TILE.GRASS0);
  grass(pen, a.ox, a.oy, PAL.grass, PAL.grassSpeck, PAL.grassSpeckLight);
  a = at(TILE.GRASS1);
  grass(pen, a.ox, a.oy, PAL.grassAlt, PAL.grassSpeck, PAL.grassSpeckLight);
  a = at(TILE.GRASSDRY);
  grass(pen, a.ox, a.oy, PAL.grassDry, PAL.dirtDark, PAL.parchmentDark);
  a = at(TILE.DIRT0);
  dirt(pen, a.ox, a.oy, PAL.dirt, PAL.dirtAlt, PAL.dirtDark);
  a = at(TILE.DIRT1);
  dirt(pen, a.ox, a.oy, PAL.dirtAlt, PAL.dirt, PAL.dirtDark);
  a = at(TILE.SAND0);
  sand(pen, a.ox, a.oy, PAL.sand, PAL.sandAlt, PAL.sandDark);
  a = at(TILE.SAND1);
  sand(pen, a.ox, a.oy, PAL.sandAlt, PAL.sand, PAL.sandDark);
  a = at(TILE.WATER0);
  water(pen, a.ox, a.oy, 0);
  a = at(TILE.WATER1);
  water(pen, a.ox, a.oy, 2);
  a = at(TILE.ROCK0);
  rock(pen, a.ox, a.oy, false);
  a = at(TILE.ROCK1);
  rock(pen, a.ox, a.oy, true);
  a = at(TILE.FENCE_H);
  fenceH(pen, a.ox, a.oy);
  a = at(TILE.FENCE_V);
  fenceV(pen, a.ox, a.oy);
  a = at(TILE.FENCE_POST);
  fencePost(pen, a.ox, a.oy);
  a = at(TILE.FLOWER);
  flower(pen, a.ox, a.oy);
  a = at(TILE.PLAZA);
  plaza(pen, a.ox, a.oy);

  refresh();
}
