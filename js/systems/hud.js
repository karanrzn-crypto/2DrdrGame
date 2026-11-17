/**
 * hud.js — رابط کاربری وسترن (§8): نوار سلامت چرمی، سکه، ساعت، راهنمای تعامل.
 * همه روی بوم پیکسلی رسم می‌شود — هیچ عنصر DOM/استایل مرورگر نیست.
 */
import { PAL, faText } from '../art/palette.js';
import { toFa, faMoney } from '../util.js';

function chip(ctx, x, y, w, h, opts = {}) {
  // پنل کاغذی با قاب چرم — همان زبان بصری جعبهٔ گفتگو
  ctx.fillStyle = PAL.uiStrapDark;
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = PAL.uiStrap;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = opts.bg || PAL.uiPaper;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PAL.uiPaperDark;
  ctx.fillRect(x, y + h - 2, w, 2);
}

function coinIcon(ctx, x, y) {
  ctx.fillStyle = '#8a6a20';
  ctx.beginPath(); ctx.arc(x + 4, y + 4, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PAL.uiGold;
  ctx.beginPath(); ctx.arc(x + 4, y + 4, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f0d080';
  ctx.fillRect(x + 2, y + 2, 2, 1);
  ctx.fillStyle = '#8a6a20';
  ctx.fillRect(x + 3, y + 3, 2, 3);
}

function heartIcon(ctx, x, y, filled) {
  const c = filled ? '#b03a2a' : '#6e5a48';
  ctx.fillStyle = c;
  ctx.fillRect(x, y, 3, 2);
  ctx.fillRect(x + 4, y, 3, 2);
  ctx.fillRect(x - 1, y + 1, 9, 3);
  ctx.fillRect(x, y + 4, 7, 1);
  ctx.fillRect(x + 1, y + 5, 5, 1);
  ctx.fillRect(x + 2, y + 6, 3, 1);
  ctx.fillRect(x + 3, y + 7, 1, 1);
  if (filled) {
    ctx.fillStyle = '#d86048';
    ctx.fillRect(x + 1, y + 1, 2, 1);
    ctx.fillRect(x + 5, y + 1, 1, 1);
  }
}

export class HUD {
  constructor(viewW, viewH) {
    this.viewW = viewW; this.viewH = viewH;
    this.hint = null;          // متن راهنمای تعامل جاری
    this.toast = null;         // پیام لحظه‌ای
    this.toastT = 0;
    this.ctrlT = 12;           // زمان نمایش راهنمای کنترل‌ها
  }

  resize(w, h) { this.viewW = w; this.viewH = h; }

  showToast(text, sec = 2.5) {
    this.toast = text;
    this.toastT = sec;
  }

  update(dt) {
    if (this.toastT > 0) this.toastT -= dt;
    if (this.ctrlT > 0) this.ctrlT -= dt;
  }

  /** state: {health, maxHealth, money, time} */
  render(ctx, state, time) {
    /* ---- سلامت: نوار چرمی ---- */
    chip(ctx, 12, 12, 130, 16);
    heartIcon(ctx, 20, 16, true);
    const hpW = 100;
    const hp = Math.max(0, Math.min(1, state.health / state.maxHealth));
    ctx.fillStyle = '#c9b183';
    ctx.fillRect(36, 19, hpW, 6);
    ctx.fillStyle = hp > 0.35 ? PAL.uiHealth : '#7d2a20';
    ctx.fillRect(36, 19, Math.max(2, hpW * hp) | 0, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(36, 19, Math.max(2, hpW * hp) | 0, 1);

    /* ---- پول ---- */
    chip(ctx, 12, 34, 84, 16);
    coinIcon(ctx, 17, 38);
    faText(ctx, faMoney(state.money), 92, 43, 12, PAL.uiInk, 'right');

    /* ---- ساعت (بالا-راست) ---- */
    const phase = time.phase;
    const label = { dawn: 'سپیده‌دم', day: 'روز', dusk: 'غروب', night: 'شب' }[phase];
    const txt = `روز ${toFa(time.day)} — ${time.clockLabel} · ${label}`;
    const cw = 34 + txt.length * 7.2;
    const chipX = this.viewW - 12 - cw;
    chip(ctx, chipX, 12, cw, 16);
    faText(ctx, txt, chipX + cw - 10, 21, 12, PAL.uiInk, 'right');
    // نماد خورشید/ماه در سمت چپ چیپ (پایان جریان RTL)
    const sx = chipX + 13;
    if (phase === 'night') {
      ctx.fillStyle = '#d8d8e8';
      ctx.beginPath(); ctx.arc(sx, 20, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PAL.uiPaper;
      ctx.beginPath(); ctx.arc(sx + 2, 19, 3, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = PAL.uiGold;
      ctx.beginPath(); ctx.arc(sx, 20, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f0d080';
      ctx.fillRect(sx - 1, 18, 2, 2);
    }

    /* ---- راهنمای تعامل (پایین-وسط) ---- */
    if (this.hint && !state.dialogOpen) {
      const hw = 34 + this.hint.length * 8.6;
      const hx = (this.viewW - hw) / 2;
      const hy = this.viewH - 34;
      chip(ctx, hx, hy, hw, 16, { bg: '#efe3c2' });
      // کلاویز E
      ctx.fillStyle = '#6e5a38';
      ctx.fillRect(hx + hw - 24, hy + 3, 13, 11);
      ctx.fillStyle = '#e8d8b0';
      ctx.fillRect(hx + hw - 23, hy + 4, 11, 9);
      faText(ctx, 'E', hx + hw - 17.5, hy + 9, 10, '#3e2818');
      faText(ctx, this.hint, hx + hw - 28, hy + 9, 11, PAL.uiInk, 'right');
    }

    /* ---- توست پیام ---- */
    if (this.toast && this.toastT > 0) {
      const a = Math.min(1, this.toastT / 0.5);
      ctx.globalAlpha = a;
      const tw = 30 + this.toast.length * 8.4;
      const tx = (this.viewW - tw) / 2;
      chip(ctx, tx, 36, tw, 16, { bg: '#efe3c2' });
      faText(ctx, this.toast, this.viewW / 2, 45, 11, PAL.uiInk);
      ctx.globalAlpha = 1;
    }

    /* ---- راهنمای کنترل‌ها (اول بازی) ---- */
    if (this.ctrlT > 0 && !state.dialogOpen) {
      const a = Math.min(1, this.ctrlT / 1.5);
      ctx.globalAlpha = a;
      faText(ctx, 'حرکت: WASD یا جهت‌نما · دویدن: Shift · تعامل: E · رد گفتگو: ESC',
        this.viewW / 2, this.viewH - 10, 10, 'rgba(232,216,176,0.75)');
      ctx.globalAlpha = 1;
    }
  }
}
