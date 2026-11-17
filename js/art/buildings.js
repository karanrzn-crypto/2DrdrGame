/**
 * buildings.js — نقاشی رویه‌ای ساختمان‌های وسترن با هویت مستقل (§4).
 * هر ساختمان: silhouette متمایز، جزئیات، سایه، پنجره/در، تابلوی فارسی.
 * خروجی: canvas آفسکرین + نقطهٔ قرارگیری؛ برخورد از پا-چاپ کامل در world.
 */
import { PAL, faText } from './palette.js';
import { TILE } from '../world/world.js';

function mk(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return [cv, ctx];
}

/* ---------- اجزای مشترک ---------- */

function planksV(ctx, x, y, w, h, base, gap = PAL.plankGap) {
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  for (let px = x; px < x + w; px += 4) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(px + 3, y, 1, h);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(px, y, 1, h);
    // میخ‌ها
    ctx.fillStyle = '#3a2c1a';
    ctx.fillRect(px + 1, y + 2, 1, 1);
    ctx.fillRect(px + 1, y + h - 3, 1, 1);
  }
  // گره‌های چوب نویزی‌مانند (قطعی با موقعیت)
  for (let px = x + 2; px < x + w; px += 9) {
    ctx.fillStyle = 'rgba(60,40,22,0.5)';
    ctx.fillRect(px, y + (h * 7 / 12 | 0), 1, 2);
  }
  void gap;
}

function sidingH(ctx, x, y, w, h, base) {
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  for (let py = y; py < y + h; py += 4) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x, py + 3, w, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(x, py, w, 1);
  }
}

function stoneWall(ctx, x, y, w, h) {
  ctx.fillStyle = '#6e6458';
  ctx.fillRect(x, y, w, h);
  for (let py = y, row = 0; py < y + h; py += 4, row++) {
    const off = (row % 2) * 3;
    for (let px = x - off; px < x + w; px += 7) {
      const c = PAL.stone[(px + py) % 3];
      ctx.fillStyle = c;
      ctx.fillRect(px, py, 6, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(px, py, 6, 1);
      ctx.fillStyle = 'rgba(30,26,20,0.5)';
      ctx.fillRect(px, py + 3, 6, 1);
      ctx.fillRect(px + 6, py, 1, 3);
    }
  }
}

function shingleRoof(ctx, x, y, w, h, base = PAL.roof[0]) {
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  for (let py = y; py < y + h; py += 4) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(x, py + 3, w, 1);
    if (((py - y) / 4) % 3 === 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.fillRect(x, py, w, 3);
    }
  }
  // خط کوهان (ridge)
  ctx.fillStyle = PAL.roof[2];
  ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x, y, w, 1);
}

function windowBox(ctx, x, y, w, h, opts = {}) {
  // قاب
  ctx.fillStyle = opts.frame || PAL.woodDark;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  // شیشه
  ctx.fillStyle = opts.glass || '#2a3644';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(160,190,205,0.35)';
  ctx.fillRect(x + 1, y + 1, Math.max(1, w / 3 | 0), 1);
  ctx.fillRect(x + 1, y + 2, 1, Math.max(1, h / 3 | 0));
  if (opts.cross) {
    ctx.fillStyle = opts.frame || PAL.woodDark;
    ctx.fillRect(x + (w >> 1) - 1, y, 1, h);
    ctx.fillRect(x, y + (h >> 1) - 1, w, 1);
  }
  if (opts.bars) {
    ctx.fillStyle = '#3a3a40';
    for (let bx = x + 2; bx < x + w - 1; bx += 3) ctx.fillRect(bx, y, 1, h);
  }
  if (opts.shutters) {
    ctx.fillStyle = opts.shutter || '#5e442a';
    ctx.fillRect(x - 4, y - 1, 3, h + 2);
    ctx.fillRect(x + w + 1, y - 1, 3, h + 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x - 2, y - 1, 1, h + 2);
    ctx.fillRect(x + w + 2, y - 1, 1, h + 2);
  }
  // زیرِ پنجره
  ctx.fillStyle = PAL.woodDark;
  ctx.fillRect(x - 1, y + h + 1, w + 2, 2);
}

function doorBox(ctx, x, y, w, h, opts = {}) {
  ctx.fillStyle = PAL.woodDark;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  planksV(ctx, x, y, w, h, opts.base || PAL.wood[0]);
  if (opts.swing) {
    // درهای نیمهٔ سالون
    ctx.fillStyle = PAL.trimCream;
    ctx.fillRect(x - 2, y + h - 10, w + 4, 8);
    ctx.fillStyle = PAL.woodDark;
    ctx.fillRect(x - 2, y + h - 10, w + 4, 1);
    ctx.fillRect(x + (w >> 1) - 1, y + h - 10, 1, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x - 2, y + h - 3, w + 4, 1);
  }
  if (opts.cross) {
    ctx.strokeStyle = PAL.woodDark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 1, y + 1); ctx.lineTo(x + w - 1, y + h - 1);
    ctx.moveTo(x + w - 1, y + 1); ctx.lineTo(x + 1, y + h - 1);
    ctx.stroke();
  }
  ctx.fillStyle = PAL.uiGold;
  ctx.fillRect(x + w - 3, y + (h >> 1), 2, 2); // دستگیره
}

function signBoard(ctx, x, y, w, h, text, opts = {}) {
  ctx.fillStyle = opts.bg || PAL.wood[1];
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PAL.woodDark;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(x + 1, y + 1, w - 2, 1);
  faText(ctx, text, x + w / 2, y + h / 2 + 0.5, opts.size || 9, opts.color || PAL.trimCream);
}

function porchPosts(ctx, x, y, w, baseY) {
  ctx.fillStyle = PAL.wood[3];
  for (let px = x; px <= x + w; px += Math.max(14, w / 2)) {
    ctx.fillRect(px, y, 3, baseY - y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(px + 2, y, 1, baseY - y);
    ctx.fillStyle = PAL.wood[3];
  }
}

function outlineRect(ctx, x, y, w, h) {
  ctx.strokeStyle = PAL.outline;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

/* ---------- نقاش هر نوع ساختمان ---------- */
/* قرارداد: مختصات داده‌شده = گوشهٔ بالا-چپ «دیوار جلویی»؛
   سقف بالای دیوار کشیده می‌شود. خروجی: {cv, dx, dy} */

function paintSaloon(w, h) {
  const W = w * TILE, H = h * TILE;
  const facade = 26, roofSliver = 9, ov = 4;
  const [cv, ctx] = mk(W + ov * 2, H + facade + roofSliver + ov + 2);
  const X = ov, Y = ov + roofSliver;
  // سقف پشت نما
  shingleRoof(ctx, X, ov, W + 2, roofSliver + 2, PAL.roof[1]);
  // نمای false-front
  planksV(ctx, X, Y, W, H + facade, PAL.wallRed);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(X, Y + H + facade - 3, W, 3); // سایهٔ پای دیوار
  // قرنیز بالا
  ctx.fillStyle = PAL.trimCream;
  ctx.fillRect(X - 1, Y - 2, W + 2, 4);
  ctx.fillStyle = PAL.woodDark;
  ctx.fillRect(X - 1, Y + 2, W + 2, 2);
  // تابلوی بزرگ
  signBoard(ctx, X + (W >> 1) - 34, Y + 6, 68, 14, 'سالون', { bg: '#4e2820', size: 10 });
  // پنجره‌های طبقهٔ بالا
  windowBox(ctx, X + 12, Y + 26, 10, 8, { frame: PAL.trimCream });
  windowBox(ctx, X + W - 22, Y + 26, 10, 8, { frame: PAL.trimCream });
  // پنجره‌های اصلی
  windowBox(ctx, X + 10, Y + H - 26, 12, 14, { frame: PAL.trimCream, cross: true });
  windowBox(ctx, X + W - 22, Y + H - 26, 12, 14, { frame: PAL.trimCream, cross: true });
  // در دوبل با درهای نیمه
  doorBox(ctx, X + (W >> 1) - 12, Y + H - 24, 24, 24, { base: '#5e3428', swing: true });
  // ایوان
  ctx.fillStyle = PAL.wood[2];
  ctx.fillRect(X - 3, Y + H + facade - 2, W + 6, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(X - 3, Y + H + facade + 2, W + 6, 1);
  porchPosts(ctx, X + 2, Y + 10, W - 4, Y + H + facade - 2);
  // تیر بالای ایوان
  ctx.fillStyle = PAL.wood[1];
  ctx.fillRect(X - 3, Y + 8, W + 6, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(X - 3, Y + 12, W + 6, 1);
  outlineRect(ctx, X, Y, W, H + facade);
  return { cv, dx: -ov, dy: -(facade + roofSliver + ov + 2) };
}

function paintBank(w, h) {
  const W = w * TILE, H = h * TILE;
  const parapet = 14, ov = 3;
  const [cv, ctx] = mk(W + ov * 2, H + parapet + ov + 6);
  const X = ov, Y = ov + parapet;
  // بام پشت پاراپت
  ctx.fillStyle = PAL.roof[2];
  ctx.fillRect(X + 2, ov + 2, W - 4, parapet - 2);
  // دیوار سنگی
  stoneWall(ctx, X, Y, W, H);
  // پاراپت
  stoneWall(ctx, X - 1, Y - parapet + 2, W + 2, parapet);
  ctx.fillStyle = '#a89c8a';
  ctx.fillRect(X - 2, Y - parapet, W + 4, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(X - 2, Y - parapet + 3, W + 4, 1);
  // سنگ‌نوشتهٔ بانک
  signBoard(ctx, X + (W >> 1) - 24, Y - parapet + 5, 48, 12, 'بانک', { bg: '#5a5044', size: 9, color: '#e8d8b0' });
  // پنجره‌های میله‌دار بالا
  windowBox(ctx, X + 8, Y + 10, 9, 10, { bars: true, frame: '#4e4438' });
  windowBox(ctx, X + W - 17, Y + 10, 9, 10, { bars: true, frame: '#4e4438' });
  // پله‌ها + در سنگین
  ctx.fillStyle = '#8a8072';
  ctx.fillRect(X + (W >> 1) - 13, Y + H, 26, 3);
  ctx.fillStyle = '#9a9184';
  ctx.fillRect(X + (W >> 1) - 10, Y + H + 3, 20, 2);
  doorBox(ctx, X + (W >> 1) - 9, Y + H - 22, 18, 22, { base: '#3e2c1a', cross: true });
  outlineRect(ctx, X, Y - parapet + 2, W, H + parapet - 2);
  return { cv, dx: -ov, dy: -(parapet + ov + 6) };
}

function paintStore(w, h) {
  const W = w * TILE, H = h * TILE;
  const roofH = 16, awn = 10, ov = 4;
  const [cv, ctx] = mk(W + ov * 2, H + roofH + awn + ov + 2);
  const X = ov, Y = ov + roofH + awn;
  shingleRoof(ctx, X - 1, ov, W + 2, roofH, PAL.roof[0]);
  // آویز راه‌راه
  const stripes = ['#8a4432', '#d8c8a0'];
  for (let px = X - 4, i = 0; px < X + W + 4; px += 5, i++) {
    ctx.fillStyle = stripes[i % 2];
    ctx.fillRect(px, ov + roofH, 5, awn);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(px, ov + roofH + awn - 2, 5, 2);
  }
  // دیوار
  planksV(ctx, X, Y, W, H, PAL.wallTan);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(X, Y + H - 3, W, 3);
  // ویترین و در
  windowBox(ctx, X + 8, Y + 10, 20, 16, { cross: true, frame: PAL.trimCream });
  doorBox(ctx, X + W - 26, Y + H - 26, 16, 26, { base: '#5e442a' });
  // تابلوی آویز زیر آویز
  signBoard(ctx, X + (W >> 1) - 34, Y - 2, 68, 13, 'مغازهٔ عمومی', { bg: '#3e2c1a', size: 9 });
  ctx.fillStyle = '#3a2c1a';
  ctx.fillRect(X + (W >> 1) - 32, Y - 5, 1, 3);
  ctx.fillRect(X + (W >> 1) + 31, Y - 5, 1, 3);
  // نردهٔ کوتاه جلوی ویترین
  ctx.fillStyle = PAL.wood[2];
  ctx.fillRect(X + 6, Y + H - 1, 26, 3);
  outlineRect(ctx, X, Y, W, H);
  return { cv, dx: -ov, dy: -(roofH + awn + ov + 2) };
}

function paintSheriff(w, h) {
  const W = w * TILE, H = h * TILE;
  const parapet = 11, ov = 3;
  const [cv, ctx] = mk(W + ov * 2, H + parapet + ov + 2);
  const X = ov, Y = ov + parapet;
  ctx.fillStyle = PAL.roof[2];
  ctx.fillRect(X + 2, ov + 2, W - 4, parapet - 2);
  planksV(ctx, X, Y, W, H, '#7a6a4e');
  // پاراپت چوبی
  planksV(ctx, X - 1, Y - parapet + 2, W + 2, parapet - 2, '#6a5a42');
  ctx.fillStyle = PAL.woodDark;
  ctx.fillRect(X - 2, Y - parapet, W + 4, 3);
  // ستارهٔ کلانتر + تابلو
  signBoard(ctx, X + (W >> 1) - 32, Y - parapet + 4, 64, 12, 'دفتر کلانتر', { bg: '#4e3a26', size: 8 });
  drawStar(ctx, X + (W >> 1), Y - parapet - 4, 5, PAL.uiGold);
  // پنجرهٔ میله‌دار و در
  windowBox(ctx, X + 7, Y + 12, 10, 11, { bars: true });
  doorBox(ctx, X + W - 20, Y + H - 24, 14, 24, { base: '#4e3a26' });
  outlineRect(ctx, X, Y - parapet + 2, W, H + parapet - 2);
  return { cv, dx: -ov, dy: -(parapet + ov + 2) };
}

function paintGableHouse(w, h, opts) {
  const W = w * TILE, H = h * TILE;
  const roofH = 20, ov = 4;
  const [cv, ctx] = mk(W + ov * 2, H + roofH + ov + 2);
  const X = ov, Y = ov + roofH;
  // بام شیروانی
  shingleRoof(ctx, X - 2, ov, W + 4, roofH, opts.roof || PAL.roof[0]);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(X - 2, ov + roofH - 3, W + 4, 3);
  // دیوار
  if (opts.siding) sidingH(ctx, X, Y, W, H, opts.wall);
  else planksV(ctx, X, Y, W, H, opts.wall);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(X, Y + H - 3, W, 3);
  // دودکش
  ctx.fillStyle = PAL.stone[1];
  ctx.fillRect(X + W - 12, ov + 2, 7, roofH);
  ctx.fillStyle = PAL.stone[0];
  ctx.fillRect(X + W - 13, ov + 1, 9, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(X + W - 12, ov + roofH, 7, 2);
  // در و پنجره‌ها
  doorBox(ctx, X + (W >> 1) - 7, Y + H - 20, 14, 20, { base: opts.door || '#5e442a' });
  windowBox(ctx, X + 6, Y + 9, 11, 11, { shutters: true, cross: true, frame: PAL.trimCream, shutter: opts.shutter });
  windowBox(ctx, X + W - 17, Y + 9, 11, 11, { shutters: true, cross: true, frame: PAL.trimCream, shutter: opts.shutter });
  if (opts.sign) signBoard(ctx, X + (W >> 1) - 28, Y - 1, 56, 12, opts.sign, { bg: '#3e2c1a', size: 8 });
  outlineRect(ctx, X, Y, W, H);
  return { cv, dx: -ov, dy: -(roofH + ov + 2) };
}

function paintStable(w, h) {
  const W = w * TILE, H = h * TILE;
  const roofH = 18, ov = 4;
  const [cv, ctx] = mk(W + ov * 2, H + roofH + ov + 2);
  const X = ov, Y = ov + roofH;
  shingleRoof(ctx, X - 2, ov, W + 4, roofH, PAL.roof[1]);
  planksV(ctx, X, Y, W, H, '#8a7050');
  // دهانهٔ بزرگ تاریک
  ctx.fillStyle = '#171009';
  ctx.fillRect(X + 10, Y + 8, W - 20, H - 8);
  ctx.fillStyle = PAL.woodDark;
  ctx.fillRect(X + 9, Y + 6, W - 18, 2);
  // تیرهای میان دهانه + یخ‌زدهٔ کاه
  ctx.fillStyle = PAL.wood[3];
  ctx.fillRect(X + (W >> 1) - 1, Y + 6, 2, H - 6);
  ctx.fillStyle = '#b09a5a';
  ctx.fillRect(X + 12, Y + H - 8, 8, 5);
  ctx.fillRect(X + W - 22, Y + H - 7, 7, 4);
  // دم‌درخت‌های کاه در طبقهٔ بالا
  ctx.fillStyle = '#b09a5a';
  ctx.fillRect(X + (W >> 1) - 8, ov + roofH + 2, 16, 7);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(X + (W >> 1) - 8, ov + roofH + 9, 16, 1);
  ctx.fillStyle = PAL.woodDark;
  ctx.fillRect(X + (W >> 1) - 9, ov + roofH + 1, 18, 1);
  ctx.fillRect(X + (W >> 1) - 9, ov + roofH + 10, 18, 1);
  outlineRect(ctx, X, Y, W, H);
  return { cv, dx: -ov, dy: -(roofH + ov + 2) };
}

function paintBarn(w, h) {
  const W = w * TILE, H = h * TILE;
  const roofH = 26, ov = 4;
  const [cv, ctx] = mk(W + ov * 2, H + roofH + ov + 2);
  const X = ov, Y = ov + roofH;
  shingleRoof(ctx, X - 2, ov, W + 4, roofH, PAL.roofRed);
  planksV(ctx, X, Y, W, H, PAL.roofRedDark);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(X, Y + H - 3, W, 3);
  // درهای بزرگ ضربدری با قاب سفید
  doorBox(ctx, X + (W >> 1) - 13, Y + H - 26, 26, 26, { base: '#6e3a28', cross: true });
  ctx.strokeStyle = PAL.trimCream;
  ctx.strokeRect(X + (W >> 1) - 13.5, Y + H - 26.5, 27, 27);
  // درخونهٔ کاه بالا
  ctx.fillStyle = '#171009';
  ctx.fillRect(X + (W >> 1) - 6, Y + 6, 12, 10);
  ctx.fillStyle = PAL.trimCream;
  ctx.fillRect(X + (W >> 1) - 7, Y + 5, 14, 1);
  ctx.fillRect(X + (W >> 1) - 7, Y + 16, 14, 1);
  ctx.fillRect(X + (W >> 1) - 7, Y + 5, 1, 12);
  ctx.fillRect(X + (W >> 1) + 6, Y + 5, 1, 12);
  // ترمیم‌های چوب روشن
  ctx.fillStyle = '#c8b088';
  ctx.fillRect(X + 6, Y + 20, 10, 6);
  ctx.fillRect(X + W - 16, Y + 30, 10, 6);
  outlineRect(ctx, X, Y, W, H);
  return { cv, dx: -ov, dy: -(roofH + ov + 2) };
}

function paintMineShack(w, h) {
  const W = w * TILE, H = h * TILE;
  const roofH = 14, ov = 4;
  const [cv, ctx] = mk(W + ov * 2, H + roofH + ov + 2);
  const X = ov, Y = ov + roofH;
  // بام فرسوده
  shingleRoof(ctx, X - 2, ov, W + 4, roofH, '#5e5244');
  // اسکلت چوبی + دیوار کم‌رنگ
  planksV(ctx, X, Y, W, H, '#6e6048');
  ctx.fillStyle = PAL.woodDark;
  ctx.fillRect(X + 4, Y + 4, 3, H - 4);
  ctx.fillRect(X + W - 7, Y + 4, 3, H - 4);
  ctx.fillRect(X + 4, Y + 4, W - 8, 3);
  // دهانهٔ تاریک ورودی
  ctx.fillStyle = '#0c0a06';
  ctx.fillRect(X + (W >> 1) - 8, Y + H - 20, 16, 20);
  ctx.fillStyle = PAL.woodDark;
  ctx.fillRect(X + (W >> 1) - 9, Y + H - 21, 18, 2);
  ctx.fillRect(X + (W >> 1) - 9, Y + H - 21, 2, 21);
  ctx.fillRect(X + (W >> 1) + 7, Y + H - 21, 2, 21);
  outlineRect(ctx, X, Y, W, H);
  return { cv, dx: -ov, dy: -(roofH + ov + 2) };
}

function paintWaterTower(w, h) {
  const W = w * TILE, H = h * TILE;
  const tankH = 30, ov = 4;
  const [cv, ctx] = mk(W + ov * 2, H + tankH + ov + 2);
  const X = ov, Y = ov + tankH;
  // پایه‌ها
  ctx.strokeStyle = PAL.wood[3];
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(X + 6, Y + H); ctx.lineTo(X + 12, Y - 4);
  ctx.moveTo(X + W - 6, Y + H); ctx.lineTo(X + W - 12, Y - 4);
  ctx.moveTo(X + 10, Y + (H >> 1)); ctx.lineTo(X + W - 10, Y + (H >> 1));
  ctx.stroke();
  // مخزن
  planksV(ctx, X + 4, Y - tankH, W - 8, tankH, '#7a6248');
  ctx.fillStyle = '#5e4a34';
  ctx.fillRect(X + 3, Y - tankH, W - 6, 3);
  ctx.fillRect(X + 3, Y - tankH + tankH - 4, W - 6, 3);
  ctx.fillStyle = '#4a3a2a';
  ctx.fillRect(X + 3, Y - tankH + 8, W - 6, 2);
  ctx.fillRect(X + 3, Y - tankH + 18, W - 6, 2);
  // نردبان
  ctx.strokeStyle = '#3a2c1a';
  ctx.lineWidth = 1;
  for (let ly = Y - tankH + 6; ly < Y + H; ly += 5) {
    ctx.beginPath();
    ctx.moveTo(X + 16, ly); ctx.lineTo(X + 20, ly);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(X + 15, Y - tankH + 4); ctx.lineTo(X + 15, Y + H);
  ctx.moveTo(X + 21, Y - tankH + 4); ctx.lineTo(X + 21, Y + H);
  ctx.stroke();
  return { cv, dx: -ov, dy: -(tankH + ov + 2) };
}

function drawStar(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + i * Math.PI / 5;
    const rr = i % 2 ? r * 0.45 : r;
    const px = cx + Math.cos(ang) * rr, py = cy + Math.sin(ang) * rr;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

/** ساخت همهٔ اسپرایت‌های ساختمان. خروجی: Map type→{cv, dx, dy} */
export function buildBuildingSprites() {
  const out = new Map();
  for (const b of [
    { type: 'saloon', w: 8, h: 6, fn: paintSaloon },
    { type: 'bank', w: 5, h: 5, fn: paintBank },
    { type: 'store', w: 6, h: 5, fn: paintStore },
    { type: 'sheriff', w: 4, h: 4, fn: paintSheriff },
    { type: 'stable', w: 7, h: 5, fn: paintStable },
    { type: 'houseA', w: 5, h: 4, fn: (w, h) => paintGableHouse(w, h, { wall: '#c8b088', siding: true, roof: PAL.roof[0], shutter: '#5e442a' }) },
    { type: 'houseB', w: 5, h: 4, fn: (w, h) => paintGableHouse(w, h, { wall: '#8c8272', roof: PAL.roof[2], shutter: '#4e3a26' }) },
    { type: 'gunsmith', w: 4, h: 4, fn: (w, h) => paintGableHouse(w, h, { wall: '#5e442a', roof: PAL.roof[1], sign: 'اسلحه‌سازی' }) },
    { type: 'farmhouse', w: 5, h: 4, fn: (w, h) => paintGableHouse(w, h, { wall: '#c8b898', siding: true, roof: '#7e6440', shutter: '#7a6a4e' }) },
    { type: 'barn', w: 6, h: 5, fn: paintBarn },
    { type: 'mineShack', w: 4, h: 3, fn: paintMineShack },
    { type: 'waterTower', w: 3, h: 3, fn: paintWaterTower },
  ]) {
    out.set(b.type, b.fn(b.w, b.h));
  }
  return out;
}
