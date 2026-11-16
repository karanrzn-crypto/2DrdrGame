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
} as const;

export const SCENES = {
  BOOT: 'Boot',
  WORLD: 'World',
  UI: 'UI',
} as const;

export function createGameConfig(scenes: Phaser.Types.Scenes.SceneType[]): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: GAME.width,
    height: GAME.height,
    backgroundColor: '#14100b',
    pixelArt: true,
    roundPixels: true,
    // Keeps the drawing buffer after each frame: required for reliable
    // screenshots in automated browser tests (documented in TESTING.md).
    // The measured FPS cost on target hardware is negligible for Phase 1;
    // revisit in Phase 10 if profiling says otherwise.
    preserveDrawingBuffer: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
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
