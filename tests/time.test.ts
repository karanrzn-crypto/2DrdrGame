import { describe, it, expect } from 'vitest';
import { TimeSystem, PHASE_VISUALS, DayPhase } from '../src/core/TimeSystem';

describe('TimeSystem', () => {
  it('starts at 07:30 on day 1 by default', () => {
    const t = new TimeSystem();
    expect(t.minutes).toBe(450);
    expect(t.day).toBe(1);
    expect(t.clockLabel).toBe('۷:۳۰');
  });

  it('advances at the configured world-minutes per real second', () => {
    const t = new TimeSystem(2, 0);
    t.advance(10); // 10 real seconds => 20 world minutes
    expect(t.minutes).toBe(20);
    t.advance(0.5);
    expect(t.minutes).toBe(21);
  });

  it('ignores negative deltas', () => {
    const t = new TimeSystem(2, 100);
    t.advance(-5);
    expect(t.minutes).toBe(100);
  });

  it('wraps the day and increments the day counter', () => {
    const t = new TimeSystem(2, 23 * 60 + 59);
    t.advance(1); // +2 minutes => 24:01 -> 00:01 next day
    expect(t.minutes).toBe(1);
    expect(t.day).toBe(2);
  });

  it('classifies day phases correctly at the boundaries', () => {
    const cases: Array<[number, DayPhase]> = [
      [299, 'night'], [300, 'dawn'], [419, 'dawn'], [420, 'day'],
      [1019, 'day'], [1020, 'dusk'], [1139, 'dusk'], [1140, 'night'],
    ];
    for (const [m, phase] of cases) {
      expect(TimeSystem.phaseOf(m)).toBe(phase);
    }
  });

  it('formats the clock with Persian digits', () => {
    const t = new TimeSystem(2, 9 * 60 + 5);
    expect(t.clockLabel).toBe('۹:۰۵');
  });

  it('has a visual config for every phase', () => {
    for (const p of ['dawn', 'day', 'dusk', 'night'] as DayPhase[]) {
      expect(PHASE_VISUALS[p]).toBeTruthy();
      expect(typeof PHASE_VISUALS[p].alpha).toBe('number');
    }
    expect(PHASE_VISUALS.day.alpha).toBe(0);
  });
});

describe('TimeSystem — Phase 2 hardening', () => {
  describe('constructor validation (a broken clock must fail loudly, not silently)', () => {
    it('throws TypeError on non-positive or non-finite speed', () => {
      expect(() => new TimeSystem(0)).toThrow(TypeError);
      expect(() => new TimeSystem(-1)).toThrow(TypeError);
      expect(() => new TimeSystem(NaN)).toThrow(TypeError);
      expect(() => new TimeSystem(Infinity)).toThrow(TypeError);
    });

    it('throws TypeError on a non-finite start time', () => {
      expect(() => new TimeSystem(2, NaN)).toThrow(TypeError);
      expect(() => new TimeSystem(2, Infinity)).toThrow(TypeError);
    });
  });

  it('wraps startMinutes into [0, 1440) instead of allowing an invalid state', () => {
    expect(new TimeSystem(2, -60).minutes).toBe(1380);
    expect(new TimeSystem(2, 1500).minutes).toBe(60);
    expect(new TimeSystem(2, 1440 * 3).minutes).toBe(0);
  });

  it('ignores non-finite deltas (NaN used to slip past the < 0 check)', () => {
    const t = new TimeSystem(2, 450);
    t.advance(NaN);
    t.advance(Infinity);
    t.advance(-Infinity);
    expect(t.minutes).toBe(450);
    expect(t.day).toBe(1);
  });

  it('advances huge deltas in O(1) with the exact result (no while-loop wrap)', () => {
    const t = new TimeSystem(2, 450);
    t.advance(1e9); // ~31.7 years of real time — must return, not spin
    const total = 450 + 1e9 * 2;
    expect(t.day).toBe(1 + Math.floor(total / 1440));
    expect(t.minutes).toBeCloseTo(total % 1440, 6);
  });

  it('wraps several full days in one advance call', () => {
    const t = new TimeSystem(2, 0);
    t.advance(720 * 3); // 2160 real s × 2 = 4320 world min = exactly 3 full days
    expect(t.day).toBe(4);
    expect(t.minutes).toBe(0);
  });

  it('day-boundary advance is exact across two consecutive steps', () => {
    const t = new TimeSystem(2, 0);
    t.advance(719.5); // 1439 world minutes
    expect(t.minutes).toBe(1439);
    expect(t.day).toBe(1);
    t.advance(0.5);   // 1440 -> wrap
    expect(t.minutes).toBe(0);
    expect(t.day).toBe(2);
  });

  it('phase boundaries after wrapping are unchanged (23:00 -> 00:00 -> 05:00)', () => {
    const t = new TimeSystem(2, 23 * 60);
    t.advance(30); // 23:00 + 60 world min => 00:00 day 2
    expect(t.day).toBe(2);
    expect(t.phase).toBe('night');
    t.advance(150); // +300 world min => 05:00 day 2
    expect(t.phase).toBe('dawn');
  });
});
