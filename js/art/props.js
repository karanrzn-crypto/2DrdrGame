/**
 * props.js — اسپرایت‌های رویه‌ای اشیاء و گیاهان (§3/§6).
 * هر نوع: فریم‌های انیمیشن (آتش، گوسفند، اسب، پرهٔ آسیاب، نی) + لنگر پایین-مرکز.
 */
import { PAL, faText } from './palette.js';
import { mulberry32 } from '../util.js';

function mk(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return [cv, ctx];
}

function flipCv(cv) {
  const [f, ctx] = mk(cv.width, cv.height);
  ctx.translate(cv.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(cv, 0, 0);
  return f;
}

function shadowEllipse(ctx, cx, cy, rx, ry) {
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/* ---------- درخت‌ها ---------- */
function treePine(seed) {
  const rng = mulberry32(seed);
  const [cv, ctx] = mk(22, 32);
  shadowEllipse(ctx, 11, 30, 7, 2.5);
  ctx.fillStyle = PAL.wood[2];
  ctx.fillRect(10, 24, 2, 7);
  const layers = 4;
  for (let i = 0; i < layers; i++) {
    const ly = 22 - i * 6;
    const lw = 4 + i * 3 + (rng() * 2 | 0);
    ctx.fillStyle = i === layers - 1 ? '#4a6e3e' : i % 2 ? '#3c5c36' : '#2e4a2e';
    ctx.beginPath();
    ctx.moveTo(11, ly - 9);
    ctx.lineTo(11 - lw, ly);
    ctx.lineTo(11 + lw, ly);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(11 - 1, ly - 8, 1, 4);
  }
  return cv;
}

function treeOak(seed) {
  const rng = mulberry32(seed);
  const [cv, ctx] = mk(28, 28);
  shadowEllipse(ctx, 14, 26, 9, 3);
  ctx.fillStyle = PAL.wood[2];
  ctx.fillRect(13, 18, 3, 9);
  ctx.fillStyle = PAL.wood[3];
  ctx.fillRect(10, 21, 3, 2);
  const blobs = [
    [14, 9, 9], [8, 13, 6], [20, 12, 6], [12, 6, 5], [18, 7, 5],
  ];
  for (const [bx, by, br] of blobs) {
    ctx.fillStyle = '#3a5a30';
    ctx.beginPath(); ctx.arc(bx, by + 1, br, 0, Math.PI * 2); ctx.fill();
  }
  for (const [bx, by, br] of blobs) {
    ctx.fillStyle = '#4c7038';
    ctx.beginPath(); ctx.arc(bx, by, br - 1, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = '#5e8442';
    ctx.fillRect(6 + rng() * 14 | 0, 4 + rng() * 8 | 0, 2, 1);
  }
  return cv;
}

function treeSmall() {
  const [cv, ctx] = mk(14, 17);
  shadowEllipse(ctx, 7, 15, 5, 2);
  ctx.fillStyle = PAL.wood[2];
  ctx.fillRect(6, 10, 2, 6);
  ctx.fillStyle = '#3a5a30';
  ctx.beginPath(); ctx.arc(7, 7, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4c7038';
  ctx.beginPath(); ctx.arc(7, 6.5, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5e8442';
  ctx.fillRect(5, 4, 3, 1);
  return cv;
}

function treeDead(seed) {
  const rng = mulberry32(seed);
  const [cv, ctx] = mk(18, 28);
  shadowEllipse(ctx, 9, 26, 5, 2);
  ctx.strokeStyle = '#5e5040';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(9, 26); ctx.lineTo(9, 10); ctx.stroke();
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const y0 = 20 - i * 4;
    const dx = rng() < 0.5 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(9, y0); ctx.lineTo(9 + dx * (3 + rng() * 4), y0 - 3 - rng() * 3);
    ctx.stroke();
  }
  return cv;
}

function stump() {
  const [cv, ctx] = mk(11, 8);
  shadowEllipse(ctx, 5, 7, 5, 1.5);
  ctx.fillStyle = PAL.wood[1];
  ctx.fillRect(2, 3, 7, 4);
  ctx.fillStyle = PAL.woodLight;
  ctx.fillRect(2, 2, 7, 2);
  ctx.fillStyle = '#8a7458';
  ctx.beginPath(); ctx.ellipse(5.5, 2.5, 3.5, 1.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#6e5a40';
  ctx.beginPath(); ctx.ellipse(5.5, 2.5, 2, 0.8, 0, 0, Math.PI * 2); ctx.stroke();
  return cv;
}

/* ---------- بوته‌ها و کاکتوس ---------- */
function bushSage(seed) {
  const rng = mulberry32(seed);
  const [cv, ctx] = mk(13, 10);
  shadowEllipse(ctx, 6, 9, 5, 1.5);
  for (const [bx, by, r] of [[6, 5, 4], [3, 6, 3], [9, 6, 3]]) {
    ctx.fillStyle = '#5e7a4a';
    ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = '#6e8c56';
    ctx.fillRect(2 + rng() * 9 | 0, 3 + rng() * 5 | 0, 1, 2);
  }
  return cv;
}

function bushDry(seed) {
  const rng = mulberry32(seed);
  const [cv, ctx] = mk(13, 9);
  shadowEllipse(ctx, 6, 8, 4.5, 1.4);
  ctx.strokeStyle = '#a89058';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(6, 8);
    ctx.lineTo(2 + rng() * 8, 2 + rng() * 3);
    ctx.stroke();
  }
  return cv;
}

function bushFlower(seed) {
  const rng = mulberry32(seed);
  const [cv, ctx] = mk(13, 10);
  shadowEllipse(ctx, 6, 9, 5, 1.5);
  ctx.fillStyle = '#4e6a38';
  ctx.beginPath(); ctx.arc(6, 6, 4, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = rng() < 0.5 ? PAL.flowerY : PAL.flowerW;
    ctx.fillRect(2 + rng() * 9 | 0, 3 + rng() * 5 | 0, 1, 1);
  }
  return cv;
}

function cactusSaguaro(seed, flip) {
  const rng = mulberry32(seed);
  const [cv, ctx] = mk(15, 26);
  shadowEllipse(ctx, 7, 24, 5, 2);
  ctx.fillStyle = '#4a7a3c';
  ctx.fillRect(6, 4, 4, 21);
  ctx.fillStyle = '#5c8c4a';
  ctx.fillRect(6, 4, 1, 21);
  // بازوها
  const armY = 10 + (rng() * 4 | 0);
  ctx.fillStyle = '#4a7a3c';
  ctx.fillRect(2, armY, 4, 3); ctx.fillRect(2, armY - 5, 3, 6);
  ctx.fillRect(10, armY + 4, 4, 3); ctx.fillRect(11, armY - 2, 3, 6);
  ctx.fillStyle = '#5c8c4a';
  ctx.fillRect(2, armY - 5, 1, 5); ctx.fillRect(11, armY - 2, 1, 6);
  // تیغه‌ها
  ctx.fillStyle = '#2e5226';
  for (let i = 0; i < 6; i++) ctx.fillRect(6 + (rng() * 4 | 0), 6 + i * 3, 1, 1);
  if (flip) return flipCv(cv);
  return cv;
}

function cactusPear(seed) {
  const rng = mulberry32(seed);
  const [cv, ctx] = mk(13, 15);
  shadowEllipse(ctx, 6, 13, 5, 1.6);
  ctx.fillStyle = '#4e7c3e';
  ctx.beginPath(); ctx.ellipse(6, 9, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(9, 6, 3, 4, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(3.5, 6.5, 2.6, 3.4, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5e8c4c';
  ctx.beginPath(); ctx.ellipse(5, 8, 2.4, 3.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c8b86a';
  for (let i = 0; i < 5; i++) ctx.fillRect(2 + rng() * 9 | 0, 3 + rng() * 9 | 0, 1, 1);
  return cv;
}

function cactusAgave(seed) {
  const rng = mulberry32(seed + 7);
  const [cv, ctx] = mk(15, 13);
  shadowEllipse(ctx, 7, 11, 6, 2);
  ctx.strokeStyle = '#5e8c4c';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i - 3.5) * 0.38;
    ctx.beginPath();
    ctx.moveTo(7, 11);
    ctx.lineTo(7 + Math.cos(a) * (5 + rng() * 3), 11 + Math.sin(a) * (6 + rng() * 4));
    ctx.stroke();
  }
  return cv;
}

/* ---------- سنگ‌ها ---------- */
function rockSmall(seed) {
  const rng = mulberry32(seed);
  const [cv, ctx] = mk(12, 9);
  shadowEllipse(ctx, 6, 8, 5, 1.6);
  ctx.fillStyle = PAL.rock[1];
  ctx.beginPath(); ctx.moveTo(2, 8); ctx.lineTo(3, 4); ctx.lineTo(7, 2);
  ctx.lineTo(10, 5); ctx.lineTo(9, 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PAL.rockLight;
  ctx.fillRect(4, 3, 3, 1);
  ctx.fillStyle = PAL.rockDark;
  ctx.fillRect(2, 7, 8, 1);
  if (rng() < 0.5) { ctx.fillStyle = PAL.rockDark; ctx.fillRect(6, 4, 1, 2); }
  return cv;
}

function rockBig(seed, flip) {
  const rng = mulberry32(seed);
  const [cv, ctx] = mk(18, 14);
  shadowEllipse(ctx, 9, 13, 8, 2.2);
  ctx.fillStyle = PAL.rock[1];
  ctx.beginPath();
  ctx.moveTo(2, 13); ctx.lineTo(3, 6); ctx.lineTo(8, 2); ctx.lineTo(14, 4);
  ctx.lineTo(16, 9); ctx.lineTo(15, 13); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PAL.rockLight;
  ctx.fillRect(6, 3, 5, 1); ctx.fillRect(4, 5, 3, 1);
  ctx.fillStyle = PAL.rockDark;
  ctx.fillRect(3, 12, 13, 1);
  ctx.fillRect(10, 5, 1, 4);
  if (rng() < 0.6) { ctx.fillStyle = PAL.rockDark; ctx.fillRect(5, 8, 4, 1); }
  return flip ? flipCv(cv) : cv;
}

/* ---------- اشیاء چوبی ---------- */
function barrel() {
  const [cv, ctx] = mk(11, 13);
  shadowEllipse(ctx, 5, 12, 5, 1.6);
  ctx.fillStyle = PAL.wood[1];
  ctx.fillRect(2, 1, 7, 11);
  ctx.fillStyle = PAL.woodLight;
  ctx.fillRect(2, 1, 1, 11);
  ctx.fillStyle = PAL.woodDark;
  ctx.fillRect(8, 1, 1, 11);
  ctx.fillStyle = '#4a4a52';
  ctx.fillRect(1, 3, 9, 1);
  ctx.fillRect(1, 8, 9, 1);
  ctx.fillStyle = PAL.wood[3];
  ctx.fillRect(2, 0, 7, 1);
  return cv;
}

function crate() {
  const [cv, ctx] = mk(13, 11);
  shadowEllipse(ctx, 6, 10, 6, 1.6);
  ctx.fillStyle = PAL.wood[0];
  ctx.fillRect(1, 1, 11, 9);
  ctx.strokeStyle = PAL.woodDark;
  ctx.strokeRect(1.5, 1.5, 10, 8);
  ctx.beginPath();
  ctx.moveTo(2, 2); ctx.lineTo(11, 9);
  ctx.moveTo(11, 2); ctx.lineTo(2, 9);
  ctx.stroke();
  return cv;
}

function crateStack() {
  const [cv, ctx] = mk(15, 17);
  shadowEllipse(ctx, 7, 16, 7, 2);
  const c1 = crate(); ctx.drawImage(c1, 0, 7);
  const c2 = crate(); ctx.drawImage(c2, 2, 0);
  const c3 = flipCv(crate()); ctx.drawImage(c3, 3, 3);
  return cv;
}

function sack(seed) {
  const rng = mulberry32(seed);
  const [cv, ctx] = mk(11, 10);
  shadowEllipse(ctx, 5, 9, 5, 1.5);
  ctx.fillStyle = '#c8b088';
  ctx.beginPath(); ctx.ellipse(5.5, 6, 4.5, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#a89068';
  ctx.beginPath(); ctx.ellipse(5.5, 3.5, 2, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a7458';
  ctx.beginPath(); ctx.moveTo(4, 2); ctx.lineTo(6, 4); ctx.stroke();
  if (rng() < 0.4) { ctx.fillStyle = '#8a7458'; ctx.fillRect(3, 6, 3, 1); }
  return cv;
}

function hitch() {
  const [cv, ctx] = mk(18, 11);
  shadowEllipse(ctx, 9, 10, 8, 1.5);
  ctx.fillStyle = PAL.wood[2];
  ctx.fillRect(2, 2, 3, 8);
  ctx.fillRect(13, 2, 3, 8);
  ctx.fillStyle = PAL.wood[1];
  ctx.fillRect(1, 3, 16, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(1, 5, 16, 1);
  return cv;
}

function bench() {
  const [cv, ctx] = mk(19, 11);
  shadowEllipse(ctx, 9, 10, 8, 1.5);
  ctx.fillStyle = PAL.wood[1];
  ctx.fillRect(1, 3, 17, 3);
  ctx.fillStyle = PAL.woodLight;
  ctx.fillRect(1, 3, 17, 1);
  ctx.fillStyle = PAL.wood[3];
  ctx.fillRect(2, 6, 2, 4);
  ctx.fillRect(15, 6, 2, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(1, 6, 17, 1);
  return cv;
}

function lamppost(lit) {
  const [cv, ctx] = mk(9, 27);
  shadowEllipse(ctx, 4, 26, 4, 1.4);
  ctx.fillStyle = '#3a3428';
  ctx.fillRect(4, 4, 2, 22);
  ctx.fillRect(3, 24, 4, 2);
  ctx.fillRect(2, 26, 6, 1);
  // سر پایه
  ctx.fillStyle = '#3a3428';
  ctx.fillRect(2, 1, 6, 1);
  ctx.fillRect(2, 1, 1, 6);
  ctx.fillRect(7, 1, 1, 6);
  ctx.fillStyle = lit ? PAL.lampWarm : '#2a3644';
  ctx.fillRect(3, 2, 4, 5);
  if (lit) {
    ctx.fillStyle = '#fff2c8';
    ctx.fillRect(4, 3, 2, 2);
  }
  return cv;
}

function well() {
  const [cv, ctx] = mk(30, 30);
  shadowEllipse(ctx, 15, 27, 12, 3);
  // حلقهٔ سنگی
  for (let a = 0; a < 12; a++) {
    const ang = a / 12 * Math.PI * 2;
    const sx = 15 + Math.cos(ang) * 10, sy = 20 + Math.sin(ang) * 5;
    ctx.fillStyle = PAL.stone[(a % 3)];
    ctx.fillRect(sx - 2.5, sy - 2, 5, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(sx - 2.5, sy + 1.5, 5, 1);
  }
  // داخل تاریک
  ctx.fillStyle = '#0e1620';
  ctx.beginPath(); ctx.ellipse(15, 20, 7, 3.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a4a5a';
  ctx.fillRect(10, 19, 10, 1);
  // پایه‌ها و بام
  ctx.fillStyle = PAL.wood[2];
  ctx.fillRect(7, 8, 2, 12);
  ctx.fillRect(21, 8, 2, 12);
  ctx.fillStyle = PAL.roof[1];
  ctx.beginPath(); ctx.moveTo(4, 9); ctx.lineTo(15, 2); ctx.lineTo(26, 9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PAL.roof[2];
  ctx.fillRect(4, 8, 22, 1);
  // طناب و سطل
  ctx.strokeStyle = '#8a7458';
  ctx.beginPath(); ctx.moveTo(15, 8); ctx.lineTo(15, 14); ctx.stroke();
  ctx.fillStyle = PAL.wood[1];
  ctx.fillRect(13, 14, 4, 3);
  return cv;
}

function trough(withWater) {
  const [cv, ctx] = mk(30, 13);
  shadowEllipse(ctx, 15, 11, 14, 2);
  ctx.fillStyle = PAL.wood[1];
  ctx.fillRect(1, 2, 28, 8);
  ctx.fillStyle = PAL.woodLight;
  ctx.fillRect(1, 2, 28, 1);
  ctx.fillStyle = PAL.woodDark;
  ctx.fillRect(1, 9, 28, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(4, 2, 1, 9); ctx.fillRect(14, 2, 1, 9); ctx.fillRect(25, 2, 1, 9);
  if (withWater) {
    ctx.fillStyle = PAL.water[0];
    ctx.fillRect(3, 4, 24, 4);
    ctx.fillStyle = PAL.waterLight;
    ctx.fillRect(6, 5, 6, 1);
    ctx.fillRect(16, 6, 5, 1);
  } else {
    ctx.fillStyle = '#9a8a6a';
    ctx.fillRect(3, 4, 24, 4);
    ctx.strokeStyle = '#6e5f44';
    ctx.beginPath(); ctx.moveTo(5, 6); ctx.lineTo(12, 5); ctx.lineTo(19, 7); ctx.lineTo(25, 5); ctx.stroke();
  }
  return cv;
}

function haypile(seed) {
  const rng = mulberry32(seed);
  const [cv, ctx] = mk(15, 11);
  shadowEllipse(ctx, 7, 9, 7, 2);
  ctx.fillStyle = '#b09a5a';
  ctx.beginPath(); ctx.ellipse(7.5, 6, 7, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c8b26a';
  ctx.beginPath(); ctx.ellipse(7, 4.5, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a7444';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(3 + rng() * 9, 3 + rng() * 6);
    ctx.lineTo(3 + rng() * 9, 3 + rng() * 6);
    ctx.stroke();
  }
  return cv;
}

function wagon(seed) {
  const rng = mulberry32(seed);
  const [cv, ctx] = mk(32, 20);
  shadowEllipse(ctx, 16, 17, 15, 2.5);
  // بدنه
  ctx.fillStyle = PAL.wood[1];
  ctx.fillRect(4, 4, 24, 7);
  ctx.fillStyle = PAL.woodLight;
  ctx.fillRect(4, 4, 24, 1);
  for (let x = 4; x < 28; x += 5) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, 5, 1, 5); }
  ctx.fillStyle = PAL.wood[3];
  ctx.fillRect(4, 10, 24, 2);
  // چرخ‌ها
  const wheel = (cx, cy, r) => {
    ctx.fillStyle = '#3a2c1a';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5e4a34';
    ctx.beginPath(); ctx.arc(cx, cy, r - 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3a2c1a';
    ctx.beginPath();
    ctx.moveTo(cx - r + 1, cy); ctx.lineTo(cx + r - 1, cy);
    ctx.moveTo(cx, cy - r + 1); ctx.lineTo(cx, cy + r - 1);
    ctx.stroke();
  };
  wheel(8, 13, 5); wheel(24, 13, 5);
  if (rng() < 0.6) { ctx.fillStyle = '#8a7458'; ctx.fillRect(12, 2, 6, 1); }
  return cv;
}

function wagon2(seed) {
  const [cv, ctx] = mk(32, 18);
  shadowEllipse(ctx, 16, 15, 14, 2.5);
  // گاری واژگون نیم‌مُرده
  ctx.save();
  ctx.translate(16, 8);
  ctx.rotate(-0.12);
  ctx.fillStyle = '#6e5638';
  ctx.fillRect(-13, -4, 24, 6);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-13, 0, 24, 2);
  ctx.restore();
  ctx.fillStyle = '#3a2c1a';
  ctx.beginPath(); ctx.arc(9, 12, 4.5, 0, Math.PI * 2); ctx.fill();
  // چرخ افتاده کنار
  ctx.fillStyle = '#3a2c1a';
  ctx.beginPath(); ctx.arc(26, 13, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5e4a34';
  ctx.beginPath(); ctx.arc(26, 13, 2, 0, Math.PI * 2); ctx.fill();
  // تخته‌های پراکنده
  ctx.fillStyle = '#5e4a34';
  ctx.fillRect(2, 14, 5, 1);
  ctx.fillRect(19, 2, 6, 1);
  return cv;
}

function campfire(frame) {
  const rng = mulberry32(50 + frame);
  const [cv, ctx] = mk(15, 14);
  shadowEllipse(ctx, 7, 12, 6, 2);
  // سنگ‌ها
  for (const [sx, sy] of [[3, 11], [7, 12], [11, 11], [4, 9], [10, 9], [2, 10], [12, 10]]) {
    ctx.fillStyle = PAL.stone[1];
    ctx.fillRect(sx, sy, 2, 2);
    ctx.fillStyle = PAL.rockLight;
    ctx.fillRect(sx, sy, 1, 1);
  }
  // هیزم
  ctx.strokeStyle = PAL.wood[3];
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(4, 10); ctx.lineTo(11, 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, 8); ctx.lineTo(11, 10); ctx.stroke();
  // شعله — ۳ فریم
  const flames = [
    [[7, 8, 2, 4], [5, 9, 1, 2], [9, 9, 1, 2]],
    [[6, 6, 3, 6], [9, 8, 2, 3], [5, 9, 1, 2]],
    [[7, 7, 2, 5], [5, 7, 1, 4], [9, 9, 2, 2]],
  ];
  const f = flames[frame % 3];
  ctx.fillStyle = PAL.fireEdge;
  ctx.fillRect(f[0][0] - 1, f[0][1] - 1, f[0][2] + 2, f[0][3] + 2);
  ctx.fillStyle = PAL.fireMid;
  for (const [x, y, w, h] of f) ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PAL.fireCore;
  ctx.fillRect(f[0][0], f[0][1] + 1, f[0][2], f[0][3] - 2);
  return cv;
}

function log() {
  const [cv, ctx] = mk(17, 8);
  shadowEllipse(ctx, 8, 7, 8, 1.5);
  ctx.fillStyle = PAL.wood[1];
  ctx.fillRect(1, 3, 15, 4);
  ctx.fillStyle = PAL.woodLight;
  ctx.fillRect(1, 3, 15, 1);
  ctx.fillStyle = '#8a7458';
  ctx.beginPath(); ctx.ellipse(15.5, 5, 1.6, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(1, 6, 15, 1);
  return cv;
}

function logseat() {
  const [cv, ctx] = mk(15, 9);
  shadowEllipse(ctx, 7, 8, 7, 1.5);
  ctx.fillStyle = PAL.wood[2];
  ctx.fillRect(2, 3, 11, 5);
  ctx.fillStyle = PAL.woodLight;
  ctx.beginPath(); ctx.ellipse(7.5, 3.5, 5.5, 1.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a7458';
  ctx.beginPath(); ctx.ellipse(7.5, 3.5, 3, 1, 0, 0, Math.PI * 2); ctx.stroke();
  return cv;
}

function minecart() {
  const [cv, ctx] = mk(19, 15);
  shadowEllipse(ctx, 9, 13, 9, 2);
  ctx.fillStyle = '#4a4038';
  ctx.fillRect(2, 2, 15, 8);
  ctx.fillStyle = '#5e5248';
  ctx.fillRect(2, 2, 15, 2);
  ctx.fillStyle = '#2e2822';
  ctx.fillRect(3, 4, 13, 5);
  ctx.fillStyle = '#3a2c1a';
  ctx.beginPath(); ctx.arc(5, 11, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(14, 11, 2.5, 0, Math.PI * 2); ctx.fill();
  // سنگ مس داخل
  ctx.fillStyle = '#3e7a6a';
  ctx.fillRect(6, 3, 4, 2);
  ctx.fillStyle = '#5aa08a';
  ctx.fillRect(7, 3, 2, 1);
  return cv;
}

function mineDoor() {
  const [cv, ctx] = mk(34, 26);
  // دهانهٔ تاریک داخل کوه
  ctx.fillStyle = '#0c0a06';
  ctx.fillRect(4, 2, 26, 24);
  ctx.fillStyle = '#1a1410';
  ctx.fillRect(6, 4, 22, 20);
  ctx.fillStyle = '#0c0a06';
  ctx.fillRect(8, 6, 18, 18);
  // قاب چوبی مهار
  ctx.fillStyle = PAL.wood[2];
  ctx.fillRect(2, 0, 4, 26);
  ctx.fillRect(28, 0, 4, 26);
  ctx.fillRect(0, 0, 34, 3);
  ctx.fillStyle = PAL.woodDark;
  ctx.fillRect(2, 4, 30, 1);
  ctx.fillRect(2, 10, 30, 1);
  // ریل خروج
  ctx.fillStyle = '#4a4038';
  ctx.fillRect(8, 22, 3, 4);
  ctx.fillRect(23, 22, 3, 4);
  ctx.fillStyle = '#5e5248';
  ctx.fillRect(4, 24, 26, 2);
  return cv;
}

function ribs() {
  const [cv, ctx] = mk(15, 10);
  ctx.strokeStyle = '#d8cfb8';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(7.5, 6, 2 + i * 1.8, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  }
  ctx.fillStyle = '#e8dfc8';
  ctx.fillRect(7, 1, 1, 6);
  return cv;
}

function skull() {
  const [cv, ctx] = mk(9, 7);
  ctx.fillStyle = '#d8cfb8';
  ctx.fillRect(2, 1, 5, 4);
  ctx.fillRect(3, 5, 3, 1);
  ctx.fillStyle = '#3a3028';
  ctx.fillRect(3, 2, 1, 1);
  ctx.fillRect(5, 2, 1, 1);
  ctx.fillRect(4, 4, 1, 1);
  return cv;
}

function boots() {
  const [cv, ctx] = mk(10, 8);
  ctx.fillStyle = '#5e442a';
  ctx.fillRect(2, 1, 3, 5);
  ctx.fillRect(6, 1, 3, 5);
  ctx.fillStyle = '#3a2c1a';
  ctx.fillRect(2, 5, 3, 2);
  ctx.fillRect(6, 5, 3, 2);
  ctx.fillStyle = '#7a5c3a';
  ctx.fillRect(2, 1, 3, 1);
  ctx.fillRect(6, 1, 3, 1);
  return cv;
}

function plow(seed) {
  const [cv, ctx] = mk(17, 12);
  shadowEllipse(ctx, 8, 10, 8, 1.6);
  ctx.fillStyle = '#6e6048';
  ctx.fillRect(3, 4, 10, 3);
  ctx.fillStyle = '#4e4a44';
  ctx.fillRect(10, 5, 5, 4);
  ctx.fillStyle = '#8a8078';
  ctx.fillRect(12, 3, 3, 2);
  ctx.strokeStyle = '#5e4a34';
  ctx.beginPath(); ctx.moveTo(4, 7); ctx.lineTo(2, 10); ctx.stroke();
  void seed;
  return cv;
}

function windmill(frame) {
  const [cv, ctx] = mk(26, 46);
  shadowEllipse(ctx, 13, 44, 9, 2.5);
  // برج هرمی
  ctx.fillStyle = PAL.wood[1];
  ctx.beginPath();
  ctx.moveTo(9, 44); ctx.lineTo(11, 20); ctx.lineTo(15, 20); ctx.lineTo(17, 44);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = PAL.wood[3];
  ctx.fillRect(9, 30, 8, 1);
  ctx.fillRect(10, 36, 6, 1);
  // پره‌ها
  const angles = [0, Math.PI / 4, Math.PI / 2, (Math.PI * 3) / 4];
  const a = angles[frame % 4];
  ctx.save();
  ctx.translate(13, 16);
  ctx.rotate(a);
  ctx.fillStyle = PAL.wood[0];
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.fillRect(1, -1.5, 10, 3);
    ctx.fillStyle = '#c8b898';
    ctx.fillRect(3, -1, 6, 2);
    ctx.fillStyle = PAL.wood[0];
  }
  ctx.restore();
  ctx.fillStyle = '#3a2c1a';
  ctx.fillRect(12, 15, 2, 2);
  // سکوی کوچک
  ctx.fillStyle = PAL.wood[2];
  ctx.fillRect(8, 19, 10, 2);
  return cv;
}

function sheep(frame) {
  const [cv, ctx] = mk(14, 11);
  shadowEllipse(ctx, 7, 9, 5, 1.6);
  const headY = frame ? 6 : 3; // چرایدن: سر پایین
  ctx.fillStyle = '#e0d8c8';
  ctx.beginPath(); ctx.ellipse(6, 5, 5, 3.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#cfc4b0';
  ctx.beginPath(); ctx.ellipse(9, 6, 3, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a3230';
  ctx.fillRect(1, headY - 2, 4, 3);
  ctx.fillStyle = '#2a2422';
  ctx.fillRect(1, headY - 1, 1, 1);
  ctx.fillStyle = '#4a403c';
  ctx.fillRect(3, 7, 1, 2);
  ctx.fillRect(7, 7, 1, 2);
  return cv;
}

function horse(frame) {
  const [cv, ctx] = mk(26, 20);
  shadowEllipse(ctx, 13, 17, 11, 2.5);
  const legShift = frame ? 1 : 0;
  // پاها
  ctx.fillStyle = '#5e4428';
  ctx.fillRect(5, 12 + legShift, 2, 6 - legShift);
  ctx.fillRect(9, 12, 2, 6);
  ctx.fillRect(15, 12, 2, 6);
  ctx.fillRect(19, 12 - legShift, 2, 6);
  // بدن
  ctx.fillStyle = '#6e4e2e';
  ctx.fillRect(4, 6, 18, 7);
  ctx.fillStyle = '#7e5e3a';
  ctx.fillRect(4, 6, 18, 2);
  // گردن و سر
  ctx.fillStyle = '#6e4e2e';
  ctx.fillRect(20, 3, 4, 6);
  ctx.fillRect(22, 1, 4, 4);
  ctx.fillStyle = '#5e4226';
  ctx.fillRect(25, 2, 1, 3);
  ctx.fillStyle = '#2a2018';
  ctx.fillRect(25, 2, 1, 1);
  // یال و دم
  ctx.fillStyle = '#3a2c1c';
  ctx.fillRect(20, 2, 1, 5);
  ctx.fillRect(3, 6, 1, 6);
  if (frame) ctx.fillRect(2, 7, 1, 4);
  // زین
  ctx.fillStyle = '#7a4438';
  ctx.fillRect(11, 5, 6, 3);
  ctx.fillStyle = '#5e3428';
  ctx.fillRect(11, 7, 6, 1);
  return cv;
}

function reed(frame) {
  const [cv, ctx] = mk(11, 15);
  const sway = frame ? 1 : 0;
  ctx.strokeStyle = '#5e7a4a';
  ctx.lineWidth = 1;
  for (const [bx, top] of [[3, 4], [5, 2], [7, 3], [9, 5]]) {
    ctx.beginPath();
    ctx.moveTo(bx, 14);
    ctx.quadraticCurveTo(bx + sway, 8, bx + sway + 1, top);
    ctx.stroke();
    if (top < 4) {
      ctx.fillStyle = '#8a7444';
      ctx.fillRect(bx + sway, top - 1, 1, 3);
    }
  }
  return cv;
}

function sign(text) {
  const w = Math.max(34, 12 + text.length * 8);
  const [cv, ctx] = mk(w, 24);
  shadowEllipse(ctx, w / 2, 22, w / 3, 1.6);
  ctx.fillStyle = PAL.wood[2];
  ctx.fillRect(w / 2 - 2, 6, 4, 16);
  ctx.fillStyle = PAL.wood[3];
  ctx.fillRect(w / 2 - 2, 6, 1, 16);
  ctx.fillStyle = PAL.wood[1];
  ctx.fillRect(2, 1, w - 4, 9);
  ctx.strokeStyle = PAL.woodDark;
  ctx.strokeRect(2.5, 1.5, w - 5, 8);
  faText(ctx, text, w / 2, 6, 8, PAL.trimCream);
  return cv;
}

function ruin() {
  // ویرانهٔ ۶×۵ تایل — دیوارهای پاره و آوار
  const [cv, ctx] = mk(96, 80);
  const rng = mulberry32(4242);
  // کف آوار
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = rng() < 0.5 ? '#8a7458' : '#6e5a44';
    ctx.fillRect(rng() * 88 | 0, rng() * 72 | 0, 3 + rng() * 4 | 0, 2);
  }
  // دیوار شمالی پاره
  for (const [x, w] of [[6, 30], [48, 14], [70, 20]]) {
    const h = 10 + (rng() * 8 | 0);
    planksBreak(ctx, x, 8, w, h, rng);
  }
  // دیوار غربی
  planksBreak(ctx, 6, 8, 8, 46, rng);
  // تیرهای سوخته
  ctx.strokeStyle = '#2e2418';
  ctx.lineWidth = 2;
  for (const [x1, y1, x2, y2] of [[20, 20, 44, 44], [60, 16, 40, 40], [80, 24, 66, 52]]) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  ctx.fillStyle = '#1e1810';
  ctx.fillRect(30, 26, 3, 3);
  ctx.fillRect(52, 20, 3, 3);
  return cv;
}

function planksBreak(ctx, x, y, w, h, rng) {
  ctx.fillStyle = '#7a6848';
  ctx.fillRect(x, y, w, h);
  for (let py = y; py < y + h; py += 3) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x, py + 2, w, 1);
  }
  // لبهٔ فرسودهٔ بالای دیوار
  ctx.fillStyle = '#5e5038';
  ctx.fillRect(x, y, w, 2);
  for (let i = 0; i < w / 3; i++) {
    const px = x + rng() * w | 0;
    ctx.fillStyle = '#5e5038';
    ctx.fillRect(px, y, 2, 2 + rng() * 3 | 0);
    ctx.fillStyle = '#3a3020';
    if (rng() < 0.3) ctx.fillRect(px, y + 2, 1, 3);
  }
}

/* ---------- رجیستری ---------- */

/** ساخت همهٔ اسپرایت اشیاء. type → {frames:[cv], ax, ay, flip?} */
export function buildPropSprites() {
  const R = (frames, w, h) => ({ frames, ax: w / 2, ay: h });
  const m = new Map();
  m.set('tree_pine', R([treePine(11), treePine(12)], 22, 32));
  m.set('tree_oak', R([treeOak(21), treeOak(22), treeOak(23)], 28, 28));
  m.set('tree_small', R([treeSmall()], 14, 17));
  m.set('tree_dead', R([treeDead(31), treeDead(32)], 18, 28));
  m.set('stump', R([stump()], 11, 8));
  m.set('bush_sage', R([bushSage(41), bushSage(42)], 13, 10));
  m.set('bush_dry', R([bushDry(51), bushDry(52)], 13, 9));
  m.set('bush_flower', R([bushFlower(61), bushFlower(62)], 13, 10));
  m.set('cactus_saguaro', R([cactusSaguaro(71), cactusSaguaro(72)], 15, 26));
  m.set('cactus_pear', R([cactusPear(81), cactusPear(82)], 13, 15));
  m.set('cactus_agave', R([cactusAgave(91), cactusAgave(92)], 15, 13));
  m.set('rock_small', R([rockSmall(101), rockSmall(102)], 12, 9));
  m.set('rock_big', R([rockBig(111), rockBig(112)], 18, 14));
  m.set('barrel', R([barrel()], 11, 13));
  m.set('crate', R([crate()], 13, 11));
  m.set('crateStack', R([crateStack()], 15, 17));
  m.set('sack', R([sack(121), sack(122)], 11, 10));
  m.set('hitch', R([hitch()], 18, 11));
  m.set('bench', R([bench()], 19, 11));
  m.set('lamppost', R([lamppost(false), lamppost(true)], 9, 27)); // فریم ۱ = روشن
  m.set('well', R([well()], 30, 30));
  m.set('trough_water', R([trough(true)], 30, 13));
  m.set('trough_dry', R([trough(false)], 30, 13));
  m.set('haypile', R([haypile(131), haypile(132)], 15, 11));
  m.set('wagon', R([wagon(141)], 32, 20));
  m.set('wagon2', R([wagon2(151)], 32, 18));
  m.set('campfire', R([campfire(0), campfire(1), campfire(2)], 15, 14));
  m.set('log', R([log()], 17, 8));
  m.set('logseat', R([logseat()], 15, 9));
  m.set('minecart', R([minecart()], 19, 15));
  m.set('mineDoor', R([mineDoor()], 34, 26));
  m.set('ribs', R([ribs()], 15, 10));
  m.set('skull', R([skull()], 9, 7));
  m.set('boots', R([boots()], 10, 8));
  m.set('plow', R([plow(161)], 17, 12));
  m.set('windmill', R([windmill(0), windmill(1), windmill(2), windmill(3)], 26, 46));
  m.set('sheep', R([sheep(0), sheep(1)], 14, 11));
  m.set('horse', R([horse(0), horse(1)], 26, 20));
  m.set('reed', R([reed(0), reed(1)], 11, 15));
  m.set('ruin', R([ruin()], 96, 80));
  // تابلوها با متن — کلید یکتا
  m.set('sign_COPPERGATE', R([sign('COPPERGATE')], 34, 24));
  m.set('sign_← بی‌ماه', R([sign('← بی‌ماه')], 34, 24));
  m.set('sign_← معدن', R([sign('← معدن')], 34, 24));
  m.set('sign_راست‌واتر →', R([sign('راست‌واتر →')], 34, 24));
  return m;
}
