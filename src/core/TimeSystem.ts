/**
 * TimeSystem.ts — authoritative world clock (pure, no Phaser).
 *
 * Design rule (master directive §56): day/night, NPC schedules and lighting
 * must all follow THIS one clock. Rendering derives visuals from it; it never
 * derives time from rendering.
 *
 * Speed: `minutesPerRealSecond` world-minutes per real second.
 * Default 2 => a full 24h day lasts 12 real minutes.
 *
 * Phase 2 contract (hardened):
 * - Constructor validation: a non-finite or non-positive speed and a
 *   non-finite start are programmer errors and throw TypeError immediately
 *   (a silently frozen or NaN clock is worse than a loud failure).
 * - startMinutes is wrapped into [0, 1440) — a negative or >24h start is
 *   interpreted modulo a full day instead of creating an invalid state.
 * - advance() rejects non-finite and negative deltas (NaN used to slip
 *   through the `< 0` check and poison the clock).
 * - Day wrap is O(1): huge deltas (a save-loading fast-forward, a sleeping
 *   tab with a giant delta) jump directly instead of looping 1440s thousands
 *   of times; the wrapped result is identical to the old loop's.
 */
import { toFa } from './format';

export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

export interface PhaseVisual {
  /** Overlay tint color applied above the world. */
  tint: number;
  /** Overlay alpha (0 = no overlay). */
  alpha: number;
  /** Persian label shown in the HUD. */
  label: string;
}

export const PHASE_VISUALS: Record<DayPhase, PhaseVisual> = {
  dawn: { tint: 0xffb870, alpha: 0.16, label: 'سپیده‌دم' },
  day: { tint: 0x000000, alpha: 0.0, label: 'روز' },
  dusk: { tint: 0xff8040, alpha: 0.24, label: 'غروب' },
  night: { tint: 0x14264f, alpha: 0.45, label: 'شب' },
};

const MINUTES_PER_DAY = 1440;

export class TimeSystem {
  /** Minutes since midnight, [0, 1440). */
  minutes: number;
  /** Current day, starting at 1. */
  day = 1;

  constructor(
    public minutesPerRealSecond = 2,
    startMinutes = 7 * 60 + 30,
  ) {
    if (!Number.isFinite(minutesPerRealSecond) || minutesPerRealSecond <= 0) {
      throw new TypeError(
        `TimeSystem: minutesPerRealSecond must be a finite number > 0 (got ${minutesPerRealSecond})`,
      );
    }
    if (!Number.isFinite(startMinutes)) {
      throw new TypeError(`TimeSystem: startMinutes must be finite (got ${startMinutes})`);
    }
    this.minutes = ((startMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  }

  /**
   * Advance the clock by real seconds. Delta-time clamping is the caller's
   * responsibility; this method accepts any finite non-negative value and
   * wraps correctly (directive §16: large delta times must be handled).
   * Non-finite and negative values leave the clock untouched.
   */
  advance(realSeconds: number): void {
    if (!Number.isFinite(realSeconds) || realSeconds < 0) return;
    const total = this.minutes + realSeconds * this.minutesPerRealSecond;
    const days = Math.floor(total / MINUTES_PER_DAY);
    this.minutes = total - days * MINUTES_PER_DAY;
    this.day += days;
  }

  static phaseOf(minutes: number): DayPhase {
    if (minutes >= 300 && minutes < 420) return 'dawn';     // 05:00-07:00
    if (minutes >= 420 && minutes < 1020) return 'day';     // 07:00-17:00
    if (minutes >= 1020 && minutes < 1140) return 'dusk';   // 17:00-19:00
    return 'night';                                          // 19:00-05:00
  }

  get phase(): DayPhase {
    return TimeSystem.phaseOf(this.minutes);
  }

  /** "07:30" with Persian digits. */
  get clockLabel(): string {
    const h = Math.floor(this.minutes / 60);
    const m = Math.floor(this.minutes % 60);
    const mm = m < 10 ? '0' + m : String(m);
    return `${toFa(h)}:${toFa(mm)}`;
  }
}
