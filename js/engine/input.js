/**
 * input.js — ورودی کیبورد: حالت کلید + لبهٔ فشردن.
 * منطق ساده و بدون قفل: هیچ کلیدی هرگز «بلعیده» نمی‌شود؛
 * هر کلید هم برای حرکت و هم برای تعامل همیشه خوانده می‌شود.
 */

const PREVENT = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  ' ', 'Space', 'Enter', 'Tab',
]);

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();   // لبهٔ فشردن — در پایان فریم پاک می‌شود
    this._capture = false;      // وقتی گفتگو باز است حرکت غیرفعال ولی ESC/E زنده

    window.addEventListener('keydown', (e) => {
      const k = this._norm(e);
      if (PREVENT.has(e.key) || PREVENT.has(k)) e.preventDefault();
      if (!this.down.has(k)) this.pressed.add(k);
      this.down.add(k);
    });
    window.addEventListener('keyup', (e) => {
      this.down.delete(this._norm(e));
    });
    window.addEventListener('blur', () => { this.down.clear(); });
  }

  _norm(e) {
    if (e.code === 'Space') return 'Space';
    return e.key.length === 1 ? e.key.toLowerCase() : e.key;
  }

  isDown(...keys) { return keys.some((k) => this.down.has(k)); }
  wasPressed(...keys) { return keys.some((k) => this.pressed.has(k)); }

  /** پایان فریم — لبه‌ها پاک می‌شوند. */
  endFrame() { this.pressed.clear(); }

  /** حرکت چهارجهت نرمال‌شده [dx, dy] وقتی ورودی حرکت آزاد است. */
  moveVector() {
    if (this._capture) return [0, 0];
    let dx = 0, dy = 0;
    if (this.isDown('ArrowLeft', 'a')) dx -= 1;
    if (this.isDown('ArrowRight', 'd')) dx += 1;
    if (this.isDown('ArrowUp', 'w')) dy -= 1;
    if (this.isDown('ArrowDown', 's')) dy += 1;
    if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
    return [dx, dy];
  }

  setCapture(on) { this._capture = on; }
}
