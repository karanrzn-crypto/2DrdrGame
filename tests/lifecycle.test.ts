/**
 * lifecycle.test.ts — the boot-phase state machine: legal/illegal
 * transitions, terminal phases and the recorded history.
 */
import { describe, it, expect } from 'vitest';
import { AppLifecycle, LEGAL_TRANSITIONS, AppPhase } from '../src/core/AppLifecycle';

describe('AppLifecycle — happy path', () => {
  it('starts in idle', () => {
    const l = new AppLifecycle();
    expect(l.phase).toBe('idle');
    expect(l.isTerminal).toBe(false);
    expect(l.history).toEqual([]);
  });

  it('accepts the healthy boot sequence up to ready', () => {
    const l = new AppLifecycle();
    l.transition('probing');
    l.transition('booting');
    l.transition('verifying');
    l.transition('ready');
    expect(l.phase).toBe('ready');
    expect(l.isTerminal).toBe(true);
    expect(l.history.map((h) => h.to)).toEqual(['probing', 'booting', 'verifying', 'ready']);
  });

  it('accepts the Canvas-retry sequence', () => {
    const l = new AppLifecycle();
    l.transition('probing');
    l.transition('booting');
    l.transition('recovering'); // watchdog or dead output fired
    l.transition('booting');    // Canvas attempt
    l.transition('verifying');
    l.transition('ready');
    expect(l.phase).toBe('ready');
    expect(l.history).toHaveLength(6);
  });

  it('accepts failure from every active phase', () => {
    for (const path of [
      ['probing', 'failed'],
      ['probing', 'booting', 'failed'],
      ['probing', 'booting', 'verifying', 'failed'],
      ['probing', 'booting', 'recovering', 'failed'],
      ['probing', 'booting', 'verifying', 'recovering', 'failed'],
    ] as AppPhase[][]) {
      const l = new AppLifecycle();
      for (const p of path) l.transition(p);
      expect(l.phase).toBe('failed');
      expect(l.isTerminal).toBe(true);
    }
  });
});

describe('AppLifecycle — illegal transitions', () => {
  it('rejects skipping phases (idle cannot jump to booting/ready/failed)', () => {
    const l = new AppLifecycle();
    expect(() => l.transition('booting')).toThrow(/idle → booting/);
    expect(() => l.transition('ready')).toThrow(/idle → ready/);
    expect(() => l.transition('verifying')).toThrow(/idle → verifying/);
    expect(l.phase).toBe('idle'); // failed attempts leave state untouched
  });

  it('terminal phases accept nothing (ready and failed are one-shot)', () => {
    const ready = new AppLifecycle();
    ready.transition('probing');
    ready.transition('booting');
    ready.transition('verifying');
    ready.transition('ready');
    for (const p of ['idle', 'probing', 'booting', 'verifying', 'recovering', 'ready', 'failed'] as AppPhase[]) {
      expect(() => ready.transition(p)).toThrow(/illegal transition ready/);
    }

    const failed = new AppLifecycle();
    failed.transition('probing');
    failed.transition('failed');
    for (const p of ['idle', 'probing', 'booting', 'verifying', 'recovering', 'ready', 'failed'] as AppPhase[]) {
      expect(() => failed.transition(p)).toThrow(/illegal transition failed/);
    }
  });

  it('rejects backwards transitions (verifying cannot return to booting directly)', () => {
    const l = new AppLifecycle();
    l.transition('probing');
    l.transition('booting');
    l.transition('verifying');
    expect(() => l.transition('booting')).toThrow(/verifying → booting/);
    expect(() => l.transition('probing')).toThrow(/verifying → probing/);
  });

  it('rejects unknown phases', () => {
    const l = new AppLifecycle();
    expect(() => l.transition('phantom' as never)).toThrow(/unknown phase/);
  });
});

describe('AppLifecycle — table & history', () => {
  it('every documented phase has a transition row', () => {
    for (const p of ['idle', 'probing', 'booting', 'verifying', 'recovering', 'ready', 'failed'] as AppPhase[]) {
      expect(Array.isArray(LEGAL_TRANSITIONS[p])).toBe(true);
    }
  });

  it('history records from/to pairs in order', () => {
    const l = new AppLifecycle();
    l.transition('probing');
    l.transition('booting');
    expect(l.history[0]).toMatchObject({ from: 'idle', to: 'probing' });
    expect(l.history[1]).toMatchObject({ from: 'probing', to: 'booting' });
    expect(l.history[0].at).toBeLessThanOrEqual(l.history[1].at);
  });

  it('canTransition mirrors the table without mutating state', () => {
    const l = new AppLifecycle();
    expect(l.canTransition('probing')).toBe(true);
    expect(l.canTransition('ready')).toBe(false);
    expect(l.phase).toBe('idle');
  });
});
