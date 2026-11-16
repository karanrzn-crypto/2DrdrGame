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
