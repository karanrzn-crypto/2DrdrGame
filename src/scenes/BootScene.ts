/**
 * BootScene.ts — generates every original texture procedurally, prepares
 * animations, waits for the Persian web font, then starts the game.
 */
import Phaser from 'phaser';
import { SCENES } from '../config/GameConfig';
import { buildTileSheet } from '../assets/TileFactory';
import {
  buildCharSheet, createCharAnims,
  ELI_LOOK, PETE_LOOK, TRAVELER_LOOK,
} from '../assets/CharFactory';
import { buildAllProps } from '../assets/PropFactory';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  create(): void {
    buildTileSheet(this);
    buildCharSheet(this, 'char-eli', ELI_LOOK);
    buildCharSheet(this, 'char-pete', PETE_LOOK);
    buildCharSheet(this, 'char-traveler', TRAVELER_LOOK);
    createCharAnims(this, 'char-eli');
    createCharAnims(this, 'char-pete');
    createCharAnims(this, 'char-traveler');
    buildAllProps(this);

    const start = (): void => {
      document.getElementById('loading')?.classList.add('hidden');
      this.scene.start(SCENES.WORLD);
      this.scene.launch(SCENES.UI);
    };

    // Wait for the Persian web font so UI text renders correctly,
    // but never block the game for more than 1.5s (fallback: Tahoma).
    let started = false;
    const startOnce = (): void => {
      if (started) return;
      started = true;
      start();
    };
    Promise.race([
      document.fonts.load('16px Vazirmatn'),
      new Promise((res) => setTimeout(res, 1500)),
    ]).then(startOnce, startOnce);
  }
}
