/**
 * MapData.ts — the authored world: "Coppergate — western approach".
 *
 * Pure module (no Phaser) so the layout is unit-testable: gameplay
 * geometry and the painter's ground plan derive from the same data.
 *
 * v3 rebuild — the world is shaped by coherent noise fields, not per-tile
 * random picks:
 *   - North-west: cool pine woods, boundary wobbling with fbm.
 *   - West: ochre badlands with an organic, dithered edge.
 *   - Central: sage grassland with dry patches and flower meadows.
 *   - East: scrubland fading into sand.
 *   - Town: cobbled plaza on the road, porched facades, the bank, the stable.
 *   - South-east: fenced corral with trampled ground, hay and sheep.
 *   - Rim: layered mesa cliffs close the horizon.
 * The clay road is a curving POLYLINE painted with wheel ruts that follow
 * its direction; every town door gets a worn footpath down to the road.
 * The pond is a noise-perturbed ellipse with a wet-sand shore.
 */
import { TILE, COLLIDER_TILES, WATER_TILES } from '../assets/TileIds';
import { fbm, mulberry32, clamp01 } from './noise';

export const MAP_W = 64;
export const MAP_H = 44;
export const TILE_PX = 16;
export const WORLD_PX_W = MAP_W * TILE_PX;
export const WORLD_PX_H = MAP_H * TILE_PX;

export interface PropSpawn {
  type: string;
  tx: number;
  ty: number;
  /** Optional Persian sign text rendered above the prop. */
  signText?: string;
  /** Dialogue key when this prop is interactable. */
  dialogue?: string;
  /** Mirror the sprite horizontally (variety for symmetric art). */
  flip?: boolean;
}

export interface NpcSpawn {
  id: string;
  tx: number;
  ty: number;
  wanderRadius: number;
  dialogue: string;
  prompt: string;
}

export interface Rect { x: number; y: number; w: number; h: number }

/** Everything the ground painter needs, in tile units unless noted. */
export interface GroundPlan {
  /** Per-tile biome id (Biome enum) used to choose field treatments. */
  biome: Uint8Array;
  /** Road center polyline in world px. */
  roadPts: Array<[number, number]>;
  /** Road half-width in px (edges get organic noise on top). */
  roadHalf: number;
  /** Cobbled town plaza in world px. */
  plaza: Rect;
  /** Pond ellipse in world px (noise-perturbed by the painter). */
  pond: { cx: number; cy: number; rx: number; ry: number };
  /** Tilled farm plot in world px. */
  soil: Rect;
  /** Corral trampled ground in world px. */
  corral: Rect;
  /** Worn ground point under each town door (px) — footpaths to the road. */
  doorPx: Array<[number, number]>;
  /** Corral fence segments (tile coords x1,y1,x2,y2) painted as rails. */
  fenceSegs: Array<[number, number, number, number]>;
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
  /** Painter plan for the single hand-painted ground canvas. */
  plan: GroundPlan;
}

/** Biome ids used by GroundPlan.biome. */
export const BIOME = {
  PLAINS: 0,
  DRY: 1,
  WOODS: 2,
  BADLANDS: 3,
  SCRUB: 4,
  MEADOW: 5,
} as const;

/** Road center polyline (tile coords, fractions allowed) — a gentle
 *  west→east curve with a town dip, drawn as px in the plan. */
const ROAD_PATH: Array<[number, number]> = [
  [-1, 24.5], [5, 24.2], [10, 23.5], [16, 23.9], [22, 24.1], [28, 23.7],
  [33, 23.3], [40, 23.1], [47, 23.5], [52, 24.6], [57, 25.4], [62, 26.0], [66, 26.2],
];

/** Nearest road centerline y (px) for a given x (px) — for footpaths. */
export function roadCenterYAt(px: number): number {
  const pts = ROAD_PATH;
  const x = px / TILE_PX;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    if (x >= x0 && x <= x1) {
      const t = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
      return (y0 + (y1 - y0) * t) * TILE_PX;
    }
  }
  return pts[pts.length - 1][1] * TILE_PX;
}

/** The pond mask — ONE function used by both collision and the painter. */
function pondAt(x: number, y: number, cx: number, cy: number, rx: number, ry: number): boolean {
  const dx = x - cx;
  const dy = y - cy;
  const d = Math.hypot(dx, dy);
  const ang = Math.atan2(dy, dx);
  // wobble the rim with low-frequency noise (deterministic)
  const wob = 0.5 + fbm(Math.cos(ang) * 1.6 + 31.7, Math.sin(ang) * 1.6 + 17.3, 777, 3) * 0.34;
  const rr = Math.min(rx, ry) * (0.55 + 0.45 * (Math.min(rx, ry) / Math.max(rx, ry)));
  const eff = rr * (1 + wob * 0.55);
  return d * d <= eff * eff * (1 + ((Math.abs(dx) / rx) ** 2 + (Math.abs(dy) / ry) ** 2) * 0.12);
}

function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

/** Author and parse the world. Deterministic — no Math.random. */
export function buildMap(): ParsedMap {
  const rng = mulberry32(1873);
  const ground: number[][] = [];
  const obstacles: number[][] = [];
  const biome = new Uint8Array(MAP_W * MAP_H);

  const pond = { cx: 57, cy: 8, rx: 5.2, ry: 3.2 };
  const plaza: Rect = { x: 36, y: 21, w: 12, h: 6 };
  const corral: Rect = { x: 49, y: 27, w: 10, h: 6 };
  const soil: Rect = { x: 30, y: 25, w: 5, h: 4 };

  // --- biome field ----------------------------------------------------------
  for (let y = 0; y < MAP_H; y++) {
    ground[y] = [];
    obstacles[y] = [];
    for (let x = 0; x < MAP_W; x++) {
      const woodsEdge = 15.5 + (fbm(x * 0.09, y * 0.09, 41, 3) - 0.5) * 7;
      const badlandsEdge = 15.0 + (fbm(x * 0.11 + 50, y * 0.11 + 50, 43, 3) - 0.5) * 6;
      const dryN = fbm(x * 0.13 + 90, y * 0.13 + 90, 47, 3);
      let b: number = BIOME.PLAINS;
      const woodsD = Math.hypot((x - 14) / 12.5, (y - 8) / 8.5);
      if (woodsD < 1 + (fbm(x * 0.16, y * 0.16, 45, 2) - 0.5) * 0.5) b = BIOME.WOODS;
      else if (x < badlandsEdge && y > 2 && y < MAP_H - 3) b = BIOME.BADLANDS;
      else if (x > 56 + (fbm(x * 0.13 + 70, y * 0.13 + 70, 49, 2) - 0.5) * 5) b = BIOME.SCRUB;
      else if (dryN > 0.62 && x > woodsEdge) b = BIOME.DRY;
      if (b === BIOME.PLAINS || b === BIOME.DRY) {
        const pd = Math.hypot((x - pond.cx) / 7.4, (y - pond.cy) / 5.4);
        if (pd < 1.25 && fbm(x * 0.3, y * 0.3, 51, 2) > 0.42) b = BIOME.MEADOW;
      }
      biome[y * MAP_W + x] = b;
      obstacles[y][x] = -1;
    }
  }

  // --- ground tile ids (hidden physics layer — must match the visuals) ------
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const b = biome[y * MAP_W + x];
      const r = rng();
      switch (b) {
        case BIOME.WOODS: ground[y][x] = r < 0.3 ? TILE.GRASS_WOOD1 : TILE.GRASS_WOOD; break;
        case BIOME.BADLANDS: ground[y][x] = r < 0.5 ? TILE.SAND0 : r < 0.75 ? TILE.SAND1 : TILE.SAND2; break;
        case BIOME.SCRUB: ground[y][x] = r < 0.5 ? TILE.SAND0 : r < 0.8 ? TILE.GRASSDRY : TILE.GRASS_EDGE_S; break;
        case BIOME.DRY: ground[y][x] = r < 0.55 ? TILE.GRASSDRY : TILE.GRASS0; break;
        case BIOME.MEADOW: ground[y][x] = r < 0.35 ? TILE.FLOWER : r < 0.5 ? TILE.FLOWER2 : TILE.GRASS0; break;
        default: ground[y][x] = r < 0.1 ? TILE.GRASS1 : r < 0.2 ? TILE.GRASSDRY : r < 0.26 ? TILE.TUFT : TILE.GRASS0;
      }
    }
  }

  // --- pond water + colliders -------------------------------------------------
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (pondAt(x + 0.5, y + 0.5, pond.cx, pond.cy, pond.rx, pond.ry)) {
        ground[y][x] = rng() < 0.5 ? TILE.WATER0 : TILE.WATER1;
        obstacles[y][x] = ground[y][x];
      }
    }
  }

  // --- mesa cliff rim (world border colliders) --------------------------------
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

  // --- corral fences (with a gate gap on the north side) ----------------------
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

  // --- reserved areas ----------------------------------------------------------
  const reserved: Rect[] = [
    { x: 33, y: 17, w: 7, h: 6 },  // saloon
    { x: 41, y: 18, w: 6, h: 5 },  // store
    { x: 47, y: 18, w: 5, h: 5 },  // sheriff
    { x: 27, y: 17, w: 5, h: 5 },  // bank
    { x: 24, y: 19, w: 3, h: 4 },  // gunsmith workshop
    { x: 36, y: 25, w: 5, h: 4 },  // house A
    { x: 43, y: 25, w: 5, h: 4 },  // house B
    { x: 49, y: 21, w: 6, h: 4 },  // stable
    { x: 55, y: 18, w: 4, h: 3 },  // water tower
    { x: 30, y: 25, w: 5, h: 5 },  // farm plot + windmill
    { x: 3, y: 30, w: 6, h: 5 },   // abandoned ruin
    corral,
    { x: 51, y: 2, w: 13, h: 14 }, // pond + margin
    { x: 35, y: 21, w: 14, h: 8 }, // plaza
    { x: 2, y: 21, w: 8, h: 6 },   // spawn camp area
  ];
  const isReserved = (x: number, y: number): boolean => reserved.some((r) => inRect(r, x, y));
  const roadY = (x: number): number => {
    const c = roadCenterYAt(x * TILE_PX + 8) / TILE_PX;
    return c;
  };
  const isRoad = (x: number, y: number): boolean => Math.abs(y + 0.5 - roadY(x)) < 1.4;

  // --- authored props ------------------------------------------------------------
  const props: PropSpawn[] = [
    { type: 'saloon', tx: 33, ty: 17, dialogue: 'saloonDoor', signText: 'سالون' },
    { type: 'store', tx: 41, ty: 18, signText: 'مغازهٔ عمومی' },
    { type: 'sheriff', tx: 47, ty: 18, signText: 'دفتر کلانتر' },
    { type: 'bank', tx: 27, ty: 17, signText: 'بانک' },
    { type: 'gunsmith', tx: 24, ty: 19, signText: 'اسلحه‌سازی' },
    { type: 'houseA', tx: 36, ty: 25 },
    { type: 'houseB', tx: 43, ty: 25 },
    { type: 'stable', tx: 49, ty: 21 },
    { type: 'ruin', tx: 3, ty: 30 },
    { type: 'watertower', tx: 55, ty: 18 },
    { type: 'windmill', tx: 31, ty: 26 },
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
    { type: 'barrel', tx: 45, ty: 23, flip: true },
    { type: 'crate', tx: 28, ty: 22 },
    { type: 'crate', tx: 29, ty: 22 },
    { type: 'crateStack', tx: 44, ty: 23 },
    { type: 'sack', tx: 42, ty: 23 },
    { type: 'sack', tx: 43, ty: 23 },
    { type: 'haypile', tx: 51, ty: 30 },
    { type: 'wagon', tx: 12, ty: 27 },
    { type: 'wagon2', tx: 56, ty: 23 },
    { type: 'campfire', tx: 8, ty: 27 },
    { type: 'log', tx: 6, ty: 28 },
    { type: 'logseat', tx: 10, ty: 28 },
    { type: 'horse', tx: 33, ty: 26 },
    { type: 'sheep', tx: 52, ty: 29 },
    { type: 'sheep', tx: 55, ty: 30 },
    { type: 'sheep', tx: 54, ty: 31, flip: true },
    // badlands storytelling
    { type: 'ribcage', tx: 6, ty: 14 },
    { type: 'skull', tx: 11, ty: 35 },
    { type: 'boots', tx: 13, ty: 19 },
  ];

  // --- scatter: flora driven by the same noise fields ----------------------------
  const dens = (x: number, y: number, seed: number, lo: number, hi: number): number => {
    return clamp01((fbm(x * 0.14 + seed, y * 0.14 + seed * 0.7, 61, 3) - lo) / (hi - lo));
  };

  // pine woods — dense groves with open glades
  for (let y = 2; y <= 16; y++) {
    for (let x = 2; x <= 30; x++) {
      if (isReserved(x, y) || isRoad(x, y) || obstacles[y][x] !== -1) continue;
      const d = dens(x, y, 3.1, 0.35, 0.72);
      const r = rng();
      if (r < d * 0.30) props.push({ type: 'tree_pine', tx: x, ty: y, flip: rng() < 0.5 });
      else if (r < d * 0.34) props.push({ type: 'tree_small', tx: x, ty: y });
      else if (r < d * 0.36) props.push({ type: 'tree_dead', tx: x, ty: y });
      else if (r < d * 0.40) props.push({ type: 'log', tx: x, ty: y });
      else if (r < d * 0.5) props.push({ type: 'stump', tx: x, ty: y });
      else if (r < 0.30 + d * 0.1) props.push({ type: 'bush_sage', tx: x, ty: y });
    }
  }
  // lone oaks + copses across the grassland
  for (let y = 16; y <= 39; y++) {
    for (let x = 17; x <= 55; x++) {
      if (isReserved(x, y) || isRoad(x, y) || obstacles[y][x] !== -1) continue;
      const d = dens(x, y, 8.7, 0.42, 0.75);
      const r = rng();
      if (r < d * 0.045) props.push({ type: rng() < 0.75 ? 'tree_oak' : 'tree_small', tx: x, ty: y, flip: rng() < 0.5 });
      else if (r < d * 0.075) props.push({ type: 'bush_sage', tx: x, ty: y });
      else if (r < d * 0.095) props.push({ type: 'bush_flower', tx: x, ty: y });
      else if (r < d * 0.115) props.push({ type: 'bush_dry', tx: x, ty: y });
    }
  }
  // badlands — cacti, snags, scatter rocks
  for (let y = 5; y <= 39; y++) {
    for (let x = 3; x <= 15; x++) {
      if (isReserved(x, y) || isRoad(x, y) || obstacles[y][x] !== -1) continue;
      const d = dens(x, y, 5.3, 0.4, 0.7);
      const r = rng();
      if (r < d * 0.09) props.push({ type: 'cactus_saguaro', tx: x, ty: y, flip: rng() < 0.5 });
      else if (r < d * 0.13) props.push({ type: 'cactus_pear', tx: x, ty: y });
      else if (r < d * 0.16) props.push({ type: 'cactus_agave', tx: x, ty: y });
      else if (r < d * 0.185) props.push({ type: 'tree_dead', tx: x, ty: y });
      else if (r < d * 0.235) props.push({ type: rng() < 0.4 ? 'rock_big' : 'rock_small', tx: x, ty: y, flip: rng() < 0.5 });
      else if (r < d * 0.3) props.push({ type: 'bush_dry', tx: x, ty: y });
    }
  }
  // rocks along the south rim + east scrub
  for (let y = 33; y <= 39; y++) {
    for (let x = 18; x <= 58; x++) {
      if (isReserved(x, y) || isRoad(x, y) || obstacles[y][x] !== -1) continue;
      const r = rng();
      if (r < 0.05) props.push({ type: rng() < 0.5 ? 'rock_big' : 'rock_small', tx: x, ty: y, flip: rng() < 0.5 });
      else if (r < 0.07) props.push({ type: 'cactus_agave', tx: x, ty: y });
    }
  }
  // reeds around the pond margin
  for (let y = 3; y <= 15; y++) {
    for (let x = 50; x <= 63; x++) {
      if (obstacles[y][x] !== -1 || isReserved(x, y)) continue;
      const near = pondAt(x + 0.5, y + 0.5, pond.cx, pond.cy, pond.rx + 1.1, pond.ry + 1.1)
        && !pondAt(x + 0.5, y + 0.5, pond.cx, pond.cy, pond.rx - 0.4, pond.ry - 0.4);
      if (near && rng() < 0.42) props.push({ type: 'reed', tx: x, ty: y });
    }
  }

  // --- NPCs ----------------------------------------------------------------------
  const npcs: NpcSpawn[] = [
    { id: 'npc-pete', tx: 53, ty: 30, wanderRadius: 2.2, dialogue: 'pete', prompt: 'گفتگو با پیت پیر' },
    { id: 'npc-traveler', tx: 38, ty: 23, wanderRadius: 3.2, dialogue: 'traveler', prompt: 'گفتگو با مسافر' },
  ];

  const spawn = { tx: 5, ty: 24 };

  // --- ground plan for the painter -------------------------------------------------
  const doorPx: Array<[number, number]> = [
    [33 * TILE_PX + 56, 17 * TILE_PX + 96],  // saloon door
    [41 * TILE_PX + 44, 18 * TILE_PX + 80],  // store door
    [47 * TILE_PX + 36, 18 * TILE_PX + 72],  // sheriff door
    [27 * TILE_PX + 40, 17 * TILE_PX + 70],  // bank steps
    [24 * TILE_PX + 24, 19 * TILE_PX + 68],  // gunsmith door
    [36 * TILE_PX + 32, 25 * TILE_PX + 62],  // house A
    [43 * TILE_PX + 32, 25 * TILE_PX + 62],  // house B
    [49 * TILE_PX + 40, 21 * TILE_PX + 64],  // stable entry
  ];
  const fenceSegs: Array<[number, number, number, number]> = [
    [corral.x, corral.y, corral.x + corral.w - 1, corral.y],
    [corral.x, corral.y + corral.h - 1, corral.x + corral.w - 1, corral.y + corral.h - 1],
    [corral.x, corral.y, corral.x, corral.y + corral.h - 1],
    [corral.x + corral.w - 1, corral.y, corral.x + corral.w - 1, corral.y + corral.h - 1],
  ];
  const plan: GroundPlan = {
    biome,
    roadPts: ROAD_PATH.map(([x, y]) => [x * TILE_PX, y * TILE_PX]),
    roadHalf: 15,
    plaza: { x: plaza.x * TILE_PX, y: plaza.y * TILE_PX, w: plaza.w * TILE_PX, h: plaza.h * TILE_PX },
    pond: { cx: pond.cx * TILE_PX, cy: pond.cy * TILE_PX, rx: pond.rx * TILE_PX, ry: pond.ry * TILE_PX },
    soil: { x: soil.x * TILE_PX, y: soil.y * TILE_PX, w: soil.w * TILE_PX, h: soil.h * TILE_PX },
    corral: { x: corral.x * TILE_PX, y: corral.y * TILE_PX, w: corral.w * TILE_PX, h: corral.h * TILE_PX },
    doorPx,
    fenceSegs,
  };

  return { w: MAP_W, h: MAP_H, ground, obstacles, props, npcs, spawn, colliderTiles: COLLIDER_TILES, plan };
}

/** True when a tile position allows walking (used by NPC wander logic). */
export function isWalkable(map: ParsedMap, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return false;
  return map.obstacles[ty][tx] === -1;
}

/** Water tile check. */
export function isWaterTile(index: number): boolean {
  return WATER_TILES.includes(index);
}
