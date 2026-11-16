/**
 * UIScene.ts — screen-space interface layer: HUD, interaction prompt,
 * dialogue box, pause overlay and the location banner.
 * Runs in parallel with WorldScene; communicates only through EventBus
 * and the shared TimeSystem reference (registry).
 */
import Phaser from 'phaser';
import { GAME, SCENES } from '../config/GameConfig';
import { events, EV } from '../core/EventBus';
import { PAL } from '../assets/Palette';
import { HUD } from '../ui/HUD';
import { DialogueBox } from '../ui/DialogueBox';

const FONT = 'Vazirmatn, Tahoma, Arial';

export class UIScene extends Phaser.Scene {
  private hud!: HUD;
  private dialogue!: DialogueBox;
  private promptText!: Phaser.GameObjects.Text;
  private pauseOverlay!: Phaser.GameObjects.Container;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private pauseWasVisiblePrevFrame = false;
  private cleanups: Array<() => void> = [];

  constructor() {
    super(SCENES.UI);
  }

  create(): void {
    this.hud = new HUD(this);
    this.dialogue = new DialogueBox(this);

    // Interaction hint (bottom center)
    this.promptText = this.add.text(GAME.width / 2, GAME.height - 148, '', {
      fontFamily: FONT,
      fontSize: '14px',
      color: PAL.parchment,
      backgroundColor: '#1e180ecf',
      padding: { x: 12, y: 5 },
    }).setOrigin(0.5, 1).setVisible(false);

    this.cleanups.push(events.on(EV.INTERACT_PROMPT, (payload: unknown) => {
      const data = payload as { text: string } | null;
      if (data && data.text) {
        this.promptText.setText(`E — ${data.text}`).setVisible(true);
      } else {
        this.promptText.setVisible(false);
      }
    }));

    // Pause overlay
    this.pauseOverlay = this.buildPauseOverlay();
    this.pauseOverlay.setVisible(false);
    this.cleanups.push(events.on(EV.PAUSE_STATE, (payload: unknown) => {
      const { paused } = payload as { paused: boolean };
      this.pauseOverlay.setVisible(paused);
    }));

    this.keyEsc = this.input.keyboard!.addKey('ESC');

    // Location banner (fades out)
    this.buildLocationBanner();

    this.events.once('shutdown', () => {
      this.cleanups.forEach((off) => off());
      this.cleanups = [];
    });
  }

  private buildPauseOverlay(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    const dim = this.add.rectangle(0, 0, GAME.width, GAME.height, 0x0a0805, 0.72).setOrigin(0);
    const title = this.add.text(GAME.width / 2, 200, 'مکث', {
      fontFamily: FONT, fontSize: '44px', color: PAL.parchment,
    }).setOrigin(0.5);
    const controls = this.add.text(GAME.width / 2, 268,
      'WASD / کلیدهای جهت — حرکت      Shift — دویدن\nE — تعامل      Enter — ادامهٔ دیالوگ      Esc — بازگشت', {
      fontFamily: FONT, fontSize: '15px', color: PAL.parchment,
      align: 'center', lineSpacing: 8,
    }).setOrigin(0.5);
    const hint = this.add.text(GAME.width / 2, 340, 'برای ادامه Esc را بزنید', {
      fontFamily: FONT, fontSize: '13px', color: PAL.parchmentDark,
    }).setOrigin(0.5);
    c.add([dim, title, controls, hint]);
    return c;
  }

  private buildLocationBanner(): void {
    const title = this.add.text(GAME.width / 2, 108, 'COPPERGATE', {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '46px',
      color: PAL.parchment,
      stroke: PAL.ink,
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);
    const sub = this.add.text(GAME.width / 2, 150, 'دروازهٔ مسی — مسیر غربی شهر', {
      fontFamily: FONT, fontSize: '17px', color: PAL.parchmentDark,
      stroke: PAL.ink, strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: title, alpha: 1, duration: 900, delay: 400 });
    this.tweens.add({ targets: sub, alpha: 1, duration: 900, delay: 700 });
    this.tweens.add({ targets: [title, sub], alpha: 0, duration: 1400, delay: 4200 });
  }

  override update(_time: number, _delta: number): void {
    this.hud.update();
    this.dialogue.update(_time);

    // Resume from pause (WorldScene is paused, so only UI sees this key).
    // Guard: only react when the overlay was already visible on a PREVIOUS
    // frame — otherwise the same ESC press that triggered the pause would
    // also resume it instantly (both scenes share the same key event).
    const visibleNow = this.pauseOverlay.visible;
    const escPressed = Phaser.Input.Keyboard.JustDown(this.keyEsc);
    if (visibleNow && this.pauseWasVisiblePrevFrame && escPressed) {
      this.pauseOverlay.setVisible(false);
      events.emit(EV.PAUSE_STATE, { paused: false });
      this.scene.resume(SCENES.WORLD);
    }
    this.pauseWasVisiblePrevFrame = visibleNow;
  }
}
