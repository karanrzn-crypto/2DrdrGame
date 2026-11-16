/**
 * TileIds.ts — tile indices and collision rules, pure constants (no Phaser).
 * Split from TileFactory so tests and NPC logic can import them in Node.
 *
 * v2: the sheet grew from 4x4 to 8x8 (64 tiles) for the visual overhaul:
 * biome variants, transition dithers, road ruts, pond shores, mesa cliffs,
 * corral ground and small storytelling decals. Indices 0..15 keep their
 * original meaning; 16..63 are new.
 */
export const TILE = {
  // row 0 — grass family
  GRASS0: 0,
  GRASS1: 1,
  GRASSDRY: 2,
  GRASS_WOOD: 3,
  GRASS_WOOD1: 4,
  FLOWER: 5,
  FLOWER2: 6,
  TUFT: 7,
  // row 1 — dirt / road family
  DIRT0: 8,
  DIRT1: 9,
  ROAD: 10,
  ROAD1: 11,
  ROAD_RUT: 12,
  ROAD_EDGE_G: 13,
  ROAD_EDGE_S: 14,
  GRAVEL: 15,
  // row 2 — sand family + plaza
  SAND0: 16,
  SAND1: 17,
  SAND2: 18,
  SAND_CRACK: 19,
  SAND_EDGE_G: 20,
  DIRT_SAND: 21,
  PLAZA0: 22,
  PLAZA1: 23,
  // row 3 — water + shores
  WATER0: 24,
  WATER1: 25,
  SHORE_N: 26,
  SHORE_S: 27,
  SHORE_E: 28,
  SHORE_W: 29,
  SHORE_C1: 30,
  SHORE_C2: 31,
  // row 4 — rocks + cliffs
  ROCK0: 32,
  ROCK1: 33,
  ROCK2: 34,
  CLIFF_TOP: 35,
  CLIFF_FACE: 36,
  CLIFF_DARK: 37,
  SCREE: 38,
  BONE: 39,
  // row 5 — fences + farm
  FENCE_H: 40,
  FENCE_V: 41,
  FENCE_POST: 42,
  GATE: 43,
  SOIL: 44,
  CORRAL_DIRT: 45,
  HAY: 46,
  TRACKS: 47,
  // row 6 — town details + decals
  PLANK: 48,
  PORCH: 49,
  PEBBLES: 50,
  DIRT_PATCH: 51,
  GRASS_EDGE_D: 52,
  GRASS_EDGE_S: 53,
  STUMP: 54,
  RUBBLE: 55,
  // row 7 — reserve
  SPARE0: 56,
  SPARE1: 57,
  SPARE2: 58,
  SPARE3: 59,
  SPARE4: 60,
  SPARE5: 61,
  SPARE6: 62,
  SPARE7: 63,
} as const;

/** Tile indices that block movement. */
export const COLLIDER_TILES: number[] = [
  TILE.WATER0, TILE.WATER1,
  TILE.ROCK0, TILE.ROCK1, TILE.ROCK2,
  TILE.CLIFF_TOP, TILE.CLIFF_FACE, TILE.CLIFF_DARK,
  TILE.FENCE_H, TILE.FENCE_V, TILE.FENCE_POST,
];

/** Pond water tiles (both indices) — used for shimmer animation. */
export const WATER_TILES: number[] = [TILE.WATER0, TILE.WATER1];

/** Highest valid tile index (sheet is 8x8). */
export const MAX_TILE_INDEX = 63;
