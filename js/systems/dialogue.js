/**
 * dialogue.js — جعبهٔ گفتگو با ماشین‌حالت ضدگیرکردن (خواستهٔ اصلی کاربر).
 * قواعد اطمینان:
 *  - هر گفتگو خط پایانی دارد؛ هیچ حالتی بی‌خروجی نیست.
 *  - E/Space/Enter/کلیک: حین تایپ → کل خط فوراً؛ بعد → خط بعد؛ آخر → بستن.
 *  - ESC هر لحظه بلافاصله می‌بندد.
 *  - بعد از بستن، ۳۰۰ms خنکی: تعامل فوری دوباره باز نمی‌شود.
 *  - هیچ ورودی دیگری قفل نمی‌شود؛ فقط حرکت حین باز بودن خاموش است.
 */
import { PAL, faText, FONT } from '../art/palette.js';
import { DIALOGUES } from '../data/dialogues.js';

const CHAR_PER_SEC = 34;

export class DialogueSystem {
  constructor(viewW, viewH) {
    this.viewW = viewW; this.viewH = viewH;
    this.open = false;
    this.key = null;
    this.data = null;
    this.line = 0;
    this.shown = 0;
    this.timer = 0;
    this.cooldown = 0;
    this.onChange = null; // برای قفل حرکت
  }

  resize(w, h) { this.viewW = w; this.viewH = h; }

  /** باز کردن با کلید دیکشنری؛ اگر باز باشد، جایگزین می‌شود (بدون صف). */
  start(key) {
    const d = DIALOGUES[key];
    if (!d || !d.lines || !d.lines.length) return false;
    this.key = key;
    this.data = d;
    this.line = 0;
    this.shown = 0;
    this.timer = 0;
    this.open = true;
    if (this.onChange) this.onChange(true);
    return true;
  }

  close() {
    this.open = false;
    this.key = null;
    this.data = null;
    this.cooldown = 0.3;
    if (this.onChange) this.onChange(false);
  }

  /** true وقتی تعامل مجاز است (خنکی تمام شده). */
  get canInteract() { return !this.open && this.cooldown <= 0; }

  update(dt) {
    if (this.cooldown > 0) this.cooldown -= dt;
    if (!this.open) return;
    const target = this.data.lines[this.line];
    if (this.shown < target.length) {
      this.timer += dt * CHAR_PER_SEC;
      while (this.timer >= 1 && this.shown < target.length) {
        this.timer -= 1;
        this.shown++;
      }
    }
  }

  /** پیشروی با کلید تعامل. true = مصرف شد. */
  advance() {
    if (!this.open) return false;
    const target = this.data.lines[this.line];
    if (this.shown < target.length) {
      this.shown = target.length; // اول: تایپ کامل
      return true;
    }
    if (this.line < this.data.lines.length - 1) {
      this.line++;
      this.shown = 0;
      this.timer = 0;
      return true;
    }
    this.close(); // خط آخر → بستن
    return true;
  }

  cancel() {
    if (!this.open) return false;
    this.close();
    return true;
  }

  /* ---------- رندر ---------- */
  render(ctx) {
    if (!this.open) return;
    const w = Math.min(440, this.viewW - 24);
    const h = 74;
    const x = (this.viewW - w) / 2;
    const y = this.viewH - h - 16;

    // پنل کاغذی با قاب چرمی
    ctx.fillStyle = PAL.uiStrapDark;
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = PAL.uiStrap;
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = PAL.uiPaper;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = PAL.uiPaperDark;
    ctx.fillRect(x, y + h - 3, w, 3);
    // میخ‌های چهارگوشه
    ctx.fillStyle = '#6e5a38';
    for (const [nx, ny] of [[x + 4, y + 4], [x + w - 6, y + 4], [x + 4, y + h - 6], [x + w - 6, y + h - 6]]) {
      ctx.fillRect(nx, ny, 2, 2);
    }

    // پلاک نام (بالا-راست، RTL)
    const name = this.data.name || '';
    const nw = Math.max(52, 18 + name.length * 9);
    ctx.fillStyle = PAL.uiStrap;
    ctx.fillRect(x + w - nw - 8, y - 9, nw, 18);
    ctx.fillStyle = PAL.uiStrapDark;
    ctx.fillRect(x + w - nw - 8, y - 9, nw, 1);
    ctx.fillRect(x + w - nw - 8, y + 7, nw, 2);
    faText(ctx, name, x + w - nw / 2 - 8, y, 11, PAL.uiPaper);

    // متن با تایپ‌رایتر (RTL) — wrap واقعی با measureText
    const target = this.data.lines[this.line];
    const shownText = target.slice(0, this.shown);
    ctx.save();
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = `12px ${FONT}`;
    const lines = [];
    let cur = '';
    for (const word of shownText.split(' ')) {
      const test = cur ? cur + ' ' + word : word;
      if (ctx.measureText(test).width > w - 56 && cur) {
        lines.push(cur);
        cur = word;
      } else cur = test;
    }
    if (cur) lines.push(cur);
    const maxLines = 2;
    const vis = lines.slice(0, maxLines);
    vis.forEach((ln, i) => {
      faText(ctx, ln, x + w - 16, y + 24 + i * 18, 12, PAL.uiInk, 'right');
    });
    ctx.restore();

    // نشانگر ادامه ▼ (چپ-پایین، پالس)
    if (this.shown >= target.length) {
      const blink = Math.sin(performance.now() * 0.006) > 0;
      ctx.fillStyle = blink ? PAL.uiStrap : PAL.uiStrapDark;
      ctx.beginPath();
      const ax = x + 14, ay = y + h - 12;
      ctx.moveTo(ax - 4, ay - 3);
      ctx.lineTo(ax + 4, ay - 3);
      ctx.lineTo(ax, ay + 3);
      ctx.closePath();
      ctx.fill();
    }

    // راهنمای کلیدها (بیرون پنل، پایین-چپ)
    faText(ctx, 'E ادامه · ESC بستن', x + 8, y + h + 7, 9, 'rgba(232,216,176,0.55)', 'left');
  }
}
