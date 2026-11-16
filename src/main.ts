/**
 * main.ts — application entry point.
 * Original game: Coppergate (Phase 1 playable prototype).
 *
 * Boot sequence (root-cause fix for the deployed blank-screen bug):
 * 1. installBootGuard  — global errors become a visible Persian panel.
 * 2. probeRenderer     — verify the WebGL pipeline actually draws and
 *                        reads back a known pattern. On machines where a
 *                        WebGL context exists but rasterizes nothing,
 *                        Phaser's AUTO fallback never fires (it only
 *                        checks for a null context), which used to leave
 *                        players with a silent blank screen.
 * 3. chooseRenderer    — AUTO (WebGL works) / CANVAS (silently dead GPU)
 *                        / none (no usable 2D output → error panel).
 * 4. armBootWatchdog   — if the World scene is not running within
 *                        BOOT_WATCHDOG_MS, show an actionable panel.
 */
import Phaser from 'phaser';
import { createGameConfig, SCENES } from './config/GameConfig';
import { BootScene } from './scenes/BootScene';
import { WorldScene } from './scenes/WorldScene';
import { UIScene } from './scenes/UIScene';
import { probeRenderer, chooseRenderer, describeGL } from './boot/RendererProbe';
import {
  installBootGuard,
  armBootWatchdog,
  markGameReady,
  showBootError,
  isWorldRunning,
  BOOT_WATCHDOG_MS,
} from './boot/BootGuard';

installBootGuard();

function boot(): void {
  const probe = probeRenderer();
  const choice = chooseRenderer(probe);

  if (choice === 'none') {
    showBootError(
      'مرورگر شما امکان رندر بازی را ندارد',
      'نه WebGL و نه Canvas 2D در این مرورگر قابل استفاده نبود.\n'
      + describeGL() + '\n'
      + 'userAgent: ' + navigator.userAgent,
    );
    return;
  }

  if (choice === 'canvas') {
    // The player-facing behavior is unchanged (game looks identical);
    // this log is the honest trace of the fallback, per directive §54.
    console.warn(
      '[Coppergate] WebGL pipeline failed the boot self-test (draws nothing). '
      + 'Falling back to the Canvas renderer. ' + probe.glInfo,
    );
  }

  const rendererType = choice === 'auto' ? Phaser.AUTO : Phaser.CANVAS;
  const gameInstance = new Phaser.Game(
    createGameConfig([BootScene, WorldScene, UIScene], rendererType),
  );

  /**
   * Intentional, documented test hook (see AGENTS.md): lets browser-test
   * tooling inspect scene state. It exposes no credentials or secrets.
   */
  (window as unknown as { __coppergate: unknown }).__coppergate = {
    game: gameInstance,
    sceneKeys: Object.values(SCENES),
    rendererChoice: choice,
  };

  // Watchdog + readiness: the panel may only fire while the World scene
  // is not yet up; after that the game owns any error reporting.
  const bootInfo = 'renderer choice: ' + choice + '\n' + probe.glInfo;
  armBootWatchdog(bootInfo);
  const poll = window.setInterval(() => {
    if (isWorldRunning()) {
      markGameReady();
      window.clearInterval(poll);
    }
  }, 250);
  window.setTimeout(() => window.clearInterval(poll), BOOT_WATCHDOG_MS);
}

boot();
