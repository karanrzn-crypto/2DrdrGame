/**
 * EventBus.ts — typed publish/subscribe hub (pure, no Phaser).
 *
 * Design rule (master directive §15): systems communicate through well-defined
 * events; they must not reach into each other's internals. Cross-scene messages
 * (World <-> UI) go through this bus.
 *
 * Phase 2 contract (hardened):
 * - Handler isolation: a handler that throws is reported to the exception
 *   sink; every OTHER handler of the same event still runs, and the emit
 *   itself never propagates the error into the caller's frame. The default
 *   sink writes to console.error — failures are observable, never silent.
 * - Snapshot semantics: handlers added or removed DURING an emit affect the
 *   NEXT emit, not the one in progress (iteration runs over a snapshot).
 * - Reentrancy guard: a handler emitting the same event again synchronously
 *   (directly or through a cycle A→B→A) raises ReentrantEmitError instead of
 *   recursing until the stack dies. The error is reported like any other
 *   handler error and remaining handlers still run.
 * - once(): auto-removing handlers; off(event, original) also removes a
 *   pending once wrapper (tested).
 * - Dedupe by identity: registering the SAME handler twice for one event
 *   stores a single entry (Set) — re-registration cannot create a duplicate
 *   listener leak; on() returns an idempotent unsubscribe function.
 */

export type EventHandler = (payload: unknown) => void;

/** Receives every handler exception; errors are never silently swallowed. */
export type ExceptionSink = (error: unknown, event: string, payload: unknown) => void;

/** Raised when a handler synchronously re-emits an event already in flight. */
export class ReentrantEmitError extends Error {
  constructor(public readonly event: string) {
    super(`EventBus: reentrant emit of "${event}" (a handler emitted the same event synchronously)`);
    this.name = 'ReentrantEmitError';
  }
}

const defaultSink: ExceptionSink = (error, event) => {
  console.error(`[EventBus] handler for "${event}" threw:`, error);
};

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  /** original handler -> its live once-wrappers (so off(original) works). */
  private onceWrappers = new Map<EventHandler, Set<EventHandler>>();
  /** Events currently mid-emit (reentrancy guard). */
  private emitting = new Set<string>();
  private exceptionSink: ExceptionSink = defaultSink;

  /** Replace the exception sink (null restores console.error). */
  setExceptionSink(sink: ExceptionSink | null): void {
    this.exceptionSink = sink ?? defaultSink;
  }

  /**
   * Subscribe. Registering the same handler twice stores ONE entry.
   * Returns an idempotent unsubscribe function.
   */
  on(event: string, handler: EventHandler): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Subscribe for exactly one emission. The wrapper detaches itself before
   * invoking the handler (a handler that re-emits must not re-trigger it).
   */
  once(event: string, handler: EventHandler): () => void {
    const wrapper: EventHandler = (payload) => {
      this.off(event, handler);
      this.safeCall(handler, payload, event);
    };
    let set = this.onceWrappers.get(handler);
    if (!set) {
      set = new Set();
      this.onceWrappers.set(handler, set);
    }
    set.add(wrapper);
    this.on(event, wrapper);
    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe. Also removes a pending once() wrapper for this handler.
   * Safe to call for unknown events/handlers (no-op).
   */
  off(event: string, handler: EventHandler): void {
    const set = this.handlers.get(event);
    if (!set) return;
    set.delete(handler);
    const wrappers = this.onceWrappers.get(handler);
    if (wrappers) {
      for (const w of wrappers) set.delete(w);
      if (wrappers.size === 0) this.onceWrappers.delete(handler);
    }
    if (set.size === 0) this.handlers.delete(event);
  }

  /**
   * Publish. Iterates a snapshot: subscribe/unsubscribe during the emit
   * affects the next emit. Never throws because of a handler error — the
   * exception sink receives it and the remaining handlers still run.
   */
  emit(event: string, payload?: unknown): void {
    if (this.emitting.has(event)) throw new ReentrantEmitError(event);
    const set = this.handlers.get(event);
    if (!set || set.size === 0) return;
    this.emitting.add(event);
    try {
      for (const h of Array.from(set)) this.safeCall(h, payload, event);
    } finally {
      this.emitting.delete(event);
    }
  }

  /** Number of live listeners for one event (0 for unknown events). */
  listenerCount(event: string): number {
    return this.handlers.get(event)?.size ?? 0;
  }

  /** Events that currently have at least one listener. */
  eventNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /** Drop everything (used on teardown; once-wrapper map included). */
  clear(): void {
    this.handlers.clear();
    this.onceWrappers.clear();
  }

  private safeCall(handler: EventHandler, payload: unknown, event: string): void {
    try {
      handler(payload);
    } catch (err) {
      this.exceptionSink(err, event, payload);
    }
  }
}

/** Application-wide event bus instance (deliberate, documented singleton). */
export const events = new EventBus();

/** Well-known event names (avoid typos across modules). */
export const EV = {
  /** UI should show/hide an interaction prompt. payload: { text: string } | null */
  INTERACT_PROMPT: 'interact:prompt',
  /** World asks UI to open a dialogue. payload: { key: string } */
  DIALOGUE_OPEN: 'dialogue:open',
  /** UI announces the dialogue is finished (World unfreezes the player). */
  DIALOGUE_CLOSE: 'dialogue:close',
  /** Pause state changed. payload: { paused: boolean } */
  PAUSE_STATE: 'pause:state',
} as const;
