/**
 * MapData.ts — the authored Phase-1 world: "Coppergate — western approach".
 *
 * Pure module (no Phaser) so the layout is unit-testable:
 * visual tiles and gameplay geometry are derived from the same data
 * (master directive §19).
 *
 * Layout (64x44 tiles, 16px tiles => 1024x704 px):
 *   - West: sandy badlands with cacti and rocks.
 *   - A winding dirt road enters the town from the west.
 *   - Town cluster: saloon, general store, sheriff's office (north of the
 *     road), two houses (south), a plaza with a well.
 *   - A fenced corral with a water trough south-east.
 *   - North: pine tree zone and a pond. Border: rock ring (world bounds).
 */
import { TILE, COLLIDER_TILES } from '../assets/TileIds';

export const MAP_W = 64;
export const MAP_H = 44;

export interface PropSpawn {
  type: string;
  tx: number;
  ty: number;
  /** Optional Persian sign text rendered above the prop. */
  signText?: string;
  /** Dialogue key when this prop is interactable. */
  dialogue?: string;
}

export interface NpcSpawn {
  id: string;
  tx: number;
  ty: number;
  wanderRadius: number;
  dialogue: string;
  prompt: string;
}

export interface ParsedMap {
  w: number;
  h: number;
  ground: number[][];
  obstacles: number[][];
  props: PropSpawn[];
  npcs: NpcSpawn[];
  spawn: { tx: number; ty: number };
  /** List of walk-blocking tile indices (from TileFactory). */
  colliderTiles: number[];
}

/** Deterministic PRNG so the map is identical on every run (testable). */
function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Rect { x: number; y: number; w: number; h: number }

function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

/** Author and parse the world. Deterministic — no Math.random. */
export function buildMap(): ParsedMap {
  const rng = mulberry32(1873);
  const ground: number[][] = [];
  const obstacles: number[][] = [];

  // --- base terrain ---------------------------------------------------------
  for (let y = 0; y < MAP_H; y++) {
    ground[y] = [];
    obstacles[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      const r = rng();
      ground[y][x] = r < 0.14 ? TILE.GRASS1 : r < 0.20 ? TILE.GRASSDRY : r < 0.235 ? TILE.FLOWER : TILE.GRASS0;
      obstacles[y][x] = -1;
    }
  }

  // --- sandy badlands (west) -------------------------------------------------
  for (let y = 2; y < MAP_H - 2; y++) {
    for (let x = 0; x < 20; x++) {
      const blend = x > 15 ? rng() < 0.45 : x > 13 ? rng() < 0.75 : true;
      if (blend) ground[y][x] = rng() < 0.25 ? TILE.SAND1 : TILE.SAND0;
    }
  }

  // --- road: straight west -> town, with a gentle dip ------------------------
  const roadRows = (x: number): number[] => (x >= 16 && x < 30 ? [23, 24] : [24, 25]);
  for (let x = 0; x < MAP_W; x++) {
    for (const y of roadRows(x)) {
      ground[y][x] = rng() < 0.3 ? TILE.DIRT1 : TILE.DIRT0;
    }
  }

  // --- town plaza (packed dirt around the well) -------------------------------
  for (let y = 21; y <= 26; y++) {
    for (let x = 36; x <= 47; x++) {
      ground[y][x] = rng() < 0.35 ? TILE.PLAZA : TILE.DIRT0;
    }
  }

  // --- pond (north-east) ------------------------------------------------------
  const pcx = 57, pcy = 8;
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const dx = (x - pcx) / 5.2;
      const dy = (y - pcy) / 3.2;
      if (dx * dx + dy * dy <= 1) {
        ground[y][x] = rng() < 0.5 ? TILE.WATER0 : TILE.WATER1;
        obstacles[y][x] = ground[y][x];
      }
    }
  }

  // --- rock border ring --------------------------------------------------------
  for (let x = 0; x < MAP_W; x++) {
    for (const y of [0, 1, MAP_H - 2, MAP_H - 1]) {
      obstacles[y][x] = rng() < 0.5 ? TILE.ROCK0 : TILE.ROCK1;
    }
  }
  for (let y = 0; y < MAP_H; y++) {
    for (const x of [0, 1, MAP_W - 2, MAP_W - 1]) {
      obstacles[y][x] = rng() < 0.5 ? TILE.ROCK0 : TILE.ROCK1;
    }
  }

  // --- corral fences (with a gate gap on the north side) ----------------------
  const corral: Rect = { x: 49, y: 27, w: 10, h: 6 };
  for (let x = corral.x; x < corral.x + corral.w; x++) {
    if (x === 52 || x === 53) continue; // gate
    obstacles[corral.y][x] = TILE.FENCE_H;
    obstacles[corral.y + corral.h - 1][x] = TILE.FENCE_H;
  }
  for (let y = corral.y; y < corral.y + corral.h; y++) {
    obstacles[y][corral.x] = TILE.FENCE_V;
    obstacles[y][corral.x + corral.w - 1] = TILE.FENCE_V;
  }
  obstacles[corral.y][corral.x] = TILE.FENCE_POST;
  obstacles[corral.y][corral.x + corral.w - 1] = TILE.FENCE_POST;
  obstacles[corral.y + corral.h - 1][corral.x] = TILE.FENCE_POST;
  obstacles[corral.y + corral.h - 1][corral.x + corral.w - 1] = TILE.FENCE_POST;

  // --- reserved areas for prop scatter ----------------------------------------
  const reserved: Rect[] = [
    { x: 33, y: 17, w: 6, h: 5 },  // saloon
    { x: 41, y: 18, w: 5, h: 4 },  // store
    { x: 47, y: 18, w: 4, h: 4 },  // sheriff
    { x: 36, y: 25, w: 4, h: 3 },  // house A
    { x: 43, y: 25, w: 4, h: 3 },  // house B
    corral,
    { x: 53, y: 2, w: 11, h: 14 }, // pond + margin
    { x: 35, y: 21, w: 14, h: 8 }, // plaza
    { x: 2, y: 21, w: 8, h: 6 },   // spawn area
  ];
  const isReserved = (x: number, y: number): boolean =>
    reserved.some((r) => inRect(r, x, y));
  const isRoad = (x: number, y: number): boolean => roadRows(x).includes(y);

  // --- props -------------------------------------------------------------------
  const props: PropSpawn[] = [
    { type: 'saloon', tx: 33, ty: 17, dialogue: 'saloonDoor', signText: 'سالون' },
    { type: 'store', tx: 41, ty: 18, signText: 'مغازهٔ عمومی' },
    { type: 'sheriff', tx: 47, ty: 18, signText: 'دفتر کلانتر' },
    { type: 'houseA', tx: 36, ty: 25 },
    { type: 'houseB', tx: 43, ty: 25 },
    { type: 'well', tx: 40, ty: 22 },
    { type: 'trough', tx: 53, ty: 29 },
    { type: 'hitch', tx: 32, ty: 26 },
    { type: 'sign', tx: 7, ty: 22, dialogue: 'sign', signText: 'COPPERGATE' },
    { type: 'barrel', tx: 39, ty: 26 },
    { type: 'barrel', tx: 38, ty: 26 },
    { type: 'crate', tx: 31, ty: 25 },
    { type: 'crate', tx: 30, ty: 25 },
  ];

  // trees (north zone + a few near the pond)
  for (let y = 3; y <= 13; y++) {
    for (let x = 5; x <= 32; x++) {
      if (isReserved(x, y) || isRoad(x, y) || obstacles[y][x] !== -1) continue;
      if (rng() < 0.11) {
        props.push({ type: rng() < 0.6 ? 'tree_big' : 'tree_small', tx: x, ty: y });
      }
    }
  }
  // cacti (west badlands)
  for (let y = 6; y <= 40; y++) {
    for (let x = 3; x <= 15; x++) {
      if (isReserved(x, y) || isRoad(x, y) || obstacles[y][x] !== -1) continue;
      if (rng() < 0.06) {
        props.push({ type: rng() < 0.55 ? 'cactus_big' : 'cactus_small', tx: x, ty: y });
      }
    }
  }
  // rocks (south band + west)
  for (let y = 34; y <= 41; y++) {
    for (let x = 3; x <= 60; x++) {
      if (isReserved(x, y) || isRoad(x, y) || obstacles[y][x] !== -1) continue;
      if (rng() < 0.05) {
        props.push({ type: rng() < 0.5 ? 'rock_big' : 'rock_small', tx: x, ty: y });
      }
    }
  }
  // bushes (sparse, non-blocking)
  for (let y = 4; y <= 40; y++) {
    for (let x = 4; x <= 59; x++) {
      if (isReserved(x, y) || isRoad(x, y) || obstacles[y][x] !== -1) continue;
      if (rng() < 0.035) {
        props.push({ type: 'bush', tx: x, ty: y });
      }
    }
  }

  // --- NPCs ---------------------------------------------------------------------
  const npcs: NpcSpawn[] = [
    { id: 'npc-pete', tx: 53, ty: 30, wanderRadius: 2.2, dialogue: 'pete', prompt: 'گفتگو با پیت پیر' },
    { id: 'npc-traveler', tx: 38, ty: 23, wanderRadius: 3.2, dialogue: 'traveler', prompt: 'گفتگو با مسافر' },
  ];

  const spawn = { tx: 5, ty: 24 };

  return { w: MAP_W, h: MAP_H, ground, obstacles, props, npcs, spawn, colliderTiles: COLLIDER_TILES };
}

/** True when a tile position allows walking (used by NPC wander logic). */
export function isWalkable(map: ParsedMap, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return false;
  return map.obstacles[ty][tx] === -1;
}
