/**
 * CharFactory.ts — original humanoid pixel sprites (18x26, 4 directions,
 * 6 frames per direction: 2 idle + 4 walk). One parametric draw function
 * generates the player AND every NPC from a CharLook, so all characters
 * share one consistent style.
 *
 * v3 rebuild: bigger, readable silhouettes (18x26 vs 16x22), a full ink
 * outline around every frame so characters pop from the painted ground,
 * wide-brim hats with three tones, duster coats with swinging tails,
 * waistcoats, neckerchiefs, gun belts with holsters and beards.
 */
import Phaser from 'phaser';
import { PAL } from './Palette';
import { makeCanvasTexture, PixelPen } from './PixelPen';

export const CHAR = { FW: 18, FH: 26, COLS: 6, ROWS: 4 } as const;

/** Direction row order in the sheet. */
export const DIR = { DOWN: 0, LEFT: 1, RIGHT: 2, UP: 3 } as const;
export type Dir = (typeof DIR)[keyof typeof DIR];

export interface CharLook {
  skin: string;
  skinShade: string;
  hair: string;
  shirt: string;
  shirtShade: string;
  pants: string;
  boots: string;
  hat?: string;
  hatDark?: string;
  beard?: string;
  coat?: string;
  coatShade?: string;
  vest?: string;
  vestShade?: string;
  scarf?: string;
  holster?: boolean;
  skirt?: string;
}

function drawHead(pen: PixelPen, ox: number, oy: number, dir: number, look: CharLook): void {
  const ink = PAL.outline;
  // face block
  pen.rect(ox + 6, oy + 3, 7, 7, look.skin);
  if (dir === DIR.UP) {
    pen.rect(ox + 6, oy + 3, 7, 7, look.hair); // back of the head
    pen.rect(ox + 7, oy + 9, 5, 1, look.skin);
  } else if (dir === DIR.DOWN) {
    pen.rect(ox + 6, oy + 3, 7, 2, look.hair);        // hair top
    pen.px(ox + 6, oy + 5, look.hair);
    pen.px(ox + 12, oy + 5, look.hair);
    pen.px(ox + 8, oy + 6, ink);                       // eyes
    pen.px(ox + 11, oy + 6, ink);
    pen.rect(ox + 9, oy + 9, 3, 1, look.skinShade);    // mouth hint
  } else {
    const flip = dir === DIR.RIGHT;
    pen.rect(ox + 6, oy + 3, 7, 2, look.hair);         // hair top
    pen.rect(ox + (flip ? 9 : 6), oy + 5, 4, 5, look.hair); // back hair
    pen.px(ox + (flip ? 10 : 8), oy + 6, ink);         // one eye
    pen.px(ox + (flip ? 6 : 13), oy + 7, look.skinShade); // nose shade
    pen.rect(ox + (flip ? 11 : 6), oy + 5, 2, 3, look.skin); // face front
  }
  if (look.beard) {
    pen.rect(ox + 6, oy + 9, 7, 3, look.beard);
    pen.px(ox + 8, oy + 12, look.beard);
    pen.px(ox + 10, oy + 12, look.beard);
  }
  if (look.hat) {
    const hd = look.hatDark ?? PAL.hatDark;
    // wide brim: top surface + dark underside
    pen.rect(ox + 3, oy + 2, 13, 1, look.hat);
    pen.rect(ox + 3, oy + 3, 13, 2, hd);
    pen.px(ox + 3, oy + 2, look.hat);
    pen.px(ox + 15, oy + 2, look.hat);
    // crown with a crease and band
    pen.rect(ox + 7, oy - 2, 5, 4, look.hat);
    pen.rect(ox + 7, oy + 1, 5, 1, hd);
    pen.rect(ox + 9, oy - 2, 1, 4, hd); // crease
    pen.px(ox + 7, oy - 2, look.hat);
    pen.px(ox + 11, oy - 2, look.hat);
  }
}

function drawFrame(
  pen: PixelPen, ox: number, oy: number, dir: number, frame: number, look: CharLook,
): void {
  const ink = PAL.outline;
  const walk = frame >= 2;
  const wf = walk ? frame - 2 : 0;                    // walk cycle 0..3
  const bob = frame === 1 || wf === 1 || wf === 3 ? 1 : 0;
  const top = oy + bob;                               // upper body offset

  // legs
  if (look.skirt) {
    pen.rect(ox + 6, oy + 16, 7, 5, look.skirt);
    pen.rect(ox + 5, oy + 19, 9, 3, look.skirt);
    pen.rect(ox + 5, oy + 22, 9, 1, look.boots);
    pen.rect(ox + 7, oy + 24, 5, 1, ink);
  } else {
    if (walk && (wf === 0 || wf === 2)) {
      const leftFwd = wf === 0;
      pen.rect(ox + (leftFwd ? 7 : 11), oy + 18, 2, 7, look.pants);
      pen.rect(ox + (leftFwd ? 7 : 11), oy + 24, 2, 1, look.boots);
      pen.rect(ox + (leftFwd ? 11 : 7), oy + 18, 2, 4, look.pants);
      pen.rect(ox + (leftFwd ? 11 : 7), oy + 21, 2, 1, look.boots);
    } else {
      pen.rect(ox + 7, oy + 18, 2, 7, look.pants);
      pen.rect(ox + 11, oy + 18, 2, 7, look.pants);
      pen.rect(ox + 7, oy + 24, 2, 1, look.boots);
      pen.rect(ox + 11, oy + 24, 2, 1, look.boots);
    }
  }

  // torso
  pen.rect(ox + 6, top + 11, 7, 8, look.shirt);
  pen.rect(ox + 6, top + 16, 7, 3, look.shirtShade);

  // vest over the shirt
  if (look.vest) {
    const vestShade = look.vestShade ?? look.boots;
    pen.rect(ox + 6, top + 11, 7, 6, look.vest);
    pen.rect(ox + 6, top + 11, 1, 6, vestShade);
    pen.rect(ox + 12, top + 11, 1, 6, vestShade);
    pen.rect(ox + 9, top + 11, 2, 6, look.shirt); // shirt strip between lapels
  }

  // coat: shoulders + side tails (swing while walking)
  if (look.coat) {
    const coatShade = look.coatShade ?? look.coat;
    const swing = walk ? (wf === 0 ? 1 : wf === 2 ? 0 : 0) : 0;
    pen.rect(ox + 6, top + 11, 7, 1, look.coat);
    pen.rect(ox + 5, top + 12, 1, 7 + swing, look.coat);
    pen.rect(ox + 13, top + 12, 1, 7 + (1 - swing), look.coat);
    pen.px(ox + 5, top + 19 + swing, coatShade);
    pen.px(ox + 13, top + 19 + (1 - swing), coatShade);
    pen.rect(ox + 6, top + 18, 7, 1, coatShade); // coat hem
  }

  // belt + buckle + holster
  pen.rect(ox + 6, top + 17, 7, 1, look.boots);
  if (look.holster) {
    pen.px(ox + 9, top + 17, PAL.brass);
    pen.rect(ox + 12, top + 18, 2, 4, ink);
    pen.rect(ox + 12, top + 15, 1, 3, ink);
  }

  // arms (swing while walking)
  const armSwing = walk ? (wf === 0 ? -1 : wf === 2 ? 1 : 0) : 0;
  const armCol = look.coat ?? look.shirt;
  pen.rect(ox + 5, top + 12 + armSwing, 1, 5, armCol);
  pen.rect(ox + 13, top + 12 - armSwing, 1, 5, armCol);
  if (look.vest) {
    pen.rect(ox + 5, top + 12 + armSwing, 1, 2, look.vest);
    pen.rect(ox + 13, top + 12 - armSwing, 1, 2, look.vest);
  }
  pen.px(ox + 5, top + 16 + armSwing, look.skin);
  pen.px(ox + 13, top + 16 - armSwing, look.skin);

  // neckerchief
  if (look.scarf) {
    pen.rect(ox + 7, top + 11, 5, 1, look.scarf);
    pen.px(ox + 9, top + 12, look.scarf);
  }

  // head + hat
  drawHead(pen, ox, top, dir, look);
}

/**
 * Build one character sheet: 4 rows (directions) x 6 columns
 * (idle0, idle1, walk0..3), then wrap every frame in the ink outline.
 */
export function buildCharSheet(scene: Phaser.Scene, key: string, look: CharLook): void {
  const { pen, refresh } = makeCanvasTexture(scene, key, CHAR.COLS * CHAR.FW, CHAR.ROWS * CHAR.FH);
  for (let dir = 0; dir < CHAR.ROWS; dir++) {
    for (let f = 0; f < CHAR.COLS; f++) {
      const ox = f * CHAR.FW;
      const oy = dir * CHAR.FH;
      drawFrame(pen, ox, oy, dir, f, look);
    }
  }
  pen.outline(PAL.outline);
  refresh();

  const tex = scene.textures.get(key);
  for (let i = 0; i < CHAR.COLS * CHAR.ROWS; i++) {
    if (tex.has(i.toString())) continue;
    const fx = (i % CHAR.COLS) * CHAR.FW;
    const fy = Math.floor(i / CHAR.COLS) * CHAR.FH;
    tex.add(i.toString(), 0, fx, fy, CHAR.FW, CHAR.FH);
  }
}

/** Register idle/walk/run animations for a character sheet. */
export function createCharAnims(scene: Phaser.Scene, key: string): void {
  for (let dir = 0; dir < CHAR.ROWS; dir++) {
    const row = dir * CHAR.COLS;
    const idle = `${key}-idle-${dir}`;
    const walk = `${key}-walk-${dir}`;
    const run = `${key}-run-${dir}`;
    if (!scene.anims.exists(idle)) {
      scene.anims.create({
        key: idle,
        frames: scene.anims.generateFrameNumbers(key, { frames: [row + 0, row + 1] }),
        frameRate: 2,
        repeat: -1,
      });
    }
    if (!scene.anims.exists(walk)) {
      scene.anims.create({
        key: walk,
        frames: scene.anims.generateFrameNumbers(key, { frames: [row + 2, row + 3, row + 4, row + 5] }),
        frameRate: 9,
        repeat: -1,
      });
    }
    if (!scene.anims.exists(run)) {
      scene.anims.create({
        key: run,
        frames: scene.anims.generateFrameNumbers(key, { frames: [row + 2, row + 3, row + 4, row + 5] }),
        frameRate: 14,
        repeat: -1,
      });
    }
  }
}

/** The player: Eli Boone — dusty duster coat, bandana, gun belt. */
export const ELI_LOOK: CharLook = {
  skin: PAL.skin,
  skinShade: PAL.skinShade,
  hair: PAL.hairDark,
  shirt: PAL.shirtEli,
  shirtShade: '#5e382e',
  pants: PAL.pantsEli,
  boots: PAL.boots,
  hat: PAL.hatBrown,
  hatDark: PAL.hatDark,
  coat: PAL.coatEli,
  coatShade: PAL.coatEliDark,
  scarf: PAL.bandana,
  holster: true,
};

/** Old Pete — gray beard, waistcoat, farm hat. */
export const PETE_LOOK: CharLook = {
  skin: PAL.skin,
  skinShade: PAL.skinShade,
  hair: PAL.hairGray,
  shirt: PAL.shirtPete,
  shirtShade: '#3c4531',
  pants: PAL.pantsDark,
  boots: PAL.boots,
  hat: PAL.hatBrown,
  hatDark: PAL.hatDark,
  beard: PAL.hairGray,
  vest: PAL.vestPete,
  vestShade: PAL.vestPeteDark,
};

/** A traveler passing through — poncho, no hat. */
export const TRAVELER_LOOK: CharLook = {
  skin: PAL.skin,
  skinShade: PAL.skinShade,
  hair: PAL.hairDark,
  shirt: PAL.shirtTraveler,
  shirtShade: '#3e4a5e',
  pants: PAL.pantsDark,
  boots: PAL.boots,
  coat: PAL.poncho,
  coatShade: PAL.ponchoDark,
  scarf: PAL.parchmentDark,
};
