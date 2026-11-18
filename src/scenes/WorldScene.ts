/**
 * WorldScene.ts — builds the Phase-1 world from MapData, owns the world
 * simulation loop (clock, player, NPCs, interactions, atmosphere) and
 * coordinates with UIScene through the EventBus.
 */
import Phaser from 'phaser';
import { GAME, SCENES } from '../config/GameConfig';
import { events, EV } from '../core/EventBus';
import { SystemCoordinator, Tickable } from '../core/SystemCoordinator';
import { TimeSystem, PHASE_VISUALS } from '../core/TimeSystem';
import { buildMap } from '../world/MapData';
import { TILE_SHEET_KEY, TILE_SIZE } from '../assets/TileFactory';
import { PROPS } from '../assets/PropFactory';
import { PAL } from '../assets/Palette';
import { Player } from '../entities/Player';
import { Npc } from '../entities/Npc';
import { InteractionSystem, Interactable } from '../systems/InteractionSystem';

const NPC_SHEETS: Record<string, string> = {
  'npc-pete': 'char-pete',
  'npc-traveler': 'char-traveler',
};

export class WorldScene extends Phaser.Scene {
  private player!: Player;
  private timeSys!: TimeSystem;
  private interactions!: InteractionSystem;
  /** Owns init/update/dispose ordering of the world simulation systems. */
  private systems!: SystemCoordinator;
  private npcs: Npc[] = [];
  private overlay!: Phaser.GameObjects.Rectangle;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dustTimer = 0;
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

    this.physics.world.setBounds(0, 0, worldW, worldH);

    // --- props + collision bodies -------------------------------------------
    const interactables: Interactable[] = [];
    for (const spawn of map.props) {
      const spec = PROPS[spawn.type];
      if (!spec) continue;
      const baseX = spawn.tx * TILE_SIZE + spec.w / 2;
      const baseY = spawn.ty * TILE_SIZE + spec.h;
      const img = this.add.image(baseX, baseY, spec.key).setOrigin(0.5, 1);
      img.setDepth(baseY);

      if (spec.bodyW > 0) {
        const cx = baseX;
        const cy = baseY - spec.bodyGap - spec.bodyH / 2;
        const box = this.add.rectangle(cx, cy, spec.bodyW, spec.bodyH);
        this.physics.add.existing(box, true);
        box.setVisible(false);
      }

      if (spawn.signText) {
        const isSignPost = spawn.type === 'sign';
        const ty = isSignPost ? baseY - 16 : baseY - spec.h + 13;
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

    // --- atmosphere -----------------------------------------------------------
    this.overlay = this.add.rectangle(0, 0, GAME.width, GAME.height, 0x000000)
      .setOrigin(0).setScrollFactor(0).setDepth(800).setAlpha(0);
    this.dust = this.add.particles(0, 0, 'dust', {
      speed: { min: 4, max: 18 },
      angle: { min: 170, max: 380 },
      lifespan: 350,
      scale: { start: 1.2, end: 0.2 },
      alpha: { start: 0.5, end: 0 },
      frequency: -1,
    }).setDepth(700);

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

    // --- system registration (Phase 2: explicit order, error boundaries) ------
    // Execution order: clock first (atmosphere reads the phase it advanced),
    // then the player, then NPCs, then atmosphere. The interaction system is
    // driven explicitly in update() because its selection RESULT steers the
    // prompt/E-key logic (not a fire-and-forget system).
    this.systems = new SystemCoordinator();
    this.systems.register('clock', { update: (dt: number) => this.timeSys.advance(dt / 1000) } satisfies Tickable, 10);
    this.systems.register('player', {
      update: (): void => {
        this.player.update();
        this.player.postUpdate();
      },
    }, 20);
    this.systems.register('npcs', {
      update: (dt: number): void => {
        for (const npc of this.npcs) npc.update(dt);
      },
    } satisfies Tickable, 30);
    this.systems.register('atmosphere', { update: (dt: number): void => this.updateAtmosphere(dt) } satisfies Tickable, 40);
    this.systems.initAll();

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
      // Phase 2: reverse-order disposal, idempotent; the stale clock leaves
      // the registry so a later HUD read degrades honestly (guard exists).
      this.systems.disposeAll();
      this.registry.remove('timeSys');
    });
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50);

    // Ordered simulation through the coordinator — one throwing system is
    // reported to its sink and cannot freeze the frame (Phase 2 objective 6).
    this.systems.updateAll(dt);

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

  private openDialogue(key: string): void {
    this.dialogueOpen = true;
    this.player.setFrozen(true);
    this.npcs.forEach((n) => n.freeze());
    events.emit(EV.DIALOGUE_OPEN, { key });
  }

  /** Day/night tint + running dust (runs AFTER the clock system advanced). */
  private updateAtmosphere(dt: number): void {
    const visual = PHASE_VISUALS[this.timeSys.phase];
    this.overlay.fillColor = visual.tint;
    this.overlay.setAlpha(visual.alpha);

    if (this.player.isRunning) {
      this.dustTimer += dt;
      if (this.dustTimer > 120) {
        this.dustTimer = 0;
        this.dust.emitParticleAt(this.player.x - 2, this.player.y - 2);
      }
    }
  }
}
