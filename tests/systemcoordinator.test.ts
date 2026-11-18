/**
 * systemcoordinator.test.ts — registration, ordering, error boundaries and
 * disposal rules of the system lifecycle owner.
 */
import { describe, it, expect, vi } from 'vitest';
import { SystemCoordinator } from '../src/core/SystemCoordinator';

/** Records its own lifecycle calls — the standard test double. */
function makeSystem(name: string, log: string[], opts: {
  init?: boolean;
  update?: boolean;
  dispose?: boolean;
  throwOnInit?: boolean;
  throwOnUpdate?: boolean;
  throwOnDispose?: boolean;
} = {}): object {
  const sys: Record<string, unknown> = {};
  if (opts.init !== false) {
    sys.init = (): void => {
      if (opts.throwOnInit) throw new Error(name + ' init boom');
      log.push('init:' + name);
    };
  }
  if (opts.update !== false) {
    sys.update = (dt: number): void => {
      if (opts.throwOnUpdate) throw new Error(name + ' update boom');
      log.push('update:' + name + ':' + dt);
    };
  }
  if (opts.dispose !== false) {
    sys.dispose = (): void => {
      if (opts.throwOnDispose) throw new Error(name + ' dispose boom');
      log.push('dispose:' + name);
    };
  }
  return sys;
}

describe('SystemCoordinator — registration', () => {
  it('rejects duplicate ids loudly', () => {
    const c = new SystemCoordinator();
    c.register('a', {});
    expect(() => c.register('a', {})).toThrow(/duplicate system id "a"/);
  });

  it('rejects registration after disposeAll (no zombie state)', () => {
    const c = new SystemCoordinator();
    c.register('a', makeSystem('a', []));
    c.disposeAll();
    expect(() => c.register('b', {})).toThrow(/after disposeAll/);
  });

  it('rejects non-object systems', () => {
    const c = new SystemCoordinator();
    expect(() => c.register('x', null as unknown as object)).toThrow(TypeError);
    expect(() => c.register('x', 42 as unknown as object)).toThrow(TypeError);
  });

  it('get returns the registered system; unknown ids throw (honest, not undefined)', () => {
    const c = new SystemCoordinator();
    const sys = { marker: 7 };
    c.register('sys', sys);
    expect(c.get<{ marker: number }>('sys').marker).toBe(7);
    expect(() => c.get('missing')).toThrow(/unknown system id "missing"/);
  });

  it('has() reflects registration', () => {
    const c = new SystemCoordinator();
    c.register('a', {});
    expect(c.has('a')).toBe(true);
    expect(c.has('b')).toBe(false);
  });
});

describe('SystemCoordinator — ordering', () => {
  it('ids() lists execution order: ascending order value, ties keep registration order', () => {
    const c = new SystemCoordinator();
    c.register('late', {}, 50);
    c.register('early-a', {}, 10);
    c.register('tie-a', {}, 30);
    c.register('tie-b', {}, 30);
    expect(c.ids()).toEqual(['early-a', 'tie-a', 'tie-b', 'late']);
  });

  it('default order is 100 (runs after explicitly earlier systems)', () => {
    const c = new SystemCoordinator();
    c.register('default', {});
    c.register('early', {}, 1);
    expect(c.ids()).toEqual(['early', 'default']);
  });
});

describe('SystemCoordinator — initialization', () => {
  it('initAll runs init hooks in execution order', () => {
    const c = new SystemCoordinator();
    const log: string[] = [];
    c.register('b', makeSystem('b', log), 20);
    c.register('a', makeSystem('a', log), 10);
    c.initAll();
    expect(log).toEqual(['init:a', 'init:b']);
  });

  it('a second initAll without dispose is a lifecycle bug and throws', () => {
    const c = new SystemCoordinator();
    c.register('a', makeSystem('a', []));
    c.initAll();
    expect(() => c.initAll()).toThrow(/called twice/);
  });

  it('init failure disposes already-initialized systems in REVERSE, then rethrows', () => {
    const c = new SystemCoordinator();
    const log: string[] = [];
    c.register('first', makeSystem('first', log), 10);
    c.register('second', makeSystem('second', log), 20);
    c.register('broken', makeSystem('broken', log, { throwOnInit: true }), 30);
    c.register('never', makeSystem('never', log), 40);
    expect(() => c.initAll()).toThrow('broken init boom');
    expect(log).toEqual(['init:first', 'init:second', 'dispose:second', 'dispose:first']);
  });

  it('initAll after disposeAll throws', () => {
    const c = new SystemCoordinator();
    c.register('a', {});
    c.disposeAll();
    expect(() => c.initAll()).toThrow(/after disposeAll/);
  });
});

describe('SystemCoordinator — update pass', () => {
  it('updateAll before initAll throws (no hidden ordering bugs)', () => {
    const c = new SystemCoordinator();
    c.register('a', makeSystem('a', []));
    expect(() => c.updateAll(16)).toThrow(/before initAll/);
  });

  it('updateAll runs updates in execution order with the given delta', () => {
    const c = new SystemCoordinator();
    const log: string[] = [];
    c.register('a', makeSystem('a', log), 10);
    c.register('b', makeSystem('b', log), 20);
    c.initAll();
    log.length = 0;
    c.updateAll(16);
    expect(log).toEqual(['update:a:16', 'update:b:16']);
  });

  it('a throwing system is isolated: later systems still run, sink gets (err, id, "update")', () => {
    const c = new SystemCoordinator();
    const log: string[] = [];
    const sink = vi.fn();
    c.setExceptionSink(sink);
    c.register('broken', makeSystem('broken', log, { throwOnUpdate: true }), 10);
    c.register('healthy', makeSystem('healthy', log), 20);
    c.initAll();
    log.length = 0;
    expect(() => c.updateAll(16)).not.toThrow();
    expect(log).toEqual(['update:healthy:16']);
    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink.mock.calls[0][1]).toBe('broken');
    expect(sink.mock.calls[0][2]).toBe('update');
  });

  it('systems without an update hook are skipped safely', () => {
    const c = new SystemCoordinator();
    const log: string[] = [];
    c.register('passive', { marker: true }, 10);
    c.register('ticking', makeSystem('ticking', log), 20);
    c.initAll();
    log.length = 0; // init logging off — we only assert the update pass
    expect(() => c.updateAll(16)).not.toThrow();
    expect(log).toEqual(['update:ticking:16']);
  });

  it('updateAll after disposeAll throws', () => {
    const c = new SystemCoordinator();
    c.register('a', makeSystem('a', []));
    c.initAll();
    c.disposeAll();
    expect(() => c.updateAll(16)).toThrow(/after disposeAll/);
  });
});

describe('SystemCoordinator — disposal', () => {
  it('disposeAll runs dispose hooks in REVERSE execution order', () => {
    const c = new SystemCoordinator();
    const log: string[] = [];
    c.register('a', makeSystem('a', log), 10);
    c.register('b', makeSystem('b', log), 20);
    c.register('c', makeSystem('c', log), 30);
    c.initAll();
    log.length = 0;
    c.disposeAll();
    expect(log).toEqual(['dispose:c', 'dispose:b', 'dispose:a']);
  });

  it('disposeAll is idempotent: systems are never disposed twice', () => {
    const c = new SystemCoordinator();
    const log: string[] = [];
    c.register('a', makeSystem('a', log));
    c.initAll();
    c.disposeAll();
    c.disposeAll(); // repeat shutdown must be safe AND repeatable
    expect(log.filter((l) => l === 'dispose:a')).toHaveLength(1);
  });

  it('disposeAll disposes systems that were registered but never initialized', () => {
    const c = new SystemCoordinator();
    const log: string[] = [];
    c.register('a', makeSystem('a', log, { init: false }));
    c.disposeAll(); // no initAll first — constructors may already hold resources
    expect(log).toEqual(['dispose:a']);
  });

  it('a throwing dispose does not stop the others; sink gets (err, id, "dispose")', () => {
    const c = new SystemCoordinator();
    const log: string[] = [];
    const sink = vi.fn();
    c.setExceptionSink(sink);
    c.register('first', makeSystem('first', log), 10);
    c.register('broken', makeSystem('broken', log, { throwOnDispose: true }), 20);
    c.register('last', makeSystem('last', log), 30);
    c.initAll();
    log.length = 0;
    expect(() => c.disposeAll()).not.toThrow();
    expect(log).toEqual(['dispose:last', 'dispose:first']); // broken logged its throw, not dispose
    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(sink.mock.calls[0][1]).toBe('broken');
    expect(sink.mock.calls[0][2]).toBe('dispose');
  });

  it('an empty coordinator is fully usable (init, update, dispose)', () => {
    const c = new SystemCoordinator();
    expect(() => {
      c.initAll();
      c.updateAll(16);
      c.disposeAll();
      c.disposeAll();
    }).not.toThrow();
  });
});
