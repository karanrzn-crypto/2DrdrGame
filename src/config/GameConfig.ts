/**
 * GameConfig.ts — the Phaser game configuration factory.
 * Pure constants live in GameValues.ts (Phaser-free, unit-testable);
 * this module is the only Phaser touchpoint of the config layer.
 */
import Phaser from 'phaser';
import { GAME, SCENES } from './GameValues';

// Re-exported so existing imports (`from '../config/GameConfig'`) keep
// working; the pure constants themselves live in GameValues.ts.
export { GAME, SCENES };

/** Renderer types Phaser supports (guarded in createGameConfig). */
const SUPPORTED_RENDERER_TYPES: readonly number[] = [Phaser.AUTO, Phaser.CANVAS, Phaser.WEBGL];

export function createGameConfig(scenes: Phaser.Types.Scenes.SceneType[], rendererType: number): Phaser.Types.Core.GameConfig {
  // Phase 2: boot inputs are validated, never trusted (objective 7).
  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error('createGameConfig: at least one scene is required');
  }
  if (!SUPPORTED_RENDERER_TYPES.includes(rendererType)) {
    throw new Error(`createGameConfig: unsupported rendererType ${rendererType} `
      + `(expected one of ${SUPPORTED_RENDERER_TYPES.join(', ')})`);
  }
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
