/**
 * DialogueBox.ts — Persian dialogue on a framed parchment panel with a
 * typewriter effect and a name plate. Handles advance keys with a
 * start-delay guard so the same E press that opened the dialogue cannot
 * skip the first line.
 */
import Phaser from 'phaser';
import { GAME } from '../config/GameConfig';
import { events, EV } from '../core/EventBus';
import { DIALOGUES } from '../data/Dialogues';
import { PAL } from '../assets/Palette';

const FONT = 'Vazirmatn, Tahoma, Arial';
const CHAR_MS = 22;

export class DialogueBox {
  private panel: Phaser.GameObjects.Image;
  private namePlate: Phaser.GameObjects.Rectangle;
  private nameText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private hintText: Phaser.GameObjects.Text;
  private keyE: Phaser.Input.Keyboard.Key;
  private keyEnter: Phaser.Input.Keyboard.Key;

  private lines: string[] = [];
  private lineIdx = 0;
  private charsShown = 0;
  private lastCharAt = 0;
  private open = false;
  private openedAt = 0;

  constructor(private scene: Phaser.Scene) {
    const px = 130;
    const py = GAME.height - 140;
    const pw = 700;
    const ph = 116;

    this.panel = scene.add.image(px, py, 'ui-dialogue')
      .setOrigin(0, 0).setVisible(false);
    // name plate pinned to the top-right corner of the parchment
    this.namePlate = scene.add.rectangle(px + pw - 14, py + 12, 148, 24, 0x8a6f46, 0.92)
      .setOrigin(1, 0).setVisible(false);
    this.nameText = scene.add.text(px + pw - 20, py + 15, '', {
      fontFamily: FONT, fontSize: '14px', color: PAL.parchment,
      stroke: PAL.ink, strokeThickness: 2,
    }).setOrigin(1, 0).setVisible(false);
    this.bodyText = scene.add.text(px + pw - 20, py + 44, '', {
      fontFamily: FONT, fontSize: '15px', color: PAL.ink,
      wordWrap: { width: pw - 40 }, lineSpacing: 6, align: 'right',
    }).setOrigin(1, 0).setVisible(false);
    this.hintText = scene.add.text(px + 16, py + ph - 12, 'E / Enter — ادامه', {
      fontFamily: FONT, fontSize: '11px', color: PAL.parchmentDeep,
    }).setOrigin(0, 1).setVisible(false);

    this.keyE = scene.input.keyboard!.addKey('E');
    this.keyEnter = scene.input.keyboard!.addKey('ENTER');

    events.on(EV.DIALOGUE_OPEN, (payload: unknown) => {
      const { key } = payload as { key: string };
      this.openDialogue(key);
    });
  }

  private openDialogue(key: string): void {
    const entry = DIALOGUES[key];
    if (!entry) return;
    this.lines = [...entry.lines];
    this.lineIdx = 0;
    this.charsShown = 0;
    this.lastCharAt = this.scene.time.now;
    this.open = true;
    this.openedAt = this.scene.time.now;
    this.nameText.setText(entry.name);
    this.bodyText.setText('');
    this.panel.setVisible(true);
    this.namePlate.setVisible(true);
    this.nameText.setVisible(true);
    this.bodyText.setVisible(true);
    this.hintText.setVisible(true);
  }

  private close(): void {
    this.open = false;
    this.panel.setVisible(false);
    this.namePlate.setVisible(false);
    this.nameText.setVisible(false);
    this.bodyText.setVisible(false);
    this.hintText.setVisible(false);
    events.emit(EV.DIALOGUE_CLOSE);
  }

  update(now: number): void {
    if (!this.open) return;

    // typewriter
    const line = this.lines[this.lineIdx] ?? '';
    if (this.charsShown < line.length && now - this.lastCharAt >= CHAR_MS) {
      const step = Math.max(1, Math.floor((now - this.lastCharAt) / CHAR_MS));
      this.charsShown = Math.min(line.length, this.charsShown + step);
      this.lastCharAt = now;
      this.bodyText.setText(line.slice(0, this.charsShown));
    }

    // advance input (guarded for 180ms after opening)
    const pressed = Phaser.Input.Keyboard.JustDown(this.keyE)
      || Phaser.Input.Keyboard.JustDown(this.keyEnter);
    if (pressed && now - this.openedAt > 180) {
      if (this.charsShown < line.length) {
        this.charsShown = line.length;
        this.bodyText.setText(line);
      } else {
        this.lineIdx += 1;
        if (this.lineIdx >= this.lines.length) {
          this.close();
        } else {
          this.charsShown = 0;
          this.lastCharAt = now;
          this.bodyText.setText('');
        }
      }
    }
  }
}
