/**
 * Palette.ts — the single, coherent Coppergate color palette.
 * Design rule (master directive §5): every pixel in the game comes from this
 * palette so the whole world reads as one place. Never hard-code colors in
 * drawing code — import from here.
 *
 * v2 ("Late-Afternoon Frontier"): the palette is organized as material RAMPS
 * (3–5 tones from light → shadow) so lit/shaded sides of every object agree,
 * and as time-of-day grades so the atmosphere engine tints the whole world
 * from one place. Saturation is kept low and warm — sun-baked, dusty, real.
 */
export const PAL = {
  // --- Ground: sage grassland (central plains) ------------------------------
  grass: '#8d9e62',
  grassAlt: '#7d8e54',
  grassDry: '#a49d5e',
  grassSpeck: '#6e7f48',
  grassSpeckLight: '#a2b26e',
  grassWood: '#6f7f4c',     // cooler, darker — north woods floor
  grassWoodAlt: '#64744a',
  grassWoodSpeck: '#56653d',
  grassWoodLight: '#84945e',

  // --- Ground: clay roads and packed dirt (rose-taupe, road-worn) -----------
  dirt: '#ab8a68',
  dirtAlt: '#997a5c',
  dirtDark: '#7d6349',
  dirtDeep: '#69523c',
  clay: '#a8896a',          // road surface
  clayAlt: '#967a5f',
  clayDark: '#7c654d',
  clayRut: '#6e5743',       // wheel-rut groove
  clayRidge: '#bfa07f',     // dry ridge between ruts

  // --- Ground: sand / badlands (ochre) ---------------------------------------
  sand: '#d2b98c',
  sandAlt: '#c2a97c',
  sandDark: '#a9926b',
  sandRipple: '#e0cb9e',    // wind-ripple crest
  sandCrack: '#96835f',     // cracked-pan lines

  // --- Ground: stone / gravel -------------------------------------------------
  stone: '#8b8578',
  stoneDark: '#6f6a5e',
  stoneLight: '#a5a093',
  stoneDeep: '#58544b',
  gravel: '#9a8f7a',
  gravelDark: '#7d7360',
  gravelLight: '#b0a68f',
  scree: '#877e6d',

  // --- Mesa cliffs (world rim, strata) ----------------------------------------
  mesaTop: '#b09267',
  mesa: '#9c7a52',
  mesaDark: '#82603f',
  mesaShadow: '#684a31',
  mesaStrata: '#b58a5e',    // sunlit strata band

  // --- Water -------------------------------------------------------------------
  water: '#3f6a88',
  waterLight: '#5b87a3',
  waterDark: '#2f546e',
  waterShine: '#7fa9bd',
  waterShore: '#b8a67f',    // wet sand rim
  waterShoreDark: '#94835f',

  // --- Wood / buildings ---------------------------------------------------------
  wood: '#7a5a38',
  woodDark: '#5d4229',
  woodLight: '#97744c',
  woodPale: '#a98c62',      // sun-bleached planks
  woodPaleDark: '#8a7150',
  woodGray: '#9b8f78',      // old gray fence wood
  woodGrayDark: '#7c7260',
  wallPlank: '#9c7a4f',
  wallPlankDark: '#7c5f3a',
  wallPlankLight: '#b29163',
  beam: '#4e3a24',          // structural beams, eaves

  // --- Roofs ----------------------------------------------------------------------
  roofBrown: '#6e4f33',
  roofBrownDark: '#573d26',
  roofBrownLight: '#83603f',
  roofSlate: '#55605a',
  roofSlateDark: '#434d48',
  roofSlateLight: '#68736c',
  roofRust: '#8f4636',
  roofRustDark: '#71362a',
  roofRustLight: '#a65a44',
  shingle: '#4c3a28',
  shingleLight: '#5f4a33',

  // --- Masonry -----------------------------------------------------------------------
  brick: '#8a5644',
  brickDark: '#6e4234',
  brickLight: '#a06a52',
  mortar: '#b3a68c',
  cutStone: '#9a9484',      // dressed blocks (bank)
  cutStoneDark: '#7c7666',
  cutStoneLight: '#b2ac9a',

  // --- Glass -------------------------------------------------------------------
  glass: '#7fa0ab',
  glassDark: '#5e7f8c',
  glassLight: '#a8c4c9',

  // --- Metal / accents ------------------------------------------------------------------
  copper: '#c07a3e',
  copperDark: '#8f5a2e',
  copperLight: '#d89a58',
  brass: '#c2a44e',
  iron: '#4a453c',
  ironLight: '#6a655a',
  ironDark: '#35312a',

  // --- Nature: flora -----------------------------------------------------------------------
  foliage: '#6a7a44',
  foliageDark: '#55643a',
  foliageLight: '#83945c',
  pine: '#4a5e3d',
  pineDark: '#39492f',
  pineLight: '#5d7448',
  olive: '#7d8b52',
  oliveDark: '#647440',
  oliveLight: '#93a163',
  deadWood: '#7a6a52',
  deadWoodDark: '#61543f',
  trunk: '#5d4229',
  trunkDark: '#48351f',
  cactus: '#5e7a4a',
  cactusDark: '#48603a',
  cactusLight: '#74925c',
  cactusBloom: '#c96a6a',
  sage: '#8a9367',
  sageDark: '#6e7952',
  sageLight: '#a3ab7c',
  dryGrass: '#b3a367',
  dryGrassDark: '#96874f',
  dryGrassLight: '#c9b982',
  tumble: '#a89868',
  tumbleDark: '#877a51',

  // --- Fire / lights --------------------------------------------------------------------------
  flameCore: '#ffd982',
  flameMid: '#ff9b40',
  flameEdge: '#e2571f',
  ember: '#8f3a1c',
  lampGlow: '#ffcf8a',       // lantern light pool
  windowGlow: '#ffc977',     // warm interior light
  smoke: '#b9b3a6',
  smokeDark: '#8f8a7f',

  // --- Fauna ------------------------------------------------------------------------------------
  wool: '#e3ded2',
  woolDark: '#c7c1b2',
  woolShade: '#a8a294',
  faceDark: '#3a3128',
  horseCoat: '#7a5a3c',
  horseCoatDark: '#5d4229',
  horseMane: '#3a2c1e',
  horseBlanket: '#8f4636',

  // --- Characters ---------------------------------------------------------------------------------
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
  coatEli: '#5e4630',        // dusty duster coat
  coatEliDark: '#48351f',
  vestPete: '#5d4a30',
  vestPeteDark: '#463a24',
  poncho: '#7a6a4e',
  ponchoDark: '#5f5239',
  outline: '#241a10',

  // --- UI ---------------------------------------------------------------------------------------------
  parchment: '#e8d9b0',
  parchmentDark: '#c9b184',
  ink: '#3a2c1a',
  panel: 'rgba(30, 24, 14, 0.82)',
  panelBorder: '#8a6f46',
  health: '#b0402c',
  healthBg: '#3a2c1a',

  // --- Time-of-day grades (used by world/Atmosphere.ts) -------------------------------------------------
  // [comment]: continuous keyframes replace the old 4-phase flat overlay.
  gradeNight: '#0d1526',
  gradePreDawn: '#2c3350',
  gradeDawn: '#b27a55',
  gradeSunrise: '#ff9d5e',
  gradeMorning: '#ffdfae',
  gradeNoon: '#fff2d9',
  gradeAfternoon: '#ffe2b3',
  gradeGolden: '#ffb066',
  gradeSunset: '#ff7a3c',
  gradeDusk: '#b25840',
  gradeTwilight: '#4a3a55',
  gradeRain: '#5a6570',
  gradeDust: '#c2a05e',
} as const;
