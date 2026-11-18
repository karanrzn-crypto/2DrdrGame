/**
 * integration.test.ts — pure modules working together exactly as the scenes
 * wire them (no Phaser, no DOM): coordinator-driven simulation, World<->UI
 * event round-trips and the HUD read contract.
 */
import { describe, it, expect, vi } from 'vitest';
import { SystemCoordinator, Tickable } from '../src/core/SystemCoordinator';
import { EventBus, EV, ReentrantEmitError } from '../src/core/EventBus';
import { TimeSystem, PHASE_VISUALS } from '../src/core/TimeSystem';
import { GameState } from '../src/core/GameState';
import { selectInteractable, Interactable } from '../src/systems/InteractionSystem';

describe('integration — coordinator drives the world clock (WorldScene wiring)', () => {
  /** Mirrors WorldScene.create(): clock system at order 10. */
  function buildWorld(bus: EventBus, clock: TimeSystem): SystemCoordinator {
    const c = new SystemCoordinator();
    c.register('clock', { update: (dt: number) => clock.advance(dt / 1000) } satisfies Tickable, 10);
    c.register('reader', { update: () => bus.emit('phase:tick', clock.phase) } satisfies Tickable, 20);
    c.initAll();
    return c;
  }

  it('60 simulated seconds at 2 world-min/s advance the clock by 120 minutes', () => {
    const clock = new TimeSystem(2, 7 * 60 + 30);
    const c = buildWorld(new EventBus(), clock);
    for (let f = 0; f < 60; f++) c.updateAll(1000); // 60 frames of 1s each
    expect(clock.minutes).toBe(9 * 60 + 30);
    expect(clock.day).toBe(1);
  });

  it('clock ordering: the phase reader always sees the ALREADY-advanced clock', () => {
    const bus = new EventBus();
    const clock = new TimeSystem(2, 6 * 60); // dawn starts at 05:00
    const seen: string[] = [];
    bus.on('phase:tick', (p) => seen.push(p as string));
    const c = buildWorld(bus, clock);
    c.updateAll(60000); // +120 min => 08:00 — same frame as the advance
    expect(seen).toEqual(['day']); // not the stale pre-advance phase
  });

  it('a broken game system never stops the clock (frame-level error boundary)', () => {
    const clock = new TimeSystem(2, 0);
    const sink = vi.fn();
    const c = new SystemCoordinator();
    c.setExceptionSink(sink);
    c.register('clock', { update: (dt: number) => clock.advance(dt / 1000) } satisfies Tickable, 10);
    c.register('exploding', {
      update: () => { throw new Error('simulation bug'); },
    } satisfies Tickable, 20);
    c.initAll();
    for (let f = 0; f < 30; f++) c.updateAll(1000);
    expect(clock.minutes).toBe(60);        // clock survived 30 frames of errors
    expect(sink).toHaveBeenCalledTimes(30); // every failure was reported
  });

  it('teardown: disposeAll + bus clear leave zero live listeners (no leaks)', () => {
    const bus = new EventBus();
    const clock = new TimeSystem();
    const c = buildWorld(bus, clock);
    expect(bus.listenerCount('phase:tick')).toBe(0); // emitter, not listener
    bus.on('phase:tick', () => {});
    expect(bus.listenerCount('phase:tick')).toBe(1);
    c.disposeAll();
    c.disposeAll(); // repeat shutdown is safe
    bus.clear();
    expect(bus.listenerCount('phase:tick')).toBe(0);
  });
});

describe('integration — World <-> UI dialogue round-trip (EventBus protocol)', () => {
  it('open -> lines advance -> close releases the player, with no listener residue', () => {
    const bus = new EventBus();
    let frozen = true;
    const offClose = bus.on(EV.DIALOGUE_CLOSE, () => { frozen = false; });

    // World asks UI to open; UI finishes and closes.
    bus.emit(EV.DIALOGUE_OPEN, { key: 'pete' });
    bus.emit(EV.DIALOGUE_CLOSE);

    expect(frozen).toBe(false);
    offClose();
    expect(bus.listenerCount(EV.DIALOGUE_CLOSE)).toBe(0);
    expect(bus.listenerCount(EV.DIALOGUE_OPEN)).toBe(0);
  });

  it('a UIScene handler that unsubscribes stops receiving opens (destroy contract)', () => {
    const bus = new EventBus();
    let opens = 0;
    const off = bus.on(EV.DIALOGUE_OPEN, () => { opens += 1; });
    bus.emit(EV.DIALOGUE_OPEN, { key: 'pete' });
    off(); // DialogueBox.destroy()
    bus.emit(EV.DIALOGUE_OPEN, { key: 'pete' });
    expect(opens).toBe(1);
  });

  it('a broken UI handler cannot break the World emit (isolation across scenes)', () => {
    const bus = new EventBus();
    const sink = vi.fn();
    bus.setExceptionSink(sink);
    let worldContinue = false;
    bus.on(EV.DIALOGUE_OPEN, () => { throw new Error('UI bug'); });
    bus.on(EV.DIALOGUE_OPEN, () => { worldContinue = true; });
    expect(() => bus.emit(EV.DIALOGUE_OPEN, { key: 'pete' })).not.toThrow();
    expect(worldContinue).toBe(true);
    expect(sink).toHaveBeenCalledTimes(1);
  });
});

describe('integration — interaction prompt protocol (World selection dedupe)', () => {
  const a: Interactable = { id: 'a', x: 0, y: 0, range: 30, prompt: 'A', dialogue: 'a' };
  const b: Interactable = { id: 'b', x: 100, y: 0, range: 30, prompt: 'B', dialogue: 'b' };

  it('emits prompt events ONLY when the selection changes (1000 frames => 3 emissions)', () => {
    const bus = new EventBus();
    const emissions: Array<string | null> = [];
    bus.on(EV.INTERACT_PROMPT, (p) => emissions.push((p as { text: string } | null)?.text ?? null));

    let current: string | null = null;
    for (let frame = 0; frame < 1000; frame++) {
      // The player lingers: A for 500 frames, B for 250, back to A for 250.
      const x = frame < 500 ? 0 : frame < 750 ? 100 : 0;
      const sel = selectInteractable([a, b], x, 0);
      const text = sel ? sel.prompt : null;
      if (text !== current) {
        current = text;
        bus.emit(EV.INTERACT_PROMPT, text ? { text } : null);
      }
    }
    expect(emissions).toEqual(['A', 'B', 'A']); // 997 redundant frames suppressed
  });

  it('leaving the interaction range emits a null payload (prompt hides)', () => {
    const bus = new EventBus();
    const emissions: Array<string | null> = [];
    bus.on(EV.INTERACT_PROMPT, (p) => emissions.push((p as { text: string } | null)?.text ?? null));
    let current: string | null = null;
    for (const x of [0, 5, 25, 100, 100]) {
      const sel = selectInteractable([a], x, 0);
      const text = sel ? sel.prompt : null;
      if (text !== current) { current = text; bus.emit(EV.INTERACT_PROMPT, text ? { text } : null); }
    }
    expect(emissions).toEqual(['A', null]);
  });
});

describe('integration — the HUD read contract (GameState + TimeSystem getters)', () => {
  it('health bar, money text and clock label can be derived every frame', () => {
    const g = new GameState();
    const t = new TimeSystem(2, 7 * 60 + 30);
    const rows: Array<{ bar: number; money: string; clock: string; tint: number }> = [];

    for (let f = 0; f < 10; f++) {
      g.damage(10);
      t.advance(6); // 6 real seconds -> 12 world minutes per frame
      rows.push({
        bar: Math.max(2, 60 * (g.health / g.maxHealth)),
        money: '$' + String(g.money).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]),
        clock: t.clockLabel,
        tint: PHASE_VISUALS[t.phase].tint,
      });
    }
    expect(rows[0].bar).toBe(54);   // 90% health
    expect(rows[9].bar).toBe(2);    // dead clamps the bar at the minimum
    expect(rows[9].clock).toBe('۹:۳۰'); // 07:30 + 120 world minutes
    expect(g.isDead).toBe(true);
    expect(rows.every((r) => Number.isFinite(r.bar))).toBe(true);
  });

  it('an invalid HUD input path (NaN damage) cannot reach the bar anymore', () => {
    const g = new GameState();
    g.damage(NaN); // previously: health = NaN -> bar width NaN
    const bar = Math.max(2, 60 * (g.health / g.maxHealth));
    expect(Number.isFinite(bar)).toBe(true);
    expect(bar).toBe(60);
  });
});

describe('integration — error propagation stops at the boundaries', () => {
  it('a ReentrantEmitError from a cyclic protocol cannot kill the coordinator frame', () => {
    const bus = new EventBus();
    const sink = vi.fn();
    bus.setExceptionSink(sink);
    let clockTicks = 0;
    const c = new SystemCoordinator();
    c.setExceptionSink(sink); // same shared sink the scenes would install
    c.register('clock', { update: () => { clockTicks += 1; } } satisfies Tickable, 10);
    c.register('cyclic-ui', {
      update: () => {
        bus.on('ping', () => bus.emit('pong'));
        bus.on('pong', () => bus.emit('ping')); // cycle: ping -> pong -> ping
        bus.emit('ping');
      },
    } satisfies Tickable, 20);
    c.initAll();
    expect(() => c.updateAll(16)).not.toThrow();
    expect(clockTicks).toBe(1); // the frame completed
    // The reentrancy error reached the shared sink through the bus boundary.
    const busErr = sink.mock.calls.map((call) => call[0]).find((e) => e instanceof ReentrantEmitError);
    expect(busErr).toBeInstanceOf(ReentrantEmitError);
    expect((busErr as ReentrantEmitError).event).toBe('ping');
  });
});
