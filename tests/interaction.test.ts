import { describe, it, expect } from 'vitest';
import { selectInteractable, Interactable } from '../src/systems/InteractionSystem';

function mk(id: string, x: number, y: number, range = 30): Interactable {
  return { id, x, y, range, prompt: id, dialogue: id };
}

describe('selectInteractable', () => {
  it('returns null when nothing is in range', () => {
    const list = [mk('a', 100, 100, 30)];
    expect(selectInteractable(list, 0, 0)).toBeNull();
  });

  it('picks the only target in range', () => {
    const list = [mk('far', 100, 100, 30), mk('near', 10, 0, 30)];
    expect(selectInteractable(list, 0, 0)?.id).toBe('near');
  });

  it('picks the nearest among several in range', () => {
    const list = [mk('a', 20, 0, 40), mk('b', 8, 0, 40), mk('c', 15, 0, 40)];
    expect(selectInteractable(list, 0, 0)?.id).toBe('b');
  });

  it('respects per-target range, not a global one', () => {
    const list = [mk('short', 25, 0, 20), mk('long', 40, 0, 50)];
    // 'short' is nearer but out of its own range -> 'long' wins
    expect(selectInteractable(list, 0, 0)?.id).toBe('long');
  });

  it('handles diagonal distances', () => {
    const list = [mk('diag', 3, 4, 10)]; // distance 5
    expect(selectInteractable(list, 0, 0)?.id).toBe('diag');
    const tight = [mk('diag', 3, 4, 4)]; // distance 5 > 4
    expect(selectInteractable(tight, 0, 0)).toBeNull();
  });

  it('returns null for an empty list', () => {
    expect(selectInteractable([], 0, 0)).toBeNull();
  });
});
