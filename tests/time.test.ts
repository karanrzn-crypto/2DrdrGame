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
