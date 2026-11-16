/**
 * TileFactory.ts — builds the world tile sheet procedurally (8x8 grid of
 * 16px tiles => 128x128 canvas). All tiles are original pixel art drawn
 * from Palette.ts, deterministic (seeded per-tile PRNG — reproducible art).
 *
 * v2 visual overhaul: biome variants (sage plain / dry / cool woods),
 * transition dithers between biomes, clay road with wheel ruts, cobble
 * plaza, pond shore rings, mesa-cliff strata for the world rim, corral
 * ground, farm soil and small story decals (stump, bones, rubble, hay).
 * Tile indices live in TileIds.ts (pure, testable without Phaser).
 */
import Phaser from 'phaser';
import { PAL } from './Palette';
import { makeCanvasTexture, PixelPen } from './PixelPen';
import { TILE } from './TileIds';

export { TILE, COLLIDER_TILES } from './TileIds';

export const TILE_SHEET_KEY = 'world-tiles';
export const TILE_COLS = 8;
export const TILE_SIZE = 16;

/** Deterministic PRNG so every tile is identical on every run (testable). */
function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type RNG = () => number;

interface TileCtx { pen: PixelPen; ox: number; oy: number; rng: RNG }

/** Scatter n single pixels of color from a weighted list. */
function speckle(c: TileCtx, colors: string[], n: number): void {
  for (let i = 0; i < n; i++) {
    const x = Math.floor(c.rng() * TILE_SIZE);
    const y = Math.floor(c.rng() * TILE_SIZE);
    c.pen.px(c.ox + x, c.oy + y, colors[Math.floor(c.rng() * colors.length)]);
  }
}

/** Short horizontal weathered strokes (dry grass / soil cracks). */
function strokes(c: TileCtx, color: string, n: number, len = 3): void {
  for (let i = 0; i < n; i++) {
    const x = Math.floor(c.rng() * (TILE_SIZE - len));
    const y = Math.floor(c.rng() * TILE_SIZE);
    c.pen.rect(c.ox + x, c.oy + y, len, 1, color);
  }
}

/** Tiny vertical grass blades. */
function blades(c: TileCtx, color: string, n: number, h = 2): void {
  for (let i = 0; i < n; i++) {
    const x = Math.floor(c.rng() * TILE_SIZE);
    const y = Math.floor(c.rng() * (TILE_SIZE - h));
    c.pen.rect(c.ox + x, c.oy + y, 1, h, color);
  }
}

// ---------------------------------------------------------------------------
// grass family
// ---------------------------------------------------------------------------
function grassPlain(c: TileCtx, base: string, alt: string, dark: string, light: string): void {
  c.pen.fill(base, TILE_SIZE, TILE_SIZE, c.ox, c.oy);
  speckle(c, [alt], 7);
  speckle(c, [dark], 4);
  speckle(c, [light], 4);
  blades(c, dark, 2);
  blades(c, light, 2);
}

function grassDry(c: TileCtx): void {
  grassPlain(c, PAL.grassDry, PAL.dryGrassDark, PAL.dirtDark, PAL.dryGrassLight);
  strokes(c, PAL.dryGrassDark, 4);
  // sage-grass fringe on all four edges so dry patches melt into the plain
  for (let x = 0; x < TILE_SIZE; x++) {
    if (c.rng() < 0.5) c.pen.px(c.ox + x, c.oy, c.rng() < 0.5 ? PAL.grass : PAL.grassAlt);
    if (c.rng() < 0.5) c.pen.px(c.ox + x, c.oy + 15, c.rng() < 0.5 ? PAL.grass : PAL.grassAlt);
  }
  for (let y = 0; y < TILE_SIZE; y++) {
    if (c.rng() < 0.5) c.pen.px(c.ox, c.oy + y, c.rng() < 0.5 ? PAL.grass : PAL.grassAlt);
    if (c.rng() < 0.5) c.pen.px(c.ox + 15, c.oy + y, c.rng() < 0.5 ? PAL.grass : PAL.grassAlt);
  }
}

function grassWood(c: TileCtx, alt: boolean): void {
  grassPlain(c, alt ? PAL.grassWoodAlt : PAL.grassWood, PAL.grassWoodSpeck, PAL.grassWoodSpeck, PAL.grassWoodLight);
  // leaf litter
  speckle(c, [PAL.pineDark, PAL.deadWoodDark], 5);
}

function flower(c: TileCtx, variant: number): void {
  grassPlain(c, PAL.grass, PAL.grassAlt, PAL.grassSpeck, PAL.grassSpeckLight);
  const cols = variant === 0
    ? [PAL.copper, PAL.parchment, PAL.copperLight]
    : [PAL.cactusBloom, PAL.parchment, PAL.brass];
  for (let i = 0; i < 5; i++) {
    const x = 2 + Math.floor(c.rng() * 12);
    const y = 2 + Math.floor(c.rng() * 12);
    c.pen.px(c.ox + x, c.oy + y, cols[i % cols.length]);
    c.pen.px(c.ox + x, c.oy + y + 1, PAL.grassSpeck);
  }
}

function tuft(c: TileCtx): void {
  grassPlain(c, PAL.grass, PAL.grassAlt, PAL.grassSpeck, PAL.grassSpeckLight);
  // a dry tuft: 3 splayed strokes
  const tx = 4 + Math.floor(c.rng() * 8);
  const ty = 5 + Math.floor(c.rng() * 7);
  c.pen.rect(c.ox + tx, c.oy + ty - 2, 1, 4, PAL.dryGrass);
  c.pen.rect(c.ox + tx - 2, c.oy + ty - 1, 1, 3, PAL.dryGrassDark);
  c.pen.rect(c.ox + tx + 2, c.oy + ty - 1, 1, 3, PAL.dryGrassDark);
  c.pen.px(c.ox + tx, c.oy + ty + 2, PAL.dryGrassDark);
}

// ---------------------------------------------------------------------------
// dirt / road family
// ---------------------------------------------------------------------------
function dirtTile(c: TileCtx, swap: boolean): void {
  c.pen.fill(swap ? PAL.dirtAlt : PAL.dirt, TILE_SIZE, TILE_SIZE, c.ox, c.oy);
  strokes(c, swap ? PAL.dirt : PAL.dirtAlt, 5);
  speckle(c, [PAL.dirtDark], 5);
  strokes(c, PAL.dirtDark, 2, 2);
  if (c.rng() < 0.5) c.pen.px(c.ox + 2 + Math.floor(c.rng() * 12), c.oy + 2 + Math.floor(c.rng() * 12), PAL.gravelDark);
}

/** Packed clay road: wheel ruts (E–W traffic) + wear. variant/rut/rutOnly. */
function roadTile(c: TileCtx, variant: number, ruts: boolean): void {
  c.pen.fill(variant === 0 ? PAL.clay : PAL.clayAlt, TILE_SIZE, TILE_SIZE, c.ox, c.oy);
  strokes(c, variant === 0 ? PAL.clayAlt : PAL.clay, 4);
  speckle(c, [PAL.clayDark, PAL.gravelDark], 6);
  speckle(c, [PAL.clayRidge], 3);
  if (ruts) {
    // two wheel paths with a dry ridge between them
    const y1 = variant === 0 ? 5 : 6;
    const y2 = y1 + 5;
    c.pen.rect(c.ox, c.oy + y1, TILE_SIZE, 1, PAL.clayRut);
    c.pen.rect(c.ox, c.oy + y2, TILE_SIZE, 1, PAL.clayRut);
    c.pen.rect(c.ox, c.oy + y1 + 2, TILE_SIZE, 1, PAL.clayRidge);
    // rut gaps: wheel tracks fade in and out
    const g = Math.floor(c.rng() * 10);
    c.pen.rect(c.ox + g, c.oy + y2, 3, 1, variant === 0 ? PAL.clay : PAL.clayAlt);
    c.pen.rect(c.ox + ((g + 7) % 13), c.oy + y1, 2, 1, variant === 0 ? PAL.clay : PAL.clayAlt);
  }
}

/** Road edge grassing over: clay with grass dither on top+bottom margins. */
function roadEdge(c: TileCtx, sand: boolean): void {
  roadTile(c, Math.floor(c.rng() * 2), c.rng() < 0.5);
  const g1 = sand ? PAL.sandAlt : PAL.grass;
  const g2 = sand ? PAL.sand : PAL.grassAlt;
  for (let x = 0; x < TILE_SIZE; x++) {
    if (c.rng() < 0.55) c.pen.px(c.ox + x, c.oy, c.rng() < 0.5 ? g1 : g2);
    if (c.rng() < 0.4) c.pen.px(c.ox + x, c.oy + 1, g2);
    if (c.rng() < 0.5) c.pen.px(c.ox + x, c.oy + 15, c.rng() < 0.5 ? g1 : g2);
    if (c.rng() < 0.3) c.pen.px(c.ox + x, c.oy + 14, g2);
  }
}

function gravelTile(c: TileCtx): void {
  c.pen.fill(PAL.gravel, TILE_SIZE, TILE_SIZE, c.ox, c.oy);
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(c.rng() * 14) + 1;
    const y = Math.floor(c.rng() * 14) + 1;
    const col = c.rng() < 0.4 ? PAL.gravelLight : c.rng() < 0.7 ? PAL.gravelDark : PAL.stoneDark;
    c.pen.rect(c.ox + x, c.oy + y, 2, 1, col);
    c.pen.px(c.ox + x, c.oy + y + 1, PAL.gravelDark);
  }
}

// ---------------------------------------------------------------------------
// sand family
// ---------------------------------------------------------------------------
function sandTile(c: TileCtx, variant: number): void {
  c.pen.fill(variant === 0 ? PAL.sand : variant === 1 ? PAL.sandAlt : PAL.sandAlt, TILE_SIZE, TILE_SIZE, c.ox, c.oy);
  speckle(c, [PAL.sandDark], 8);
  speckle(c, [PAL.sandRipple], 5);
  if (variant === 2) {
    // wind ripples
    strokes(c, PAL.sandRipple, 3, 6);
    strokes(c, PAL.sandDark, 3, 5);
  }
}

function sandCrack(c: TileCtx): void {
  sandTile(c, 1);
  // cracked pan polygon lines
  c.pen.rect(c.ox + 2, c.oy + 4, 7, 1, PAL.sandCrack);
  c.pen.rect(c.ox + 9, c.oy + 4, 1, 5, PAL.sandCrack);
  c.pen.rect(c.ox + 4, c.oy + 10, 9, 1, PAL.sandCrack);
  c.pen.rect(c.ox + 3, c.oy + 5, 1, 5, PAL.sandCrack);
  c.pen.rect(c.ox + 10, c.oy + 11, 4, 1, PAL.sandCrack);
}

/** Checker dither between two bases (biome transitions). */
function dither(c: TileCtx, a: string, b: string, bias = 0.5): void {
  c.pen.fill(a, TILE_SIZE, TILE_SIZE, c.ox, c.oy);
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      if (c.rng() < bias) c.pen.px(c.ox + x, c.oy + y, b);
    }
  }
  if (bias < 0.5) speckle(c, [b], 6); else speckle(c, [a], 6);
}

// ---------------------------------------------------------------------------
// plaza cobbles
// ---------------------------------------------------------------------------
function plazaTile(c: TileCtx, variant: number): void {
  c.pen.fill(PAL.dirtDark, TILE_SIZE, TILE_SIZE, c.ox, c.oy);
  // irregular cobbles in staggered rows
  const rows = [1, 6, 11];
  for (let r = 0; r < rows.length; r++) {
    const y = rows[r];
    let x = r % 2 === 0 ? 0 : 3;
    while (x < TILE_SIZE) {
      const w = 4 + Math.floor(c.rng() * 3);
      if (c.rng() < 0.12) { x += w + 1; continue; } // missing stone → dirt
      const shade = c.rng();
      const col = shade < 0.3 ? PAL.stone : shade < 0.6 ? PAL.stoneLight : shade < 0.8 ? PAL.gravel : PAL.gravelLight;
      c.pen.rect(c.ox + x, c.oy + y, Math.min(w, TILE_SIZE - x), 4, col);
      c.pen.rect(c.ox + x, c.oy + y, Math.min(w, TILE_SIZE - x), 1, PAL.stoneLight);
      if (variant === 1 && c.rng() < 0.4) c.pen.px(c.ox + x + 1, c.oy + y + 2, PAL.stoneDark);
      x += w + 1;
    }
  }
}

// ---------------------------------------------------------------------------
// water + shores
// ---------------------------------------------------------------------------
function waterTile(c: TileCtx, shift: number): void {
  c.pen.fill(PAL.water, TILE_SIZE, TILE_SIZE, c.ox, c.oy);
  c.pen.rect(c.ox, c.oy + 3 + shift, 6, 1, PAL.waterLight);
  c.pen.rect(c.ox + 8, c.oy + 3 + shift, 8, 1, PAL.waterLight);
  c.pen.rect(c.ox + 2, c.oy + 9 - shift, 7, 1, PAL.waterLight);
  c.pen.rect(c.ox + 11, c.oy + 12, 4, 1, PAL.waterDark);
  c.pen.rect(c.ox + 1, c.oy + 13, 3, 1, PAL.waterDark);
  speckle(c, [PAL.waterDark], 4);
  // a sparkle
  c.pen.px(c.ox + 4 + Math.floor(c.rng() * 8), c.oy + 5 + shift, PAL.waterShine);
}

/**
 * Shore rings around the pond. Orientation of the water portion:
 *   SHORE_N  water in the LOWER half (pond north rim)
 *   SHORE_S  water in the UPPER half (south rim)
 *   SHORE_E  water on the LEFT (east rim)
 *   SHORE_W  water on the RIGHT (west rim)
 *   SHORE_C1 water bottom-right corner (SE/NW inner corners)
 *   SHORE_C2 water top-left corner
 */
function shoreTile(c: TileCtx, dir: number): void {
  // wet-sand land base
  c.pen.fill(PAL.waterShore, TILE_SIZE, TILE_SIZE, c.ox, c.oy);
  speckle(c, [PAL.waterShoreDark, PAL.sandDark], 7);
  const wet = (x: number, y: number, w: number, h: number): void => {
    c.pen.rect(c.ox + x, c.oy + y, w, h, PAL.waterShoreDark);
    c.pen.rect(c.ox + x, c.oy + y, w, 1, PAL.water);
  };
  if (dir === 0) { wet(0, 9, TILE_SIZE, 3); c.pen.rect(c.ox, c.oy + 12, TILE_SIZE, 4, PAL.water); }
  else if (dir === 1) { c.pen.rect(c.ox, c.oy, TILE_SIZE, 4, PAL.water); wet(0, 4, TILE_SIZE, 2); }
  else if (dir === 2) { c.pen.rect(c.ox, c.oy, 4, TILE_SIZE, PAL.water); wet(4, 0, 2, TILE_SIZE); }
  else if (dir === 3) { wet(10, 0, 2, TILE_SIZE); c.pen.rect(c.ox + 12, c.oy, 4, TILE_SIZE, PAL.water); }
  else if (dir === 4) {
    c.pen.rect(c.ox + 8, c.oy + 8, 8, 1, PAL.water);
    c.pen.rect(c.ox + 8, c.oy + 8, 1, 8, PAL.water);
    c.pen.rect(c.ox + 10, c.oy + 10, 6, 6, PAL.water);
    c.pen.rect(c.ox + 9, c.oy + 9, 1, 1, PAL.waterShoreDark);
  } else {
    c.pen.rect(c.ox, c.oy, 8, 1, PAL.water);
    c.pen.rect(c.ox, c.oy, 1, 8, PAL.water);
    c.pen.rect(c.ox, c.oy, 6, 6, PAL.water);
    c.pen.rect(c.ox + 7, c.oy + 7, 1, 1, PAL.waterShoreDark);
  }
}

// ---------------------------------------------------------------------------
// rocks + cliffs
// ---------------------------------------------------------------------------
function rockTile(c: TileCtx, size: number): void {
  if (size === 0) {
    // large boulder
    c.pen.rect(c.ox + 1, c.oy + 6, 14, 8, PAL.stone);
    c.pen.rect(c.ox + 3, c.oy + 3, 10, 3, PAL.stone);
    c.pen.rect(c.ox + 6, c.oy + 2, 4, 1, PAL.stone);
    c.pen.rect(c.ox + 7, c.oy + 3, 4, 1, PAL.stoneLight);
    c.pen.rect(c.ox + 5, c.oy + 5, 3, 1, PAL.stoneLight);
    c.pen.rect(c.ox + 1, c.oy + 13, 14, 1, PAL.stoneDark);
    c.pen.rect(c.ox + 2, c.oy + 11, 2, 2, PAL.stoneDark);
    c.pen.rect(c.ox + 12, c.oy + 10, 2, 3, PAL.stoneDark);
    c.pen.rect(c.ox + 6, c.oy + 8, 2, 1, PAL.stoneDark);
  } else if (size === 1) {
    c.pen.rect(c.ox + 3, c.oy + 7, 10, 6, PAL.stone);
    c.pen.rect(c.ox + 5, c.oy + 4, 6, 3, PAL.stone);
    c.pen.rect(c.ox + 7, c.oy + 3, 3, 1, PAL.stoneLight);
    c.pen.rect(c.ox + 4, c.oy + 12, 9, 1, PAL.stoneDark);
    c.pen.rect(c.ox + 3, c.oy + 11, 1, 2, PAL.stoneDark);
    c.pen.rect(c.ox + 12, c.oy + 11, 1, 2, PAL.stoneDark);
  } else {
    // wide sun-baked slab
    c.pen.rect(c.ox, c.oy + 8, 16, 6, PAL.stone);
    c.pen.rect(c.ox + 2, c.oy + 5, 12, 3, PAL.stone);
    c.pen.rect(c.ox + 2, c.oy + 5, 12, 1, PAL.stoneLight);
    c.pen.rect(c.ox, c.oy + 13, 16, 1, PAL.stoneDark);
    c.pen.rect(c.ox + 5, c.oy + 9, 1, 4, PAL.stoneDark);
    c.pen.rect(c.ox + 10, c.oy + 10, 3, 1, PAL.stoneDark);
    c.pen.px(c.ox + 3, c.oy + 10, PAL.gravelDark);
  }
}

/** Mesa rim: plateau top / strata face / shadowed face. */
function cliffTile(c: TileCtx, kind: number): void {
  if (kind === 0) {
    // CLIFF_TOP — sunlit plateau surface with a shadowed rim
    c.pen.fill(PAL.mesaTop, TILE_SIZE, TILE_SIZE, c.ox, c.oy);
    speckle(c, [PAL.mesa, PAL.sandDark], 7);
    strokes(c, PAL.mesa, 2, 4);
    c.pen.rect(c.ox, c.oy + 13, TILE_SIZE, 3, PAL.mesaDark);
    c.pen.rect(c.ox, c.oy + 13, TILE_SIZE, 1, PAL.mesaShadow);
  } else if (kind === 1) {
    // CLIFF_FACE — sunlit strata bands
    c.pen.fill(PAL.mesa, TILE_SIZE, TILE_SIZE, c.ox, c.oy);
    c.pen.rect(c.ox, c.oy + 2, TILE_SIZE, 3, PAL.mesaStrata);
    c.pen.rect(c.ox, c.oy + 8, TILE_SIZE, 2, PAL.mesaStrata);
    c.pen.rect(c.ox, c.oy + 12, TILE_SIZE, 4, PAL.mesaDark);
    c.pen.rect(c.ox, c.oy + 7, TILE_SIZE, 1, PAL.mesaShadow);
    // eroded notches
    c.pen.rect(c.ox + 3, c.oy + 4, 2, 3, PAL.mesaDark);
    c.pen.rect(c.ox + 10, c.oy + 9, 2, 2, PAL.mesaDark);
    c.pen.rect(c.ox + 6, c.oy + 12, 3, 2, PAL.mesaShadow);
  } else {
    // CLIFF_DARK — deep shadow face
    c.pen.fill(PAL.mesaDark, TILE_SIZE, TILE_SIZE, c.ox, c.oy);
    c.pen.rect(c.ox, c.oy + 3, TILE_SIZE, 2, PAL.mesa);
    c.pen.rect(c.ox, c.oy + 9, TILE_SIZE, 3, PAL.mesaShadow);
    c.pen.rect(c.ox, c.oy + 13, TILE_SIZE, 3, PAL.mesaShadow);
    c.pen.rect(c.ox + 5, c.oy + 5, 2, 4, PAL.mesaShadow);
  }
}

function screeTile(c: TileCtx): void {
  c.pen.fill(PAL.sandAlt, TILE_SIZE, TILE_SIZE, c.ox, c.oy);
  speckle(c, [PAL.sandDark], 5);
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(c.rng() * 13) + 1;
    const y = Math.floor(c.rng() * 13) + 1;
    c.pen.rect(c.ox + x, c.oy + y, 2, 2, c.rng() < 0.5 ? PAL.scree : PAL.gravelDark);
    c.pen.px(c.ox + x, c.oy + y, PAL.gravelLight);
  }
}

function boneTile(c: TileCtx): void {
  sandTile(c, 1);
  // old cattle skull + rib hint (storytelling decal, walkable)
  c.pen.rect(c.ox + 4, c.oy + 6, 6, 4, PAL.parchmentDark);
  c.pen.rect(c.ox + 5, c.oy + 5, 4, 1, PAL.parchmentDark);
  c.pen.px(c.ox + 5, c.oy + 7, PAL.ink);
  c.pen.px(c.ox + 8, c.oy + 7, PAL.ink);
  c.pen.rect(c.ox + 10, c.oy + 9, 4, 1, PAL.parchmentDark);
  c.pen.rect(c.ox + 11, c.oy + 11, 3, 1, PAL.parchmentDark);
}

// ---------------------------------------------------------------------------
// fences + farm
// ---------------------------------------------------------------------------
function fenceH(c: TileCtx): void {
  c.pen.rect(c.ox, c.oy + 6, TILE_SIZE, 2, PAL.woodGray);
  c.pen.rect(c.ox, c.oy + 11, TILE_SIZE, 2, PAL.woodGray);
  c.pen.rect(c.ox, c.oy + 7, TILE_SIZE, 1, PAL.woodGrayDark);
  c.pen.rect(c.ox, c.oy + 12, TILE_SIZE, 1, PAL.woodGrayDark);
  c.pen.rect(c.ox + 2, c.oy + 3, 2, 11, PAL.woodGrayDark);
  c.pen.rect(c.ox + 11, c.oy + 3, 2, 11, PAL.woodGrayDark);
  c.pen.rect(c.ox + 2, c.oy + 3, 1, 11, PAL.woodGray);
  c.pen.rect(c.ox + 11, c.oy + 3, 1, 11, PAL.woodGray);
  // nail dots
  c.pen.px(c.ox + 2, c.oy + 6, PAL.ironDark);
  c.pen.px(c.ox + 12, c.oy + 11, PAL.ironDark);
}

function fenceV(c: TileCtx): void {
  c.pen.rect(c.ox + 7, c.oy + 1, 2, 15, PAL.woodGray);
  c.pen.rect(c.ox + 8, c.oy + 1, 1, 15, PAL.woodGrayDark);
  c.pen.rect(c.ox + 3, c.oy + 5, 10, 2, PAL.woodGray);
  c.pen.rect(c.ox + 3, c.oy + 10, 10, 2, PAL.woodGray);
  c.pen.rect(c.ox + 3, c.oy + 6, 10, 1, PAL.woodGrayDark);
  c.pen.rect(c.ox + 3, c.oy + 11, 10, 1, PAL.woodGrayDark);
}

function fencePost(c: TileCtx): void {
  c.pen.rect(c.ox + 6, c.oy + 3, 3, 11, PAL.woodGrayDark);
  c.pen.rect(c.ox + 6, c.oy + 3, 1, 11, PAL.woodGray);
  c.pen.rect(c.ox + 5, c.oy + 2, 5, 2, PAL.woodGray);
  c.pen.rect(c.ox + 5, c.oy + 2, 5, 1, PAL.woodGray);
}

function gateTile(c: TileCtx): void {
  // open gate wings swung inward (walkable)
  c.pen.rect(c.ox, c.oy + 4, 6, 2, PAL.woodGrayDark);
  c.pen.rect(c.ox, c.oy + 9, 5, 2, PAL.woodGrayDark);
  c.pen.rect(c.ox + 5, c.oy + 3, 1, 9, PAL.woodGrayDark);
  c.pen.rect(c.ox + 10, c.oy + 4, 6, 2, PAL.woodGrayDark);
  c.pen.rect(c.ox + 11, c.oy + 9, 5, 2, PAL.woodGrayDark);
  c.pen.rect(c.ox + 10, c.oy + 3, 1, 9, PAL.woodGrayDark);
}

function soilTile(c: TileCtx): void {
  c.pen.fill(PAL.dirtDark, TILE_SIZE, TILE_SIZE, c.ox, c.oy);
  for (let y = 2; y < TILE_SIZE; y += 4) {
    c.pen.rect(c.ox, c.oy + y, TILE_SIZE, 2, PAL.dirtDeep);
    c.pen.rect(c.ox, c.oy + y, TILE_SIZE, 1, PAL.dirt);
  }
  speckle(c, [PAL.clayDark], 4);
}

function corralTile(c: TileCtx): void {
  c.pen.fill(PAL.clayAlt, TILE_SIZE, TILE_SIZE, c.ox, c.oy);
  speckle(c, [PAL.clay, PAL.clayDark], 9);
  // hoofprints
  const hx = 2 + Math.floor(c.rng() * 10);
  const hy = 3 + Math.floor(c.rng() * 10);
  c.pen.rect(c.ox + hx, c.oy + hy, 2, 2, PAL.clayRut);
  c.pen.rect(c.ox + hx + 3, c.oy + hy + 2, 2, 2, PAL.clayRut);
}

function hayTile(c: TileCtx): void {
  grassPlain(c, PAL.grassDry, PAL.dryGrassDark, PAL.dirtDark, PAL.dryGrassLight);
  strokes(c, PAL.dryGrass, 6, 4);
  strokes(c, PAL.dryGrassDark, 4, 3);
}

function tracksTile(c: TileCtx): void {
  dirtTile(c, false);
  for (let i = 0; i < 4; i++) {
    const x = 2 + Math.floor(c.rng() * 11);
    const y = 2 + Math.floor(c.rng() * 11);
    c.pen.rect(c.ox + x, c.oy + y, 1, 2, PAL.dirtDeep);
    c.pen.rect(c.ox + x + 2, c.oy + y + 2, 1, 2, PAL.dirtDeep);
  }
}

// ---------------------------------------------------------------------------
// town details + decals
// ---------------------------------------------------------------------------
function plankTile(c: TileCtx): void {
  c.pen.fill(PAL.wallPlank, TILE_SIZE, TILE_SIZE, c.ox, c.oy);
  for (let y = 0; y < TILE_SIZE; y += 4) {
    c.pen.rect(c.ox, c.oy + y, TILE_SIZE, 1, PAL.wallPlankDark);
    c.pen.rect(c.ox, c.oy + y + 1, TILE_SIZE, 1, PAL.wallPlankLight);
  }
  c.pen.px(c.ox + 4, c.oy + 2, PAL.ironDark);
  c.pen.px(c.ox + 11, c.oy + 6, PAL.ironDark);
}

function porchTile(c: TileCtx): void {
  c.pen.fill(PAL.woodPale, TILE_SIZE, TILE_SIZE, c.ox, c.oy);
  for (let y = 0; y < TILE_SIZE; y += 3) {
    c.pen.rect(c.ox, c.oy + y, TILE_SIZE, 1, PAL.woodPaleDark);
  }
  speckle(c, [PAL.dirtDark], 3);
}

function pebblesTile(c: TileCtx): void {
  grassPlain(c, PAL.grass, PAL.grassAlt, PAL.grassSpeck, PAL.grassSpeckLight);
  for (let i = 0; i < 5; i++) {
    const x = 1 + Math.floor(c.rng() * 13);
    const y = 1 + Math.floor(c.rng() * 13);
    c.pen.rect(c.ox + x, c.oy + y, 2, 1, PAL.gravel);
    c.pen.px(c.ox + x, c.oy + y + 1, PAL.gravelDark);
  }
}

function dirtPatch(c: TileCtx): void {
  grassPlain(c, PAL.grass, PAL.grassAlt, PAL.grassSpeck, PAL.grassSpeckLight);
  ditherAt(c, 4, 4, 8, 8, PAL.dirtAlt, 0.42, PAL.dirt);
}

/** Local checker dither into a region of the tile (patch / blend helpers). */
function ditherAt(c: TileCtx, x0: number, y0: number, w: number, h: number, base: string, bias: number, base2: string): void {
  for (let y = y0; y < y0 + h && y < TILE_SIZE; y++) {
    for (let x = x0; x < x0 + w && x < TILE_SIZE; x++) {
      if (c.rng() < bias) c.pen.px(c.ox + x, c.oy + y, base);
      else if (c.rng() < 0.15) c.pen.px(c.ox + x, c.oy + y, base2);
    }
  }
}

function grassEdgeD(c: TileCtx): void {
  grassPlain(c, PAL.grass, PAL.grassAlt, PAL.grassSpeck, PAL.grassSpeckLight);
  ditherAt(c, 0, 6, TILE_SIZE, 10, PAL.dirtAlt, 0.55, PAL.dirt);
  ditherAt(c, 2, 12, 12, 4, PAL.dirt, 0.8, PAL.dirtDark);
}

function grassEdgeS(c: TileCtx): void {
  grassPlain(c, PAL.grass, PAL.grassAlt, PAL.grassSpeck, PAL.grassSpeckLight);
  ditherAt(c, 0, 6, TILE_SIZE, 10, PAL.sandAlt, 0.55, PAL.sand);
  ditherAt(c, 2, 12, 12, 4, PAL.sand, 0.8, PAL.sandDark);
}

function stumpTile(c: TileCtx): void {
  grassPlain(c, PAL.grass, PAL.grassAlt, PAL.grassSpeck, PAL.grassSpeckLight);
  c.pen.rect(c.ox + 4, c.oy + 6, 8, 6, PAL.trunkDark);
  c.pen.rect(c.ox + 5, c.oy + 5, 6, 1, PAL.trunk);
  c.pen.rect(c.ox + 6, c.oy + 6, 4, 3, PAL.deadWoodDark);
  c.pen.px(c.ox + 7, c.oy + 7, PAL.trunkDark);
  c.pen.px(c.ox + 8, c.oy + 8, PAL.trunk);
}

function rubbleTile(c: TileCtx): void {
  dirtTile(c, false);
  c.pen.rect(c.ox + 3, c.oy + 9, 5, 2, PAL.gravel);
  c.pen.rect(c.ox + 9, c.oy + 4, 4, 2, PAL.stoneDark);
  c.pen.rect(c.ox + 6, c.oy + 12, 6, 1, PAL.woodGrayDark);
  c.pen.px(c.ox + 12, c.oy + 9, PAL.gravelLight);
}

function spareTile(c: TileCtx): void {
  // unused indices render as plain grass so they can never look broken
  grassPlain(c, PAL.grass, PAL.grassAlt, PAL.grassSpeck, PAL.grassSpeckLight);
}

// ---------------------------------------------------------------------------
// sheet assembly
// ---------------------------------------------------------------------------
/** Draw the full tile sheet onto one canvas texture. */
export function buildTileSheet(scene: Phaser.Scene): void {
  const { pen, refresh } = makeCanvasTexture(
    scene, TILE_SHEET_KEY, TILE_COLS * TILE_SIZE, TILE_COLS * TILE_SIZE,
  );
  const at = (i: number) => ({
    pen,
    ox: (i % TILE_COLS) * TILE_SIZE,
    oy: Math.floor(i / TILE_COLS) * TILE_SIZE,
    rng: mulberry32(9100 + i * 733),
  });

  const T = TILE;
  const jobs: Array<[number, (c: TileCtx) => void]> = [
    [T.GRASS0, (c) => grassPlain(c, PAL.grass, PAL.grassAlt, PAL.grassSpeck, PAL.grassSpeckLight)],
    [T.GRASS1, (c) => grassPlain(c, PAL.grassAlt, PAL.grass, PAL.grassSpeck, PAL.grassSpeckLight)],
    [T.GRASSDRY, grassDry],
    [T.GRASS_WOOD, (c) => grassWood(c, false)],
    [T.GRASS_WOOD1, (c) => grassWood(c, true)],
    [T.FLOWER, (c) => flower(c, 0)],
    [T.FLOWER2, (c) => flower(c, 1)],
    [T.TUFT, tuft],
    [T.DIRT0, (c) => dirtTile(c, false)],
    [T.DIRT1, (c) => dirtTile(c, true)],
    [T.ROAD, (c) => roadTile(c, 0, true)],
    [T.ROAD1, (c) => roadTile(c, 1, true)],
    [T.ROAD_RUT, (c) => roadTile(c, 0, true)],
    [T.ROAD_EDGE_G, (c) => roadEdge(c, false)],
    [T.ROAD_EDGE_S, (c) => roadEdge(c, true)],
    [T.GRAVEL, gravelTile],
    [T.SAND0, (c) => sandTile(c, 0)],
    [T.SAND1, (c) => sandTile(c, 1)],
    [T.SAND2, (c) => sandTile(c, 2)],
    [T.SAND_CRACK, sandCrack],
    [T.SAND_EDGE_G, (c) => { grassPlain(c, PAL.grass, PAL.grassAlt, PAL.grassSpeck, PAL.grassSpeckLight); ditherAt(c, 2, 0, 12, 10, PAL.sand, 0.5, PAL.sandAlt); ditherAt(c, 4, 0, 8, 4, PAL.sand, 0.85, PAL.sandAlt); }],
    [T.DIRT_SAND, (c) => dither(c, PAL.dirtAlt, PAL.sandAlt, 0.45)],
    [T.PLAZA0, (c) => plazaTile(c, 0)],
    [T.PLAZA1, (c) => plazaTile(c, 1)],
    [T.WATER0, (c) => waterTile(c, 0)],
    [T.WATER1, (c) => waterTile(c, 2)],
    [T.SHORE_N, (c) => shoreTile(c, 0)],
    [T.SHORE_S, (c) => shoreTile(c, 1)],
    [T.SHORE_E, (c) => shoreTile(c, 2)],
    [T.SHORE_W, (c) => shoreTile(c, 3)],
    [T.SHORE_C1, (c) => shoreTile(c, 4)],
    [T.SHORE_C2, (c) => shoreTile(c, 5)],
    [T.ROCK0, (c) => rockTile(c, 0)],
    [T.ROCK1, (c) => rockTile(c, 1)],
    [T.ROCK2, (c) => rockTile(c, 2)],
    [T.CLIFF_TOP, (c) => cliffTile(c, 0)],
    [T.CLIFF_FACE, (c) => cliffTile(c, 1)],
    [T.CLIFF_DARK, (c) => cliffTile(c, 2)],
    [T.SCREE, screeTile],
    [T.BONE, boneTile],
    [T.FENCE_H, fenceH],
    [T.FENCE_V, fenceV],
    [T.FENCE_POST, fencePost],
    [T.GATE, gateTile],
    [T.SOIL, soilTile],
    [T.CORRAL_DIRT, corralTile],
    [T.HAY, hayTile],
    [T.TRACKS, tracksTile],
    [T.PLANK, plankTile],
    [T.PORCH, porchTile],
    [T.PEBBLES, pebblesTile],
    [T.DIRT_PATCH, dirtPatch],
    [T.GRASS_EDGE_D, grassEdgeD],
    [T.GRASS_EDGE_S, grassEdgeS],
    [T.STUMP, stumpTile],
    [T.RUBBLE, rubbleTile],
    [T.SPARE0, spareTile], [T.SPARE1, spareTile], [T.SPARE2, spareTile],
    [T.SPARE3, spareTile], [T.SPARE4, spareTile], [T.SPARE5, spareTile],
    [T.SPARE6, spareTile], [T.SPARE7, spareTile],
  ];

  for (const [index, draw] of jobs) draw(at(index));

  refresh();
}
