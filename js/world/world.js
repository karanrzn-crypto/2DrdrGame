/**
 * world.js — ساخت قطعی دنیا: مناطق، جاده‌ها، رودخانه و سد، شهر، مزرعه، معدن.
 * خروجی: مواد زمین، شبکهٔ برخورد (پاسخ اصلی به «عبور از ساختمان‌ها»)،
 * اشیاء، NPCها، نقاط تعامل، چراغ‌ها و پنجره‌ها برای نورپردازی.
 * دنیا و نقاشِ زمین از همین دادهٔ واحد تغذیه می‌شوند (حقیقت واحد).
 */
import { mulberry32, fbm, clamp01, distToSeg } from '../util.js';

export const TILE = 16;
export const MAP_W = 140;
export const MAP_H = 110;
export const WORLD_W = MAP_W * TILE;
export const WORLD_H = MAP_H * TILE;

/** مواد زمین (شناسهٔ یکتا برای نقاش و برخورد). */
export const M = {
  PLAIN: 0, DRY: 1, WOODS: 2, BAD: 3, SCRUB: 4, MEADOW: 5,
  RUST: 6, SOIL: 7, PLAZA: 8, BOARD: 9, ROCK: 10,
  WATER: 11, POOL: 12, BED: 13, BRIDGE: 14, TRAMPLE: 15,
};

export const WATER_MATS = new Set([M.WATER, M.POOL]);

/* ---------- پلی‌لاین‌ها (مختصات تایل) ---------- */
const ROAD_MAIN = [
  [-10, 57.6], [12, 57.9], [26, 57.4], [40, 57.0], [52, 57.2],
  [62, 57.5], [72, 57.2], [82, 57.4], [90, 57.2], [98, 57.0],
  [106, 57.4], [116, 57.6], [126, 57.4], [136, 57.8], [150, 58.0],
];
const ROAD_NORTH = [
  [88.2, 57.2], [89, 52], [90, 47], [92, 42], [94, 36],
  [95, 30], [95, 24], [94, 19.5], [95, 15], [95, 12.5],
];
const ROAD_SOUTH = [
  [70, 57.6], [69, 62], [68, 68], [66, 74], [64, 80],
  [63, 86], [62, 92], [61, 98], [61, 104],
];
const RIVER = [
  [103, 2], [102, 6], [101, 10], [100, 14], [99, 17], [98, 19],
  [97, 22], [96, 26], [95, 30], [94, 34], [93, 38], [92, 42],
  [91, 46], [90, 50], [89, 54], [89, 58], [88, 62], [87, 66],
  [86, 70], [85, 74], [84, 78], [83, 82], [82, 86], [81, 90],
  [80, 94], [79, 98], [78, 102], [77, 108],
];
const DAM_Y = 18.5;          // رودخانه بالای این خط = پشت سد (پر آب)
const TRICKLE_Y = 25;        // تا این خط سفرهٔ کم‌آب ادامه دارد

/* ---------- ساختمان‌ها ---------- */
export const BUILDINGS = [
  { type: 'saloon',   x: 62, y: 48, w: 8, h: 6, sign: 'سالون' },
  { type: 'bank',     x: 71, y: 49, w: 5, h: 5, sign: 'بانک' },
  { type: 'store',    x: 77, y: 49, w: 6, h: 5, sign: 'مغازهٔ عمومی' },
  { type: 'sheriff',  x: 84, y: 50, w: 4, h: 4, sign: 'دفتر کلانتر' },
  { type: 'stable',   x: 89, y: 49, w: 7, h: 5, sign: null },
  { type: 'houseA',   x: 66, y: 61, w: 5, h: 4, sign: null },
  { type: 'houseB',   x: 73, y: 61, w: 5, h: 4, sign: null },
  { type: 'gunsmith', x: 79, y: 61, w: 4, h: 4, sign: 'اسلحه‌سازی' },
  { type: 'waterTower', x: 97, y: 50, w: 3, h: 3, sign: null },
  { type: 'farmhouse', x: 117, y: 51, w: 5, h: 4, sign: null },
  { type: 'barn',     x: 124, y: 62, w: 6, h: 5, sign: null },
  { type: 'mineShack', x: 93, y: 10, w: 4, h: 3, sign: null },
];

/* ---------- مستطیل‌های ویژه ---------- */
const PLAZA   = { x: 69, y: 55, w: 9, h: 4 };
const CORRAL  = { x: 88, y: 60, w: 11, h: 6 };
const GARDEN  = { x: 60, y: 62, w: 5, h: 5 };
const PLOT1   = { x: 114, y: 62, w: 5, h: 4 };
const PLOT2   = { x: 120, y: 65, w: 4, h: 3 };
const POND    = { cx: 26, cy: 16, rx: 6.2, ry: 4.0 };
const RESERVOIR = { cx: 99, cy: 11, rx: 5.5, ry: 6.0 };
const POOLS = [
  { cx: 96, cy: 33, rx: 2.2, ry: 1.4 },
  { cx: 91, cy: 52, rx: 2.4, ry: 1.5 },
  { cx: 88, cy: 72, rx: 2.0, ry: 1.4 },
  { cx: 84, cy: 88, rx: 2.2, ry: 1.4 },
];
const POOLS_D = [
  { cx: 91, cy: 52, rx: 2.4, ry: 1.5 }, { cx: 88, cy: 72, rx: 2.0, ry: 1.4 },
  { cx: 84, cy: 88, rx: 2.2, ry: 1.4 }, { cx: 96, cy: 33, rx: 2.2, ry: 1.4 },
];
const RUST_ZONE = { x: 108, y: 44, w: 30, h: 36 };

/** فاصلهٔ (تایل) تا مرکز پلی‌لاین. */
function distToPath(px, py, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distToSeg(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (d < best) best = d;
  }
  return best;
}
const distToRiver = (tx, ty) => distToPath(tx, ty, RIVER);
const distToRoads = (tx, ty) => Math.min(
  distToPath(tx, ty, ROAD_MAIN),
  distToPath(tx, ty, ROAD_NORTH),
  distToPath(tx, ty, ROAD_SOUTH),
);

function inRect(r, x, y) { return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h; }
function inEllipse(cx, cy, rx, ry, x, y) {
  const dx = (x - cx) / rx, dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

/** زیست‌بوم پایهٔ هر تایل — قطعی با نویز. */
export function biomeAt(tx, ty) {
  const n = fbm(tx * 0.09, ty * 0.09, 41, 3);
  const rimW = 2 + (fbm(tx * 0.15, ty * 0.15, 55, 2) - 0.5) * 2;
  if (tx < rimW || tx > MAP_W - rimW || ty < rimW || ty > MAP_H - rimW) return M.ROCK;
  if (ty < 9 + (fbm(tx * 0.12 + 70, ty * 0.12, 57, 2) - 0.5) * 2) return M.ROCK;

  const badEdge = 44 + (fbm(tx * 0.055 + 30, ty * 0.055 + 30, 43, 3) - 0.5) * 10;
  if (tx < badEdge && ty > 8) return M.BAD;
  const woodsD = Math.hypot((tx - POND.cx) / 16, (ty - POND.cy) / 12);
  if (woodsD < 1 + (fbm(tx * 0.16, ty * 0.16, 45, 2) - 0.5) * 0.5) return M.WOODS;
  if (tx > RUST_ZONE.x + (fbm(tx * 0.13 + 70, ty * 0.13, 49, 2) - 0.5) * 7
      && ty > RUST_ZONE.y && ty < RUST_ZONE.y + RUST_ZONE.h) return M.RUST;
  if (ty > 80 && tx > 44 && tx < 90 && fbm(tx * 0.11 + 90, ty * 0.11, 47, 3) > 0.55) return M.SCRUB;
  if (fbm(tx * 0.13 + 120, ty * 0.13 + 120, 51, 3) > 0.64) return M.MEADOW;
  if (fbm(tx * 0.13 + 200, ty * 0.13 + 200, 53, 3) > 0.66) return M.DRY;
  return M.PLAIN;
}

/**
 * ساخت کامل دنیا. خروجی را یک‌بار در بوت می‌گیریم.
 */
export function buildWorld() {
  const rng = mulberry32(1873);
  const mat = new Uint8Array(MAP_W * MAP_H);
  const solid = new Uint8Array(MAP_W * MAP_H);
  const idx = (x, y) => y * MAP_W + x;
  const get = (x, y) => (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) ? M.ROCK : mat[idx(x, y)];
  const setMat = (x, y, m) => { if (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H) mat[idx(x, y)] = m; };

  /* --- ۱) زیست‌بوم پایه --- */
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) mat[idx(x, y)] = biomeAt(x, y);

  /* --- ۲) رودخانه، سد، بستر خشک، برکه‌ها --- */
  const waterTiles = [];
  const bedTiles = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const d = distToRiver(x + 0.5, y + 0.5);
      const wob = (fbm(x * 0.2, y * 0.2, 61, 2) - 0.5) * 0.9;
      const dd = d + wob;
      const aboveDam = y + 0.5 < DAM_Y;
      if (aboveDam && dd < 2.2) { setMat(x, y, M.WATER); waterTiles.push([x, y, 0]); }
      else if (!aboveDam && y + 0.5 < TRICKLE_Y && dd < 1.6) { setMat(x, y, M.WATER); waterTiles.push([x, y, 0]); }
      else if (!aboveDam && dd < 3.0 && y + 0.5 < 104) {
        if (get(x, y) !== M.WATER) { setMat(x, y, M.BED); bedTiles.push([x, y]); }
      }
      if (aboveDam && inEllipse(RESERVOIR.cx, RESERVOIR.cy, RESERVOIR.rx, RESERVOIR.ry, x + 0.5, y + 0.5)
        && get(x, y) !== M.ROCK) {
        setMat(x, y, M.WATER); if (!waterTiles.some(w => w[0] === x && w[1] === y)) waterTiles.push([x, y, 0]);
      }
      for (const p of POOLS) {
        if (inEllipse(p.cx, p.cy, p.rx, p.ry, x + 0.5, y + 0.5)) {
          setMat(x, y, M.POOL); waterTiles.push([x, y, 1]);
        }
      }
    }
  }
  // برکهٔ شمال غربی
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const wob = (fbm(x * 0.18 + 31.7, y * 0.18 + 17.3, 63, 2) - 0.5) * 1.6;
    if (inEllipse(POND.cx, POND.cy, POND.rx + wob, POND.ry + wob, x + 0.5, y + 0.5)) {
      setMat(x, y, M.WATER); waterTiles.push([x, y, 2]);
    }
  }
  // بانک شنی دور آب (ساحل)
  for (let y = 1; y < MAP_H - 1; y++) for (let x = 1; x < MAP_W - 1; x++) {
    if (get(x, y) === M.WATER || get(x, y) === M.POOL) continue;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1 && !near; dx++) {
      const m = get(x + dx, y + dy);
      if (m === M.WATER || m === M.POOL) near = true;
    }
    if (near && get(x, y) !== M.ROCK) setMat(x, y, M.SCRUB);
  }

  /* --- ۳) سد (دیوار سنگی عرض رودخانه) --- */
  const dam = { x: 94, y: 17, w: 7, h: 2 };
  for (let y = dam.y; y < dam.y + dam.h; y++)
    for (let x = dam.x; x < dam.x + dam.w; x++) setMat(x, y, M.ROCK);

  /* --- ۴) مزرعه و باغ و حیاط‌ها --- */
  const markRect = (r, m) => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) setMat(x, y, m); };
  markRect(PLOT1, M.SOIL);
  markRect(PLOT2, M.SOIL);
  markRect(GARDEN, M.SOIL);

  /* --- ۵) پلازای سنگ‌فرش و تخته‌پیاده‌رو --- */
  markRect(PLAZA, M.PLAZA);
  const board = { x: 61, y: 54, w: 30, h: 1 };
  for (let x = board.x; x < board.x + board.w; x++) setMat(x, board.y, M.BOARD);

  /* --- ۶) حیاط محصور چوب‌بستی (trampled) --- */
  markRect({ x: CORRAL.x + 1, y: CORRAL.y + 1, w: CORRAL.w - 2, h: CORRAL.h - 2 }, M.TRAMPLE);

  /* --- ۷) برخورد پایه: مرز دنیا، کوه، آب، سد --- */
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const m = get(x, y);
    if (m === M.ROCK || m === M.WATER || m === M.POOL) solid[idx(x, y)] = 1;
    if (m === M.ROCK && m === M.ROCK) { /* سنگ = مانع */ }
  }
  // نوار کوه شمالی: تا y<9 کامل؛ گذرگاه معدن x 91..101 تا y 12
  for (let y = 9; y <= 11; y++) for (let x = 0; x < MAP_W; x++) {
    if (x >= 91 && x <= 101) continue;
    solid[idx(x, y)] = 1;
  }

  /* --- ۸) پل چوبی روی بستر (جادهٔ شرقی × رودخانه) --- */
  for (let x = 86; x <= 92; x++) for (let y = 55; y <= 59; y++) {
    if (distToRiver(x + 0.5, y + 0.5) < 2.6 || get(x, y) === M.WATER || get(x, y) === M.BED) {
      setMat(x, y, M.BRIDGE); solid[idx(x, y)] = 0;
    }
  }

  /* --- ۹) ساختمان‌ها → برخورد کامل پا-چاپ --- */
  for (const b of BUILDINGS) {
    for (let y = b.y; y < b.y + b.h; y++)
      for (let x = b.x; x < b.x + b.w; x++) solid[idx(x, y)] = 1;
  }

  /* --- ۱۰) حصارها --- */
  const fences = [];
  const fenceH = (x1, x2, y) => { for (let x = x1; x <= x2; x++) fences.push({ x, y, h: true }); };
  const fenceV = (y1, y2, x) => { for (let y = y1; y <= y2; y++) fences.push({ x, y, h: false }); };
  // چوب‌بستی با دروازهٔ شمالی
  fenceH(CORRAL.x, CORRAL.x + CORRAL.w - 1, CORRAL.y);
  fenceH(CORRAL.x, CORRAL.x + CORRAL.w - 1, CORRAL.y + CORRAL.h - 1);
  fenceV(CORRAL.y, CORRAL.y + CORRAL.h - 1, CORRAL.x);
  fenceV(CORRAL.y, CORRAL.y + CORRAL.h - 1, CORRAL.x + CORRAL.w - 1);
  // پاک‌کردن دروازهٔ شمالی چوب‌بستی (x 92..93 روی y=60)
  for (let x = 92; x <= 93; x++) {
    const i = fences.findIndex((f) => f.x === x && f.y === CORRAL.y && f.h);
    if (i >= 0) { fences.splice(i, 1); solid[idx(x, CORRAL.y)] = 0; setMat(x, CORRAL.y, M.TRAMPLE); }
  }
  // حصار حیاط شمالی مزرعه (دور خانهٔ کشاورز) با دروازهٔ جنوبی
  fenceH(115, 123, 49); fenceH(115, 123, 55);
  fenceV(49, 55, 115); fenceV(49, 55, 123);
  for (let x = 118; x <= 120; x++) {
    const i = fences.findIndex((f) => f.x === x && f.y === 55 && f.h);
    if (i >= 0) { fences.splice(i, 1); solid[idx(x, 55)] = 0; }
  }
  // حصار حیاط جنوبی مزرعه با دروازهٔ شمالی
  fenceH(113, 130, 61); fenceH(113, 130, 69);
  fenceV(61, 69, 113); fenceV(61, 69, 130);
  for (let x = 117; x <= 119; x++) {
    const i = fences.findIndex((f) => f.x === x && f.y === 61 && f.h);
    if (i >= 0) { fences.splice(i, 1); solid[idx(x, 61)] = 0; }
  }
  // حصار باغ جنوب‌غربی با دروازهٔ شمالی
  fenceH(59, 65, 61); fenceH(59, 65, 67);
  fenceV(61, 67, 59); fenceV(61, 67, 65);
  for (let x = 62; x <= 63; x++) {
    const i = fences.findIndex((f) => f.x === x && f.y === 61 && f.h);
    if (i >= 0) { fences.splice(i, 1); solid[idx(x, 61)] = 0; }
  }
  for (const f of fences) {
    if (get(f.x, f.y) !== M.ROCK && get(f.x, f.y) !== M.WATER && get(f.x, f.y) !== M.PLAZA) solid[idx(f.x, f.y)] = 1;
  }

  /* --- ۱۱) اشیاء ثابت (authored) --- */
  const props = [
    { type: 'well', tx: 72, ty: 56, w: 2, h: 2 },
    { type: 'sign', tx: 56, ty: 59, dialogue: 'signRoad', text: 'COPPERGATE' },
    { type: 'sign', tx: 20, ty: 59, dialogue: 'signWest', text: '← بی‌ماه' },
    { type: 'sign', tx: 92, ty: 14, dialogue: 'signMine', text: '← معدن' },
    { type: 'sign', tx: 109, ty: 59, dialogue: 'signEast', text: 'راست‌واتر →' },
    { type: 'lamppost', tx: 61, ty: 55 }, { type: 'lamppost', tx: 67, ty: 54 },
    { type: 'lamppost', tx: 75, ty: 54 }, { type: 'lamppost', tx: 82, ty: 55 },
    { type: 'lamppost', tx: 87, ty: 55 },
    { type: 'bench', tx: 69, ty: 59 }, { type: 'bench', tx: 77, ty: 59 },
    { type: 'barrel', tx: 79, ty: 54 }, { type: 'barrel', tx: 80, ty: 54 },
    { type: 'crate', tx: 76, ty: 54 }, { type: 'crateStack', tx: 83, ty: 55 },
    { type: 'sack', tx: 78, ty: 55 }, { type: 'hitch', tx: 63, ty: 57 },
    { type: 'hitch', tx: 64, ty: 57 },
    { type: 'horse', tx: 64, ty: 58 },
    { type: 'trough', tx: 94, ty: 63, w: 2, h: 1, water: true },
    { type: 'trough', tx: 123, ty: 67, w: 2, h: 1, water: false },
    { type: 'haypile', tx: 90, ty: 64 }, { type: 'haypile', tx: 96, ty: 62 },
    { type: 'sheep', tx: 91, ty: 62 }, { type: 'sheep', tx: 95, ty: 64 },
    { type: 'sheep', tx: 93, ty: 65, flip: true },
    { type: 'wagon', tx: 12, ty: 58 },
    { type: 'wagon2', tx: 64, ty: 99 },
    { type: 'campfire', tx: 8, ty: 59 },
    { type: 'log', tx: 7, ty: 60 }, { type: 'logseat', tx: 9, ty: 60 },
    { type: 'campfire', tx: 61, ty: 100 },
    { type: 'log', tx: 60, ty: 101 }, { type: 'logseat', tx: 62, ty: 101 },
    { type: 'minecart', tx: 95, ty: 13 },
    { type: 'mineDoor', tx: 95, ty: 9, w: 2, h: 1 },
    { type: 'ribs', tx: 6, ty: 30 }, { type: 'skull', tx: 18, ty: 70 },
    { type: 'boots', tx: 25, ty: 40 },
    { type: 'ruin', tx: 14, ty: 38, w: 6, h: 5 },
    { type: 'windmill', tx: 59, ty: 61, w: 2, h: 2 },
    { type: 'windmill', tx: 127, ty: 62, w: 2, h: 2 },
    { type: 'plow', tx: 116, ty: 66 },
  ];

  /* --- ۱۲) برخورد اشیاء --- */
  const SOLID_PROP = new Set([
    'well', 'sign', 'lamppost', 'bench', 'barrel', 'crate', 'crateStack',
    'sack', 'hitch', 'trough', 'haypile', 'wagon', 'wagon2', 'campfire',
    'log', 'logseat', 'minecart', 'ribs', 'ruin', 'rock_big', 'mineDoor',
  ]);
  for (const p of props) {
    if (!SOLID_PROP.has(p.type)) continue;
    const w = p.w || 1, h = p.h || 1;
    for (let y = p.ty; y < p.ty + h; y++) for (let x = p.tx; x < p.tx + w; x++) {
      if (x >= 0 && y >= 0 && x < MAP_W && y < MAP_H) solid[idx(x, y)] = 1;
    }
  }

  /* --- ۱۳) پراکندگی طبیعی (درخت/کاکتوس/بوته/سنگ) --- */
  const reserved = [];
  for (const b of BUILDINGS) reserved.push({ x: b.x - 1, y: b.y - 2, w: b.w + 2, h: b.h + 2 });
  reserved.push(
    PLAZA, { x: PLAZA.x - 2, y: PLAZA.y - 2, w: PLAZA.w + 4, h: PLAZA.h + 4 },
    { x: CORRAL.x - 1, y: CORRAL.y - 1, w: CORRAL.w + 2, h: CORRAL.h + 2 },
    { x: GARDEN.x - 2, y: GARDEN.y - 2, w: GARDEN.w + 4, h: GARDEN.h + 4 },
    { x: PLOT1.x - 2, y: PLOT1.y - 2, w: PLOT1.w + 4, h: PLOT1.h + 4 },
    { x: PLOT2.x - 2, y: PLOT2.y - 2, w: PLOT2.w + 4, h: PLOT2.h + 4 },
    { x: 113, y: 48, w: 19, h: 22 },   // حیاط‌های مزرعه
    { x: 2, y: 55, w: 14, h: 8 },      // اردوگاه اسپاون
    { x: 56, y: 52, w: 10, h: 10 },    // ورودی غربی شهر
    { x: 91, y: 8, w: 12, h: 8 },      // معدن
    { x: 57, y: 94, w: 12, h: 10 },    // اردوگاه جنوبی
    { x: 12, y: 36, w: 10, h: 9 },     // ویرانه
    { x: dam.x - 1, y: dam.y - 3, w: dam.w + 2, h: dam.h + 5 },
    { x: 55, y: 53, w: 42, h: 8 },     // بدنهٔ اصلی جاده در شهر
  );
  const isReserved = (x, y) => reserved.some((r) => inRect(r, x, y));
  const dens = (x, y, seed, lo, hi) =>
    clamp01((fbm(x * 0.14 + seed, y * 0.14 + seed * 0.7, 61, 3) - lo) / (hi - lo));

  for (let y = 3; y < MAP_H - 3; y++) {
    for (let x = 3; x < MAP_W - 3; x++) {
      if (solid[idx(x, y)] || isReserved(x, y)) continue;
      if (distToRoads(x + 0.5, y + 0.5) < 2.6) continue;
      if (distToRiver(x + 0.5, y + 0.5) < 3.4) continue;
      const m = get(x, y);
      if (m === M.WATER || m === M.POOL || m === M.BED || m === M.BRIDGE
        || m === M.PLAZA || m === M.BOARD || m === M.SOIL || m === M.TRAMPLE) continue;
      const r = rng();
      const d = dens(x, y, 3.1, 0.38, 0.72);
      if (m === M.WOODS) {
        if (r < d * 0.30) props.push({ type: 'tree_pine', tx: x, ty: y, flip: rng() < 0.5 });
        else if (r < d * 0.34) props.push({ type: 'tree_oak', tx: x, ty: y, flip: rng() < 0.5 });
        else if (r < d * 0.37) props.push({ type: 'tree_dead', tx: x, ty: y });
        else if (r < d * 0.41) props.push({ type: 'log', tx: x, ty: y });
        else if (r < d * 0.50) props.push({ type: 'stump', tx: x, ty: y });
        else if (r < 0.30 + d * 0.12) props.push({ type: 'bush_sage', tx: x, ty: y });
      } else if (m === M.BAD) {
        const d2 = dens(x, y, 5.3, 0.40, 0.70);
        if (r < d2 * 0.09) props.push({ type: 'cactus_saguaro', tx: x, ty: y, flip: rng() < 0.5 });
        else if (r < d2 * 0.13) props.push({ type: 'cactus_pear', tx: x, ty: y });
        else if (r < d2 * 0.16) props.push({ type: 'cactus_agave', tx: x, ty: y });
        else if (r < d2 * 0.185) props.push({ type: 'tree_dead', tx: x, ty: y });
        else if (r < d2 * 0.235) props.push({ type: rng() < 0.4 ? 'rock_big' : 'rock_small', tx: x, ty: y, flip: rng() < 0.5 });
        else if (r < d2 * 0.30) props.push({ type: 'bush_dry', tx: x, ty: y });
      } else if (m === M.RUST) {
        const d3 = dens(x, y, 7.7, 0.45, 0.72);
        if (r < d3 * 0.05) props.push({ type: 'rock_small', tx: x, ty: y });
        else if (r < d3 * 0.08) props.push({ type: 'bush_dry', tx: x, ty: y });
        else if (r < d3 * 0.10) props.push({ type: 'cactus_pear', tx: x, ty: y });
      } else if (m === M.SCRUB) {
        const d4 = dens(x, y, 9.1, 0.44, 0.72);
        if (r < d4 * 0.10) props.push({ type: 'bush_dry', tx: x, ty: y });
        else if (r < d4 * 0.13) props.push({ type: 'cactus_agave', tx: x, ty: y });
        else if (r < d4 * 0.15) props.push({ type: 'rock_small', tx: x, ty: y, flip: rng() < 0.5 });
      } else if (m === M.PLAIN || m === M.DRY || m === M.MEADOW) {
        const d5 = dens(x, y, 8.7, 0.42, 0.75);
        if (r < d5 * 0.045) props.push({ type: rng() < 0.72 ? 'tree_oak' : 'tree_small', tx: x, ty: y, flip: rng() < 0.5 });
        else if (r < d5 * 0.075) props.push({ type: 'bush_sage', tx: x, ty: y });
        else if (r < d5 * 0.095) props.push({ type: 'bush_flower', tx: x, ty: y });
        else if (r < d5 * 0.115) props.push({ type: 'bush_dry', tx: x, ty: y });
        else if (r < d5 * 0.125) props.push({ type: 'rock_small', tx: x, ty: y, flip: rng() < 0.5 });
      }
      // نی‌های کنار آب
      if (m === M.SCRUB || m === M.PLAIN || m === M.WOODS) {
        let shore = false;
        for (let dy = -1; dy <= 1 && !shore; dy++) for (let dx = -1; dx <= 1 && !shore; dx++) {
          const mm = get(x + dx, y + dy);
          if (mm === M.WATER || mm === M.POOL) shore = true;
        }
        if (shore && rng() < 0.35) props.push({ type: 'reed', tx: x, ty: y });
      }
    }
  }

  /* --- ۱۴) NPCها --- */
  const npcs = [
    { id: 'pete',     tx: 93, ty: 59, wander: 2.2, dialogue: 'pete',     prompt: 'گفتگو با پیت پیر' },
    { id: 'traveler', tx: 70, ty: 58, wander: 3.0, dialogue: 'traveler', prompt: 'گفتگو با مسافر' },
    { id: 'farmer',   tx: 119, ty: 57, wander: 2.0, dialogue: 'farmer',  prompt: 'گفتگو با کشاورز راست‌واتر' },
    { id: 'miner',    tx: 92, ty: 13, wander: 1.8, dialogue: 'miner',   prompt: 'گفتگو با معدن‌چی مس' },
  ];

  /* --- ۱۵) نقاط تعامل (اشیاء و درها) --- */
  const interactables = [
    { x: 65.5 * TILE, y: 54.6 * TILE, range: 26, dialogue: 'saloonDoor', prompt: 'بررسی در سالون' },
    { x: 73.5 * TILE, y: 54.6 * TILE, range: 26, dialogue: 'bankDoor', prompt: 'بررسی در بانک' },
    { x: 80.0 * TILE, y: 54.6 * TILE, range: 26, dialogue: 'storeDoor', prompt: 'بررسی در مغازهٔ عمومی' },
    { x: 86.0 * TILE, y: 54.6 * TILE, range: 26, dialogue: 'sheriffDoor', prompt: 'بررسی دفتر کلانتر' },
    { x: 81.0 * TILE, y: 60.4 * TILE, range: 26, dialogue: 'gunsmithDoor', prompt: 'بررسی اسلحه‌سازی' },
    { x: 97.5 * TILE, y: 20.0 * TILE, range: 34, dialogue: 'damExamine', prompt: 'بررسی سد شرکت' },
    { x: 96.5 * TILE, y: 9.6 * TILE, range: 30, dialogue: 'mineEntrance', prompt: 'بررسی ورودی معدن' },
    { x: 73.0 * TILE, y: 56.8 * TILE, range: 30, dialogue: 'wellExamine', prompt: 'بررسی چاه' },
    { x: 89.0 * TILE, y: 57.0 * TILE, range: 34, dialogue: 'bridgeExamine', prompt: 'بررسی پل چوبی' },
    { x: 16.0 * TILE, y: 40.5 * TILE, range: 34, dialogue: 'ruinExamine', prompt: 'بررسی ویرانه' },
    { x: 20.5 * TILE, y: 59.3 * TILE, range: 26, dialogue: 'signWest', prompt: 'خواندن تابلو' },
    { x: 56.5 * TILE, y: 59.3 * TILE, range: 26, dialogue: 'signRoad', prompt: 'خواندن تابلو' },
    { x: 92.5 * TILE, y: 14.3 * TILE, range: 26, dialogue: 'signMine', prompt: 'خواندن تابلو' },
    { x: 109.5 * TILE, y: 59.3 * TILE, range: 26, dialogue: 'signEast', prompt: 'خواندن تابلو' },
  ];
  for (const n of npcs) {
    interactables.push({ x: (n.tx + 0.5) * TILE, y: (n.ty + 0.5) * TILE, range: 30, dialogue: n.dialogue, prompt: n.prompt, npc: n.id });
  }

  /* --- ۱۶) نورها --- */
  const lamps = props.filter((p) => p.type === 'lamppost')
    .map((p) => ({ x: (p.tx + 0.5) * TILE, y: (p.ty + 0.3) * TILE }));
  const fires = props.filter((p) => p.type === 'campfire')
    .map((p) => ({ x: (p.tx + 0.5) * TILE, y: (p.ty + 0.5) * TILE }));
  const windowLights = [];
  for (const b of BUILDINGS) {
    const wy = (b.y + b.h - 0.45) * TILE;
    const cx = (b.x + b.w / 2) * TILE;
    windowLights.push({ x: cx - 14, y: wy }, { x: cx + 14, y: wy });
  }

  /* --- ۱۷) مسیرهای پا از درها به جاده (برای نقاش زمین) --- */
  const doorPaths = [
    [65.5, 54.5], [73.5, 54.5], [80.0, 54.5], [86.0, 54.5], [81.0, 60.6],
    [68.5, 61.0], [75.5, 61.0], [92.0, 54.0],
  ].map(([x, y]) => [x * TILE, y * TILE]);

  /** عمق نسبی آب در [0,1] — ۱ وسط، ۰ ساحل (برای سایه‌گذاری آب). */
  function waterDepth(x, y) {
    for (const p of POOLS) {
      const e = Math.hypot((x - p.cx) / p.rx, (y - p.cy) / p.ry);
      if (e <= 1) return 1 - e;
    }
    const pe = Math.hypot((x - POND.cx) / POND.rx, (y - POND.cy) / POND.ry);
    if (pe <= 1) return 1 - pe;
    const wob = (fbm(x * 0.2, y * 0.2, 61, 2) - 0.5) * 0.9;
    const rd = distToRiver(x, y) + wob;
    if (y < DAM_Y) {
      const er = 1 - Math.min(1, Math.hypot(
        (x - RESERVOIR.cx) / RESERVOIR.rx, (y - RESERVOIR.cy) / RESERVOIR.ry));
      return Math.max(er, clamp01(1 - rd / 2.2));
    }
    if (y < TRICKLE_Y) return clamp01(1 - rd / 1.6);
    return 0.5;
  }

  /** نزدیک‌ترین نقطهٔ جادهٔ اصلی به نقطهٔ px داده‌شده. */
  function nearestRoadPoint(px, py) {
    let best = null, bd = Infinity;
    for (let i = 0; i < ROAD_MAIN.length - 1; i++) {
      const [x1, y1] = ROAD_MAIN[i], [x2, y2] = ROAD_MAIN[i + 1];
      const dx = x2 - x1, dy = y2 - y1;
      const l2 = dx * dx + dy * dy;
      let t = l2 ? ((px / TILE - x1) * dx + (py / TILE - y1) * dy) / l2 : 0;
      t = Math.max(0, Math.min(1, t));
      const cx = (x1 + dx * t) * TILE, cy = (y1 + dy * t) * TILE;
      const d = Math.hypot(px - cx, py - cy);
      if (d < bd) { bd = d; best = [cx, cy]; }
    }
    return best;
  }

  /** ماسک پیوستهٔ آب در حد پیکسل — برای لبهٔ اورگانیک ساحل. */
  function waterAt(x, y) {
    for (const p of POOLS) {
      const e = Math.hypot((x - p.cx) / p.rx, (y - p.cy) / p.ry);
      if (e <= 1) return true;
    }
    const pw = (fbm(x * 0.18 + 31.7, y * 0.18 + 17.3, 63, 2) - 0.5) * 1.6;
    const pe = Math.hypot((x - POND.cx) / (POND.rx + pw), (y - POND.cy) / (POND.ry + pw));
    if (pe <= 1) return true;
    const wob = (fbm(x * 0.2, y * 0.2, 61, 2) - 0.5) * 0.9;
    const rd = distToRiver(x, y) + wob;
    if (y < DAM_Y) {
      if (rd < 2.2) return true;
      const er = Math.hypot((x - RESERVOIR.cx) / RESERVOIR.rx, (y - RESERVOIR.cy) / RESERVOIR.ry);
      return er <= 1;
    }
    return y < TRICKLE_Y && rd < 1.6;
  }

  return {
    w: MAP_W, h: MAP_H, mat, solid, get, idx,
    distRoads: distToRoads, waterDepth, waterAt, nearestRoadPoint,
    plotRects: [PLOT1, PLOT2, GARDEN], corralGround: {
      x: CORRAL.x + 1, y: CORRAL.y + 1, w: CORRAL.w - 2, h: CORRAL.h - 2,
    },
    props, npcs, interactables, lamps, fires, windowLights, doorPaths,
    waterTiles, roadMain: ROAD_MAIN, roadNorth: ROAD_NORTH, roadSouth: ROAD_SOUTH,
    river: RIVER, dam, plaza: PLAZA, pond: POND, reservoir: RESERVOIR,
    pools: POOLS, poolsD: POOLS_D, rustZone: RUST_ZONE, corral: CORRAL,
    board: board,
    buildings: BUILDINGS, fences,
    spawn: { x: 10.5 * TILE, y: 57.5 * TILE },
    tumbleZone: { x1: 5, y1: 18, x2: 42, y2: 100 },
  };
}
