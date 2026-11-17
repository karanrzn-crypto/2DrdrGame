/**
 * time.js — ساعت مرجع دنیا (§ سابقهٔ TimeSystem): شبانه‌روز، NPC و نورپردازی
 * همه از این یک ساعت پیروی می‌کنند. ۲ دقیقهٔ بازی در هر ثانیهٔ واقعی
 * → شبانه‌روز کامل = ۱۲ دقیقهٔ واقعی.
 */
import { toFa } from '../util.js';

export const PHASES = {
  dawn: { label: 'سپیده‌دم' },
  day: { label: 'روز' },
  dusk: { label: 'غروب' },
  night: { label: 'شب' },
};

export class TimeSystem {
  constructor(minutesPerRealSecond = 2, startMinutes = 7 * 60 + 30) {
    this.mps = minutesPerRealSecond;
    this.minutes = startMinutes;
    this.day = 1;
  }

  advance(realSeconds) {
    if (realSeconds < 0) return;
    this.minutes += realSeconds * this.mps;
    while (this.minutes >= 1440) { this.minutes -= 1440; this.day += 1; }
  }

  static phaseOf(minutes) {
    if (minutes >= 300 && minutes < 420) return 'dawn';
    if (minutes >= 420 && minutes < 1020) return 'day';
    if (minutes >= 1020 && minutes < 1140) return 'dusk';
    return 'night';
  }

  get phase() { return TimeSystem.phaseOf(this.minutes); }

  get clockLabel() {
    const h = Math.floor(this.minutes / 60);
    const m = Math.floor(this.minutes % 60);
    const mm = m < 10 ? '0' + m : String(m);
    return `${toFa(h)}:${toFa(mm)}`;
  }
}
