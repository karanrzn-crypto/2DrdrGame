/**
 * SystemCoordinator.ts — explicit registration, ordered initialization,
 * ordered update and reverse disposal for simulation systems
 * (pure, no Phaser — unit-tested in tests/systemcoordinator.test.ts).
 *
 * Why it exists (Phase 2 objectives 4/5/6/8):
 * - WorldScene used to drive every system by hand inside update(); there was
 *   no ordering contract, no error boundary between systems and no reliable
 *   teardown path. One throwing system could kill the whole frame.
 * - Registration is explicit and unique by id: duplicate registration is a
 *   programmer error (throw), not a silent double-update.
 * - Initialization runs in ascending `order` (stable for ties = registration
 *   order). If a system fails to init, everything already initialized is
 *   disposed in REVERSE order (no half-initialized resources leak) and the
 *   error propagates — init failures are fail-fast, never masked.
 * - Updates run in the same order with per-system error isolation: one
 *   broken system is reported to the exception sink and the rest of the
 *   frame still runs (a simulation hiccup must not freeze the whole world).
 * - Disposal runs in reverse order and is idempotent; a disposed coordinator
 *   rejects new registrations and updates (no zombie state).
 *
 * Ownership: the coordinator never holds gameplay data — it owns the
 * LIFECYCLE (who runs, in which order, what happens on failure). Systems own
 * their own state; GameState/TimeSystem ownership rules are unchanged.
 */

export interface Tickable {
  /** Advance one frame by deltaMs (already clamped by the caller). */
  update(deltaMs: number): void;
}

/** Optional lifecycle hooks detected structurally on a registered system. */
interface MaybeInit {
  init?: () => void;
}
interface MaybeTick {
  update?: (deltaMs: number) => void;
}
interface MaybeDispose {
  dispose?: () => void;
}

/** Receives every system exception in update/dispose (never swallowed silently). */
export type SystemErrorSink = (
  error: unknown,
  systemId: string,
  phase: 'update' | 'dispose',
) => void;

const defaultSink: SystemErrorSink = (error, id, phase) => {
  console.error(`[SystemCoordinator] system "${id}" failed during ${phase}:`, error);
};

interface Entry {
  id: string;
  system: object;
  order: number;
}

export class SystemCoordinator {
  private entries = new Map<string, Entry>();
  private initCalled = false;
  private disposed = false;
  private exceptionSink: SystemErrorSink = defaultSink;

  /** Replace the exception sink (null restores console.error). */
  setExceptionSink(sink: SystemErrorSink | null): void {
    this.exceptionSink = sink ?? defaultSink;
  }

  /**
   * Register a system under a unique id. Lower `order` runs earlier;
   * ties keep registration order. Must happen before initAll().
   */
  register(id: string, system: object, order = 100): void {
    if (this.disposed) {
      throw new Error(`SystemCoordinator: cannot register "${id}" after disposeAll()`);
    }
    if (this.entries.has(id)) {
      throw new Error(`SystemCoordinator: duplicate system id "${id}"`);
    }
    if (system === null || typeof system !== 'object') {
      throw new TypeError(`SystemCoordinator: system "${id}" must be an object`);
    }
    this.entries.set(id, { id, system, order });
  }

  /** True when a system with this id is registered. */
  has(id: string): boolean {
    return this.entries.has(id);
  }

  /** Registered system by id; unknown ids throw (honest, never undefined). */
  get<T extends object>(id: string): T {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`SystemCoordinator: unknown system id "${id}"`);
    }
    return entry.system as T;
  }

  /** Registered ids in execution order (ascending order, ties stable). */
  ids(): string[] {
    return this.sorted().map((e) => e.id);
  }

  /**
   * Initialize every registered system in execution order. Idempotence is
   * deliberately NOT silent: a second initAll() on a live coordinator is a
   * lifecycle bug and throws. On failure: already-initialized systems are
   * disposed in reverse order, then the error is rethrown (fail fast).
   */
  initAll(): void {
    if (this.disposed) {
      throw new Error('SystemCoordinator: initAll() after disposeAll()');
    }
    if (this.initCalled) {
      throw new Error('SystemCoordinator: initAll() called twice without disposeAll()');
    }
    this.initCalled = true;
    const done: Entry[] = [];
    for (const entry of this.sorted()) {
      const maybe = entry.system as MaybeInit;
      if (typeof maybe.init === 'function') {
        try {
          maybe.init();
        } catch (err) {
          // Recovery boundary: nothing stays half-initialized.
          for (const d of done.reverse()) this.disposeEntry(d);
          throw err instanceof Error ? err : new Error(String(err));
        }
      }
      done.push(entry);
    }
  }

  /**
   * Run one update pass in execution order. Each system is isolated: an
   * exception is forwarded to the sink and the remaining systems still run.
   * Requires initAll() first (a silent pre-init update would hide ordering
   * bugs); empty coordinators still need initAll() for symmetry.
   */
  updateAll(deltaMs: number): void {
    if (this.disposed) {
      throw new Error('SystemCoordinator: updateAll() after disposeAll()');
    }
    if (!this.initCalled) {
      throw new Error('SystemCoordinator: updateAll() before initAll()');
    }
    for (const entry of this.sorted()) {
      const maybe = entry.system as MaybeTick;
      if (typeof maybe.update !== 'function') continue;
      try {
        maybe.update(deltaMs);
      } catch (err) {
        this.exceptionSink(err, entry.id, 'update');
      }
    }
  }

  /**
   * Dispose every registered system in REVERSE execution order (whether or
   * not it exposed init — constructors may already hold resources).
   * Idempotent: a second call is a no-op; a disposed coordinator refuses
   * registration and updates instead of decaying silently.
   */
  disposeAll(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const entry of this.sorted().reverse()) {
      this.disposeEntry(entry);
    }
    this.entries.clear();
  }

  private disposeEntry(entry: Entry): void {
    const maybe = entry.system as MaybeDispose;
    if (typeof maybe.dispose !== 'function') return;
    try {
      maybe.dispose();
    } catch (err) {
      this.exceptionSink(err, entry.id, 'dispose');
    }
  }

  /** Ascending order; Array.sort is stable, so ties keep registration order. */
  private sorted(): Entry[] {
    return Array.from(this.entries.values()).sort((a, b) => a.order - b.order);
  }
}
