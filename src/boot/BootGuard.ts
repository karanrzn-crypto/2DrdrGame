/**
 * BootGuard.ts — visible failure surface for the boot sequence
 * (master directive §16/§54: failures must be observable, never silent).
 *
 * Contract:
 * - Any script error or unhandled rejection BEFORE the World scene is
 *   running opens a visible Persian error panel (no more blank screens).
 * - A watchdog timer closes the gap where nothing throws but nothing
 *   starts either (dead font API, hung loader, silent render death).
 * - After the game is ready, runtime errors only go to the console so
 *   a caught exception never ruins a working play session.
 *
 * The panel lives in index.html (#boot-error) and is styled like the
 * game UI; this module only fills and reveals it.
 */

const PANEL_ID = 'boot-error';
const TITLE_ID = 'boot-error-title';
const DETAIL_ID = 'boot-error-detail';
/** A healthy boot reaches the World scene well under 5s (incl. font wait ≤1.5s). */
export const BOOT_WATCHDOG_MS = 10_000;

/** Structural view of the parts of Phaser.Game we read — keeps this
 *  module free of the Phaser dependency (renderer.type: 1=Canvas, 2=WebGL;
 *  scene status: 5=RUNNING). */
interface GameLike {
  renderer: { type: number };
  scene: {
    isActive(key: string): boolean;
    scenes: Array<{ scene: { settings: { key: string; status: number } } }>;
  };
}

function getGame(): GameLike | undefined {
  return (window as unknown as { __coppergate?: { game?: GameLike } }).__coppergate?.game;
}

/** Single readiness flag — shared with the early inline guard in index.html
 *  (it reads window.__cgReady to stay quiet once the game is playable). */
declare global {
  interface Window {
    __cgReady?: boolean;
    /** Installed by the inline early guard in index.html (before the bundle). */
    __cgShowBootError?: (title: string, detail: string) => void;
  }
}

let watchdogFired = false;

function isReady(): boolean {
  return window.__cgReady === true;
}

function getElement(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function showPanel(title: string, detail: string): void {
  const panel = getElement(PANEL_ID);
  if (!panel) {
    // Panel markup missing — fall back to a brutal but visible alert.
    // (Never ship without #boot-error in index.html.)
    console.error('[Coppergate] FATAL:', title, detail);
    return;
  }
  const titleEl = getElement(TITLE_ID);
  const detailEl = getElement(DETAIL_ID);
  if (titleEl) titleEl.textContent = title;
  if (detailEl) detailEl.textContent = detail;
  panel.hidden = false;
  const loading = getElement('loading');
  if (loading) loading.classList.add('hidden');
}

/** Public: open the error panel (idempotent once shown). */
export function showBootError(title: string, detail: string): void {
  if (!watchdogFired) {
    watchdogFired = true;
  }
  showPanel(title, detail);
}

/** Mark the game as playable; late errors downgrade to console only. */
export function markGameReady(): void {
  window.__cgReady = true;
}

function reportFatal(source: string, message: string): void {
  if (isReady()) {
    console.error('[Coppergate] runtime error (' + source + '):', message);
    return;
  }
  if (watchdogFired) return; // panel already visible — don't fight over it
  watchdogFired = true;
  showPanel(
    'خطا در راه‌اندازی بازی',
    'منبع خطا: ' + source + '\n' + message,
  );
}

/**
 * Install global error hooks. The inline early guard in index.html already
 * covers errors thrown during module evaluation (before this bundle runs);
 * install only if it is absent (e.g. headless unit harnesses).
 */
export function installBootGuard(): void {
  if (typeof window.__cgShowBootError === 'function') {
    return; // early guard owns the error listeners
  }
  window.addEventListener('error', (ev) => {
    reportFatal('window.onerror', ev.message);
  });
  window.addEventListener('unhandledrejection', (ev) => {
    const reason = ev.reason instanceof Error ? ev.reason.message : String(ev.reason);
    reportFatal('unhandledrejection', reason);
  });
}

/** True when the World scene is up and simulating. */
export function isWorldRunning(): boolean {
  const game = getGame();
  try {
    return !!game && game.scene.isActive('World');
  } catch {
    return false;
  }
}

/** Compact technical snapshot appended to watchdog failures. */
export function collectDiagnostics(extra: string): string {
  const lines: string[] = [extra];
  const game = getGame();
  if (game) {
    try {
      const types = ['?', 'Canvas', 'WebGL'];
      lines.push('renderer: ' + (types[game.renderer.type] ?? String(game.renderer.type)));
      lines.push(
        'scenes: '
        + game.scene.scenes
          .map((s) => s.scene.settings.key + '=' + s.scene.settings.status)
          .join(', '),
      );
    } catch {
      lines.push('scene state unreadable');
    }
  } else {
    lines.push('game instance: not created');
  }
  return lines.join('\n');
}

/**
 * Watchdog: if the World scene is not running after BOOT_WATCHDOG_MS,
 * surface a visible, actionable panel instead of hanging forever.
 */
export function armBootWatchdog(bootInfo: string, onFired?: () => void): void {
  window.setTimeout(() => {
    if (isReady() || watchdogFired) return;
    watchdogFired = true;
    onFired?.();
    showPanel(
      'بازی بیش از حد انتظار در راه‌اندازی توقف کرد',
      collectDiagnostics(bootInfo),
    );
  }, BOOT_WATCHDOG_MS);
}
