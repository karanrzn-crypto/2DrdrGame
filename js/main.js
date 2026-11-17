/**
 * main.js — بوت، حلقهٔ بازی و خط لولهٔ رندر.
 * موتور: Canvas 2D خالص — بدون WebGL، بدون Phaser → کل کلاس باگ‌های بوتِ
 * نسخه‌های قبلی (پروب GPU، بوم بیرون viewport، import مرده) از ریشه حذف شده.
 * رندر: پیکسل‌پرفکت (زوم صحیح عددی)، چانک‌های ازپیش‌رندر، Y-sort، نور لایه‌ای.
 */
import { Input } from './engine/input.js';
import { Camera } from './engine/camera.js';
import { PAL, faText, FONT } from './art/palette.js';
import { TILE, WORLD_W, WORLD_H, buildWorld } from './world/world.js';
import { TerrainPainter } from './art/terrain.js';
import { buildBuildingSprites } from './art/buildings.js';
import { buildPropSprites } from './art/props.js';
import { buildCharSheets } from './art/chars.js';
import { TimeSystem } from './systems/time.js';
import { Lighting } from './systems/lighting.js';
import { DialogueSystem } from './systems/dialogue.js';
import { InteractionSystem } from './systems/interact.js';
import { HUD } from './systems/hud.js';
import { Player, Npc, Tumbleweed } from './systems/entities.js';

/* ---------- وضعیت سراسری ---------- */
const G = {
  world: null, painter: null,
  buildingSprites: null, propSprites: null, charSheets: null,
  input: null, camera: null, time: null, lighting: null,
  dialogue: null, interact: null, hud: null,
  player: null, npcs: [], tumble: [],
  particles: [],
  canvas: null, ctx: null,
  viewW: 0, viewH: 0, zoom: 3,
  fps: 60, fpsAcc: 0, fpsN: 0,
  t: 0,
  money: 42,
  health: 6, maxHealth: 6,
  debug: new URLSearchParams(location.search).has('debug'),
};

/* ---------- ابزار ---------- */
function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function loadFont() {
  try {
    await Promise.race([
      document.fonts.load(`12px ${FONT}`),
      wait(2500),
    ]);
    await document.fonts.load(`10px ${FONT}`);
  } catch (e) { /* فونت سیستمی جایگزین می‌شود */ }
}

function setProgress(msg) {
  const el = document.querySelector('#loading .msg');
  if (el) el.textContent = msg;
}

/* ---------- اندازه و زوم ---------- */
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const zoom = Math.max(2, Math.min(6, Math.floor(Math.min(w / 420, h / 240))));
  G.zoom = zoom;
  G.viewW = Math.ceil(w / zoom);
  G.viewH = Math.ceil(h / zoom);
  const cv = G.canvas;
  cv.width = G.viewW;
  cv.height = G.viewH;
  cv.style.width = `${G.viewW * zoom}px`;
  cv.style.height = `${G.viewH * zoom}px`;
  G.ctx.imageSmoothingEnabled = false;
  G.camera.resize(G.viewW, G.viewH, WORLD_W, WORLD_H);
  G.lighting.resize(G.viewW, G.viewH);
  G.dialogue.resize(G.viewW, G.viewH);
  G.hud.resize(G.viewW, G.viewH);
}

/* ---------- ذرات ---------- */
function spawnDust(x, y) {
  if (G.particles.length > 140) return;
  G.particles.push({
    x: x + (Math.random() - 0.5) * 6, y,
    vx: (Math.random() - 0.5) * 8, vy: -6 - Math.random() * 6,
    life: 0.5 + Math.random() * 0.3, t: 0,
    size: 1 + (Math.random() * 2 | 0),
    color: 'rgba(176,146,104,',
  });
}

function spawnSmoke(x, y) {
  if (G.particles.length > 140) return;
  G.particles.push({
    x: x + (Math.random() - 0.5) * 3, y: y - 8,
    vx: (Math.random() - 0.5) * 4 + 3, vy: -9 - Math.random() * 5,
    life: 1.6 + Math.random() * 0.8, t: 0,
    size: 2, color: 'rgba(150,150,150,',
  });
}

function updateParticles(dt) {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.t += dt;
    if (p.t >= p.life) { G.particles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy *= 0.98;
  }
}

function renderParticles(ctx, cam) {
  for (const p of G.particles) {
    const a = (1 - p.t / p.life) * 0.45;
    ctx.fillStyle = p.color + a.toFixed(2) + ')';
    ctx.fillRect(Math.round(p.x - cam.rx), Math.round(p.y - cam.ry), p.size, p.size);
  }
}

/* ---------- رندر دنیا ---------- */
function renderWorld(ctx, cam) {
  // چانک‌ها
  const c0x = Math.max(0, Math.floor(cam.rx / 256));
  const c0y = Math.max(0, Math.floor(cam.ry / 256));
  const c1x = Math.min(G.painter.cols - 1, Math.floor((cam.rx + G.viewW) / 256));
  const c1y = Math.min(G.painter.rows - 1, Math.floor((cam.ry + G.viewH) / 256));
  for (let cy = c0y; cy <= c1y; cy++) {
    for (let cx = c0x; cx <= c1x; cx++) {
      ctx.drawImage(G.painter.chunk(cx, cy), cx * 256 - cam.rx, cy * 256 - cam.ry);
    }
  }

  // برق آب — لرزش ظریف (§6)
  const t = G.t;
  ctx.fillStyle = 'rgba(150,200,210,0.35)';
  for (const [tx, ty] of G.world.waterTiles) {
    const sx = tx * TILE - cam.rx, sy = ty * TILE - cam.ry;
    if (sx < -20 || sy < -20 || sx > G.viewW + 20 || sy > G.viewH + 20) continue;
    const ph = t * 0.0009 + tx * 0.9 + ty * 1.7;
    if (Math.sin(ph) > 0.45) {
      ctx.fillRect(sx + ((tx * 7 + ty * 13) % 11), sy + ((ty * 5 + tx) % 13), 3, 1);
    }
    if (Math.sin(ph * 1.7 + 2) > 0.8) {
      ctx.fillRect(sx + ((tx * 3 + ty * 9) % 9), sy + ((ty * 7) % 12), 2, 1);
    }
  }

  /* فهرست رسم با Y-sort */
  const draws = [];
  for (const p of G.world.props) {
    const w = p.w || 1, h = p.h || 1;
    const bx = (p.tx + w / 2) * TILE;
    const by = (p.ty + h) * TILE;
    if (bx < cam.rx - 96 || bx > cam.rx + G.viewW + 96 || by < cam.ry - 96 || by > cam.ry + G.viewH + 160) continue;
    draws.push({ kind: 'prop', p, y: by });
  }
  for (const b of G.world.buildings) {
    const by = (b.y + b.h) * TILE;
    if (b.x * TILE < cam.rx - 320 || (b.x + b.w) * TILE > cam.rx + G.viewW + 320
      || by < cam.ry - 200 || b.y * TILE > cam.ry + G.viewH + 120) continue;
    draws.push({ kind: 'bld', b, y: by });
  }
  for (const n of G.npcs) {
    if (n.x < cam.rx - 48 || n.x > cam.rx + G.viewW + 48 || n.y < cam.ry - 48 || n.y > cam.ry + G.viewH + 64) continue;
    draws.push({ kind: 'npc', n, y: n.y });
  }
  draws.push({ kind: 'player', y: G.player.y });
  draws.sort((a, b) => a.y - b.y);

  for (const d of draws) {
    if (d.kind === 'prop') {
      const p = d.p;
      const key = p.type === 'trough' ? (p.water ? 'trough_water' : 'trough_dry')
        : p.type === 'sign' ? 'sign_' + p.text
        : p.type;
      const sp = G.propSprites.get(key);
      if (!sp) continue;
      let frame = 0;
      if (p.type === 'campfire') frame = Math.floor(t / 160) % 3;
      else if (p.type === 'windmill') frame = Math.floor(t / 150) % 4;
      else if (p.type === 'sheep') frame = Math.floor(t / 900 + p.tx) % 2;
      else if (p.type === 'horse') frame = Math.floor(t / 700 + p.tx) % 2;
      else if (p.type === 'reed') frame = Math.floor(t / 500 + p.ty) % 2;
      else if (p.type === 'lamppost') frame = Lighting.darknessAt(G.time.minutes) > 0.3 ? 1 : 0;
      else if (p.type === 'cactus_saguaro' || p.type === 'cactus_pear' || p.type === 'cactus_agave'
        || p.type === 'rock_small' || p.type === 'rock_big' || p.type === 'tree_pine'
        || p.type === 'tree_oak' || p.type === 'bush_sage' || p.type === 'bush_dry'
        || p.type === 'bush_flower' || p.type === 'tree_dead') {
        frame = (p.tx * 7 + p.ty * 13) % sp.frames.length;
      }
      const cv = sp.frames[frame % sp.frames.length];
      const cx0 = (p.tx + (p.w || 1) / 2) * TILE;
      const flipped = !!p.flip;
      ctx.save();
      if (flipped) {
        ctx.translate(Math.round(cx0 - cam.rx), Math.round(d.y - cam.ry));
        ctx.scale(-1, 1);
        ctx.drawImage(cv, -Math.round(sp.ax), -Math.round(sp.ay));
      } else {
        ctx.drawImage(cv,
          Math.round(cx0 - sp.ax - cam.rx),
          Math.round(d.y - sp.ay - cam.ry));
      }
      ctx.restore();
    } else if (d.kind === 'bld') {
      const sp = G.buildingSprites.get(d.b.type);
      if (!sp) continue;
      ctx.drawImage(sp.cv,
        Math.round(d.b.x * TILE + sp.dx - cam.rx),
        Math.round(d.b.y * TILE + sp.dy - cam.ry));
    } else {
      const ent = d.kind === 'player' ? G.player : d.n;
      const sheetId = d.kind === 'player' ? 'player' : ent.id;
      const frames = G.charSheets[sheetId];
      if (!frames) continue;
      // سایه
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(Math.round(ent.x - cam.rx), Math.round(ent.y - cam.ry) + 1, 6, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      const cv = frames[ent.sheetIndex];
      ctx.drawImage(cv, Math.round(ent.x - 8 - cam.rx), Math.round(ent.y - 21 - cam.ry));
    }
  }

  // غلتک‌های بیابان
  for (const tw of G.tumble) tw.render(ctx, cam, t);

  renderParticles(ctx, cam);
}

/* ---------- نورپردازی ---------- */
function collectLights() {
  const dark = Lighting.darknessAt(G.time.minutes);
  const lights = [];
  if (dark > 0.28) {
    for (const L of G.world.lamps) lights.push({ x: L.x, y: L.y - 10, r: 52, warm: true, fl: G.t });
    for (const L of G.world.windowLights) lights.push({ x: L.x, y: L.y - 6, r: 26, warm: true });
  }
  for (const F of G.world.fires) {
    lights.push({ x: F.x, y: F.y - 4, r: 44, warm: true, fl: G.t });
  }
  // نور ملایم اطراف بازیکن در تاریکی (خوانایی بدون شکستن پیکسل)
  if (dark > 0.3) lights.push({ x: G.player.x, y: G.player.y - 8, r: 58, warm: false });
  return lights;
}

/* ---------- حلقه ---------- */
let lastT = 0;
function loop(ms) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (ms - lastT) / 1000 || 0.016);
  lastT = ms;
  G.t = ms;
  G.fpsAcc += dt; G.fpsN++;
  if (G.fpsAcc >= 0.5) { G.fps = Math.round(G.fpsN / G.fpsAcc); G.fpsAcc = 0; G.fpsN = 0; }

  update(dt);
  render();
  G.input.endFrame();
}

function update(dt) {
  G.time.advance(dt);
  G.dialogue.update(dt);
  G.hud.update(dt);

  const input = G.input;
  // گفتگو: ورودی تعامل و ESC
  if (G.dialogue.open) {
    input.setCapture(true);
    if (input.wasPressed('e', ' ', 'Space', 'Enter')) G.dialogue.advance();
    if (input.wasPressed('Escape')) G.dialogue.cancel();
  } else {
    input.setCapture(false);
    const sel = G.interact.update(G.player.x, G.player.y);
    G.hud.hint = sel ? sel.prompt : null;
    if (sel && input.wasPressed('e', ' ', 'Space', 'Enter') && G.dialogue.canInteract) {
      const npc = sel.npc ? G.npcs.find((n) => n.id === sel.npc) : null;
      if (npc) npc.faceToward(G.player.x, G.player.y);
      G.dialogue.start(sel.dialogue);
    }
  }

  // بازیکن و NPCها
  const mv = input.moveVector();
  const run = input.isDown('Shift');
  if (G.player.update(dt, mv, run) === 'dust') spawnDust(G.player.x, G.player.y - 2);
  for (const n of G.npcs) n.update(dt, G.player);

  // دود آتش‌ها
  if (Math.floor(G.t / 380) !== Math.floor((G.t - dt * 1000) / 380)) {
    for (const F of G.world.fires) spawnSmoke(F.x, F.y);
  }

  for (const tw of G.tumble) tw.update(dt, G.world);
  updateParticles(dt);

  G.camera.follow(G.player.x, G.player.y - 8, dt);
}

function render() {
  const ctx = G.ctx;
  const cam = G.camera;
  ctx.fillStyle = '#171009';
  ctx.fillRect(0, 0, G.viewW, G.viewH);
  renderWorld(ctx, cam);
  G.lighting.render(ctx, G.time.minutes, collectLights(), cam);
  G.hud.render(ctx, {
    health: G.health, maxHealth: G.maxHealth,
    money: G.money, dialogOpen: G.dialogue.open,
  }, G.time);
  G.dialogue.render(ctx);
  if (G.debug) {
    faText(ctx, `${G.fps} fps`, 8, 10, 11, '#8fdc8f', 'left');
    faText(ctx, `${Math.round(G.player.x)},${Math.round(G.player.y)}`, 8, 24, 11, '#8fdc8f', 'left');
  }
}

/* ---------- بوت ---------- */
async function boot() {
  setProgress('بارگذاری فونت…');
  await loadFont();

  setProgress('ساخت دنیا…');
  const world = buildWorld();
  G.world = world;

  setProgress('نقاشی زمین…');
  G.painter = new TerrainPainter(world);
  const total = G.painter.cols * G.painter.rows;
  let done = 0;
  for (let cy = 0; cy < G.painter.rows; cy++) {
    for (let cx = 0; cx < G.painter.cols; cx++) {
      G.painter.chunk(cx, cy);
      done++;
      if (done % 6 === 0) { setProgress(`نقاشی زمین… ${Math.round(done / total * 100)}٪`); await wait(0); }
    }
  }

  setProgress('ساخت اشیاء و ساختمان‌ها…');
  G.buildingSprites = buildBuildingSprites();
  G.propSprites = buildPropSprites();
  G.charSheets = buildCharSheets();

  setProgress('بیدار کردن شهر…');
  await wait(0);

  // بوم
  const canvas = document.createElement('canvas');
  G.canvas = canvas;
  G.ctx = canvas.getContext('2d');
  document.getElementById('game').appendChild(canvas);

  // سیستم‌ها
  G.input = new Input();
  G.camera = new Camera(0, 0, WORLD_W, WORLD_H);
  G.time = new TimeSystem(2, 7 * 60 + 30);
  G.lighting = new Lighting(1, 1);
  G.dialogue = new DialogueSystem(1, 1);
  G.interact = new InteractionSystem();
  for (const it of world.interactables) G.interact.add(it);
  G.hud = new HUD(1, 1);
  G.player = new Player(world, world.spawn);
  G.npcs = world.npcs.map((d) => new Npc(world, d));
  G.tumble = [new Tumbleweed(world.tumbleZone), new Tumbleweed(world.tumbleZone)];

  resize();
  window.addEventListener('resize', resize);
  G.camera.snapTo(G.player.x, G.player.y);

  // کلیک = تعامل/ادامهٔ گفتگو
  canvas.addEventListener('pointerdown', () => {
    if (G.dialogue.open) G.dialogue.advance();
    else if (G.dialogue.canInteract) {
      const sel = G.interact.update(G.player.x, G.player.y);
      if (sel) G.dialogue.start(sel.dialogue);
    }
  });

  // API تست/اشکال‌زدایی
  window.CG = {
    world: G.world,
    painter: G.painter,
    get input() { return G.input; },
    get player() { return G.player; },
    get time() { return G.time; },
    get fps() { return G.fps; },
    get dialogue() { return G.dialogue; },
    teleport(x, y) {
      G.player.x = x; G.player.y = y;
      G.camera.snapTo(x, y);
    },
    setTime(min) { G.time.minutes = min; },
    state() {
      return {
        x: G.player.x, y: G.player.y,
        fps: G.fps, time: G.time.clockLabel, day: G.time.day,
        dialogOpen: G.dialogue.open, particles: G.particles.length,
      };
    },
    solidAtPx(px, py) {
      const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
      return G.world.solid[G.world.idx(tx, ty)] === 1;
    },
  };
  window.CGReady = true;

  document.getElementById('loading').classList.add('done');
  requestAnimationFrame((ms) => { lastT = ms; requestAnimationFrame(loop); });
}

boot().catch((err) => {
  const p = document.getElementById('boot-error');
  if (p) {
    p.hidden = false;
    const d = p.querySelector('.detail');
    if (d) d.textContent = String(err && err.stack || err);
  }
});
