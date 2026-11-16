/**
 * EventBus.ts — minimal typed publish/subscribe hub (pure, no Phaser).
 *
 * Design rule (master directive §15): systems communicate through well-defined
 * events; they must not reach into each other's internals. Cross-scene messages
 * (World <-> UI) go through this bus.
 */
type Handler = (payload: unknown) => void;

export class EventBus {
  private handlers = new Map<string, Set<Handler>>();

  on(event: string, handler: Handler): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: Handler): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, payload?: unknown): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const h of Array.from(set)) h(payload);
  }

  clear(): void {
    this.handlers.clear();
  }
}

/** Application-wide event bus instance. */
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
