/**
 * GameValues.ts — pure, Phaser-free game tuning constants and scene keys.
 * Extracted from GameConfig.ts (Phase 2) so that validation tests can import
 * the REAL constants instead of a drifting copy, and so the pure modules
 * (validateConfig, tests) never touch Phaser (AGENTS.md test rule).
 */

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
