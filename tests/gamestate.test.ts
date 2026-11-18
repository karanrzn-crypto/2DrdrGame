import { describe, it, expect } from 'vitest';
import { GameState } from '../src/core/GameState';

describe('GameState (authoritative player state)', () => {
  it('adds money only with positive amounts', () => {
    const s = new GameState();
    expect(s.addMoney(10)).toBe(true);
    expect(s.money).toBe(35); // default 25 + 10
    expect(s.addMoney(0)).toBe(false);
    expect(s.addMoney(-5)).toBe(false);
    expect(s.money).toBe(35);
  });

  it('rejects spending more than owned', () => {
    const s = new GameState();
    expect(s.spendMoney(100)).toBe(false);
    expect(s.money).toBe(25);
    expect(s.spendMoney(10)).toBe(true);
    expect(s.money).toBe(15);
    expect(s.spendMoney(-1)).toBe(false);
    expect(s.money).toBe(15);
  });

  it('spending exactly the owned amount is allowed (boundary)', () => {
    const s = new GameState();
    expect(s.spendMoney(25)).toBe(true);
    expect(s.money).toBe(0);
    expect(s.spendMoney(1)).toBe(false); // now unaffordable
  });

  it('clamps damage at zero and heals up to max', () => {
    const s = new GameState();
    s.damage(150);
    expect(s.health).toBe(0);
    expect(s.isDead).toBe(true);
    s.heal(40);
    expect(s.health).toBe(40);
    expect(s.isDead).toBe(false);
    s.heal(999);
    expect(s.health).toBe(s.maxHealth);
  });

  it('ignores negative damage/heal values', () => {
    const s = new GameState();
    s.damage(-10);
    expect(s.health).toBe(100);
    s.heal(-10);
    expect(s.health).toBe(100);
  });
});

describe('GameState — Phase 2 input validation (invalid inputs rejected)', () => {
  it('rejects non-finite money amounts on add (NaN used to poison the state)', () => {
    const s = new GameState();
    expect(s.addMoney(NaN)).toBe(false);
    expect(s.addMoney(Infinity)).toBe(false);
    expect(s.addMoney(-Infinity)).toBe(false);
    expect(s.money).toBe(25);
    expect(Number.isInteger(s.money)).toBe(true);
  });

  it('rejects non-finite money amounts on spend', () => {
    const s = new GameState();
    expect(s.spendMoney(NaN)).toBe(false);
    expect(s.spendMoney(Infinity)).toBe(false);
    expect(s.money).toBe(25);
  });

  it('rejects fractional money (the currency is integer dollars)', () => {
    const s = new GameState();
    expect(s.addMoney(0.5)).toBe(false);
    expect(s.spendMoney(0.25)).toBe(false);
    expect(s.money).toBe(25);
  });

  it('rejects ALL non-finite damage/heal (NaN and ±Infinity never touch the state)', () => {
    const s = new GameState();
    s.damage(NaN);
    s.damage(Infinity);
    s.damage(-Infinity);
    expect(s.health).toBe(100);
    expect(s.isDead).toBe(false);
    s.heal(NaN);
    s.heal(Infinity);
    expect(s.health).toBe(100);
    expect(s.health).toBeLessThanOrEqual(s.maxHealth);
  });

  it('setMaxHealth clamps existing health down and ignores invalid values', () => {
    const s = new GameState();
    s.setMaxHealth(50);
    expect(s.maxHealth).toBe(50);
    expect(s.health).toBe(50); // clamped down from 100 immediately
    s.heal(999);
    expect(s.health).toBe(50); // heal can never exceed the ceiling
    s.setMaxHealth(0);
    s.setMaxHealth(-5);
    s.setMaxHealth(NaN);
    s.setMaxHealth(Infinity);
    expect(s.maxHealth).toBe(50); // unchanged by invalid values
  });
});

describe('GameState — Phase 2 ownership & reset', () => {
  it('enforces the owner rule at runtime: direct writes throw (getter without setter)', () => {
    const s = new GameState();
    expect(() => {
      (s as unknown as { health: number }).health = 999;
    }).toThrow(TypeError);
    expect(() => {
      (s as unknown as { money: number }).money = 999999;
    }).toThrow(TypeError);
    expect(s.health).toBe(100);
    expect(s.money).toBe(25);
  });

  it('reset() restores the phase defaults after any mutations', () => {
    const s = new GameState();
    s.damage(80);
    s.addMoney(75);
    s.setMaxHealth(60);
    s.reset();
    expect(s.health).toBe(100);
    expect(s.maxHealth).toBe(100);
    expect(s.money).toBe(25);
    expect(s.isDead).toBe(false);
  });

  it('many guarded mutations keep every invariant intact (boundary stress)', () => {
    const s = new GameState();
    for (let i = 0; i < 1000; i++) {
      s.addMoney(1);
      s.spendMoney(1);
      s.damage(0.5);
      s.heal(0.25);
      s.damage(NaN);
      s.addMoney(-3);
    }
    expect(Number.isFinite(s.money)).toBe(true);
    expect(Number.isFinite(s.health)).toBe(true);
    expect(s.health).toBeGreaterThanOrEqual(0);
    expect(s.health).toBeLessThanOrEqual(s.maxHealth);
    expect(Number.isInteger(s.money)).toBe(true);
  });
});
