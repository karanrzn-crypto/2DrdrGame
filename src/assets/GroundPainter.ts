/**
 * GroundPainter.ts — paints the ENTIRE visible ground into one 1024x704
 * canvas texture ("world-ground"). This is the core of the v3 rebuild:
 * per-tile procedural tiles always read as a patchwork of squares; a single
 * painted canvas has no tile grid at all, so terrain fields, roads, shores
 * and worn paths can be painted as continuous organic shapes with macro
 * light/shadow structure — the "hand-illustrated" look.
 *
 * Physics stays on the (hidden) tilemap layers; this painter reads the same
 * authoritative MapData so visuals and collision agree.
 *
 * Everything is deterministic (seeded PRNG + fbm fields): the world looks
 * identical on every run.
 */
import Phaser from 'phaser';
import { PAL } from './Palette';
import { makeCanvasTexture, PixelPen } from './PixelPen';
import { PROPS } from './PropFactory';
import { BUILDINGS } from './Buildings';
import { ParsedMap, GroundPlan, BIOME, WORLD_PX_W, WORLD_PX_H, TILE_PX, roadCenterYAt } from '../world/MapData';
import { WATER_TILES } from './TileIds';
import { fbm, mulberry32 } from '../world/noise';

export const GROUND_KEY = 'world-ground';

type RNG = () => number;

const SHADOW = 'rgba(26,16,8,';

/** rgba helper for palette hex + alpha. */
function withAlpha(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/** Channel-wise hex mix (t=0 → a, t=1 → b). */
function mixHex(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}

interface FieldColors {
  base: string; alt: string; dark: string; light: string; blade?: string;
}

const FIELD_PAL: Record<number, FieldColors> = {
  [BIOME.PLAINS]: { base: PAL.grass, alt: PAL.grassAlt, dark: PAL.grassSpeck, light: PAL.grassSpeckLight, blade: PAL.grassDeep },
  [BIOME.DRY]: { base: PAL.grassDry, alt: PAL.grassAlt, dark: PAL.dryGrassDark, light: PAL.dryGrassLight, blade: PAL.dirtDark },
  [BIOME.WOODS]: { base: PAL.grassWood, alt: PAL.grassWoodAlt, dark: PAL.grassWoodSpeck, light: PAL.grassWoodLight, blade: PAL.pineDark },
  [BIOME.BADLANDS]: { base: PAL.sand, alt: PAL.sandAlt, dark: PAL.sandDark, light: PAL.sandRipple, blade: PAL.sandDeep },
  [BIOME.SCRUB]: { base: PAL.grassDry, alt: PAL.sandAlt, dark: PAL.sandDark, light: PAL.grassSpeckLight, blade: PAL.sandDeep },
  [BIOME.MEADOW]: { base: PAL.grass, alt: PAL.grassSpeckLight, dark: PAL.grassSpeck, light: PAL.dryGrassLight, blade: PAL.grassDeep },
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Soft layered shadow rect (feathered by 3 alpha steps), bias to the east. */
function softShadow(pen: PixelPen, x: number, y: number, w: number, h: number, strength = 0.1): void {
  pen.rect(x + 5, y + 3, w, h, SHADOW + (strength * 0.8).toFixed(3) + ')');
  pen.rect(x + 3, y + 1, w, h, SHADOW + strength.toFixed(3) + ')');
  pen.rect(x + 1, y, w, h, SHADOW + strength.toFixed(3) + ')');
}

/** Contact dirt + shadow under a small prop. */
function contactDirt(pen: PixelPen, cx: number, baseY: number, w: number, rng: RNG): void {
  pen.blob(cx + 2, baseY - 1, w * 0.62, w * 0.2, withAlpha(PAL.dirtDark, 0.30), rng, 0.3);
  pen.blob(cx + 3, baseY, w * 0.5, w * 0.14, SHADOW + '0.22)', rng, 0.3);
}

/** Grass blade cluster: 2–4 blades with light tips. */
function tuft(pen: PixelPen, x: number, y: number, rng: RNG, dark: string, light: string): void {
  const n = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const bx = x + Math.floor(rng() * 5) - 2;
    const h = 2 + Math.floor(rng() * 3);
    pen.rect(bx, y - h, 1, h, rng() < 0.6 ? dark : light);
  }
}

/** Small flowers scattered on meadow grass. */
function flowers(pen: PixelPen, x: number, y: number, rng: RNG, n: number): void {
  const cols = [PAL.copper, PAL.cactusBloom, PAL.parchment, PAL.brass];
  for (let i = 0; i < n; i++) {
    const fx = x + Math.floor(rng() * 14);
    const fy = y + Math.floor(rng() * 14);
    pen.px(fx, fy, cols[Math.floor(rng() * cols.length)]);
    pen.px(fx, fy + 1, PAL.grassSpeck);
  }
}

// ---------------------------------------------------------------------------
// terrain fields
// ---------------------------------------------------------------------------

function paintTerrainFields(pen: PixelPen, map: ParsedMap, rng: RNG): void {
  const { plan } = map;
  for (let ty = 0; ty < map.h; ty++) {
    for (let tx = 0; tx < map.w; tx++) {
      const idx = map.ground[ty][tx];
      if (WATER_TILES.includes(idx)) continue; // painted by paintPond
      const b = plan.biome[ty * map.w + tx];
      const f = FIELD_PAL[b] ?? FIELD_PAL[BIOME.PLAINS];
      const x = tx * TILE_PX;
      const y = ty * TILE_PX;
      // macro tone: large-scale noise decides this tile's base value so the
      // ground has big light/dark structures instead of uniform noise
      const macro = fbm(tx * 0.11 + 3.7, ty * 0.11 + 9.2, 91, 3);
      // SMOOTH BIOME FIELDS: blend the base tone toward neighboring biomes
      // by proximity, so regions melt into each other instead of stepping
      const own = FIELD_PAL[b] ?? FIELD_PAL[BIOME.PLAINS];
      const tally = new Map<number, number>();
      for (let dy2 = -2; dy2 <= 2; dy2++) {
        for (let dx2 = -2; dx2 <= 2; dx2++) {
          const nx = tx + dx2;
          const ny = ty + dy2;
          if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h) continue;
          const nb = plan.biome[ny * map.w + nx];
          if (nb === b || !FIELD_PAL[nb]) continue;
          tally.set(nb, (tally.get(nb) ?? 0) + (3 - Math.max(Math.abs(dx2), Math.abs(dy2))));
        }
      }
      let mixed = own.base;
      let bestNb = -1;
      let bestW = 0;
      tally.forEach((wgt, nb) => { if (wgt > bestW) { bestW = wgt; bestNb = nb; } });
      if (bestNb >= 0 && bestW >= 2) {
        const t = Math.min(0.45, bestW / 16);
        mixed = mixHex(own.base, FIELD_PAL[bestNb].base, t);
      }
      const base = macro > 0.58 ? mixHex(mixed, own.alt, 0.5)
        : macro < 0.4 ? mixed
        : b === BIOME.PLAINS || b === BIOME.MEADOW ? mixHex(mixed, own.alt, 0.5) : mixed;
      pen.rect(x, y, TILE_PX, TILE_PX, base);
      // mottling
      const n = 5 + Math.floor(rng() * 5);
      for (let i = 0; i < n; i++) {
        const px = x + Math.floor(rng() * 16);
        const py = y + Math.floor(rng() * 16);
        const r = rng();
        pen.px(px, py, r < 0.4 ? f.dark : r < 0.75 ? f.light : base);
      }
      // 1x2 pebbles / litter
      if (rng() < 0.3) {
        const px = x + 1 + Math.floor(rng() * 13);
        const py = y + 1 + Math.floor(rng() * 13);
        pen.rect(px, py, 2, 1, b === BIOME.BADLANDS || b === BIOME.SCRUB ? PAL.gravelDark : f.dark);
      }
      // vegetation ticks
      if (f.blade && rng() < 0.5) tuft(pen, x + 3 + rng() * 10, y + 4 + rng() * 11, rng, f.blade, f.light);
      if (b === BIOME.MEADOW && rng() < 0.5) flowers(pen, x, y, rng, 3);
      if (b === BIOME.WOODS && rng() < 0.4) {
        // conifer needle litter + occasional leaf
        pen.px(x + rng() * 16, y + rng() * 16, PAL.pineDark);
        pen.px(x + rng() * 16, y + rng() * 16, PAL.deadWood);
      }
      if (b === BIOME.BADLANDS) {
        // wind ripples
        if (rng() < 0.35) {
          const ry = y + 2 + Math.floor(rng() * 12);
          pen.wavyH(x + Math.floor(rng() * 4), ry, 6 + Math.floor(rng() * 8), 1, withAlpha(PAL.sandRipple, 0.7), rng);
        }
        // cracked pan patches
        if (rng() < 0.1) {
          const cx = x + 4 + rng() * 6;
          const cy = y + 4 + rng() * 6;
          pen.wavyH(cx, cy, 6 + rng() * 4, 1, withAlpha(PAL.sandCrack, 0.8), rng);
          pen.rect(Math.floor(cx + 4), Math.floor(cy + 1), 1, 3 + rng() * 3, withAlpha(PAL.sandCrack, 0.8));
        }
        // long dune macro bands (low-frequency light/shadow ridges)
        const dune = fbm(tx * 0.05 + 130, ty * 0.16 + 7, 97, 2);
        if (dune > 0.62) pen.rect(x, y + Math.floor(rng() * 10), TILE_PX, 2, withAlpha(PAL.sandRipple, 0.5));
        else if (dune < 0.36) pen.rect(x, y + Math.floor(rng() * 12), TILE_PX, 2, withAlpha(PAL.sandDeep, 0.4));
      }
      if ((b === BIOME.PLAINS || b === BIOME.DRY) && rng() < 0.05) {
        // dry worn patch: organic dirt blob
        const cx = x + 8;
        const cy = y + 8;
        pen.blob(cx, cy, 4 + rng() * 4, 3 + rng() * 3, withAlpha(PAL.dirtAlt, 0.5), rng, 0.35);
        pen.blob(cx + 1, cy + 1, 3 + rng() * 2, 2 + rng() * 2, withAlpha(PAL.dirt, 0.5), rng, 0.35);
      }
      // ORGANIC BIOME EDGES: tiles within 2 of a different biome get the
      // neighbor's colors dithered in with distance falloff — soft, wide
      // transitions instead of hard region lines
      const self = b;
      let edgeD = 9;
      const neighborCols: string[] = [];
      for (let dy2 = -2; dy2 <= 2; dy2++) {
        for (let dx2 = -2; dx2 <= 2; dx2++) {
          const nx = tx + dx2;
          const ny = ty + dy2;
          if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h) continue;
          const nb = plan.biome[ny * map.w + nx];
          if (nb !== self && FIELD_PAL[nb]) {
            const d = Math.max(Math.abs(dx2), Math.abs(dy2));
            if (d < edgeD) edgeD = d;
            neighborCols.push(FIELD_PAL[nb].base, FIELD_PAL[nb].alt, FIELD_PAL[nb].dark);
          }
        }
      }
      if (edgeD <= 2 && neighborCols.length) {
        const density = edgeD === 1 ? 0.85 : 0.4;
        const specks = Math.floor((8 + rng() * 10) * density);
        for (let i = 0; i < specks; i++) {
          pen.px(x + rng() * 16, y + rng() * 16, neighborCols[Math.floor(rng() * neighborCols.length)]);
        }
        if (rng() < density * 0.7) {
          pen.blob(x + 4 + rng() * 8, y + 4 + rng() * 8, 2 + rng() * 3, 1.5 + rng() * 2, withAlpha(neighborCols[0], 0.7), rng, 0.35);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// road
// ---------------------------------------------------------------------------

function paintRoad(pen: PixelPen, plan: GroundPlan, rng: RNG): void {
  const pts = plan.roadPts;
  const half = plan.roadHalf;
  // total length
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    total += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  }
  const step = 2;
  const plaza = plan.plaza;
  const inPlaza = (x: number, y: number): boolean =>
    x >= plaza.x - 6 && x <= plaza.x + plaza.w + 6 && y >= plaza.y - 6 && y <= plaza.y + plaza.h + 6;

  const roadRects: Array<[number, number, number]> = [];
  for (let d = 0; d <= total; d += step) {
    // locate segment
    let acc = 0;
    let seg = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
      if (acc + l >= d) { seg = i; break; }
      acc += l;
    }
    const [x0, y0] = pts[seg];
    const [x1, y1] = pts[seg + 1];
    const l = Math.hypot(x1 - x0, y1 - y0);
    const t = l === 0 ? 0 : (d - acc) / l;
    const cx = x0 + (x1 - x0) * t;
    const cy = y0 + (y1 - y0) * t;
    const nx = -(y1 - y0) / (l || 1);
    const ny = (x1 - x0) / (l || 1);
    if (inPlaza(cx, cy)) continue; // the road dissolves into the plaza cobbles

    // organic edge width — strong local wobble so edges never read parallel
    const wob = (fbm(cx * 0.05, cy * 0.05, 71, 2) - 0.5) * 10 + (rng() * 4 - 2);
    const w = Math.max(6, half + wob);
    // shoulder band (trampled dirt)
    pen.rect(Math.floor(cx - w - 9), Math.floor(cy - 9), Math.floor((w + 9) * 2), 18, withAlpha(PAL.dirtAlt, 0.26));
    // main clay body
    roadRects.push([cx, cy, w]);
    pen.rect(Math.floor(cx - w), Math.floor(cy - 9), Math.floor(w * 2), 18, withAlpha(PAL.clay, 0.95));
    // clay tone variation
    if (rng() < 0.5) pen.rect(Math.floor(cx - w + rng() * w), Math.floor(cy - 7 + rng() * 12), 5 + rng() * 8, 2, withAlpha(PAL.clayAlt, 0.6));
    if (rng() < 0.3) pen.rect(Math.floor(cx - w + rng() * w), Math.floor(cy - 7 + rng() * 12), 4 + rng() * 6, 1, withAlpha(PAL.clayRidge, 0.5));
    // wheel ruts: two dashed grooves offset ±5px along the normal
    for (const o of [-5, 5]) {
      const rx = cx + nx * o;
      const ry = cy + ny * o;
      if (rng() < 0.88) pen.rect(Math.floor(rx - 1), Math.floor(ry - 6), 2, 12, withAlpha(PAL.clayRut, 0.8));
      if (rng() < 0.2) pen.rect(Math.floor(rx - 1), Math.floor(ry - 3), 2, 4, withAlpha(PAL.clay, 0.9)); // rut gap
    }
    // scattered gravel + hoofprints
    if (rng() < 0.35) pen.px(cx + (rng() * 2 - 1) * w, cy + (rng() * 2 - 1) * 7, PAL.gravelDark);
    if (rng() < 0.12) {
      const hx = cx + (rng() * 2 - 1) * w * 0.6;
      const hy = cy + (rng() * 2 - 1) * 6;
      pen.rect(Math.floor(hx), Math.floor(hy), 2, 1, withAlpha(PAL.clayRut, 0.7));
      pen.rect(Math.floor(hx + 2), Math.floor(hy + 2), 2, 1, withAlpha(PAL.clayRut, 0.7));
    }
    // grass overhang on the outer edge
    if (rng() < 0.4) {
      const side = rng() < 0.5 ? -1 : 1;
      const ex = cx + nx * (w + 2) * side;
      const ey = cy + ny * (w + 2) * side;
      tuft(pen, ex, ey + 4, rng, PAL.grassSpeck, PAL.grassSpeckLight);
    }
  }
  void roadRects;
}

// ---------------------------------------------------------------------------
// plaza, pond, soil, corral, cliffs
// ---------------------------------------------------------------------------

function paintPlaza(pen: PixelPen, plan: GroundPlan, rng: RNG): void {
  const p = plan.plaza;
  // trampled edge blending into the dirt
  pen.blob(p.x + p.w / 2, p.y + p.h / 2, p.w / 2 + 12, p.h / 2 + 10, withAlpha(PAL.dirtAlt, 0.45), rng, 0.18);
  // cobble body with an organic rim
  pen.blob(p.x + p.w / 2, p.y + p.h / 2, p.w / 2, p.h / 2 + 2, withAlpha(PAL.dirtDark, 0.9), rng, 0.06);
  const rows = [4, 10, 16, 22, 28, 34, 40, 46, 52, 58, 64, 70, 76, 82, 88];
  for (let r = 0; r < rows.length; r++) {
    const y = p.y + rows[r];
    if (y > p.y + p.h - 2) break;
    let x = p.x + (r % 2 === 0 ? 0 : 4) + Math.floor(rng() * 3);
    while (x < p.x + p.w - 2) {
      const w = 5 + Math.floor(rng() * 4);
      if (rng() < 0.18) { x += w + 1; continue; } // missing stone → packed dirt
      const shade = rng();
      const col = shade < 0.42 ? PAL.stoneDark : shade < 0.78 ? PAL.stone : shade < 0.92 ? PAL.gravel : PAL.stoneLight;
      pen.rect(x, y, Math.min(w, p.x + p.w - x), 5, col);
      pen.rect(x, y, Math.min(w, p.x + p.w - x), 1, withAlpha(PAL.stone, 0.9));
      pen.rect(x, y + 4, Math.min(w, p.x + p.w - x), 1, withAlpha(PAL.stoneDeep, 0.85));
      if (rng() < 0.35) pen.px(x + 1 + Math.floor(rng() * w), y + 2, PAL.stoneDeep);
      if (rng() < 0.2) pen.px(x + 1 + Math.floor(rng() * w), y + 1, PAL.gravelLight);
      x += w + 1;
    }
  }
  // wear trail where the road crosses (subtle clay tint band)
  const ryMid = roadCenterYAt(p.x + p.w / 2);
  pen.rect(p.x, Math.floor(ryMid - 8), p.w, 16, withAlpha(PAL.clay, 0.28));
}

function paintPond(pen: PixelPen, map: ParsedMap, plan: GroundPlan, rng: RNG): void {
  const { cx, cy, rx, ry } = plan.pond;
  const tcx = cx / TILE_PX;
  const tcy = cy / TILE_PX;
  const trx = rx / TILE_PX;
  const try_ = ry / TILE_PX;

  const maskAt = (px: number, py: number): number => {
    const dx = px / TILE_PX - tcx;
    const dy = py / TILE_PX - tcy;
    const d = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);
    const wob = 0.5 + fbm(Math.cos(ang) * 1.6 + 31.7, Math.sin(ang) * 1.6 + 17.3, 777, 3) * 0.34;
    const rr = Math.min(trx, try_) * (0.55 + 0.45 * (Math.min(trx, try_) / Math.max(trx, try_)));
    const eff = rr * (1 + wob * 0.55);
    return d / eff; // <1 inside water
  };

  const x0 = Math.floor(cx - rx - 14);
  const y0 = Math.floor(cy - ry - 14);
  const x1 = Math.ceil(cx + rx + 14);
  const y1 = Math.ceil(cy + ry + 14);

  // wet-sand ring under/around the water — ragged, with a soft outer falloff
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const m = maskAt(px, py);
      if (m < 1.5) {
        const ragged = fbm(px * 0.09 + 55, py * 0.09 + 21, 83, 2);
        if (m >= 1.34 && rng() > 1.45 - m) continue; // ragged outer cutoff
        const damp = m < 1.1 + ragged * 0.12 ? 0.5 : m < 1.34 ? 0.26 : 0.14;
        pen.px(px, py, withAlpha(m < 1.12 ? PAL.waterShoreDark : PAL.waterShore, damp));
        if (m > 1.06 && rng() < 0.08) pen.px(px, py, withAlpha(PAL.gravelDark, 0.5));
        if (m > 1.18 && ragged > 0.6 && rng() < 0.2) pen.px(px, py, withAlpha(PAL.grassSpeck, 0.6));
      }
    }
  }
  // water fill — pixels must belong to a colliding water tile so the player
  // can never stand on painted water
  const isWaterTileAt = (px: number, py: number): boolean => {
    const tx = Math.floor(px / TILE_PX);
    const ty = Math.floor(py / TILE_PX);
    if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return false;
    return WATER_TILES.includes(map.ground[ty][tx]);
  };
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const m = maskAt(px, py);
      if (m >= 1 || !isWaterTileAt(px, py)) continue;
      // depth gradient: deep blue center → richer tone at the rim;
      // light comes from the drifting shimmer sprites, not the fill
      const depth = Math.max(0, Math.min(1, m));
      const col = depth < 0.5 ? PAL.waterDeep : depth < 0.8 ? PAL.waterDark : PAL.water;
      pen.px(px, py, col);
      // micro ripple lines
      if ((py + px) % 7 === 0 && rng() < 0.4) pen.px(px, py, PAL.waterLight);
      if ((py * 3 + px) % 23 === 0 && rng() < 0.3) pen.px(px, py, PAL.water);
    }
  }
  // shore foam dashes along the waterline
  for (let a = 0; a < 360; a += 2) {
    const ang = (a / 360) * Math.PI * 2;
    const wob = 0.5 + fbm(Math.cos(ang) * 1.6 + 31.7, Math.sin(ang) * 1.6 + 17.3, 777, 3) * 0.34;
    const rr = Math.min(trx, try_) * (0.55 + 0.45 * (Math.min(trx, try_) / Math.max(trx, try_)));
    const eff = rr * (1 + wob * 0.55);
    const px = Math.floor(tcx * TILE_PX + Math.cos(ang) * eff * TILE_PX);
    const py = Math.floor(tcy * TILE_PX + Math.sin(ang) * eff * TILE_PX);
    if (rng() < 0.5) pen.rect(px - 1, py, 3, 1, withAlpha(PAL.waterShine, 0.8));
    if (rng() < 0.25) tuft(pen, px, py - 3, rng, PAL.reedDark, PAL.reed);
  }
}

function paintSoil(pen: PixelPen, plan: GroundPlan, rng: RNG): void {
  const s = plan.soil;
  pen.blob(s.x + s.w / 2, s.y + s.h / 2, s.w / 2 + 6, s.h / 2 + 5, withAlpha(PAL.dirtDark, 0.55), rng, 0.2);
  pen.rect(s.x, s.y, s.w, s.h, PAL.dirtDark);
  for (let y = s.y + 2; y < s.y + s.h - 2; y += 4) {
    pen.rect(s.x, y, s.w, 2, PAL.dirtDeep);
    pen.rect(s.x, y, s.w, 1, withAlpha(PAL.dirt, 0.8));
    // a few sprouts
    for (let x = s.x + 2; x < s.x + s.w - 2; x += 3 + Math.floor(rng() * 3)) {
      if (rng() < 0.5) pen.rect(x, y - 1, 1, 2, rng() < 0.5 ? PAL.olive : PAL.oliveDark);
    }
  }
  pen.speckle(s.x, s.y, s.w, s.h, withAlpha(PAL.clayDark, 0.7), 10, rng);
}

function paintCorral(pen: PixelPen, plan: GroundPlan, rng: RNG): void {
  const c = plan.corral;
  pen.rect(c.x, c.y, c.w, c.h, withAlpha(PAL.clayAlt, 0.9));
  pen.speckle(c.x, c.y, c.w, c.h, withAlpha(PAL.clay, 0.6), 60, rng);
  pen.speckle(c.x, c.y, c.w, c.h, withAlpha(PAL.clayDark, 0.6), 50, rng);
  // hoofprint trails
  for (let i = 0; i < 26; i++) {
    const hx = c.x + 4 + rng() * (c.w - 10);
    const hy = c.y + 4 + rng() * (c.h - 10);
    pen.rect(Math.floor(hx), Math.floor(hy), 2, 2, withAlpha(PAL.clayRut, 0.7));
    pen.rect(Math.floor(hx + 3 + rng() * 4), Math.floor(hy + 1 + rng() * 4), 2, 2, withAlpha(PAL.clayRut, 0.7));
  }
  // hay wisps
  for (let i = 0; i < 12; i++) {
    const hx = c.x + rng() * (c.w - 6);
    const hy = c.y + rng() * (c.h - 6);
    pen.rect(Math.floor(hx), Math.floor(hy), 3 + Math.floor(rng() * 3), 1, withAlpha(PAL.dryGrass, 0.7));
    pen.rect(Math.floor(hx + 1), Math.floor(hy + 1), 2, 1, withAlpha(PAL.dryGrassDark, 0.6));
  }
}

/** Mesa cliff rim around the whole world + soft AO inside the map. */
function paintCliffs(pen: PixelPen, map: ParsedMap, rng: RNG): void {
  const W = WORLD_PX_W;
  const H = WORLD_PX_H;
  const band = TILE_PX * 2;
  const strata = (x: number, y: number, w: number, h: number, vertical: boolean): void => {
    pen.rect(x, y, w, h, PAL.mesa);
    if (vertical) {
      for (let yy = y; yy < y + h; yy += 5 + Math.floor(rng() * 3)) {
        pen.rect(x, yy, w, 2 + Math.floor(rng() * 2), rng() < 0.5 ? PAL.mesaStrata : PAL.mesaDark);
      }
    } else {
      for (let xx = x; xx < x + w; xx += 7 + Math.floor(rng() * 4)) {
        pen.rect(xx, y, 3 + Math.floor(rng() * 3), h, rng() < 0.5 ? PAL.mesaStrata : PAL.mesaDark);
      }
    }
    // eroded notches
    for (let i = 0; i < Math.max(2, (vertical ? h : w) / 14); i++) {
      const nx = vertical ? x + rng() * w : x + rng() * w;
      const ny = vertical ? y + rng() * h : y + rng() * h;
      pen.blob(nx, ny, 3 + rng() * 3, 2 + rng() * 3, withAlpha(PAL.mesaShadow, 0.8), rng, 0.3);
    }
  };
  const pavement = (x: number, y: number, w: number, h: number): void => {
    pen.rect(x, y, w, h, PAL.mesaTop);
    pen.speckle(x, y, w, h, withAlpha(PAL.mesa, 0.7), Math.floor((w * h) / 90), rng);
    pen.speckle(x, y, w, h, withAlpha(PAL.sandDark, 0.6), Math.floor((w * h) / 130), rng);
  };

  // north rim: sunlit face + plateau top edge + AO inside the map
  pavement(0, 0, W, band - 6);
  strata(0, band - 6, W, 8, false);
  pen.rect(0, band + 2, W, 6, SHADOW + '0.22)');
  pen.rect(0, band + 8, W, 5, SHADOW + '0.12)');
  // south rim: plateau + shaded face below the playfield
  pen.rect(0, H - band - 6, W, 5, SHADOW + '0.10)');
  pavement(0, H - band - 1, W, 5);
  strata(0, H - band + 4, W, 10, false);
  pen.rect(0, H - band + 4, W, 2, PAL.mesaShadow);
  // west + east rims: vertical strata walls
  strata(0, 0, band - 4, H, true);
  pavement(band - 4, 0, 4, H);
  pavement(W - band, 0, 4, H);
  strata(W - band + 4, 0, band - 4, H, true);
  pen.rect(band - 2, 0, 5, H, SHADOW + '0.16)');
  pen.rect(W - band + 1, 0, 4, H, SHADOW + '0.14)');
  // scree aprons at the base of the rims
  for (let i = 0; i < 90; i++) {
    const side = rng();
    let x = 0; let y = 0;
    if (side < 0.35) { x = band + rng() * 26; y = rng() * H; }
    else if (side < 0.7) { x = W - band - 26 + rng() * 26; y = rng() * H; }
    else { x = rng() * W; y = rng() < 0.5 ? band + rng() * 18 : H - band - 18 + rng() * 18; }
    pen.rect(Math.floor(x), Math.floor(y), 2 + Math.floor(rng() * 2), 1 + Math.floor(rng() * 2), rng() < 0.5 ? PAL.scree : PAL.gravelDark);
    pen.px(Math.floor(x), Math.floor(y), PAL.gravelLight);
  }
  void map;
}

// ---------------------------------------------------------------------------
// feature shadows + footpaths
// ---------------------------------------------------------------------------

function paintFeatureShadows(pen: PixelPen, map: ParsedMap, rng: RNG): void {
  for (const spawn of map.props) {
    const spec = PROPS[spawn.type];
    if (!spec) continue;
    const isBuilding = BUILDINGS[spawn.type] !== undefined;
    const baseX = spawn.tx * TILE_PX + spec.w / 2;
    const baseY = spawn.ty * TILE_PX + spec.h;
    if (isBuilding) {
      // broad cast shadow east of the footprint + worn dirt in front
      softShadow(pen, spawn.tx * TILE_PX + 4, spawn.ty * TILE_PX + spec.h * 0.35, spec.w, spec.h * 0.62, 0.12);
      pen.blob(baseX, baseY + 3, spec.w * 0.55, 7, withAlpha(PAL.dirtAlt, 0.4), rng, 0.25);
    } else if (spawn.type.startsWith('tree_')) {
      pen.blob(baseX + spec.w * 0.22, baseY + 1, spec.w * 0.48, spec.w * 0.17, SHADOW + '0.18)', rng, 0.25);
      contactDirt(pen, baseX, baseY, spec.bodyW || 10, rng);
    } else if (spawn.type.startsWith('cactus_') || spawn.type.startsWith('rock_')) {
      pen.blob(baseX + 3, baseY, spec.w * 0.42, spec.w * 0.15, SHADOW + '0.2)', rng, 0.3);
      contactDirt(pen, baseX, baseY, spec.w * 0.6, rng);
    } else if (spec.bodyW > 0) {
      contactDirt(pen, baseX, baseY, Math.max(12, spec.bodyW), rng);
    }
  }
}

/** Worn footpaths from every town door down to the road. */
function paintFootpaths(pen: PixelPen, plan: GroundPlan, rng: RNG): void {
  for (const [dx, dy] of plan.doorPx) {
    const ry = roadCenterYAt(dx);
    const y1 = Math.max(dy, ry - 14);
    const steps = Math.max(4, Math.floor((y1 - dy) / 3));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = dx + (rng() * 2 - 1) * 2.4;
      const y = dy + (y1 - dy) * t;
      pen.rect(Math.floor(x - 3), Math.floor(y - 1), 6, 2, withAlpha(PAL.dirtAlt, 0.5 - t * 0.3));
      if (rng() < 0.4) pen.px(Math.floor(x), Math.floor(y), withAlpha(PAL.dirtDeep, 0.5));
    }
  }
}

// ---------------------------------------------------------------------------
// fences (visual rails; collision stays on the hidden tile layer)
// ---------------------------------------------------------------------------

function paintFences(pen: PixelPen, map: ParsedMap, rng: RNG): void {
  for (const [x1, y1, x2, y2] of map.plan.fenceSegs) {
    const horiz = y1 === y2;
    const len = horiz ? x2 - x1 : y2 - y1;
    for (let i = 0; i <= len; i++) {
      const tx = horiz ? x1 + i : x1;
      const ty = horiz ? y1 : y1 + i;
      // the gate gap stays open (obstacle == -1 there)
      if (map.obstacles[ty]?.[tx] === -1) continue;
      const px = tx * TILE_PX;
      const py = ty * TILE_PX;
      if (horiz) {
        pen.rect(px, py + 6, TILE_PX, 2, PAL.woodGray);
        pen.rect(px, py + 7, TILE_PX, 1, PAL.woodGrayDark);
        pen.rect(px, py + 11, TILE_PX, 2, PAL.woodGray);
        pen.rect(px, py + 12, TILE_PX, 1, PAL.woodGrayDark);
        pen.rect(px + 2, py + 8, 2, 8, SHADOW + '0.2)');
      } else {
        pen.rect(px + 7, py, 2, TILE_PX, PAL.woodGray);
        pen.rect(px + 8, py, 1, TILE_PX, PAL.woodGrayDark);
        pen.rect(px + 3, py + 5, 10, 2, PAL.woodGray);
        pen.rect(px + 3, py + 10, 10, 2, PAL.woodGray);
        pen.rect(px + 8, py + 2, 2, 12, SHADOW + '0.2)');
      }
      // posts at every other tile
      if (i % 2 === 0 || i === len) {
        if (horiz) {
          pen.rect(px + 1, py + 3, 3, 12, PAL.woodGrayDark);
          pen.rect(px + 1, py + 3, 1, 12, PAL.woodGray);
          pen.rect(px, py + 2, 5, 2, PAL.woodGrayDark);
          pen.rect(px + 4, py + 4, 2, 10, SHADOW + '0.22)');
        } else {
          pen.rect(px + 5, py + 1, 3, 12, PAL.woodGrayDark);
          pen.rect(px + 5, py + 1, 1, 12, PAL.woodGray);
          pen.rect(px + 4, py, 5, 2, PAL.woodGrayDark);
          pen.rect(px + 8, py + 3, 2, 10, SHADOW + '0.22)');
        }
      }
    }
  }
  void rng;
}

// ---------------------------------------------------------------------------
// region color washes (macro identity)
// ---------------------------------------------------------------------------

function paintRegionWashes(pen: PixelPen, map: ParsedMap, rng: RNG): void {
  const W = WORLD_PX_W;
  const H = WORLD_PX_H;
  // badlands: warm ochre wash
  pen.blob(8 * TILE_PX, 20 * TILE_PX, 15 * TILE_PX, 20 * TILE_PX, withAlpha(PAL.sandRipple, 0.10), rng, 0.25);
  // woods: cool shade wash
  pen.blob(13 * TILE_PX, 8 * TILE_PX, 14 * TILE_PX, 9 * TILE_PX, withAlpha(PAL.pineDark, 0.10), rng, 0.2);
  // meadow glimmer near the pond
  pen.blob(map.plan.pond.cx, map.plan.pond.cy, 13 * TILE_PX, 9 * TILE_PX, withAlpha(PAL.grassSpeckLight, 0.08), rng, 0.3);
  // map-corner ambient occlusion
  const corners: Array<[number, number, number, number]> = [
    [W / 2, H / 2 - H * 0.62, W * 0.75, H * 0.3],
    [W / 2, H / 2 + H * 0.62, W * 0.75, H * 0.3],
  ];
  for (const [x, y, rx, ry] of corners) {
    pen.blob(x, y, rx, ry, SHADOW + '0.10)', rng, 0.2);
  }
}

// ---------------------------------------------------------------------------
// entry
// ---------------------------------------------------------------------------

/** Paint the full world ground into the "world-ground" canvas texture. */
export function paintGround(scene: Phaser.Scene, map: ParsedMap): void {
  const { pen, refresh } = makeCanvasTexture(scene, GROUND_KEY, WORLD_PX_W, WORLD_PX_H);
  const rng = mulberry32(20260117);

  paintTerrainFields(pen, map, rng);
  paintRoad(pen, map.plan, rng);
  paintPlaza(pen, map.plan, rng);
  paintSoil(pen, map.plan, rng);
  paintCorral(pen, map.plan, rng);
  paintPond(pen, map, map.plan, rng);
  paintFeatureShadows(pen, map, rng);
  paintFootpaths(pen, map.plan, rng);
  paintFences(pen, map, rng);
  paintRegionWashes(pen, map, rng);
  paintCliffs(pen, map, rng); // last: the rim overpaints the map edges

  refresh();
}
