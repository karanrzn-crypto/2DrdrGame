/**
 * Palette.ts — the single, coherent Coppergate color palette.
 * Design rule (master directive §5): every pixel in the game comes from this
 * palette so the whole world reads as one place. Never hard-code colors in
 * drawing code — import from here.
 */
export const PAL = {
  // Ground
  grass: '#8fa05f',
  grassAlt: '#7c8f52',
  grassDry: '#a8a05e',
  grassSpeck: '#6f8049',
  grassSpeckLight: '#a3b26e',

  dirt: '#b89c72',
  dirtAlt: '#a08a5f',
  dirtDark: '#8a7350',
  sand: '#d9c39a',
  sandAlt: '#c9b184',
  sandDark: '#b09a72',

  water: '#4a6f8f',
  waterLight: '#5d84a3',
  waterDark: '#3a5a77',

  stone: '#8b8578',
  stoneDark: '#6f6a5e',
  stoneLight: '#a5a093',

  // Wood / buildings
  wood: '#7a5a38',
  woodDark: '#5d4229',
  woodLight: '#97744c',
  wallPlank: '#9c7a4f',
  wallPlankDark: '#7c5f3a',
  roofBrown: '#6e4f33',
  roofBrownDark: '#573d26',
  roofSlate: '#55605a',
  roofSlateDark: '#434d48',
  roofRust: '#8f4636',
  roofRustDark: '#71362a',

  // Metal / accents
  copper: '#c07a3e',
  copperDark: '#8f5a2e',
  iron: '#4a453c',
  ironLight: '#6a655a',

  // Nature
  foliage: '#6a7a44',
  foliageDark: '#55643a',
  foliageLight: '#83945c',
  trunk: '#5d4229',
  cactus: '#5e7a4a',
  cactusDark: '#48603a',
  bush: '#77874e',

  // Characters
  skin: '#d8a37a',
  skinShade: '#b98762',
  hairDark: '#3a2c1e',
  hairGray: '#b8b0a4',
  shirtEli: '#7a4a3c',
  shirtPete: '#4f5a40',
  shirtTraveler: '#54627a',
  pantsEli: '#4a3b2c',
  pantsDark: '#3c3225',
  boots: '#2e2418',
  hatBrown: '#6e4f33',
  hatDark: '#4c3826',
  bandana: '#8f4636',

  // UI
  parchment: '#e8d9b0',
  parchmentDark: '#c9b184',
  ink: '#3a2c1a',
  panel: 'rgba(30, 24, 14, 0.82)',
  panelBorder: '#8a6f46',
  health: '#b0402c',
  healthBg: '#3a2c1a',
} as const;
