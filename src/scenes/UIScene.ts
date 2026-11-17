/**
 * UIScene.ts — screen-space interface layer: HUD, interaction prompt,
 * dialogue box, pause overlay and the location banner — all drawn on the
 * western panel art (parchment + wood + brass). Runs in parallel with
 * WorldScene; communicates only through EventBus and the shared TimeSystem
 * reference (registry).
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
  private promptBox!: Phaser.GameObjects.Container;
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

    // Interaction hint: wooden keycap + parchment-backed text (bottom center)
    this.promptBox = this.buildPromptBox();
    this.promptBox.setVisible(false);
    this.cleanups.push(events.on(EV.INTERACT_PROMPT, (payload: unknown) => {
      const data = payload as { text: string } | null;
      if (data && data.text) {
        this.setPromptText(`— ${data.text}`);
        this.promptBox.setVisible(true);
      } else {
        this.promptBox.setVisible(false);
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

  /**
   * Keycap + text with a dark walnut backdrop (Text.backgroundColor scales
   * with the glyphs, so the panel always hugs the prompt). NOTE: never use a
   * dynamic-width Rectangle here — Phaser 4 keeps the origin offset from the
   * stale width, which renders the fill detached from the text.
   */
  private buildPromptBox(): Phaser.GameObjects.Container {
    const c = this.add.container(GAME.width / 2, GAME.height - 176);
    const key = this.add.image(0, 0, 'ui-keycap').setOrigin(1, 0.5).setX(-12);
    const text = this.add.text(-18, 0, '', {
      fontFamily: FONT, fontSize: '14px', color: PAL.parchment,
      backgroundColor: '#241a10d9',
      padding: { x: 10, y: 6 },
    }).setOrigin(1, 0.5);
    c.add([text, key]);
    (c as unknown as { setText: (t: string) => void }).setText = (t: string) => {
      text.setText(t);
    };
    return c;
  }

  private setPromptText(t: string): void {
    (this.promptBox as unknown as { setText: (t: string) => void }).setText(t);
  }

  private buildPauseOverlay(): Phaser.GameObjects.Container {
    const c = this.add.container(0, 0);
    const dim = this.add.rectangle(0, 0, GAME.width, GAME.height, 0x0a0805, 0.72).setOrigin(0);
    const panel = this.add.image(GAME.width / 2, 240, 'ui-pause').setOrigin(0.5);
    const title = this.add.text(GAME.width / 2, 190, 'استراحت', {
      fontFamily: FONT, fontSize: '42px', color: PAL.ink,
    }).setOrigin(0.5);
    const controls = this.add.text(GAME.width / 2, 262,
      'WASD / کلیدهای جهت — حرکت      Shift — دویدن\nE — تعامل      Enter — ادامهٔ دیالوگ      Esc — بازگشت', {
      fontFamily: FONT, fontSize: '15px', color: PAL.ink,
      align: 'center', lineSpacing: 8,
    }).setOrigin(0.5);
    const hint = this.add.text(GAME.width / 2, 330, 'برای ادامه Esc را بزنید', {
      fontFamily: FONT, fontSize: '13px', color: PAL.parchmentDeep,
    }).setOrigin(0.5);
    c.add([dim, panel, title, controls, hint]);
    return c;
  }

  /** Town title card on arrival — fades in, holds, fades out. */
  private buildLocationBanner(): void {
    const banner = this.add.image(GAME.width / 2, 128, 'ui-banner').setOrigin(0.5).setAlpha(0);
    const title = this.add.text(GAME.width / 2, 112, 'کوپرگیت', {
      fontFamily: FONT, fontSize: '38px', color: PAL.ink,
    }).setOrigin(0.5).setAlpha(0);
    const sub = this.add.text(GAME.width / 2, 158, 'درهٔ مس — ۱۸۷۳', {
      fontFamily: FONT, fontSize: '15px', color: PAL.parchmentDeep,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: [banner, title, sub],
      alpha: 1,
      duration: 800,
      delay: 300,
      onComplete: () => {
        this.tweens.add({
          targets: [banner, title, sub],
          alpha: 0,
          delay: 2600,
          duration: 900,
          onComplete: () => {
            banner.destroy();
            title.destroy();
            sub.destroy();
          },
        });
      },
    });
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
