/**
 * TileIds.ts — tile indices and collision rules, pure constants (no Phaser).
 * Split from TileFactory so tests and NPC logic can import them in Node.
 */
export const TILE = {
  GRASS0: 0,
  GRASS1: 1,
  GRASSDRY: 2,
  DIRT0: 3,
  DIRT1: 4,
  SAND0: 5,
  SAND1: 6,
  WATER0: 7,
  WATER1: 8,
  ROCK0: 9,
  ROCK1: 10,
  FENCE_H: 11,
  FENCE_V: 12,
  FENCE_POST: 13,
  FLOWER: 14,
  PLAZA: 15,
} as const;

/** Tile indices that block movement. */
export const COLLIDER_TILES: number[] = [
  TILE.WATER0, TILE.WATER1,
  TILE.ROCK0, TILE.ROCK1,
  TILE.FENCE_H, TILE.FENCE_V, TILE.FENCE_POST,
];
