/**
 * Player.ts — Eli Boone: movement with acceleration/drag, a small explicit
 * state model and animation that always agrees with the real state
 * (master directive §21, §22, §53).
 */
import Phaser from 'phaser';
import { GAME } from '../config/GameConfig';
import { DIR, Dir } from '../assets/CharFactory';

export type PlayerState = 'idle' | 'walk' | 'run' | 'frozen';

interface KeySet {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
  UP: Phaser.Input.Keyboard.Key;
  LEFT: Phaser.Input.Keyboard.Key;
  DOWN: Phaser.Input.Keyboard.Key;
  RIGHT: Phaser.Input.Keyboard.Key;
  SHIFT: Phaser.Input.Keyboard.Key;
}

export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly keys: KeySet;
  private facing: Dir = DIR.DOWN;
  private state: PlayerState = 'idle';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, 'char-eli').setOrigin(0.5, 1);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    // Small feet-level collision box; the head may overlap building tops.
    body.setSize(10, 8);
    body.setOffset(4, 18);
    body.setCollideWorldBounds(true);
    body.setAcceleration(0, 0);
    body.setDrag(GAME.drag, GAME.drag);
    body.setMaxVelocity(GAME.walkSpeed, GAME.walkSpeed);

    this.shadow = scene.add.image(x, y, 'shadow').setAlpha(0.4);
    // Start on the first frame (18x26) instead of the whole sheet.
    this.sprite.setFrame('0');

    this.keys = scene.input.keyboard!.addKeys(
      'W,A,S,D,UP,LEFT,DOWN,RIGHT,SHIFT',
    ) as unknown as KeySet;
  }

  /** Freeze/unfreeze (dialogue, pause, focus loss). */
  setFrozen(frozen: boolean): void {
    if (frozen) {
      this.state = 'frozen';
      const body = this.sprite.body as Phaser.Physics.Arcade.Body;
      body.setAcceleration(0, 0);
      body.setVelocity(0, 0);
    } else {
      this.state = 'idle';
    }
  }

  /** Zero all held input (used when the browser window loses focus). */
  clearInput(): void {
    for (const k of Object.values(this.keys)) k.isDown = false;
    this.setFrozen(true);
    this.setFrozen(false);
  }

  update(): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (this.state === 'frozen') {
      this.playIdle();
      return;
    }

    const k = this.keys;
    const ix = (k.A.isDown || k.LEFT.isDown ? -1 : 0) + (k.D.isDown || k.RIGHT.isDown ? 1 : 0);
    const iy = (k.W.isDown || k.UP.isDown ? -1 : 0) + (k.S.isDown || k.DOWN.isDown ? 1 : 0);

    const running = k.SHIFT.isDown && (ix !== 0 || iy !== 0);
    const speed = running ? GAME.runSpeed : GAME.walkSpeed;
    body.setMaxVelocity(speed, speed);

    // Diagonal movement normalized (directive §21).
    let ax = 0;
    let ay = 0;
    if (ix !== 0 || iy !== 0) {
      const len = Math.hypot(ix, iy);
      ax = (ix / len) * GAME.acceleration;
      ay = (iy / len) * GAME.acceleration;
      this.facing = Math.abs(ix) >= Math.abs(iy)
        ? (ix > 0 ? DIR.RIGHT : DIR.LEFT)
        : (iy > 0 ? DIR.DOWN : DIR.UP);
    }
    body.setAcceleration(ax, ay);

    // State + animation follow the *actual* velocity, never the intent.
    const vx = body.velocity.x;
    const vy = body.velocity.y;
    const moving = Math.hypot(vx, vy) > 8;
    this.state = moving ? (running ? 'run' : 'walk') : 'idle';
    this.applyAnim();
  }

  private applyAnim(): void {
    const anims = this.sprite.anims;
    if (this.state === 'idle') {
      this.playIdle();
      return;
    }
    const want = `char-eli-${this.state}-${this.facing}`;
    if (anims.currentAnim?.key !== want) {
      this.sprite.play(want, true);
    }
  }

  private playIdle(): void {
    const want = `char-eli-idle-${this.facing}`;
    if (this.sprite.anims.currentAnim?.key !== want) {
      this.sprite.play(want, true);
    }
  }

  /** World-space helpers used by systems. */
  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }
  get isRunning(): boolean { return this.state === 'run'; }

  /** Depth sorting + shadow follow; called after physics step. */
  postUpdate(): void {
    this.sprite.setDepth(this.sprite.y);
    this.shadow.setPosition(this.sprite.x, this.sprite.y - 1);
    this.shadow.setDepth(this.sprite.y - 0.5);
  }
}
