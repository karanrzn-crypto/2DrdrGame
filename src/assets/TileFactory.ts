/**
 * TileFactory.ts — builds the world tile sheet used by the PHYSICS layers.
 *
 * v3 rebuild: the visible ground moved to a single hand-painted canvas
 * (GroundPainter.ts) — the tilemap layers now exist only for collision and
 * are rendered hidden. The sheet therefore stays a cheap 8x8 grid of flat
 * family colors with light speckle; tile INDICES (TileIds.ts) keep their
 * exact meanings because collision, tests and NPC logic depend on them.
 */
import Phaser from 'phaser';
import { PAL } from './Palette';
import { makeCanvasTexture } from './PixelPen';
import { TILE } from './TileIds';

export { TILE, COLLIDER_TILES } from './TileIds';

export const TILE_SHEET_KEY = 'world-tiles';
export const TILE_COLS = 8;
export const TILE_SIZE = 16;

/** Family base colors for the hidden physics sheet. */
const FAMILY: Record<number, string> = {
  [TILE.GRASS0]: PAL.grass, [TILE.GRASS1]: PAL.grassAlt, [TILE.GRASSDRY]: PAL.grassDry,
  [TILE.GRASS_WOOD]: PAL.grassWood, [TILE.GRASS_WOOD1]: PAL.grassWoodAlt,
  [TILE.FLOWER]: PAL.grass, [TILE.FLOWER2]: PAL.grass, [TILE.TUFT]: PAL.grass,
  [TILE.DIRT0]: PAL.dirt, [TILE.DIRT1]: PAL.dirtAlt,
  [TILE.ROAD]: PAL.clay, [TILE.ROAD1]: PAL.clayAlt, [TILE.ROAD_RUT]: PAL.clay,
  [TILE.ROAD_EDGE_G]: PAL.clay, [TILE.ROAD_EDGE_S]: PAL.clay,
  [TILE.GRAVEL]: PAL.gravel,
  [TILE.SAND0]: PAL.sand, [TILE.SAND1]: PAL.sandAlt, [TILE.SAND2]: PAL.sandAlt,
  [TILE.SAND_CRACK]: PAL.sand, [TILE.SAND_EDGE_G]: PAL.sand, [TILE.DIRT_SAND]: PAL.sandAlt,
  [TILE.PLAZA0]: PAL.stone, [TILE.PLAZA1]: PAL.stoneDark,
  [TILE.WATER0]: PAL.water, [TILE.WATER1]: PAL.waterDark,
  [TILE.SHORE_N]: PAL.waterShore, [TILE.SHORE_S]: PAL.waterShore,
  [TILE.SHORE_E]: PAL.waterShore, [TILE.SHORE_W]: PAL.waterShore,
  [TILE.SHORE_C1]: PAL.waterShore, [TILE.SHORE_C2]: PAL.waterShore,
  [TILE.ROCK0]: PAL.stone, [TILE.ROCK1]: PAL.stoneDark, [TILE.ROCK2]: PAL.stone,
  [TILE.CLIFF_TOP]: PAL.mesaTop, [TILE.CLIFF_FACE]: PAL.mesa, [TILE.CLIFF_DARK]: PAL.mesaDark,
  [TILE.SCREE]: PAL.scree, [TILE.BONE]: PAL.sandAlt,
  [TILE.FENCE_H]: PAL.woodGray, [TILE.FENCE_V]: PAL.woodGray, [TILE.FENCE_POST]: PAL.woodGrayDark,
  [TILE.GATE]: PAL.woodGrayDark, [TILE.SOIL]: PAL.dirtDark, [TILE.CORRAL_DIRT]: PAL.clayAlt,
  [TILE.HAY]: PAL.grassDry, [TILE.TRACKS]: PAL.dirt,
  [TILE.PLANK]: PAL.wallPlank, [TILE.PORCH]: PAL.woodPale,
  [TILE.PEBBLES]: PAL.grass, [TILE.DIRT_PATCH]: PAL.grass,
  [TILE.GRASS_EDGE_D]: PAL.grass, [TILE.GRASS_EDGE_S]: PAL.grass,
  [TILE.STUMP]: PAL.grassWood, [TILE.RUBBLE]: PAL.dirtAlt,
};

/** Draw the physics tile sheet onto one canvas texture (16 x 16 cells). */
export function buildTileSheet(scene: Phaser.Scene): void {
  const size = TILE_COLS * TILE_SIZE;
  const { pen, refresh } = makeCanvasTexture(scene, TILE_SHEET_KEY, size, size);
  for (let i = 0; i < TILE_COLS * TILE_COLS; i++) {
    const ox = (i % TILE_COLS) * TILE_SIZE;
    const oy = Math.floor(i / TILE_COLS) * TILE_SIZE;
    pen.rect(ox, oy, TILE_SIZE, TILE_SIZE, FAMILY[i] ?? PAL.grass);
    // a few speckles so the sheet never reads as pure flat color in debug views
    if (i % 3 === 0) pen.px(ox + 4, oy + 5, '#00000022');
  }
  refresh();
}
