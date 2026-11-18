/**
 * GameState.ts — single source of truth for player-critical numbers
 * (master directive §15). Pure class, no Phaser, unit-testable.
 *
 * Ownership:
 *   - health / maxHealth / money: ONLY here. UI reads via getters; systems
 *     mutate exclusively through the guarded methods below. Rendering never
 *     owns gameplay state.
 *
 * Phase 2 contract (hardened):
 * - Fields are private; the only mutation paths are the guarded methods.
 *   No module can write `game.health = 999` anymore — the owner rule is
 *   enforced by the type system, not by convention.
 * - Input validation at every mutation: non-finite amounts (NaN/±Infinity)
 *   are rejected. NaN used to slip through `amount <= 0` (false for NaN)
 *   and permanently corrupt health/money with NaN.
 * - Money is an integer currency: fractional or non-finite amounts are
 *   rejected, preserving the invariant Number.isInteger(money).
 * - Health is a finite number clamped to [0, maxHealth].
 * - reset() restores the phase defaults (used by tests and, later, by the
 *   Phase-8 save/load flow — still in-memory only per AGENTS.md).
 */

const DEFAULTS = { health: 100, maxHealth: 100, money: 25 } as const;

export class GameState {
  private _health: number = DEFAULTS.health;
  private _maxHealth: number = DEFAULTS.maxHealth;
  private _money: number = DEFAULTS.money;

  /** Current health, always in [0, maxHealth]. */
  get health(): number {
    return this._health;
  }

  /** Upper bound for health (always a finite number > 0). */
  get maxHealth(): number {
    return this._maxHealth;
  }

  /** Integer money amount (never NaN, never fractional). */
  get money(): number {
    return this._money;
  }

  /**
   * Add money. Accepts only positive finite integers (the currency is
   * integer dollars); anything else is rejected with false.
   */
  addMoney(amount: number): boolean {
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
      return false;
    }
    this._money += amount;
    return true;
  }

  /**
   * Spend money. Accepts only positive finite integers the player can
   * actually afford; anything else (including unaffordable amounts) is
   * rejected with false and leaves the state untouched.
   */
  spendMoney(amount: number): boolean {
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
      return false;
    }
    if (amount > this._money) return false;
    this._money -= amount;
    return true;
  }

  /** Apply damage; non-finite / non-positive amounts are ignored, clamped at 0. */
  damage(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this._health = Math.max(0, this._health - amount);
  }

  /** Heal; non-finite / non-positive amounts are ignored, clamped at maxHealth. */
  heal(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this._health = Math.min(this._maxHealth, this._health + amount);
  }

  /**
   * Change the health ceiling. Non-finite / non-positive values are ignored.
   * Existing health is clamped down to the new ceiling (never above it).
   */
  setMaxHealth(value: number): void {
    if (!Number.isFinite(value) || value <= 0) return;
    this._maxHealth = value;
    if (this._health > this._maxHealth) this._health = this._maxHealth;
  }

  /** True when health reached 0. */
  get isDead(): boolean {
    return this._health <= 0;
  }

  /** Restore the phase defaults (in-memory only — persistence is Phase 8). */
  reset(): void {
    this._health = DEFAULTS.health;
    this._maxHealth = DEFAULTS.maxHealth;
    this._money = DEFAULTS.money;
  }
}

/** The authoritative game-state instance for this session (Phase 1: in-memory). */
export const game = new GameState();
