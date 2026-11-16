/**
 * Buildings.ts — rebuilt Western architecture for the visual overhaul.
 *
 * Every facade is drawn from shared material helpers (planked walls with
 * per-board weathering, stone masonry, shingle roofs, shuttered windows,
 * Z-brace doors, lanterns, foundations) so all buildings share one visual
 * language. Buildings declare night-light anchors and chimney smoke points
 * consumed by the atmosphere system in WorldScene.
 */
import { PAL } from './Palette';
import { PixelPen } from './PixelPen';

/** Deterministic PRNG for per-building weathering (reproducible art). */
function rng(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A night-light anchor: position in canvas coords, radius, color. */
export interface LightAnchor {
  x: number;
  y: number;
  r: number;
  color: string;
  /** Flicker amplitude 0..0.3 (fire), 0..0.08 (lamp). */
  flicker?: number;
}

export interface BuildingArt {
  w: number;
  h: number;
  draw: (pen: PixelPen) => void;
  lights?: LightAnchor[];
  /** Chimney smoke emitters, canvas coords. */
  smoke?: Array<[number, number]>;
  /** Y offset (from canvas top) where the scene renders sign text. */
  signDy?: number;
}

// ---------------------------------------------------------------------------
// shared material helpers
// ---------------------------------------------------------------------------

/** Vertical plank wall with per-board shade variation, seams and knots. */
function planks(
  pen: PixelPen, r: () => number,
  x: number, y: number, w: number, h: number,
  base: string, dark: string, light: string,
): void {
  pen.rect(x, y, w, h, base);
  let px = x;
  while (px < x + w) {
    const pw = 4 + (r() < 0.4 ? 1 : 0);
    if (r() < 0.18) pen.rect(px, y, Math.min(pw, x + w - px), h, dark);
    else if (r() < 0.14) pen.rect(px, y, Math.min(pw, x + w - px), h, light);
    if (px + pw < x + w) pen.rect(px + pw, y, 1, h, dark);
    // knot
    if (r() < 0.12) pen.px(px + 1 + Math.floor(r() * (pw - 1)), y + Math.floor(r() * h), dark);
    px += pw + 1;
  }
  // weather streaks (rain running down from the top edge)
  for (let i = 0; i < w / 10; i++) {
    const sx = x + Math.floor(r() * (w - 1));
    const len = 4 + Math.floor(r() * 8);
    pen.rect(sx, y, 1, Math.min(len, h), dark);
  }
}

/** Rough stone masonry with mortar gaps (foundations, sheriff lower wall). */
function stoneWall(
  pen: PixelPen, r: () => number,
  x: number, y: number, w: number, h: number,
): void {
  pen.rect(x, y, w, h, PAL.stoneDeep);
  const rows = Math.max(1, Math.floor(h / 4));
  for (let row = 0; row < rows; row++) {
    const sy = y + row * 4;
    let sx = x - (row % 2) * 2;
    while (sx < x + w) {
      const bw = Math.min(3 + Math.floor(r() * 3), x + w - sx);
      if (bw <= 0) break;
      const shade = r();
      const col = shade < 0.35 ? PAL.stone : shade < 0.65 ? PAL.stoneLight : PAL.stoneDark;
      pen.rect(Math.max(sx, x), Math.max(sy, y), bw, Math.min(3, y + h - sy), col);
      pen.rect(Math.max(sx, x), Math.max(sy, y), bw, 1, PAL.stoneLight);
      sx += bw + 1;
    }
  }
}

/** Dressed cut-stone blocks (bank facade). */
function cutStone(
  pen: PixelPen, r: () => number,
  x: number, y: number, w: number, h: number,
): void {
  pen.rect(x, y, w, h, PAL.cutStoneDark);
  for (let sy = y; sy < y + h; sy += 6) {
    let sx = x - ((sy / 6) % 2) * 3;
    while (sx < x + w) {
      const bw = Math.min(9 + Math.floor(r() * 4), x + w - sx);
      if (bw <= 0) break;
      const shade = r();
      const col = shade < 0.5 ? PAL.cutStone : shade < 0.75 ? PAL.cutStoneLight : PAL.cutStoneDark;
      pen.rect(Math.max(sx, x), sy, bw, 5, col);
      pen.rect(Math.max(sx, x), sy, bw, 1, PAL.cutStoneLight);
      sx += bw + 1;
    }
  }
}

/** Shingled roof band with ridge highlight, offset rows and beam ends. */
function shingleRoof(
  pen: PixelPen,
  x: number, y: number, w: number, h: number,
  main: string, dark: string, light: string,
): void {
  pen.rect(x, y, w, h, main);
  for (let ry = 0; ry < h - 1; ry += 3) {
    const off = (ry / 3) % 2 === 0 ? 0 : 2;
    for (let sx = x + off; sx < x + w; sx += 5) {
      pen.rect(sx, y + ry + 2, 4, 1, dark);
    }
    pen.rect(x, y + ry, w, 1, light);
  }
  pen.rect(x, y, w, 1, light);
  pen.rect(x, y + h - 1, w, 1, dark);
  // beam ends under the eave
  for (let bx = x + 3; bx < x + w - 2; bx += 12) {
    pen.rect(bx, y + h - 2, 2, 2, PAL.beam);
  }
}

/** Triangle gable roof for houses (apex at cx, top y). */
function gableRoof(
  pen: PixelPen, r: () => number,
  cx: number, top: number, halfW: number, height: number,
  main: string, dark: string, light: string,
): void {
  for (let ry = 0; ry < height; ry += 2) {
    const t = ry / height;
    const half = 2 + Math.round((halfW - 2) * t);
    const col = ry === 0 ? light : ry % 4 === 0 ? main : dark;
    pen.rect(cx - half, top + ry, half * 2, 2, col);
    if (r() < 0.3) pen.rect(cx - half + 1, top + ry, half * 2 - 2, 1, dark);
  }
  pen.rect(cx - 2, top, 4, 2, light); // ridge cap
}

/** Window with frame, 2-tone glass, muntin cross, sill and shutters. */
function windowShuttered(
  pen: PixelPen, r: () => number,
  x: number, y: number, w = 12, h = 13, bars = false,
): void {
  // shutters
  pen.rect(x - 4, y - 1, 3, h + 2, PAL.woodDark);
  pen.rect(x - 3, y - 1, 1, h + 2, PAL.woodLight);
  pen.rect(x + w + 1, y - 1, 3, h + 2, PAL.woodDark);
  pen.rect(x + w + 1, y - 1, 1, h + 2, PAL.woodLight);
  // frame
  pen.rect(x - 1, y - 1, w + 2, h + 2, PAL.beam);
  // glass: sky-tinted, lighter at top
  pen.rect(x, y, w, h, PAL.glassDark);
  pen.rect(x, y, w, Math.max(2, Math.floor(h / 2)), PAL.glass);
  for (let i = 0; i < Math.min(w, h); i++) {
    if (r() < 0.8) pen.px(x + i, y + i, PAL.glassLight);
  }
  // muntin cross
  pen.rect(x + Math.floor(w / 2) - 1, y, 1, h, PAL.beam);
  pen.rect(x, y + Math.floor(h / 2) - 1, w, 1, PAL.beam);
  if (bars) {
    pen.rect(x + 2, y, 1, h, PAL.ironDark);
    pen.rect(x + w - 3, y, 1, h, PAL.ironDark);
  }
  // sill + drip shadow
  pen.rect(x - 1, y + h + 1, w + 2, 2, PAL.stoneLight);
  pen.rect(x - 1, y + h + 3, w + 2, 1, PAL.stoneDark);
}

/** Big display window (store) — wider glass with a shelf hint. */
function displayWindow(pen: PixelPen, x: number, y: number, w: number, h: number): void {
  pen.rect(x - 1, y - 1, w + 2, h + 2, PAL.beam);
  pen.rect(x, y, w, h, PAL.glassDark);
  pen.rect(x, y, w, Math.floor(h * 0.4), PAL.glass);
  for (let i = 0; i < Math.min(w, h); i += 1) {
    if (i % 2 === 0) pen.px(x + i, y + i, PAL.glassLight);
  }
  pen.rect(x, y + Math.floor(h * 0.62), w, 2, PAL.woodDark); // shelf
  // goods on the shelf
  pen.rect(x + 3, y + Math.floor(h * 0.62) - 3, 3, 3, PAL.copper);
  pen.rect(x + 9, y + Math.floor(h * 0.62) - 4, 4, 4, PAL.brick);
  pen.rect(x + 16, y + Math.floor(h * 0.62) - 3, 3, 3, PAL.parchmentDark);
  pen.rect(x - 1, y + h + 1, w + 2, 2, PAL.stoneLight);
}

/** Plank door with Z-brace, frame, handle and hinges. */
function doorZ(
  pen: PixelPen,
  x: number, y: number, w: number, h: number,
  plate = false, glassTop = false,
): void {
  pen.rect(x - 1, y - 2, w + 2, h + 2, PAL.beam);
  pen.rect(x, y, w, h, PAL.wood);
  for (let px = x + 2; px < x + w; px += 3) pen.rect(px, y, 1, h, PAL.woodDark);
  if (glassTop) {
    pen.rect(x + 2, y + 2, w - 4, Math.floor(h * 0.3), PAL.glass);
    pen.px(x + 3, y + 3, PAL.glassLight);
  }
  // Z-brace
  pen.rect(x, y + 2, w, 2, PAL.woodDark);
  pen.rect(x, y + h - 4, w, 2, PAL.woodDark);
  const steps = Math.floor(h / 4);
  for (let i = 0; i < steps; i++) {
    const bx = x + Math.round((w - 2) * (i / steps));
    pen.rect(bx, y + 4 + i * Math.floor((h - 8) / steps), 2, 2, PAL.woodDark);
  }
  // hinges + handle
  pen.rect(x - 1, y + 2, 1, 3, PAL.ironDark);
  pen.rect(x - 1, y + h - 5, 1, 3, PAL.ironDark);
  pen.rect(x + w - 3, y + Math.floor(h / 2) - 1, 2, 3, PAL.copper);
  if (plate) { // iron reinforcement plates (sheriff)
    pen.rect(x, y + 6, w, 1, PAL.ironDark);
    pen.rect(x, y + h - 8, w, 1, PAL.ironDark);
  }
}

/** Saloon swing doors. */
function swingDoors(pen: PixelPen, x: number, y: number, w: number, h: number): void {
  pen.rect(x - 1, y - 1, w + 2, h + 1, PAL.beam);
  const half = Math.floor(w / 2) - 1;
  for (const [dx, dw] of [[0, half], [half + 2, half] as const]) {
    pen.rect(x + dx, y, dw, h, PAL.woodLight);
    pen.rect(x + dx, y, 1, h, PAL.woodPaleDark);
    pen.rect(x + dx + dw - 1, y, 1, h, PAL.woodDark);
    pen.rect(x + dx, y + 2, dw, 1, PAL.woodDark);
    pen.rect(x + dx, y + h - 3, dw, 1, PAL.woodDark);
  }
  pen.rect(x + half, y, 2, h, PAL.beam);
}

/** Wall lantern with bracket. */
function lantern(pen: PixelPen, x: number, y: number, wallSide = 1): void {
  pen.rect(x, y, 2, 4, PAL.ironDark);
  pen.rect(x + wallSide, y + 3, 4, 5, PAL.ironDark);
  pen.rect(x + wallSide + 1, y + 4, 2, 3, PAL.lampGlow);
  pen.px(x + wallSide + 1, y + 4, PAL.glassLight);
  pen.rect(x + wallSide, y + 8, 4, 1, PAL.copperDark);
}

/** Stone chimney with cap (returns top-center for the smoke anchor). */
function chimney(pen: PixelPen, r: () => number, x: number, y: number, w = 7, h = 11): Array<[number, number]> {
  stoneWall(pen, r, x, y + 2, w, h);
  pen.rect(x - 1, y, w + 2, 2, PAL.stoneDark);
  pen.rect(x + 1, y + 1, w - 2, 2, PAL.ironDark); // flue opening
  return [[x + Math.floor(w / 2), y]];
}

/** Building base: foundation + ground shadow. */
function foundation(pen: PixelPen, r: () => number, x: number, y: number, w: number, h = 4): void {
  stoneWall(pen, r, x, y, w, h);
  pen.rect(x, y - 1, w, 1, PAL.dirtDeep);
}

/** Wooden sign board with trim (Persian text rendered by the scene). */
function signBoard(pen: PixelPen, x: number, y: number, w: number, h: number): void {
  pen.rect(x - 1, y - 1, w + 2, h + 2, PAL.beam);
  pen.rect(x, y, w, h, PAL.wallPlank);
  pen.rect(x, y, w, 1, PAL.wallPlankLight);
  pen.rect(x, y + h - 1, w, 1, PAL.wallPlankDark);
  pen.px(x + 2, y + 2, PAL.ironDark);
  pen.px(x + w - 3, y + h - 3, PAL.ironDark);
}

// ---------------------------------------------------------------------------
// the buildings
// ---------------------------------------------------------------------------

/** Silver Spur Saloon — the town's focal point. 112x92. */
const saloon: BuildingArt = {
  w: 112, h: 92, signDy: 12,
  draw: (pen) => {
    const r = rng(11);
    // false-front parapet
    pen.rect(6, 4, 100, 14, PAL.roofRust);
    pen.rect(6, 4, 100, 2, PAL.roofRustLight);
    pen.rect(6, 16, 100, 2, PAL.roofRustDark);
    pen.rect(16, 0, 80, 4, PAL.roofRust);
    pen.rect(16, 0, 80, 1, PAL.roofRustDark);
    // decorative trim under the cornice
    for (let dx = 10; dx < 102; dx += 8) pen.rect(dx, 17, 4, 2, PAL.roofRustDark);
    // sign band
    signBoard(pen, 24, 8, 64, 9);
    // roof behind the parapet
    shingleRoof(pen, 4, 20, 104, 10, PAL.roofBrown, PAL.roofBrownDark, PAL.roofBrownLight);
    // porch roof
    shingleRoof(pen, 2, 30, 108, 7, PAL.roofBrownDark, PAL.roofBrownDark, PAL.roofBrown);
    pen.rect(2, 37, 108, 2, PAL.beam);
    // walls
    planks(pen, r, 6, 39, 100, 45, PAL.wallPlank, PAL.wallPlankDark, PAL.wallPlankLight);
    pen.rect(6, 39, 100, 2, PAL.beam); // porch shadow
    // porch deck + posts
    pen.rect(2, 84, 108, 8, PAL.woodPale);
    for (let py = 84; py < 92; py += 3) pen.rect(2, py, 108, 1, PAL.woodPaleDark);
    for (const pxx of [8, 100]) {
      pen.rect(pxx, 37, 3, 47, PAL.woodDark);
      pen.rect(pxx, 37, 1, 47, PAL.woodLight);
    }
    foundation(pen, r, 6, 80, 100, 4);
    // windows + entry (framed swing doors)
    windowShuttered(pen, r, 14, 46, 12, 13);
    windowShuttered(pen, r, 86, 46, 12, 13);
    pen.rect(46, 58, 22, 26, PAL.beam);      // entry frame
    pen.rect(47, 59, 20, 25, PAL.woodDark);  // shadowed doorway
    swingDoors(pen, 48, 60, 18, 24);
    // side door
    doorZ(pen, 88, 60, 11, 24);
    // lamp beside the entry
    lantern(pen, 74, 56, -1);
    // hitch rail stub on the facade
    pen.rect(30, 78, 2, 6, PAL.woodGrayDark);
    pen.rect(24, 77, 14, 2, PAL.woodGray);
  },
  lights: [
    { x: 75, y: 62, r: 27, color: PAL.lampGlow, flicker: 0.07 },
    { x: 20, y: 52, r: 12, color: PAL.windowGlow },
    { x: 92, y: 52, r: 12, color: PAL.windowGlow },
    { x: 57, y: 72, r: 14, color: PAL.windowGlow },
  ],
};

/** General store with a striped awning. 88x76. */
const store: BuildingArt = {
  w: 88, h: 76, signDy: 24,
  draw: (pen) => {
    const r = rng(22);
    // awning (striped, scalloped)
    for (let ax = 2, i = 0; ax < 86; ax += 7, i++) {
      pen.rect(ax, 2, 7, 12, i % 2 === 0 ? PAL.woodLight : PAL.roofRust);
      pen.rect(ax, 13, 7, 1, PAL.woodDark);
      pen.rect(ax + 2, 14, 3, 1, i % 2 === 0 ? PAL.woodLight : PAL.roofRust);
    }
    pen.rect(2, 1, 84, 1, PAL.woodDark);
    // wall
    planks(pen, r, 4, 15, 80, 53, PAL.woodPale, PAL.woodPaleDark, PAL.wallPlankLight);
    pen.rect(4, 15, 80, 2, PAL.beam);
    foundation(pen, r, 4, 66, 80, 4);
    // sign board on the wall
    signBoard(pen, 28, 20, 32, 8);
    // display window + door + window
    displayWindow(pen, 8, 34, 26, 16);
    doorZ(pen, 40, 44, 12, 22, false, true);
    windowShuttered(pen, r, 62, 34, 12, 13);
    // lamp over the door
    lantern(pen, 54, 38, -1);
    // goods outside: sack stack hint on the porch edge
    pen.rect(70, 62, 10, 6, PAL.parchmentDark);
    pen.rect(70, 62, 10, 1, PAL.parchment);
    pen.rect(74, 58, 6, 4, PAL.parchmentDark);
  },
  lights: [
    { x: 54, y: 44, r: 24, color: PAL.lampGlow, flicker: 0.07 },
    { x: 21, y: 42, r: 13, color: PAL.windowGlow },
    { x: 68, y: 40, r: 12, color: PAL.windowGlow },
  ],
};

/** Sheriff's office — stone base, badge, iron-barred windows. 72x68. */
const sheriff: BuildingArt = {
  w: 72, h: 68, signDy: 30,
  draw: (pen) => {
    const r = rng(33);
    shingleRoof(pen, 2, 0, 68, 8, PAL.roofRustDark, PAL.roofRustDark, PAL.roofRust);
    pen.rect(2, 8, 68, 2, PAL.beam);
    planks(pen, r, 4, 10, 64, 30, PAL.woodPale, PAL.woodPaleDark, PAL.wallPlankLight);
    stoneWall(pen, r, 4, 40, 64, 22);
    pen.rect(4, 40, 64, 1, PAL.stoneLight);
    foundation(pen, r, 4, 60, 64, 3);
    // badge plaque
    pen.rect(31, 13, 10, 10, PAL.woodDark);
    pen.rect(33, 15, 6, 6, PAL.copper);
    pen.px(36, 18, PAL.parchment);
    // sign board
    signBoard(pen, 18, 26, 36, 8);
    // windows with bars
    windowShuttered(pen, r, 8, 14, 11, 11, true);
    windowShuttered(pen, r, 53, 14, 11, 11, true);
    // wanted poster
    pen.rect(46, 40, 10, 12, PAL.parchment);
    pen.rect(47, 41, 8, 1, PAL.ink);
    pen.rect(49, 44, 4, 4, PAL.hairDark);
    pen.rect(47, 50, 8, 1, PAL.ink);
    // sturdy door
    doorZ(pen, 28, 40, 14, 22, true);
    lantern(pen, 48, 38, -1);
  },
  lights: [
    { x: 48, y: 44, r: 24, color: PAL.lampGlow, flicker: 0.06 },
    { x: 13, y: 20, r: 12, color: PAL.windowGlow },
    { x: 58, y: 20, r: 12, color: PAL.windowGlow },
  ],
};

/** Coppergate Bank — the most impressive building in town. 80x64. */
const bank: BuildingArt = {
  w: 80, h: 64, signDy: 26,
  draw: (pen) => {
    const r = rng(44);
    // pediment
    for (let ry = 0; ry < 12; ry++) {
      const half = Math.round((ry / 12) * 34);
      pen.rect(40 - half, 12 - ry, half * 2, 1, ry % 3 === 0 ? PAL.cutStoneLight : PAL.cutStone);
    }
    pen.rect(40 - 1, 0, 2, 2, PAL.copperLight);
    pen.rect(6, 12, 68, 2, PAL.copperDark); // cornice
    // body
    cutStone(pen, r, 6, 14, 68, 40);
    // pilasters
    for (const pxx of [6, 68]) {
      pen.rect(pxx, 14, 6, 40, PAL.cutStoneLight);
      pen.rect(pxx + 4, 14, 2, 40, PAL.cutStoneDark);
      pen.rect(pxx - 1, 12, 8, 3, PAL.cutStoneLight); // capital
      pen.rect(pxx - 1, 52, 8, 3, PAL.cutStoneDark);  // base
    }
    // steps
    pen.rect(24, 54, 32, 3, PAL.stoneLight);
    pen.rect(22, 57, 36, 3, PAL.stone);
    pen.rect(20, 60, 40, 3, PAL.stoneDark);
    // high barred windows
    windowShuttered(pen, r, 16, 20, 8, 9, true);
    windowShuttered(pen, r, 56, 20, 8, 9, true);
    // double copper doors
    pen.rect(31, 32, 18, 22, PAL.beam);
    for (const [dx, dw] of [[32, 8], [41, 8] as const]) {
      pen.rect(dx, 33, dw, 21, PAL.copper);
      pen.rect(dx, 33, dw, 1, PAL.copperLight);
      pen.rect(dx + dw - 1, 33, 1, 21, PAL.copperDark);
      pen.rect(dx, 40, dw, 1, PAL.copperDark);
      pen.px(dx + dw - 2, 44, PAL.brass);
    }
    // sign board above the doors
    signBoard(pen, 28, 24, 24, 8);
    // lanterns
    lantern(pen, 14, 30, 1);
    lantern(pen, 62, 30, -1);
  },
  lights: [
    { x: 18, y: 36, r: 22, color: PAL.lampGlow, flicker: 0.06 },
    { x: 62, y: 36, r: 22, color: PAL.lampGlow, flicker: 0.06 },
    { x: 40, y: 48, r: 16, color: PAL.windowGlow },
  ],
};

/** House factory — two variants (roof color + wall tone + lean-to). */
function house(variant: number): BuildingArt {
  const w = 68, h = 58;
  const roof = variant === 0 ? PAL.roofBrown : PAL.roofSlate;
  const roofDark = variant === 0 ? PAL.roofBrownDark : PAL.roofSlateDark;
  const roofLight = variant === 0 ? PAL.roofBrownLight : PAL.roofSlateLight;
  const wall = variant === 0 ? PAL.woodPale : PAL.wallPlank;
  const wallDark = variant === 0 ? PAL.woodPaleDark : PAL.wallPlankDark;
  return {
    w, h,
    draw: (pen) => {
      const r = rng(55 + variant);
      gableRoof(pen, r, 32, 2, 30, 16, roof, roofDark, roofLight);
      pen.rect(4, 18, 60, 2, PAL.beam); // eave shadow
      planks(pen, r, 6, 20, 56, 30, wall, wallDark, PAL.wallPlankLight);
      foundation(pen, r, 6, 50, 56, 4);
      // door + shuttered windows
      doorZ(pen, 28, 30, 11, 20);
      windowShuttered(pen, r, 10, 30, 10, 11);
      windowShuttered(pen, r, 48, 30, 10, 11);
      // porch step
      pen.rect(24, 54, 20, 4, PAL.woodPale);
      pen.rect(24, 54, 20, 1, PAL.wallPlankLight);
      // chimney + smoke anchor
      chimney(pen, r, variant === 0 ? 46 : 12, 6, 7, 11);
      if (variant === 1) {
        // lean-to shed on the side
        shingleRoof(pen, 58, 34, 10, 5, roofDark, roofDark, roof);
        planks(pen, r, 60, 39, 7, 15, wallDark, wallDark, wall);
      }
    },
    smoke: [variant === 0 ? [49, 6] : [15, 6]],
    lights: [
      { x: 15, y: 36, r: 12, color: PAL.windowGlow },
      { x: 53, y: 36, r: 12, color: PAL.windowGlow },
      { x: 33, y: 44, r: 10, color: PAL.windowGlow },
    ],
  };
}

/** Livery stable — wide dark opening, hay loft, lantern. 84x60. */
const stable: BuildingArt = {
  w: 84, h: 60,
  draw: (pen) => {
    const r = rng(66);
    shingleRoof(pen, 2, 0, 80, 12, PAL.roofSlate, PAL.roofSlateDark, PAL.roofSlateLight);
    pen.rect(2, 12, 80, 2, PAL.beam);
    planks(pen, r, 4, 14, 76, 40, PAL.woodPale, PAL.woodPaleDark, PAL.wallPlankLight);
    foundation(pen, r, 4, 52, 76, 4);
    // hay loft door
    pen.rect(34, 16, 16, 12, PAL.beam);
    pen.rect(36, 18, 12, 8, PAL.ironDark);
    for (let i = 0; i < 6; i++) pen.px(37 + i * 2, 21 + (i % 2), PAL.dryGrass);
    // big dark opening
    pen.rect(12, 28, 52, 24, PAL.beam);
    pen.rect(13, 29, 50, 22, PAL.ironDark);
    pen.rect(13, 29, 50, 3, PAL.woodDark);
    // stall posts inside
    pen.rect(24, 32, 2, 19, PAL.woodDark);
    pen.rect(46, 32, 2, 19, PAL.woodDark);
    // half-door plank
    pen.rect(56, 36, 8, 15, PAL.woodGray);
    pen.rect(56, 36, 8, 1, PAL.woodGrayDark);
    // tack hint (bridle on a nail)
    pen.rect(8, 30, 3, 5, PAL.horseCoatDark);
    pen.px(9, 35, PAL.copperDark);
    // lantern at the entry
    lantern(pen, 70, 26, -1);
  },
  lights: [{ x: 72, y: 32, r: 26, color: PAL.lampGlow, flicker: 0.07 }],
};

export const BUILDINGS: Record<string, BuildingArt> = {
  saloon, store, sheriff, bank,
  houseA: house(0), houseB: house(1), stable,
};
