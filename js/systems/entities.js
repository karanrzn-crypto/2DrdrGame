/**
 * entities.js — بازیکن، NPCها و غلتک بیابان (tumbleweed).
 * برخورد پایه‌تایلی با حل جداگانهٔ X/Y → سُرخوردن نرم روی دیوار،
 * هیچ عبوری از ساختمان/آب/حصار ممکن نیست.
 */
import { TILE } from '../world/world.js';

export function solidAtPx(world, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= world.w || ty >= world.h) return true;
  return world.solid[world.idx(tx, ty)] === 1;
}

/** بررسی جعبهٔ پا (feet box) در مختصات مرکز-پایین. */
function boxBlocked(world, cx, cy, hw, hh) {
  return solidAtPx(world, cx - hw, cy - hh * 2)
    || solidAtPx(world, cx + hw, cy - hh * 2)
    || solidAtPx(world, cx - hw, cy)
    || solidAtPx(world, cx + hw, cy)
    || solidAtPx(world, cx, cy - hh * 2)
    || solidAtPx(world, cx, cy);
}

/** حرکت با جداسازی محورها. خروجی: واقعاً جابه‌جا شد؟ */
export function moveWithCollision(world, ent, dx, dy, dt) {
  const hw = 4.5, hh = 2.5;
  let moved = false;
  const nx = ent.x + dx * dt;
  if (!boxBlocked(world, nx, ent.y, hw, hh)) { ent.x = nx; moved = true; }
  const ny = ent.y + dy * dt;
  if (!boxBlocked(world, ent.x, ny, hw, hh)) { ent.y = ny; moved = true; }
  return moved;
}

const DIRS = ['down', 'up', 'left', 'right'];
const DIR_INDEX = { down: 0, up: 1, left: 2, right: 3 };

export class Player {
  constructor(world, spawn) {
    this.world = world;
    this.x = spawn.x;
    this.y = spawn.y;
    this.dir = 0;
    this.frame = 0;
    this.animT = 0;
    this.moving = false;
    this.running = false;
    this.speed = 74;
    this.runSpeed = 118;
    this.stepT = 0;
  }

  /** dt, ورودی (می‌تواند خالی باشد وقتی گفتگو باز است) */
  update(dt, mv, run) {
    this.moving = !!(mv[0] || mv[1]);
    this.running = this.moving && run;
    if (this.moving) {
      const sp = this.running ? this.runSpeed : this.speed;
      moveWithCollision(this.world, this, mv[0] * sp, mv[1] * sp, dt);
      // جهت غالب
      if (Math.abs(mv[0]) > Math.abs(mv[1])) this.dir = mv[0] > 0 ? 3 : 2;
      else this.dir = mv[1] > 0 ? 0 : 1;
      // انیمیشن
      this.animT += dt * (this.running ? 11 : 7.5);
      this.frame = 1 + (Math.floor(this.animT) % 3); // 1..3, چرخهٔ راه رفتن
      // گرد و خاک دویدن
      this.stepT -= dt;
      if (this.running && this.stepT <= 0) {
        this.stepT = 0.16;
        return 'dust';
      }
    } else {
      this.animT = 0;
      this.frame = 0;
    }
    return null;
  }

  get sheetIndex() { return this.dir * 4 + this.frame; }
}

export class Npc {
  constructor(world, def) {
    this.world = world;
    this.id = def.id;
    this.homeX = (def.tx + 0.5) * TILE;
    this.homeY = (def.ty + 0.5) * TILE;
    this.x = this.homeX;
    this.y = this.homeY;
    this.radius = def.wander;
    this.dir = 0;
    this.frame = 0;
    this.animT = 0;
    this.moving = false;
    this.target = null;
    this.waitT = 1 + Math.random() * 3;
    this.speed = 26;
  }

  update(dt, player) {
    // وقتی بازیکن نزدیک است رو به او بایست
    const pd = Math.hypot(player.x - this.x, player.y - this.y);
    if (pd < 40) {
      this.moving = false;
      this.frame = 0;
      this.dir = Math.abs(player.x - this.x) > Math.abs(player.y - this.y)
        ? (player.x > this.x ? 3 : 2)
        : (player.y > this.y ? 0 : 1);
      return;
    }
    if (this.target) {
      const dx = this.target[0] - this.x;
      const dy = this.target[1] - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 2) {
        this.target = null;
        this.moving = false;
        this.frame = 0;
        this.waitT = 2 + Math.random() * 4;
      } else {
        const vx = dx / d, vy = dy / d;
        moveWithCollision(this.world, this, vx * this.speed, vy * this.speed, dt);
        this.moving = true;
        this.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : (dy > 0 ? 0 : 1);
        this.animT += dt * 6;
        this.frame = 1 + (Math.floor(this.animT) % 3);
      }
    } else {
      this.moving = false;
      this.frame = 0;
      this.waitT -= dt;
      if (this.waitT <= 0) {
        // هدف نویزی در شعاع — فقط روی تایل آزاد
        for (let i = 0; i < 8; i++) {
          const ang = Math.random() * Math.PI * 2;
          const rr = Math.random() * this.radius;
          const tx = this.homeX + Math.cos(ang) * rr * TILE;
          const ty = this.homeY + Math.sin(ang) * rr * TILE;
          if (!boxBlocked(this.world, tx, ty, 4.5, 2.5)) {
            this.target = [tx, ty];
            break;
          }
        }
        if (!this.target) this.waitT = 2 + Math.random() * 3;
      }
    }
  }

  faceToward(px, py) {
    this.dir = Math.abs(px - this.x) > Math.abs(py - this.y)
      ? (px > this.x ? 3 : 2) : (py > this.y ? 0 : 1);
    this.frame = 0;
  }

  get sheetIndex() { return this.dir * 4 + this.frame; }
}

/** غلتک بیابان — افکت محیطی (§6): آرام، محدود به بدلندز. */
export class Tumbleweed {
  constructor(zone) {
    this.zone = zone;
    this.reset();
  }

  reset() {
    const z = this.zone;
    this.x = (z.x1 + Math.random() * (z.x2 - z.x1)) * TILE;
    this.y = (z.y1 + Math.random() * (z.y2 - z.y1)) * TILE;
    this.vx = 14 + Math.random() * 16;
    this.vy = 6 + Math.random() * 8;
    this.rot = 0;
    this.bob = 0;
    this.r = 4 + Math.random() * 3;
    this.wait = 6 + Math.random() * 20;
    this.active = false;
  }

  update(dt, world) {
    if (!this.active) {
      this.wait -= dt;
      if (this.wait <= 0) this.active = true;
      return;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rot += dt * (this.vx / this.r);
    this.bob = Math.abs(Math.sin(this.rot * 0.7)) * 2;
    const z = this.zone;
    if (this.x < z.x1 * TILE || this.x > z.x2 * TILE || this.y < z.y1 * TILE || this.y > z.y2 * TILE
      || solidAtPx(world, this.x, this.y + 4)) {
      this.reset();
    }
  }

  /** رسم چرخان — پیکسلی و سبک */
  render(ctx, cam, t) {
    if (!this.active) return;
    const sx = Math.round(this.x - cam.rx);
    const sy = Math.round(this.y - this.bob - cam.ry);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(this.rot * 0.5 + Math.sin(t * 0.001) * 0.2);
    ctx.strokeStyle = 'rgba(150,120,80,0.9)';
    ctx.lineWidth = 1;
    const r = this.r;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + 0.4;
      ctx.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
      ctx.lineTo(Math.cos(a + 2.2) * r * 0.9, Math.sin(a + 2.2) * r * 0.9);
    }
    ctx.stroke();
    ctx.restore();
  }
}
