/**
 * GameConfig.ts — central constants + the Phaser game configuration.
 * (Pure constants module; the config factory is the only Phaser touchpoint.)
 */
import Phaser from 'phaser';

/** Game-wide tuning constants (single place to adjust game feel). */
export const GAME = {
  /** Logical canvas size; Scale.FIT letterboxes it into the browser window. */
  width: 960,
  height: 540,
  /** Camera zoom: 16px tiles render at 48px on screen. */
  camZoom: 3,
  tileSize: 16,
  /** Player movement (px/second, world units). */
  walkSpeed: 68,
  runSpeed: 112,
  acceleration: 520,
  drag: 640,
  /** Time of day speed: world-minutes per real second. */
  minutesPerRealSecond: 2,
  /** Clear color of the canvas (also the page background in index.html).
   * Single source of truth — createGameConfig and the boot-time
   * visible-output sampler both read it. */
  backgroundColor: '#14100b',
} as const;

export const SCENES = {
  BOOT: 'Boot',
  WORLD: 'World',
  UI: 'UI',
} as const;

export function createGameConfig(scenes: Phaser.Types.Scenes.SceneType[], rendererType: number): Phaser.Types.Core.GameConfig {
  return {
    type: rendererType,
    width: GAME.width,
    height: GAME.height,
    // CRITICAL (field bug #7): without an explicit parent Phaser appends the
    // canvas to <body> AFTER the full-height #game block, pushing the canvas
    // exactly one viewport down — the game renders off-screen and the player
    // sees only the page background. Parent must be the #game container.
    parent: 'game',
    backgroundColor: GAME.backgroundColor,
    pixelArt: true,
    roundPixels: true,
    // Keeps the drawing buffer after each frame: required for reliable
    // screenshots in automated browser tests (documented in TESTING.md).
    // The measured FPS cost on target hardware is negligible for Phase 1;
    // revisit in Phase 10 if profiling says otherwise.
    preserveDrawingBuffer: true,
    scale: {
      mode: Phaser.Scale.FIT,
      // Centering is owned by the #game flex container (see index.html);
      // Phaser's margin-based autoCenter double-shifts the canvas under an
      // RTL page and must stay off (part of field bug #7).
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    // Arcade physics with a fixed 60Hz step (directive §16: simulation must
    // not depend on render frame rate).
    physics: {
      default: 'arcade',
      arcade: {
        fixedStep: true,
        fps: 60,
        debug: false,
      },
    },
    scene: scenes,
  };
}
