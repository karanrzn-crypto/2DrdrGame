/**
 * CharFactory.ts — original humanoid pixel sprites (16x22, 4 directions,
 * 6 frames per direction: 2 idle + 4 walk). One parametric draw function
 * generates the player AND every NPC from a CharLook, so all characters
 * share one consistent style (master directive §5).
 */
import Phaser from 'phaser';
import { PAL } from './Palette';
import { makeCanvasTexture, PixelPen } from './PixelPen';

export const CHAR = { FW: 16, FH: 22, COLS: 6, ROWS: 4 } as const;

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
  /** When set, the character wears a skirt (no separate legs). */
  skirt?: string;
}

function drawHead(pen: PixelPen, ox: number, oy: number, dir: number, look: CharLook): void {
  const ink = '#241a10';
  // back hair / face per direction
  pen.rect(ox + 5, oy + 3, 6, 6, look.skin);
  if (dir === DIR.UP) {
    pen.rect(ox + 5, oy + 3, 6, 6, look.hair); // back of the head
    pen.rect(ox + 6, oy + 8, 4, 1, look.skin);
  } else if (dir === DIR.DOWN) {
    pen.rect(ox + 5, oy + 3, 6, 2, look.hair);       // hair top
    pen.px(ox + 5, oy + 5, look.hair);
    pen.px(ox + 10, oy + 5, look.hair);
    pen.px(ox + 6, oy + 6, ink);                      // eyes
    pen.px(ox + 9, oy + 6, ink);
    pen.rect(ox + 7, oy + 8, 2, 1, look.skinShade);   // mouth hint
  } else {
    // left / right profile
    const flip = dir === DIR.RIGHT;
    const hx = flip ? 6 : 5;                          // face front edge
    pen.rect(ox + 5, oy + 3, 6, 2, look.hair);        // hair top
    pen.rect(ox + (flip ? 8 : 5), oy + 5, 3, 4, look.hair); // back hair
    pen.px(ox + (flip ? 9 : 6), oy + 6, ink);         // one eye
    pen.px(ox + (flip ? 5 : 10), oy + 7, look.skinShade); // nose shade
    pen.px(ox + hx, oy + 5, look.skin);               // face front
  }
  if (look.beard) {
    pen.rect(ox + 5, oy + 8, 6, 2, look.beard);
    pen.px(ox + 7, oy + 10, look.beard);
    pen.px(ox + 8, oy + 10, look.beard);
  }
  if (look.hat) {
    const hd = look.hatDark ?? PAL.hatDark;
    pen.rect(ox + 4, oy + 2, 8, 1, look.hat);         // brim
    pen.rect(ox + 4, oy + 3, 8, 1, hd);
    pen.rect(ox + 6, oy, 4, 2, look.hat);             // crown
    pen.rect(ox + 6, oy + 1, 4, 1, hd);
  }
}

function drawFrame(
  pen: PixelPen, ox: number, oy: number, dir: number, frame: number, look: CharLook,
): void {
  const ink = '#241a10';
  const walk = frame >= 2;
  const wf = walk ? frame - 2 : 0;                    // walk cycle 0..3
  const bob = frame === 1 || wf === 1 || wf === 3 ? 1 : 0;
  const top = oy + bob;                               // upper body offset

  // legs (skirt characters skip)
  if (look.skirt) {
    pen.rect(ox + 5, oy + 14, 6, 4, look.skirt);
    pen.rect(ox + 4, oy + 17, 8, 3, look.skirt);
    pen.rect(ox + 4, oy + 20, 8, 1, look.boots);
    pen.rect(ox + 6, oy + 21, 4, 1, ink);
  } else {
    if (walk && (wf === 0 || wf === 2)) {
      const leftFwd = wf === 0;
      // forward leg (long), trailing leg (bent up)
      pen.rect(ox + (leftFwd ? 6 : 9), oy + 16, 2, 6, look.pants);
      pen.rect(ox + (leftFwd ? 6 : 9), oy + 21, 2, 1, look.boots);
      pen.rect(ox + (leftFwd ? 9 : 6), oy + 16, 2, 3, look.pants);
      pen.rect(ox + (leftFwd ? 9 : 6), oy + 19, 2, 1, look.boots);
    } else {
      pen.rect(ox + 6, oy + 16, 2, 6, look.pants);
      pen.rect(ox + 9, oy + 16, 2, 6, look.pants);
      pen.rect(ox + 6, oy + 21, 2, 1, look.boots);
      pen.rect(ox + 9, oy + 21, 2, 1, look.boots);
    }
  }

  // torso
  pen.rect(ox + 5, top + 9, 6, 7, look.shirt);
  pen.rect(ox + 5, top + 14, 6, 2, look.shirtShade);
  pen.rect(ox + 5, top + 15, 6, 1, look.boots);       // belt

  // arms (swing while walking)
  const armSwing = walk ? (wf === 0 ? -1 : wf === 2 ? 1 : 0) : 0;
  pen.rect(ox + 4, top + 10 + armSwing, 1, 4, look.shirt);
  pen.rect(ox + 11, top + 10 - armSwing, 1, 4, look.shirt);
  pen.px(ox + 4, top + 14 + armSwing, look.skin);     // hands
  pen.px(ox + 11, top + 14 - armSwing, look.skin);

  // head + hat
  drawHead(pen, ox, top, dir, look);
}

/**
 * Build one character sheet: 4 rows (directions) x 6 columns
 * (idle0, idle1, walk0..3). Canvas textures only expose __BASE by default,
 * so we also register numbered frames (0..23) for generateFrameNumbers.
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
  refresh();

  // Register each cell as a numbered frame so animations can slice the sheet.
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

/** The player: Eli Boone — brown hat, rust-red shirt. */
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
};

/** Old Pete — gray beard, farm hat. */
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
};

/** A traveler passing through — no hat, blue-gray shirt. */
export const TRAVELER_LOOK: CharLook = {
  skin: PAL.skin,
  skinShade: PAL.skinShade,
  hair: PAL.hairDark,
  shirt: PAL.shirtTraveler,
  shirtShade: '#3e4a5e',
  pants: PAL.pantsDark,
  boots: PAL.boots,
};
