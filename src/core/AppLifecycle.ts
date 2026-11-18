/**
 * AppLifecycle.ts — the boot-time application state machine
 * (pure, no Phaser, no DOM — unit-tested in tests/lifecycle.test.ts).
 *
 * Why it exists (Phase 2 objectives 3/5/6):
 * - main.ts built the boot sequence as closures; the rules "which phase can
 *   follow which", "a terminal phase is final" and "ready/failed are
 *   one-shot" lived only in scattered flags (confirmed, watchdogFired).
 *   This module makes the phase model explicit and testable.
 * - main.ts drives its transitions through this FSM: any flow bug that
 *   would try an illegal transition (e.g. a panel over an already-ready
 *   game, a second 'ready' after ready) now throws immediately instead of
 *   silently double-firing UI.
 *
 * Phases:
 *   idle       bundle loaded, nothing attempted yet
 *   probing    renderer probe running / decision made, no Phaser boot yet
 *   booting    a Phaser.Game instance was created, waiting for World
 *   verifying  World runs; visible-output + viewport sampling in progress
 *   recovering a failure detector fired; one Canvas retry is underway
 *   ready      World active AND real content verified on screen (terminal)
 *   failed     no renderer could boot / no visible output (terminal)
 *
 * Legal transition table (everything else throws):
 *   idle → probing | failed
 *   probing → booting | failed
 *   booting → verifying | recovering | failed
 *   verifying → ready | recovering | failed
 *   recovering → booting | failed
 */

export type AppPhase =
  | 'idle'
  | 'probing'
  | 'booting'
  | 'verifying'
  | 'recovering'
  | 'ready'
  | 'failed';

export const LEGAL_TRANSITIONS: Readonly<Record<AppPhase, readonly AppPhase[]>> = {
  idle: ['probing', 'failed'],
  probing: ['booting', 'failed'],
  booting: ['verifying', 'recovering', 'failed'],
  verifying: ['ready', 'recovering', 'failed'],
  recovering: ['booting', 'failed'],
  ready: [],
  failed: [],
};

export interface PhaseChange {
  from: AppPhase;
  to: AppPhase;
  at: number;
}

export class AppLifecycle {
  private _phase: AppPhase = 'idle';
  private readonly _history: PhaseChange[] = [];

  get phase(): AppPhase {
    return this._phase;
  }

  /** Every accepted transition, oldest first (diagnostics/tests). */
  get history(): readonly PhaseChange[] {
    return this._history;
  }

  /** ready and failed are one-shot: nothing may leave them. */
  get isTerminal(): boolean {
    return LEGAL_TRANSITIONS[this._phase].length === 0;
  }

  canTransition(to: AppPhase): boolean {
    return LEGAL_TRANSITIONS[this._phase].includes(to);
  }

  /**
   * Move to a new phase. Illegal transitions throw with the full context —
   * a lifecycle bug must be loud, never absorbed.
   */
  transition(to: AppPhase): AppPhase {
    if (!LEGAL_TRANSITIONS[to]) {
      throw new Error(`AppLifecycle: unknown phase "${to}"`);
    }
    if (!this.canTransition(to)) {
      throw new Error(`AppLifecycle: illegal transition ${this._phase} → ${to}`);
    }
    this._history.push({ from: this._phase, to, at: Date.now() });
    this._phase = to;
    return to;
  }
}
