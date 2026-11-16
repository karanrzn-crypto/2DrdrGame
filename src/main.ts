/**
 * main.ts — application entry point.
 * Original game: Coppergate (Phase 1 playable prototype).
 */
import Phaser from 'phaser';
import { createGameConfig, SCENES } from './config/GameConfig';
import { BootScene } from './scenes/BootScene';
import { WorldScene } from './scenes/WorldScene';
import { UIScene } from './scenes/UIScene';

/**
 * Intentional, documented test hook (see AGENTS.md): lets browser-test
 * tooling inspect scene state. It exposes no credentials or secrets.
 */
const gameInstance = new Phaser.Game(createGameConfig([BootScene, WorldScene, UIScene]));
if (typeof window !== 'undefined') {
  (window as unknown as { __coppergate: unknown }).__coppergate = {
    game: gameInstance,
    sceneKeys: Object.values(SCENES),
  };
}
