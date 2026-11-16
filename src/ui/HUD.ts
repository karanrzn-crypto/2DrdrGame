/**
 * HUD.ts — always-visible status: health, money, world clock.
 * Reads authoritative state (GameState + TimeSystem); owns no gameplay
 * state itself (master directive §15, §57).
 */
import Phaser from 'phaser';
import { GAME } from '../config/GameConfig';
import { game } from '../core/GameState';
import { TimeSystem, PHASE_VISUALS } from '../core/TimeSystem';
import { toFa, faMoney } from '../core/format';
import { PAL } from '../assets/Palette';

const FONT = 'Vazirmatn, Tahoma, Arial';

export class HUD {
  private healthBar: Phaser.GameObjects.Rectangle;
  private moneyText: Phaser.GameObjects.Text;
  private clockText: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene) {
    scene.add.image(18, 20, 'icon-heart').setScale(1.4);
    scene.add.rectangle(28, 16, 64, 10, 0x3a2c1a, 0.85).setOrigin(0, 0);
    this.healthBar = scene.add.rectangle(30, 18, 60, 6, 0xb0402c, 1).setOrigin(0, 0);

    scene.add.image(18, 40, 'icon-coin').setScale(1.4);
    this.moneyText = scene.add.text(30, 33, '', {
      fontFamily: FONT,
      fontSize: '14px',
      color: PAL.parchment,
      stroke: PAL.ink,
      strokeThickness: 3,
    }).setOrigin(0, 0);

    this.clockText = scene.add.text(GAME.width - 16, 14, '', {
      fontFamily: FONT,
      fontSize: '15px',
      color: PAL.parchment,
      stroke: PAL.ink,
      strokeThickness: 3,
    }).setOrigin(1, 0);
  }

  update(): void {
    this.healthBar.width = Math.max(2, 60 * (game.health / game.maxHealth));
    this.moneyText.setText(faMoney(game.money));

    const timeSys = this.scene.registry.get('timeSys') as TimeSystem | undefined;
    if (timeSys) {
      const phase = PHASE_VISUALS[timeSys.phase];
      this.clockText.setText(`روز ${toFa(timeSys.day)} — ${timeSys.clockLabel} · ${phase.label}`);
    }
  }
}
