/**
 * HUD.ts — always-visible status: health, money, world clock, drawn on
 * western panel art (leather strap, parchment chips) instead of flat
 * rectangles. Reads authoritative state (GameState + TimeSystem); owns no
 * gameplay state itself.
 */
import Phaser from 'phaser';
import { GAME } from '../config/GameConfig';
import { game } from '../core/GameState';
import { TimeSystem, PHASE_VISUALS } from '../core/TimeSystem';
import { toFa, faMoney } from '../core/format';
import { PAL } from '../assets/Palette';

const FONT = 'Vazirmatn, Tahoma, Arial';

export class HUD {
  private healthFill: Phaser.GameObjects.Rectangle;
  private moneyText: Phaser.GameObjects.Text;
  private clockText: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene) {
    // health: leather strap top-left with a fill bar inside the slot
    scene.add.image(16, 14, 'ui-health').setOrigin(0, 0);
    this.healthFill = scene.add.rectangle(24, 20, 112, 10, parseInt(PAL.health.slice(1), 16), 1)
      .setOrigin(0, 0);

    // money: parchment chip with a coin
    scene.add.image(16, 46, 'ui-chip-money').setOrigin(0, 0);
    scene.add.image(38, 64, 'icon-coin').setScale(1.6);
    this.moneyText = scene.add.text(54, 54, '', {
      fontFamily: FONT,
      fontSize: '15px',
      color: PAL.ink,
    }).setOrigin(0, 0);

    // clock: parchment chip top-right (RTL page — the natural first corner)
    scene.add.image(GAME.width - 16, 14, 'ui-chip-clock').setOrigin(1, 0);
    this.clockText = scene.add.text(GAME.width - 26, 22, '', {
      fontFamily: FONT,
      fontSize: '15px',
      color: PAL.ink,
    }).setOrigin(1, 0);
  }

  update(): void {
    const hp = Math.max(0, game.health / game.maxHealth);
    this.healthFill.width = Math.max(2, 112 * hp);
    // the strap darkens as health drops
    this.healthFill.fillColor = hp > 0.35 ? parseInt(PAL.health.slice(1), 16) : 0x7d2a20;
    this.moneyText.setText(faMoney(game.money));

    const timeSys = this.scene.registry.get('timeSys') as TimeSystem | undefined;
    if (timeSys) {
      const phase = PHASE_VISUALS[timeSys.phase];
      this.clockText.setText(`روز ${toFa(timeSys.day)} — ${timeSys.clockLabel} · ${phase.label}`);
    }
  }
}
