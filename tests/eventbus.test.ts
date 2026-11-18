/**
 * eventbus.test.ts — the hardened publish/subscribe hub.
 * Covers: ordering, dedupe, unsubscribe, once (incl. off-transparency),
 * snapshot semantics, error isolation + exception sink, reentrancy guard,
 * introspection and clear.
 */
import { describe, it, expect, vi } from 'vitest';
import { EventBus, ReentrantEmitError } from '../src/core/EventBus';

describe('EventBus — subscription basics', () => {
  it('delivers the payload to a subscriber', () => {
    const bus = new EventBus();
    const got: unknown[] = [];
    bus.on('e', (p) => got.push(p));
    bus.emit('e', { n: 1 });
    bus.emit('e', { n: 2 });
    expect(got).toEqual([{ n: 1 }, { n: 2 }]);
  });

  it('runs multiple handlers in registration order', () => {
    const bus = new EventBus();
    const order: string[] = [];
    bus.on('e', () => order.push('a'));
    bus.on('e', () => order.push('b'));
    bus.on('e', () => order.push('c'));
    bus.emit('e');
    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('emits without payload as undefined', () => {
    const bus = new EventBus();
    let seen: unknown = 'sentinel';
    bus.on('e', (p) => { seen = p; });
    bus.emit('e');
    expect(seen).toBeUndefined();
  });

  it('registers the SAME handler only once (dedupe prevents listener leaks)', () => {
    const bus = new EventBus();
    let calls = 0;
    const h = () => { calls += 1; };
    bus.on('e', h);
    bus.on('e', h);
    bus.on('e', h);
    expect(bus.listenerCount('e')).toBe(1);
    bus.emit('e');
    expect(calls).toBe(1);
  });
});

describe('EventBus — unsubscribe', () => {
  it('off removes the handler', () => {
    const bus = new EventBus();
    let calls = 0;
    const h = () => { calls += 1; };
    bus.on('e', h);
    bus.off('e', h);
    bus.emit('e');
    expect(calls).toBe(0);
    expect(bus.listenerCount('e')).toBe(0);
  });

  it('the unsubscribe function is idempotent', () => {
    const bus = new EventBus();
    const h = () => {};
    const off = bus.on('e', h);
    off();
    expect(() => off()).not.toThrow();
    expect(bus.listenerCount('e')).toBe(0);
  });

  it('off for an unknown event/handler is a safe no-op', () => {
    const bus = new EventBus();
    expect(() => bus.off('nope', () => {})).not.toThrow();
  });
});

describe('EventBus — once', () => {
  it('fires exactly once, then removes itself', () => {
    const bus = new EventBus();
    let calls = 0;
    bus.once('e', () => { calls += 1; });
    bus.emit('e');
    bus.emit('e');
    expect(calls).toBe(1);
    expect(bus.listenerCount('e')).toBe(0);
  });

  it('off(event, original) also removes a pending once wrapper', () => {
    const bus = new EventBus();
    let calls = 0;
    const h = () => { calls += 1; };
    bus.once('e', h);
    bus.off('e', h); // remove by ORIGINAL handler, not by the returned fn
    bus.emit('e');
    expect(calls).toBe(0);
    expect(bus.listenerCount('e')).toBe(0);
  });

  it('the once unsubscribe function removes the pending wrapper', () => {
    const bus = new EventBus();
    let calls = 0;
    const off = bus.once('e', () => { calls += 1; });
    off();
    bus.emit('e');
    expect(calls).toBe(0);
  });
});

describe('EventBus — snapshot semantics (documented contract)', () => {
  it('a handler subscribed DURING an emit is not called in that emit, but in the next', () => {
    const bus = new EventBus();
    const late: number[] = [];
    bus.on('e', () => { bus.on('e', (p) => late.push(p as number)); });
    bus.emit('e', 1); // snapshot: the new handler is not in it
    expect(late).toEqual([]);
    bus.emit('e', 2); // next emit includes it
    expect(late).toEqual([2]);
  });

  it('a handler that removes itself during the emit does not break other handlers', () => {
    const bus = new EventBus();
    const ran: string[] = [];
    const selfRemove = (): void => { bus.off('e', selfRemove); ran.push('self'); };
    bus.on('e', selfRemove);
    bus.on('e', () => ran.push('other'));
    bus.emit('e');
    expect(ran).toEqual(['self', 'other']);
    expect(bus.listenerCount('e')).toBe(1); // self removed, other remains
  });
});

describe('EventBus — error isolation (Phase 2 core rule)', () => {
  it('a throwing handler does not prevent later handlers from running', () => {
    const bus = new EventBus();
    const sink = vi.fn();
    bus.setExceptionSink(sink);
    const ran: string[] = [];
    bus.on('e', () => { throw new Error('boom'); });
    bus.on('e', () => ran.push('b'));
    bus.on('e', () => ran.push('c'));
    expect(() => bus.emit('e')).not.toThrow();
    expect(ran).toEqual(['b', 'c']);
  });

  it('reports (error, event, payload) to the exception sink', () => {
    const bus = new EventBus();
    const sink = vi.fn();
    bus.setExceptionSink(sink);
    const err = new Error('boom');
    bus.on('e', () => { throw err; });
    bus.emit('e', { k: 1 });
    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink).toHaveBeenCalledWith(err, 'e', { k: 1 });
  });

  it('every failing handler of one emit is reported (none swallowed)', () => {
    const bus = new EventBus();
    const sink = vi.fn();
    bus.setExceptionSink(sink);
    bus.on('e', () => { throw new Error('one'); });
    bus.on('e', () => { throw new Error('two'); });
    bus.emit('e');
    expect(sink).toHaveBeenCalledTimes(2);
  });

  it('the default sink logs to console.error (observable, never silent)', () => {
    const bus = new EventBus();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    bus.on('e', () => { throw new Error('boom'); });
    bus.emit('e');
    expect(log).toHaveBeenCalledTimes(1);
    expect(String(log.mock.calls[0][0])).toContain('"e"');
    log.mockRestore();
  });
});

describe('EventBus — reentrancy guard', () => {
  it('a handler re-emitting the SAME event raises ReentrantEmitError via the sink, then others still run', () => {
    const bus = new EventBus();
    const sink = vi.fn();
    bus.setExceptionSink(sink);
    const ran: string[] = [];
    bus.on('e', () => bus.emit('e')); // direct cycle
    bus.on('e', () => ran.push('after'));
    bus.emit('e');
    expect(ran).toEqual(['after']); // no stack death, frame continues
    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink.mock.calls[0][0]).toBeInstanceOf(ReentrantEmitError);
  });

  it('a two-event cycle (A→B→A) is detected as reentrancy, not infinite recursion', () => {
    const bus = new EventBus();
    const sink = vi.fn();
    bus.setExceptionSink(sink);
    bus.on('a', () => bus.emit('b'));
    bus.on('b', () => bus.emit('a')); // back into in-flight 'a'
    bus.emit('a');
    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink.mock.calls[0][0]).toBeInstanceOf(ReentrantEmitError);
    const err = sink.mock.calls[0][0] as ReentrantEmitError;
    expect(err.event).toBe('a');
  });

  it('nested emission of a DIFFERENT event is legal (A→B works)', () => {
    const bus = new EventBus();
    const ran: string[] = [];
    bus.on('a', () => { bus.emit('b'); ran.push('a-done'); });
    bus.on('b', () => ran.push('b'));
    expect(() => bus.emit('a')).not.toThrow();
    expect(ran).toEqual(['b', 'a-done']);
  });
});

describe('EventBus — introspection & teardown', () => {
  it('listenerCount counts per event; unknown events are 0', () => {
    const bus = new EventBus();
    bus.on('a', () => {});
    bus.on('a', () => {});
    bus.on('b', () => {});
    expect(bus.listenerCount('a')).toBe(2);
    expect(bus.listenerCount('b')).toBe(1);
    expect(bus.listenerCount('zzz')).toBe(0);
  });

  it('eventNames lists events with live listeners only', () => {
    const bus = new EventBus();
    const off = bus.on('a', () => {});
    bus.on('b', () => {});
    off();
    expect(bus.eventNames().sort()).toEqual(['b']);
  });

  it('clear drops everything, including pending once wrappers', () => {
    const bus = new EventBus();
    let calls = 0;
    bus.on('a', () => { calls += 1; });
    bus.once('b', () => { calls += 1; });
    bus.clear();
    bus.emit('a');
    bus.emit('b');
    expect(calls).toBe(0);
    expect(bus.eventNames()).toEqual([]);
  });
});
