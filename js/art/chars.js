/**
 * chars.js — اسپرایت شخصیت‌ها: بازیکن (کلانتر) و NPCها.
 * ۱۶×۲۲ پیکسل، ۴ جهت × ۴ فریم (ایست + چرخهٔ راه رفتن)، سایهٔ نرم.
 * کیفیت: کلاه لبه‌دار، صورت، سینه، کمربند، دست، پا/چکمه — همه با پیکسل‌های دقیق.
 */

const W = 16, H = 22;

function mk() {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return [cv, ctx];
}

function px(ctx, x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

/**
 * رسم یک فریم کامل شخصیت.
 * dir: 0=down 1=up 2=left 3=right ; frame: 0..3 (0/2 ایست)
 */
function drawDude(ctx, dir, frame, pal) {
  const bob = (frame === 1 || frame === 3) ? 1 : 0;
  const stride = frame === 1 ? 1 : frame === 3 ? -1 : 0;

  /* ---------- پاها ---------- */
  const legY = 15;
  if (dir === 0 || dir === 1) {
    // جلو/پشت: دو پا، یکی جلو یکی عقب در فریم‌های راه رفتن
    const l1 = stride > 0 ? 1 : 0, l2 = stride < 0 ? 1 : 0;
    px(ctx, 5, legY - l1, 2, 4 + l1 - 1, pal.pants);
    px(ctx, 9, legY - l2, 2, 4 + l2 - 1, pal.pants);
    px(ctx, 5, legY + 3, 2, 2, pal.boots);
    px(ctx, 9, legY + 3, 2, 2, pal.boots);
  } else {
    // نیم‌رخ: پاها با گام باز
    px(ctx, 6 - stride, legY, 2, 4, pal.pants);
    px(ctx, 9 + stride, legY, 2, 4, pal.pants);
    px(ctx, 6 - stride, legY + 3, 2, 2, pal.boots);
    px(ctx, 9 + stride, legY + 3, 2, 2, pal.boots);
  }

  /* ---------- بدن ---------- */
  px(ctx, 5, 9 + bob, 6, 6, pal.shirt);
  // لبهٔ کت
  px(ctx, 5, 9 + bob, 1, 6, pal.shirtDark);
  px(ctx, 10, 9 + bob, 1, 6, pal.shirtDark);
  // کمربند و سگک
  px(ctx, 5, 13 + bob, 6, 1, pal.belt || '#2e241c');
  if (pal.badge) px(ctx, 7, 10 + bob, 2, 1, pal.badge);
  // هولستر
  px(ctx, 9, 14 + bob, 2, 2, '#241a12');

  /* ---------- دست‌ها ---------- */
  const armSwing = stride * 1;
  if (dir === 0 || dir === 1) {
    px(ctx, 4, 9 + bob - armSwing, 1, 4, pal.shirtDark);
    px(ctx, 11, 9 + bob + armSwing, 1, 4, pal.shirtDark);
    px(ctx, 4, 13 + bob - armSwing, 1, 1, pal.skin);
    px(ctx, 11, 13 + bob + armSwing, 1, 1, pal.skin);
  } else {
    px(ctx, 7, 9 + bob - armSwing, 2, 4, pal.shirtDark);
    px(ctx, 7, 13 + bob - armSwing, 2, 1, pal.skin);
  }

  /* ---------- سر ---------- */
  const hx = dir === 2 ? 4 : dir === 3 ? 5 : 5;
  if (dir === 1) {
    // پشت سر: کلاه کامل + موی پشت گردن
    px(ctx, hx - 1, 4 + bob, 8, 4, pal.hatDark);
    px(ctx, hx - 2, 7 + bob, 10, 1, pal.hat);
    px(ctx, hx + 2, 8 + bob, 3, 1, pal.hair || '#4a3421');
    px(ctx, 5, 9 + bob, 6, 1, pal.collar || pal.shirtDark);
  } else {
    // صورت
    px(ctx, hx, 5 + bob, 6, 4, pal.skin);
    px(ctx, hx, 4 + bob, 6, 1, pal.skinShade || pal.skin);
    // چشم‌ها
    if (dir === 0) {
      px(ctx, hx + 1, 6 + bob, 1, 1, '#2a1c10');
      px(ctx, hx + 4, 6 + bob, 1, 1, '#2a1c10');
    } else {
      px(ctx, hx + 1, 6 + bob, 1, 1, '#2a1c10');
      if (dir === 2) px(ctx, hx - 1, 6 + bob, 1, 1, pal.skin); // بینی
      if (dir === 3) px(ctx, hx + 6, 6 + bob, 1, 1, pal.skin);
    }
    // کلاه: تاج + لبهٔ پهن
    px(ctx, hx + 1, 1 + bob, 5, 3, pal.hat);
    px(ctx, hx + 2, 0 + bob, 3, 1, pal.hat);
    px(ctx, hx - 1, 4 + bob, 9, 1, pal.hatDark);
    px(ctx, hx - 2, 4 + bob, 11, 1, pal.hat);
    // ریش پیت پیر
    if (pal.beard) {
      px(ctx, hx + 1, 8 + bob, 5, 2, pal.beard);
      px(ctx, hx + 2, 10 + bob, 3, 1, pal.beard);
    }
    // دستمال گردن مسافر/معدن‌چی
    if (pal.scarf) px(ctx, hx + 1, 9 + bob, 4, 1, pal.scarf);
  }
}

/** ساخت شیت کامل یک پالت: [dir][frame] → canvas */
function sheet(pal) {
  const frames = [];
  for (let dir = 0; dir < 4; dir++) {
    for (let f = 0; f < 4; f++) {
      const [cv, ctx] = mk();
      drawDude(ctx, dir, f, pal);
      frames.push(cv);
    }
  }
  return frames;
}

/* پالت‌ها */
const PAL_PLAYER = {
  hat: '#5a4632', hatDark: '#46351f', skin: '#d8a878',
  shirt: '#8c7a54', shirtDark: '#6e5e3e', pants: '#4a3a2e',
  boots: '#2e241c', badge: '#d8b03a', hair: '#3a2c1a',
};
const PAL_PETE = {
  hat: '#6e6a5e', hatDark: '#565248', skin: '#c89878',
  shirt: '#7a6a50', shirtDark: '#5e5038', pants: '#3e3226',
  boots: '#2a2018', beard: '#c8c4b8', hair: '#b8b4a8',
};
const PAL_TRAVELER = {
  hat: '#46351f', hatDark: '#332614', skin: '#c89268',
  shirt: '#6e5e4e', shirtDark: '#544636', pants: '#38302a',
  boots: '#241c14', scarf: '#8a4432', hair: '#2a2018',
};
const PAL_FARMER = {
  hat: '#b8a060', hatDark: '#96814a', skin: '#d8a878',
  shirt: '#5e748c', shirtDark: '#48586a', pants: '#4e4438',
  boots: '#2e261c', hair: '#4e3a24',
};
const PAL_MINER = {
  hat: '#3e4a50', hatDark: '#2e3840', skin: '#c89868',
  shirt: '#6a5a44', shirtDark: '#524434', pants: '#34302c',
  boots: '#221c16', scarf: '#a5402d', hair: '#3a3028',
};

export const CHAR_PALETTES = {
  player: PAL_PLAYER,
  pete: PAL_PETE,
  traveler: PAL_TRAVELER,
  farmer: PAL_FARMER,
  miner: PAL_MINER,
};

/** شیت‌های همهٔ شخصیت‌ها: id → frames[dir*4+frame] */
export function buildCharSheets() {
  const out = {};
  for (const [id, pal] of Object.entries(CHAR_PALETTES)) out[id] = sheet(pal);
  return out;
}
