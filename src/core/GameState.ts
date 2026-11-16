/**
 * GameState.ts — single source of truth for player-critical numbers
 * (master directive §15). Pure class, no Phaser, unit-testable.
 *
 * Ownership:
 *   - health / maxHealth / money: ONLY here. UI reads, systems mutate via
 *     the guarded methods below. Rendering never owns gameplay state.
 */
export class GameState {
  health = 100;
  maxHealth = 100;
  money = 25;

  /** Add money; rejects invalid amounts. Returns success. */
  addMoney(amount: number): boolean {
    if (amount <= 0) return false;
    this.money += amount;
    return true;
  }

  /** Spend money; rejects negative amounts and insufficient funds. */
  spendMoney(amount: number): boolean {
    if (amount <= 0) return false;
    if (amount > this.money) return false;
    this.money -= amount;
    return true;
  }

  /** Apply damage, clamped at 0. */
  damage(amount: number): void {
    if (amount <= 0) return;
    this.health = Math.max(0, this.health - amount);
  }

  /** Heal, clamped at maxHealth. */
  heal(amount: number): void {
    if (amount <= 0) return;
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  get isDead(): boolean {
    return this.health <= 0;
  }
}

/** The authoritative game-state instance for this session (Phase 1: in-memory). */
export const game = new GameState();
