/**
 * WorldScene.ts — builds the world from MapData and owns the simulation +
 * presentation loop: player, NPCs, interactions, and the full atmosphere
 * system (continuous day-cycle grading, night light pools, chimney smoke,
 * cloud shadows, pond shimmer, wind sway, weather, vignette).
 *
 * Lighting derives from TimeSystem via Atmosphere.dayVisual every frame;
 * this scene never owns the clock (master directive §56).
 */
import Phaser from 'phaser';
import { GAME, SCENES } from '../config/GameConfig';
import { events, EV } from '../core/EventBus';
import { TimeSystem } from '../core/TimeSystem';
import { buildMap } from '../world/MapData';
import { TILE_SHEET_KEY, TILE_SIZE } from '../assets/TileFactory';
import { WATER_TILES } from '../assets/TileIds';
import { PROPS } from '../assets/PropFactory';
import { BUILDINGS, LightAnchor } from '../assets/Buildings';
import { PAL } from '../assets/Palette';
import { Player } from '../entities/Player';
import { Npc } from '../entities/Npc';
import { InteractionSystem, Interactable } from '../systems/InteractionSystem';
import { dayVisual, weatherAt, WIND_MAX_ANGLE } from '../world/Atmosphere';

const NPC_SHEETS: Record<string, string> = {
  'npc-pete': 'char-pete',
  'npc-traveler': 'char-traveler',
};

interface NightLight {
  img: Phaser.GameObjects.Image;
  flicker: number;
  seed: number;
  base: number;
}

function hexNum(color: string): number {
  return parseInt(color.slice(1), 16);
}

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private timeSys!: TimeSystem;
  private interactions!: InteractionSystem;
  private npcs: Npc[] = [];
  private nightLights: NightLight[] = [];
  private overlay!: Phaser.GameObjects.Rectangle;
  private hazeRect!: Phaser.GameObjects.Rectangle;
  private darkenRect!: Phaser.GameObjects.Rectangle;
  private clouds: Array<{ img: Phaser.GameObjects.Image; speed: number }> = [];
  private waterTiles: Array<{ tile: Phaser.Tilemaps.Tile; alt: number }> = [];
  private waterTimer = 0;
  private waterPhase = 0;
  private rainEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dustEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private rainOn = false;
  private dustOn = false;
  private rainI = 0;
  private dustI = 0;
  private tumbleweed!: Phaser.GameObjects.Sprite;
  private tumbleState: 'wait' | 'roll' = 'wait';
  private tumbleTimer = 5;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dustTimer = 0;
  private elapsed = 0;
  private dialogueOpen = false;
  private currentPrompt: string | null = null;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private cleanups: Array<() => void> = [];

  constructor() {
    super(SCENES.WORLD);
  }

  create(): void {
    const map = buildMap();
    const worldW = map.w * TILE_SIZE;
    const worldH = map.h * TILE_SIZE;

    // --- tile layers (visual + collision from the same data) ---------------
    const groundMap = this.make.tilemap({ data: map.ground, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const obstacleMap = this.make.tilemap({ data: map.obstacles, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tsGround = groundMap.addTilesetImage(TILE_SHEET_KEY, TILE_SHEET_KEY, TILE_SIZE, TILE_SIZE, 0, 0, 0)!;
    const tsObst = obstacleMap.addTilesetImage(TILE_SHEET_KEY, TILE_SHEET_KEY, TILE_SIZE, TILE_SIZE, 0, 0, 0)!;
    const groundLayer = groundMap.createLayer(0, tsGround, 0, 0)!;
    groundLayer.setDepth(-100);
    const obstacleLayer = obstacleMap.createLayer(0, tsObst, 0, 0)!;
    obstacleLayer.setCollision(map.colliderTiles);

    // collect pond tiles for the shimmer animation
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        const idx = map.ground[y][x];
        if (WATER_TILES.includes(idx)) {
          const tile = groundLayer.getTileAt(x, y);
          if (tile) {
            this.waterTiles.push({
              tile,
              alt: WATER_TILES[1 - WATER_TILES.indexOf(idx)],
            });
          }
        }
      }
    }

    this.physics.world.setBounds(0, 0, worldW, worldH);

    // --- props + collision bodies + lights + smoke ---------------------------
    const interactables: Interactable[] = [];
    for (const spawn of map.props) {
      const spec = PROPS[spawn.type];
      if (!spec) continue;
      const art = BUILDINGS[spawn.type];
      const baseX = spawn.tx * TILE_SIZE + spec.w / 2;
      const baseY = spawn.ty * TILE_SIZE + spec.h;

      // soft ground shadow under anything big enough to cast one
      if (spec.bodyW >= 8) {
        this.add.image(baseX, baseY - 1, 'shadow')
          .setOrigin(0.5, 1)
          .setScale(Math.max(1, (spec.bodyW + 6) / 13), 1.6)
          .setAlpha(art ? 0.42 : 0.3)
          .setDepth(baseY - 1);
      }

      const img = spec.anim
        ? this.add.sprite(baseX, baseY, spec.key).setOrigin(0.5, 1)
        : this.add.image(baseX, baseY, spec.key).setOrigin(0.5, 1);
      img.setDepth(baseY);
      if (spec.anim) {
        (img as Phaser.GameObjects.Sprite).setFrame('0').play(spec.anim.key);
        // critters face varied directions so herds don't look cloned
        if (spawn.type === 'sheep') img.setFlipX((spawn.tx + spawn.ty) % 2 === 0);
      }

      // wind sway — gentle rotation around the base
      if (spec.sway) {
        const maxDeg = WIND_MAX_ANGLE * (180 / Math.PI) * (spawn.type.startsWith('tree_') ? 1 : 0.7);
        this.tweens.add({
          targets: img,
          angle: { from: -maxDeg, to: maxDeg },
          duration: 1600 + (spawn.tx * 37 + spawn.ty * 61) % 1400,
          delay: (spawn.tx * 53 + spawn.ty * 29) % 900,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }

      if (spec.bodyW > 0) {
        const cx = baseX;
        const cy = baseY - spec.bodyGap - spec.bodyH / 2;
        const box = this.add.rectangle(cx, cy, spec.bodyW, spec.bodyH);
        this.physics.add.existing(box, true);
        box.setVisible(false);
      }

      // night lights (from the prop itself or its building art)
      const anchors: LightAnchor[] | undefined = spec.lights ?? art?.lights;
      if (anchors) {
        for (const a of anchors) {
          const texKey = a.color === PAL.flameMid ? 'glow-fire' : 'glow';
          const glow = this.add.image(
            baseX + (a.x - spec.w / 2),
            baseY + (a.y - spec.h),
            texKey,
          ).setOrigin(0.5, 0.5)
            .setScale((a.r * 2) / 92)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setAlpha(0)
            .setDepth(820); // above the grade overlay — light punches through night
          this.nightLights.push({
            img: glow,
            flicker: a.flicker ?? 0.05,
            seed: (a.x * 7 + a.y * 13) % 100,
            base: 0.82,
          });
        }
      }

      // chimney smoke
      if (art?.smoke) {
        for (const [sx, sy] of art.smoke) {
          this.add.particles(
            baseX + (sx - art.w / 2),
            baseY + (sy - art.h),
            'smoke',
            {
              speedY: { min: -14, max: -8 },
              speedX: { min: 2, max: 10 },
              lifespan: 2800,
              scale: { start: 1, end: 3.2 },
              alpha: { start: 0.42, end: 0 },
              frequency: 380,
              quantity: 1,
            },
          ).setDepth(690);
        }
      }

      if (spawn.signText) {
        const isSignPost = spawn.type === 'sign';
        const ty = isSignPost ? baseY - 16 : baseY - spec.h + (spec.signDy ?? 13);
        const fontSize = isSignPost ? '7px' : '11px';
        this.add.text(baseX, ty, spawn.signText, {
          fontFamily: 'Vazirmatn, Tahoma, Arial',
          fontSize,
          color: PAL.parchment,
          stroke: PAL.ink,
          strokeThickness: isSignPost ? 1 : 2,
        }).setOrigin(0.5, 1).setDepth(baseY + 0.2);
      }

      if (spawn.dialogue) {
        interactables.push({
          id: `${spawn.type}-${spawn.tx}-${spawn.ty}`,
          x: baseX,
          y: baseY - 4,
          range: spawn.type === 'sign' ? 34 : 30,
          prompt: spawn.type === 'sign' ? 'خواندن تابلو' : 'کوبیدن در',
          dialogue: spawn.dialogue,
        });
      }
    }

    // --- NPCs ---------------------------------------------------------------
    for (const spawn of map.npcs) {
      const sheetKey = NPC_SHEETS[spawn.id];
      if (!sheetKey) continue;
      const px = spawn.tx * TILE_SIZE + 8;
      const py = spawn.ty * TILE_SIZE + 16;
      const npc = new Npc(this, spawn.id, sheetKey, px, py, spawn.wanderRadius, map);
      this.physics.add.collider(npc.sprite, obstacleLayer);
      this.npcs.push(npc);
      interactables.push({
        id: spawn.id,
        x: px,
        y: py,
        range: 26,
        prompt: spawn.prompt,
        dialogue: spawn.dialogue,
      });
    }

    // --- player ---------------------------------------------------------------
    this.player = new Player(this, map.spawn.tx * TILE_SIZE + 8, map.spawn.ty * TILE_SIZE + 16);
    this.physics.add.collider(this.player.sprite, obstacleLayer);

    // --- camera -----------------------------------------------------------------
    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldW, worldH);
    cam.setZoom(GAME.camZoom);
    cam.startFollow(this.player.sprite, true, 0.14, 0.14, 0, 6);

    // --- atmosphere layers --------------------------------------------------------
    // screen-wide color grade (continuous, from Atmosphere)
    this.overlay = this.add.rectangle(0, 0, GAME.width, GAME.height, 0x000000)
      .setOrigin(0).setScrollFactor(0).setDepth(800).setAlpha(0);
    // warm dust haze (badlands gusts)
    this.hazeRect = this.add.rectangle(0, 0, GAME.width, GAME.height, hexNum(PAL.gradeDust))
      .setOrigin(0).setScrollFactor(0).setDepth(805).setAlpha(0);
    // cool darkening while raining
    this.darkenRect = this.add.rectangle(0, 0, GAME.width, GAME.height, hexNum(PAL.gradeRain))
      .setOrigin(0).setScrollFactor(0).setDepth(810).setAlpha(0);
    // cinematic vignette
    this.add.image(0, 0, 'vignette')
      .setOrigin(0).setDisplaySize(GAME.width, GAME.height)
      .setScrollFactor(0).setDepth(850).setAlpha(0.9);

    // drifting cloud shadows across the world
    for (let i = 0; i < 4; i++) {
      const cx = 120 + i * 260 + (i * 97) % 140;
      const cy = 60 + ((i * 173) % 380);
      const img = this.add.image(cx, cy, 'cloud')
        .setScale(1.5 + (i % 3) * 0.5)
        .setAlpha(0.13 + (i % 2) * 0.04)
        .setDepth(645);
      this.clouds.push({ img, speed: 4 + (i % 3) * 2.5 });
    }

    // --- particles ------------------------------------------------------------------
    // ambient motes (screen-space, subtle)
    this.add.particles(0, 0, 'mote', {
      x: { min: 0, max: GAME.width },
      y: { min: 0, max: GAME.height },
      lifespan: 3200,
      speedX: { min: -8, max: 8 },
      speedY: { min: -7, max: -2 },
      scale: 1,
      alpha: { start: 0.35, end: 0 },
      frequency: 110,
      quantity: 1,
    }).setScrollFactor(0).setDepth(705);

    // rain (screen-space streaks)
    this.rainEmitter = this.add.particles(0, 0, 'rain', {
      x: { min: -40, max: GAME.width + 40 },
      y: -12,
      lifespan: { min: 750, max: 1050 },
      speedY: { min: 500, max: 620 },
      speedX: { min: -140, max: -90 },
      scale: { start: 1.3, end: 1 },
      alpha: { start: 0.68, end: 0.35 },
      frequency: 9,
      quantity: 4,
    }).setScrollFactor(0).setDepth(760);
    this.rainEmitter.stop();

    // dust gusts (badlands weather, screen-space)
    this.dustEmitter = this.add.particles(0, 0, 'dust', {
      x: { min: 0, max: GAME.width },
      y: { min: 40, max: GAME.height },
      lifespan: 1500,
      speedX: { min: 220, max: 360 },
      speedY: { min: -12, max: 12 },
      scale: { start: 2.6, end: 0.5 },
      alpha: { start: 0.22, end: 0 },
      frequency: 26,
      quantity: 2,
    }).setScrollFactor(0).setDepth(755);
    this.dustEmitter.stop();

    // running dust (world-space, behind the player)
    this.dust = this.add.particles(0, 0, 'dust', {
      speed: { min: 4, max: 18 },
      angle: { min: 170, max: 380 },
      lifespan: 350,
      scale: { start: 1.2, end: 0.2 },
      alpha: { start: 0.5, end: 0 },
      frequency: -1,
    }).setDepth(700);

    // --- tumbleweed -----------------------------------------------------------------
    this.tumbleweed = this.add.sprite(60, 300, 'prop-tumbleweed')
      .setOrigin(0.5, 1).setDepth(300).setVisible(false);

    // --- clock (authoritative, shared with UI via registry) -------------------
    this.timeSys = new TimeSystem(GAME.minutesPerRealSecond);
    this.registry.set('timeSys', this.timeSys);

    // --- interactions -----------------------------------------------------------
    this.interactions = new InteractionSystem();
    for (const it of interactables) this.interactions.add(it);

    // --- input -------------------------------------------------------------------
    const kb = this.input.keyboard!;
    this.keyE = kb.addKey('E');
    this.keyEsc = kb.addKey('ESC');
    kb.addCapture('W,A,S,D,E,ESC,SHIFT,UP,DOWN,LEFT,RIGHT,ENTER');

    // --- dialogue freeze coordination -------------------------------------------
    this.cleanups.push(events.on(EV.DIALOGUE_CLOSE, () => {
      this.dialogueOpen = false;
      this.player.setFrozen(false);
    }));

    // --- focus-loss safety: no stuck keys, no drifting player ------------------
    const onBlur = (): void => {
      kb.resetKeys();
      this.player.clearInput();
      this.npcs.forEach((n) => n.freeze());
    };
    window.addEventListener('blur', onBlur);
    this.events.once('shutdown', () => {
      window.removeEventListener('blur', onBlur);
      this.cleanups.forEach((off) => off());
      this.cleanups = [];
    });
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50);
    this.elapsed += dt;

    // World clock — clamped delta (directive §16).
    this.timeSys.advance(dt / 1000);
    const visual = dayVisual(this.timeSys.minutes);
    this.overlay.fillColor = visual.tint;
    this.overlay.setAlpha(visual.alpha);

    // night lights with per-light flicker
    for (const light of this.nightLights) {
      const flick = 1 + Math.sin(this.elapsed * 0.011 + light.seed) * light.flicker;
      light.img.setAlpha(Math.min(1, visual.night * light.base * flick));
    }

    // weather machine — smooth intensity ramps toward the schedule target
    const weather = weatherAt(this.timeSys.day, this.timeSys.minutes);
    const rate = (dt / 1000) * 0.35;
    this.rainI = Phaser.Math.Clamp(this.rainI + (weather === 'rain' ? rate : -rate), 0, 1);
    this.dustI = Phaser.Math.Clamp(this.dustI + (weather === 'dust' ? rate : -rate), 0, 1);
    this.darkenRect.setAlpha(this.rainI * 0.18);
    this.hazeRect.setAlpha(this.dustI * 0.2);
    if (this.rainI > 0.03 && !this.rainOn) {
      this.rainEmitter.start();
      this.rainOn = true;
    } else if (this.rainI <= 0.03 && this.rainOn) {
      this.rainEmitter.stop();
      this.rainOn = false;
    }
    if (this.dustI > 0.03 && !this.dustOn) {
      this.dustEmitter.start();
      this.dustOn = true;
    } else if (this.dustI <= 0.03 && this.dustOn) {
      this.dustEmitter.stop();
      this.dustOn = false;
    }

    // drifting cloud shadows
    for (const cloud of this.clouds) {
      cloud.img.x += cloud.speed * (dt / 1000);
      if (cloud.img.x > 64 * TILE_SIZE + 180) cloud.img.x = -180;
    }

    // pond shimmer — swap water frames on a third of the tiles
    this.waterTimer += dt;
    if (this.waterTimer > 700) {
      this.waterTimer = 0;
      this.waterPhase = 1 - this.waterPhase;
      for (const { tile, alt } of this.waterTiles) {
        if ((tile.x + tile.y) % 3 === this.waterPhase) tile.index = alt;
      }
    }

    // tumbleweed rolling through the badlands
    this.updateTumbleweed(dt);

    // Simulation
    this.player.update();
    this.player.postUpdate();
    for (const npc of this.npcs) npc.update(dt);

    // Running dust
    if (this.player.isRunning) {
      this.dustTimer += dt;
      if (this.dustTimer > 120) {
        this.dustTimer = 0;
        this.dust.emitParticleAt(this.player.x - 2, this.player.y - 2);
      }
    }

    // Interactions
    const sel = this.interactions.update(this.player.x, this.player.y - 8);
    const promptText = sel ? sel.prompt : null;
    if (promptText !== this.currentPrompt) {
      this.currentPrompt = promptText;
      events.emit(EV.INTERACT_PROMPT, promptText ? { text: promptText } : null);
    }
    if (sel && !this.dialogueOpen && Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.openDialogue(sel.dialogue);
    }

    // Pause
    if (!this.dialogueOpen && Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      this.scene.pause();
      events.emit(EV.PAUSE_STATE, { paused: true });
    }
  }

  /** A tumbleweed occasionally rolls across the badlands and fades out. */
  private updateTumbleweed(dt: number): void {
    if (this.tumbleState === 'wait') {
      this.tumbleTimer -= dt / 1000;
      if (this.tumbleTimer <= 0) {
        this.tumbleState = 'roll';
        const y = 130 + (Math.floor(this.elapsed / 7) % 780);
        this.tumbleweed.setVisible(true).setAlpha(0.9);
        this.tumbleweed.setPosition(30, y).setDepth(y);
        this.tweens.add({
          targets: this.tumbleweed,
          x: '+=340',
          angle: 900,
          duration: 6800,
          onComplete: () => {
            this.tweens.add({
              targets: this.tumbleweed,
              alpha: 0,
              duration: 700,
              onComplete: () => {
                this.tumbleweed.setVisible(false);
                this.tumbleState = 'wait';
                this.tumbleTimer = 5 + (Math.floor(this.elapsed / 100) % 9);
              },
            });
          },
        });
      }
    }
  }

  private openDialogue(key: string): void {
    this.dialogueOpen = true;
    this.player.setFrozen(true);
    this.npcs.forEach((n) => n.freeze());
    events.emit(EV.DIALOGUE_OPEN, { key });
  }
}
