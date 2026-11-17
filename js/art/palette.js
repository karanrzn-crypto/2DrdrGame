/**
 * palette.js — پالت واحد کل بازی (§2: زبان بصری یکپارچه).
 * الهام از غرب آمریکا: خاک گرم، چوب فرسوده، سنگ مس، چمن خشک، آب رودخانه.
 * هیچ رنگ بیرون از این پالت استفاده نمی‌شود.
 */

export const PAL = {
  /* خط و سایه */
  outline: '#1d130b',
  shadow: '#000000',

  /* زمین — چمن */
  grass: ['#5e7d3a', '#67893f', '#709345', '#7a9d4c'],
  grassDry: ['#8f9a4a', '#9aa553', '#a5b05c'],
  tuft: '#4e6a30',
  tuftLight: '#83a752',
  flowerY: '#d9c27a',
  flowerR: '#b05038',
  flowerW: '#d8d8c8',

  /* زمین — بدلندز و خاک */
  sand: ['#cf9d5e', '#d8ab6c', '#c69255', '#bd8a4f'],
  sandRipple: '#b08048',
  dirt: ['#a8825a', '#b08e63', '#9a7550'],
  road: ['#a8825a', '#b18e63', '#9d7952'],
  rut: '#8a6845',
  dryMud: ['#c9b18a', '#c2a97f', '#bd9f74'],
  crack: '#96805e',

  /* چوب و ساختمان */
  wood: ['#8a6a44', '#7a5c3a', '#6e5030', '#5e442a'],
  woodLight: '#9a7a50',
  woodDark: '#4e3822',
  plankGap: '#5e4428',
  trimCream: '#d8c8a0',
  wallRed: '#7a4438',
  wallTan: '#9a8462',
  wallGray: '#8c8272',
  stone: ['#9a8f80', '#8a7f70', '#7a7060', '#6a6054'],
  roof: ['#6e5638', '#63502f', '#584528'],
  roofLight: '#7e6440',
  roofRed: '#7a4030',
  roofRedDark: '#5e3024',
  shingle: '#3a2c1a',

  /* آب */
  water: ['#3f6d7e', '#386271', '#4a7a8a'],
  waterLight: '#7fb2bc',
  waterDeep: '#2e5261',

  /* کوه و سنگ */
  rock: ['#8a7a66', '#7a6b58', '#6e6050'],
  rockLight: '#a3947e',
  rockDark: '#54483a',
  mesa: ['#b56b4a', '#a45c3c', '#8c4c30'],
  mesaLight: '#c9855e',

  /* شخصیت‌ها */
  skin: '#d8a878',
  skinShade: '#b8875e',
  hatBrown: '#5a4632',
  hatDark: '#46351f',
  shirt: '#7a8c5a',
  pants: '#4a3a2e',
  boots: '#2e241c',
  badge: '#d8b03a',

  /* UI */
  uiPaper: '#e8d8b0',
  uiPaperDark: '#c9b183',
  uiInk: '#2e2118',
  uiStrap: '#5a3a24',
  uiStrapDark: '#3e2818',
  uiGold: '#c8973a',
  uiRed: '#a5402d',
  uiHealth: '#b03a2a',

  /* نور */
  lampWarm: '#ffd98a',
  fireCore: '#e8b23a',
  fireMid: '#d97a2e',
  fireEdge: '#b04a22',
  smoke: '#8a8a8a',
};

export const FONT = 'Vazirmatn, Tahoma, Arial, sans-serif';

/** متن فارسی با فونت بازی — RTL و اندازهٔ درست. */
export function faText(ctx, text, x, y, size = 12, color = PAL.uiInk, align = 'center') {
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.font = `${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}
