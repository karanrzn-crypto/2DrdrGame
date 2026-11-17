/**
 * NPC.ts — Phase-1 minimal NPC: identity fields that matter now
 * (id, dialogue, wander) with a tiny idle/walk behavior model.
 * Full schedules, perception and simulation levels arrive in Phase 3
 * (documented in docs/DEVELOPMENT_ROADMAP.md).
 */
import Phaser from 'phaser';
import { DIR, Dir } from '../assets/CharFactory';
import { ParsedMap, isWalkable } from '../world/MapData';

const WALK_SPEED = 30;

export class Npc {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly map: ParsedMap;
  private readonly homeX: number;
  private readonly homeY: number;
  private readonly wanderRadius: number;
  private targetX = 0;
  private targetY = 0;
  private state: 'idle' | 'walk' = 'idle';
  private timer = 1.5;
  private facing: Dir = DIR.DOWN;
  private walkAnimKey: string;

  constructor(
    scene: Phaser.Scene,
    public readonly id: string,
    sheetKey: string,
    x: number,
    y: number,
    wanderRadius: number,
    map: ParsedMap,
  ) {
    this.homeX = x;
    this.homeY = y;
    this.wanderRadius = wanderRadius;
    this.map = map;
    this.walkAnimKey = sheetKey;
    this.sprite = scene.physics.add.sprite(x, y, sheetKey).setOrigin(0.5, 1);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 8);
    body.setOffset(4, 18);
    body.setCollideWorldBounds(true);
    body.setDrag(400, 400);
    this.shadow = scene.add.image(x, y, 'shadow').setAlpha(0.35);
    this.sprite.play(`${sheetKey}-idle-${DIR.DOWN}`, true);
  }

  /** Max speed clamp — also guarantees frozen-safe velocity. */
  freeze(): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    this.state = 'idle';
    this.timer = 2;
  }

  update(deltaMs: number): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const dt = Math.min(deltaMs, 50) / 1000;

    if (this.state === 'idle') {
      body.setVelocity(0, 0);
      this.timer -= dt;
      if (this.timer <= 0) {
        // Pick a reachable wander target inside the radius.
        for (let attempt = 0; attempt < 8; attempt++) {
          const ang = Math.random() * Math.PI * 2;
          const dist = Math.random() * this.wanderRadius * 16;
          const nx = this.homeX + Math.cos(ang) * dist;
          const ny = this.homeY + Math.sin(ang) * dist;
          const tx = Math.floor(nx / 16);
          const ty = Math.floor(ny / 16);
          if (isWalkable(this.map, tx, ty)) {
            this.targetX = nx;
            this.targetY = ny;
            this.state = 'walk';
            break;
          }
        }
        if (this.state !== 'walk') this.timer = 2;
      }
    } else {
      const dx = this.targetX - this.sprite.x;
      const dy = (this.targetY - this.sprite.y);
      const d = Math.hypot(dx, dy);
      if (d < 4 || this.timerExceeded(dt)) {
        this.state = 'idle';
        this.timer = 1.5 + Math.random() * 3.5;
        body.setVelocity(0, 0);
      } else {
        const vx = (dx / d) * WALK_SPEED;
        const vy = (dy / d) * WALK_SPEED;
        body.setVelocity(vx, vy);
        this.facing = Math.abs(dx) >= Math.abs(dy)
          ? (dx > 0 ? DIR.RIGHT : DIR.LEFT)
          : (dy > 0 ? DIR.DOWN : DIR.UP);
        const want = `${this.walkAnimKey}-walk-${this.facing}`;
        if (this.sprite.anims.currentAnim?.key !== want) this.sprite.play(want, true);
      }
    }

    if (this.state === 'idle') {
      const want = `${this.walkAnimKey}-idle-${this.facing}`;
      if (this.sprite.anims.currentAnim?.key !== want) this.sprite.play(want, true);
    }

    this.sprite.setDepth(this.sprite.y);
    this.shadow.setPosition(this.sprite.x, this.sprite.y - 1);
    this.shadow.setDepth(this.sprite.y - 0.5);
  }

  /** Guard so a stuck NPC gives up instead of walking into walls forever. */
  private walkElapsed = 0;
  private timerExceeded(dt: number): boolean {
    this.walkElapsed += dt;
    if (this.walkElapsed > 4) {
      this.walkElapsed = 0;
      return true;
    }
    return false;
  }
}
