/**
 * MapData.ts — the authored world: "Coppergate — western approach".
 *
 * Pure module (no Phaser) so the layout is unit-testable: visual tiles and
 * gameplay geometry are derived from the same data (master directive §19).
 *
 * v2 visual overhaul — regional identities:
 *   - North-west: cool pine woods with stumps and fallen logs.
 *   - West: ochre badlands — sand ripples, cracked pan, scree, cacti,
 *     sun-bleached bones, a broken wagon by the roadside.
 *   - Central: sage grassland with dry patches and flower meadows.
 *   - East: scrubland fading into sand.
 *   - Town: cobbled plaza, porched facades, lampposts, the bank, the stable.
 *   - South-east: fenced corral with trampled ground, hay and sheep.
 *   - Rim: layered mesa cliffs close the horizon.
 * The clay road curves naturally, carries wheel ruts and grasses over at
 * the edges; the pond gets wet-sand shore rings oriented to the water.
 */
import { TILE, COLLIDER_TILES, WATER_TILES } from '../assets/TileIds';

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

/** Road center rows — a gentle west→east curve with a town dip. */
function roadRows(x: number): number[] {
  if (x <= 14) return [24, 25];
  if (x <= 22) return [23, 24];
  if (x <= 38) return [24, 25];
  if (x <= 44) return [25, 26];
  return [26, 27];
}

/** Author and parse the world. Deterministic — no Math.random. */
export function buildMap(): ParsedMap {
  const rng = mulberry32(1873);
  const ground: number[][] = [];
  const obstacles: number[][] = [];

  // --- base terrain: sage grassland with dry patches and meadows ----------
  for (let y = 0; y < MAP_H; y++) {
    ground[y] = [];
    obstacles[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      const r = rng();
      ground[y][x] =
        r < 0.10 ? TILE.GRASS1 :
        r < 0.19 ? TILE.GRASSDRY :
        r < 0.22 ? TILE.FLOWER :
        r < 0.24 ? TILE.FLOWER2 :
        r < 0.27 ? TILE.TUFT :
        r < 0.29 ? TILE.PEBBLES :
        r < 0.31 ? TILE.DIRT_PATCH :
        TILE.GRASS0;
      obstacles[y][x] = -1;
    }
  }

  // --- west badlands: sand + cracked pan + scree, dithered into grass -----
  for (let y = 2; y < MAP_H - 2; y++) {
    for (let x = 0; x < 17; x++) {
      const t = rng();
      if (x > 14) { if (t < 0.4) ground[y][x] = TILE.SAND_EDGE_G; continue; }
      if (x > 12) { if (t < 0.75) ground[y][x] = t < 0.35 ? TILE.SAND_EDGE_G : t < 0.55 ? TILE.DIRT_SAND : TILE.SAND0; continue; }
      ground[y][x] =
        t < 0.38 ? TILE.SAND0 :
        t < 0.60 ? TILE.SAND1 :
        t < 0.78 ? TILE.SAND2 :
        t < 0.86 ? TILE.SAND_CRACK :
        t < 0.94 ? TILE.SCREE :
        TILE.BONE;
    }
  }
  // east scrubland fading into sand
  for (let y = 16; y < MAP_H - 2; y++) {
    for (let x = 56; x < MAP_W - 2; x++) {
      const t = rng();
      if (x === 56) { if (t < 0.35) ground[y][x] = TILE.GRASS_EDGE_S; continue; }
      ground[y][x] = t < 0.45 ? TILE.SAND0 : t < 0.7 ? TILE.SAND1 : t < 0.85 ? TILE.SAND2 : TILE.GRASS_EDGE_S;
    }
  }

  // --- north-west woods: cool grass floor ----------------------------------
  for (let y = 2; y <= 15; y++) {
    for (let x = 2; x <= 32; x++) {
      const r = rng();
      if (r < 0.05) ground[y][x] = TILE.STUMP;
      else if (r < 0.30) ground[y][x] = TILE.GRASS_WOOD1;
      else ground[y][x] = TILE.GRASS_WOOD;
    }
  }
  // blend the woods boundary into the plains (no hard region edge)
  for (let x = 2; x <= 32; x++) {
    if (rng() < 0.5) ground[15][x] = rng() < 0.5 ? TILE.GRASS_WOOD : TILE.GRASS0;
    if (rng() < 0.5) ground[16][x] = rng() < 0.3 ? TILE.GRASS_WOOD : TILE.GRASS0;
  }
  for (let y = 2; y <= 15; y++) {
    if (rng() < 0.5) ground[y][32] = rng() < 0.5 ? TILE.GRASS_WOOD : TILE.GRASS0;
    if (rng() < 0.5) ground[y][31] = rng() < 0.3 ? TILE.GRASS_WOOD : TILE.GRASS0;
  }

  // --- clay road with wheel ruts and overgrown edges ------------------------
  for (let x = 0; x < MAP_W; x++) {
    const rows = roadRows(x);
    for (const y of rows) {
      if (inRect({ x: 36, y: 21, w: 12, h: 6 }, x, y)) continue; // the road dissolves into the plaza
      const r = rng();
      // sand-edge dithering where the road crosses the badlands
      const nearSand = x < 13;
      ground[y][x] =
        r < 0.16 ? TILE.ROAD_RUT :
        r < 0.36 ? TILE.ROAD1 :
        r < 0.44 ? TILE.TRACKS :
        nearSand && r < 0.52 ? TILE.ROAD_EDGE_S :
        r < 0.56 ? TILE.ROAD_EDGE_G :
        TILE.ROAD;
    }
    // shoulder wear: one tile of trampled dirt/grass beside the road
    for (const y of [rows[0] - 1, rows[1] + 1]) {
      if (y <= 1 || y >= MAP_H - 2 || inRect({ x: 36, y: 21, w: 12, h: 6 }, x, y)) continue;
      if (rng() < 0.42) ground[y][x] = rng() < 0.5 ? TILE.DIRT0 : TILE.DIRT1;
    }
  }

  // --- town plaza (cobbles) --------------------------------------------------
  for (let y = 21; y <= 26; y++) {
    for (let x = 36; x <= 47; x++) {
      const r = rng();
      ground[y][x] = r < 0.55 ? TILE.PLAZA0 : r < 0.85 ? TILE.PLAZA1 : TILE.DIRT_PATCH;
    }
  }

  // --- pond (north-east) with wet-sand shore ring ----------------------------
  const pcx = 57, pcy = 8;
  const isWater: boolean[][] = [];
  for (let y = 0; y < MAP_H; y++) {
    isWater[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      const dx = (x - pcx) / 5.2;
      const dy = (y - pcy) / 3.2;
      if (dx * dx + dy * dy <= 1) {
        ground[y][x] = rng() < 0.5 ? TILE.WATER0 : TILE.WATER1;
        obstacles[y][x] = ground[y][x];
        isWater[y][x] = true;
      } else {
        isWater[y][x] = false;
      }
    }
  }
  // shore ring: orient the wet sand toward the neighboring water
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (isWater[y][x] || obstacles[y][x] !== -1) continue;
      const up = y > 0 && isWater[y - 1][x];
      const down = y < MAP_H - 1 && isWater[y + 1][x];
      const left = x > 0 && isWater[y][x - 1];
      const right = x < MAP_W - 1 && isWater[y][x + 1];
      if (up && left) ground[y][x] = TILE.SHORE_C2;
      else if (down && right) ground[y][x] = TILE.SHORE_C1;
      else if (up) ground[y][x] = TILE.SHORE_S;
      else if (down) ground[y][x] = TILE.SHORE_N;
      else if (left) ground[y][x] = TILE.SHORE_E;
      else if (right) ground[y][x] = TILE.SHORE_W;
    }
  }
  // pond margin: sandy grass and flower meadow
  for (let y = 3; y <= 14; y++) {
    for (let x = 51; x <= 62; x++) {
      if (obstacles[y][x] !== -1) continue;
      const dx = (x - pcx) / 7.4;
      const dy = (y - pcy) / 5.0;
      if (dx * dx + dy * dy <= 1) {
        const r = rng();
        ground[y][x] = r < 0.16 ? TILE.FLOWER2 : r < 0.4 ? TILE.GRASSDRY : r < 0.55 ? TILE.SAND0 : TILE.GRASS0;
      }
    }
  }

  // --- corral ground (trampled) + farm soil ----------------------------------
  for (let y = 28; y <= 31; y++) {
    for (let x = 50; x <= 57; x++) {
      const r = rng();
      ground[y][x] = r < 0.62 ? TILE.CORRAL_DIRT : r < 0.8 ? TILE.TRACKS : TILE.HAY;
    }
  }
  for (let y = 21; y <= 24; y++) {
    for (let x = 45; x <= 48; x++) {
      ground[y][x] = rng() < 0.85 ? TILE.SOIL : TILE.DIRT1;
    }
  }

  // --- mesa cliff rim (world border) ------------------------------------------
  for (let x = 0; x < MAP_W; x++) {
    for (const y of [0, 1, MAP_H - 2, MAP_H - 1]) {
      const r = rng();
      obstacles[y][x] = r < 0.5 ? TILE.CLIFF_FACE : r < 0.8 ? TILE.CLIFF_DARK : TILE.CLIFF_TOP;
    }
  }
  for (let y = 0; y < MAP_H; y++) {
    for (const x of [0, 1, MAP_W - 2, MAP_W - 1]) {
      const r = rng();
      obstacles[y][x] = r < 0.5 ? TILE.CLIFF_FACE : r < 0.8 ? TILE.CLIFF_DARK : TILE.CLIFF_TOP;
    }
  }

  // --- porch / boardwalk strips in front of the facades -----------------------
  const porchStrip = (x0: number, x1: number, y: number): void => {
    for (let x = x0; x <= x1; x++) {
      ground[y][x] = rng() < 0.6 ? TILE.PORCH : TILE.PLANK;
    }
  };
  porchStrip(33, 39, 23); // saloon
  porchStrip(41, 46, 23); // store
  porchStrip(47, 51, 23); // sheriff
  porchStrip(27, 31, 22); // bank steps
  porchStrip(49, 53, 25); // stable

  // --- corral fences (with a gate gap on the north side) ----------------------
  const corral: Rect = { x: 49, y: 27, w: 10, h: 6 };
  for (let x = corral.x; x < corral.x + corral.w; x++) {
    if (x === 52 || x === 53) { obstacles[corral.y][x] = -1; continue; } // open gate
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
    { x: 33, y: 17, w: 7, h: 6 },  // saloon (112px wide)
    { x: 41, y: 18, w: 6, h: 5 },  // store
    { x: 47, y: 18, w: 5, h: 5 },  // sheriff
    { x: 27, y: 17, w: 5, h: 5 },  // bank
    { x: 36, y: 25, w: 5, h: 4 },  // house A
    { x: 43, y: 25, w: 5, h: 4 },  // house B
    { x: 49, y: 21, w: 6, h: 4 },  // stable
    corral,
    { x: 53, y: 2, w: 11, h: 14 }, // pond + margin
    { x: 35, y: 21, w: 14, h: 8 }, // plaza
    { x: 2, y: 21, w: 8, h: 6 },   // spawn area
  ];
  const isReserved = (x: number, y: number): boolean =>
    reserved.some((r) => inRect(r, x, y));
  const isRoad = (x: number, y: number): boolean => roadRows(x).includes(y);

  // --- authored props ----------------------------------------------------------
  const props: PropSpawn[] = [
    { type: 'saloon', tx: 33, ty: 17, dialogue: 'saloonDoor', signText: 'سالون' },
    { type: 'store', tx: 41, ty: 18, signText: 'مغازهٔ عمومی' },
    { type: 'sheriff', tx: 47, ty: 18, signText: 'دفتر کلانتر' },
    { type: 'bank', tx: 27, ty: 17, signText: 'بانک' },
    { type: 'houseA', tx: 36, ty: 25 },
    { type: 'houseB', tx: 43, ty: 25 },
    { type: 'stable', tx: 49, ty: 21 },
    { type: 'well', tx: 40, ty: 22 },
    { type: 'trough', tx: 53, ty: 29 },
    { type: 'hitch', tx: 32, ty: 26 },
    { type: 'sign', tx: 7, ty: 22, dialogue: 'sign', signText: 'COPPERGATE' },
    { type: 'lamppost', tx: 34, ty: 22 },
    { type: 'lamppost', tx: 52, ty: 22 },
    { type: 'lamppost', tx: 30, ty: 22 },
    { type: 'bench', tx: 35, ty: 23 },
    { type: 'bench', tx: 10, ty: 27 },
    { type: 'barrel', tx: 38, ty: 23 },
    { type: 'barrel', tx: 39, ty: 23 },
    { type: 'crate', tx: 28, ty: 22 },
    { type: 'crate', tx: 29, ty: 22 },
    { type: 'crate', tx: 45, ty: 23 },
    { type: 'sack', tx: 42, ty: 23 },
    { type: 'sack', tx: 43, ty: 23 },
    { type: 'wagon', tx: 12, ty: 27 },
    { type: 'campfire', tx: 8, ty: 27 },
    { type: 'log', tx: 6, ty: 28 },
    { type: 'horse', tx: 33, ty: 26 },
    { type: 'sheep', tx: 52, ty: 29 },
    { type: 'sheep', tx: 55, ty: 30 },
    { type: 'sheep', tx: 54, ty: 31 },
  ];

  // --- scatter: flora per region -----------------------------------------------
  // pines + snags in the woods
  for (let y = 3; y <= 14; y++) {
    for (let x = 3; x <= 31; x++) {
      if (isReserved(x, y) || isRoad(x, y) || obstacles[y][x] !== -1) continue;
      const r = rng();
      if (r < 0.14) props.push({ type: 'tree_pine', tx: x, ty: y });
      else if (r < 0.19) props.push({ type: 'tree_small', tx: x, ty: y });
      else if (r < 0.21) props.push({ type: 'tree_dead', tx: x, ty: y });
      else if (r < 0.23) props.push({ type: 'log', tx: x, ty: y });
    }
  }
  // lone oaks across the grassland
  for (let y = 16; y <= 38; y++) {
    for (let x = 18; x <= 55; x++) {
      if (isReserved(x, y) || isRoad(x, y) || obstacles[y][x] !== -1) continue;
      if (rng() < 0.015) props.push({ type: rng() < 0.7 ? 'tree_oak' : 'tree_small', tx: x, ty: y });
    }
  }
  // cacti + dead trees in the badlands
  for (let y = 6; y <= 39; y++) {
    for (let x = 3; x <= 15; x++) {
      if (isReserved(x, y) || isRoad(x, y) || obstacles[y][x] !== -1) continue;
      const r = rng();
      if (r < 0.065) props.push({ type: 'cactus_saguaro', tx: x, ty: y });
      else if (r < 0.10) props.push({ type: 'cactus_pear', tx: x, ty: y });
      else if (r < 0.125) props.push({ type: 'cactus_agave', tx: x, ty: y });
      else if (r < 0.14) props.push({ type: 'tree_dead', tx: x, ty: y });
    }
  }
  // rocks — south band + badland edges
  for (let y = 33; y <= 39; y++) {
    for (let x = 18; x <= 55; x++) {
      if (isReserved(x, y) || isRoad(x, y) || obstacles[y][x] !== -1) continue;
      const r = rng();
      if (r < 0.045) props.push({ type: rng() < 0.5 ? 'rock_big' : 'rock_small', tx: x, ty: y });
      else if (r < 0.06) props.push({ type: 'cactus_agave', tx: x, ty: y });
    }
  }
  // region-tinted bushes everywhere
  for (let y = 4; y <= 39; y++) {
    for (let x = 4; x <= 59; x++) {
      if (isReserved(x, y) || isRoad(x, y) || obstacles[y][x] !== -1) continue;
      const badlands = x <= 15;
      const r = rng();
      if (r < 0.05) {
        const type = badlands
          ? (r < 0.03 ? 'bush_dry' : 'bush_sage')
          : (r < 0.032 ? 'bush_sage' : r < 0.044 ? 'bush_flower' : 'bush_dry');
        props.push({ type, tx: x, ty: y });
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

/** Water tile check (used by the shimmer animation in WorldScene). */
export function isWaterTile(index: number): boolean {
  return WATER_TILES.includes(index);
}
