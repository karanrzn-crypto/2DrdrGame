/**
 * Palette.ts — the single, coherent Coppergate color palette.
 * Design rule: every pixel in the game comes from this palette so the whole
 * world reads as one place. Never hard-code colors in drawing code.
 *
 * v3 ("Hand-Painted Frontier"): organized as material RAMPS (4–5 tones from
 * light → shadow) with a warm midday sun. Grassland reads sage-olive instead
 * of washed yellow; badlands are ochre; the woods run cool. Shadows are warm
 * dark umber, never pure black. Time-of-day grade keys are kept stable (the
 * Atmosphere engine and QA depend on them).
 */
export const PAL = {
  // --- Ground: sage grassland (central plains) ------------------------------
  grass: '#94a05c',
  grassAlt: '#879351',
  grassDry: '#a5a05f',
  grassSpeck: '#78844a',
  grassSpeckLight: '#aeb770',
  grassDeep: '#6c7842',     // macro shading tone for plains
  grassWood: '#6f8049',     // cooler, darker — north woods floor
  grassWoodAlt: '#657544',
  grassWoodSpeck: '#57663c',
  grassWoodLight: '#88995f',

  // --- Ground: clay roads and packed dirt (rose-taupe, road-worn) -----------
  dirt: '#a98a67',
  dirtAlt: '#967a5b',
  dirtDark: '#7c6349',
  dirtDeep: '#68513b',
  clay: '#ab8b6b',
  clayAlt: '#997c60',
  clayDark: '#7f684f',
  clayRut: '#6e5743',       // wheel-rut groove
  clayRidge: '#c1a282',     // dry ridge between ruts

  // --- Ground: sand / badlands (ochre) ---------------------------------------
  sand: '#d8c091',
  sandAlt: '#c7ad7e',
  sandDark: '#ab9266',
  sandDeep: '#8f7a52',
  sandRipple: '#e6d2a4',    // wind-ripple crest
  sandCrack: '#98855f',     // cracked-pan lines

  // --- Ground: stone / gravel -------------------------------------------------
  stone: '#8d8779',
  stoneDark: '#716c5f',
  stoneLight: '#a8a395',
  stoneDeep: '#5a564c',
  gravel: '#9c917b',
  gravelDark: '#7f7561',
  gravelLight: '#b3a991',
  scree: '#897f6d',

  // --- Mesa cliffs (world rim, strata) ----------------------------------------
  mesaTop: '#b49468',
  mesa: '#9f7c53',
  mesaDark: '#84613f',
  mesaShadow: '#684a31',
  mesaStrata: '#b98c5f',    // sunlit strata band

  // --- Water -------------------------------------------------------------------
  water: '#3d6c94',
  waterLight: '#5e89a5',
  waterDark: '#2c5578',
  waterDeep: '#22425e',
  waterShine: '#84adc1',
  waterShore: '#b8a67f',    // wet sand rim
  waterShoreDark: '#93825e',

  // --- Wood / buildings ---------------------------------------------------------
  wood: '#7d5c3a',
  woodDark: '#5f4429',
  woodLight: '#9a774f',
  woodPale: '#ab8d63',      // sun-bleached planks
  woodPaleDark: '#8b7251',
  woodGray: '#9d917a',      // old gray fence wood
  woodGrayDark: '#7e7462',
  wallPlank: '#9e7c50',
  wallPlankDark: '#7e613b',
  wallPlankLight: '#b49366',
  beam: '#503c25',          // structural beams, eaves

  // --- Roofs ----------------------------------------------------------------------
  roofBrown: '#704f32',
  roofBrownDark: '#573d25',
  roofBrownLight: '#86623f',
  roofSlate: '#575f58',
  roofSlateDark: '#444c46',
  roofSlateLight: '#6b766e',
  roofRust: '#914736',
  roofRustDark: '#723628',
  roofRustLight: '#a85c45',
  shingle: '#4d3a28',
  shingleLight: '#614b34',

  // --- Masonry -----------------------------------------------------------------------
  brick: '#8c5745',
  brickDark: '#704335',
  brickLight: '#a26c54',
  mortar: '#b4a78d',
  cutStone: '#9c9686',      // dressed blocks (bank)
  cutStoneDark: '#7e7868',
  cutStoneLight: '#b4ae9c',

  // --- Glass -------------------------------------------------------------------
  glass: '#81a1ac',
  glassDark: '#60818e',
  glassLight: '#abc6cb',

  // --- Metal / accents ------------------------------------------------------------------
  copper: '#c27c3f',
  copperDark: '#915c2f',
  copperLight: '#da9c5a',
  brass: '#c4a650',
  iron: '#4b463d',
  ironLight: '#6c675c',
  ironDark: '#36322b',

  // --- Nature: flora -----------------------------------------------------------------------
  foliage: '#6d7d45',
  foliageDark: '#566539',
  foliageLight: '#86985e',
  foliageDeep: '#485531',
  pine: '#4b5f3e',
  pineDark: '#3a4a30',
  pineLight: '#5f7649',
  olive: '#7f8d54',
  oliveDark: '#667542',
  oliveLight: '#95a365',
  deadWood: '#7c6c54',
  deadWoodDark: '#635641',
  trunk: '#5f4429',
  trunkDark: '#4a3720',
  cactus: '#607c4c',
  cactusDark: '#4a623c',
  cactusLight: '#76945e',
  cactusBloom: '#cb6c6c',
  sage: '#8c9569',
  sageDark: '#707b54',
  sageLight: '#a5ad7e',
  dryGrass: '#b5a569',
  dryGrassDark: '#988950',
  dryGrassLight: '#cbbb84',
  tumble: '#aa9a6a',
  tumbleDark: '#897c52',
  reed: '#8a8a52',
  reedDark: '#6d6d40',

  // --- Fire / lights --------------------------------------------------------------------------
  flameCore: '#ffd982',
  flameMid: '#ff9b40',
  flameEdge: '#e2571f',
  ember: '#8f3a1c',
  lampGlow: '#ffcf8a',       // lantern light pool
  windowGlow: '#ffc977',     // warm interior light
  smoke: '#bbb5a8',
  smokeDark: '#918c81',

  // --- Fauna ------------------------------------------------------------------------------------
  wool: '#e5e0d4',
  woolDark: '#c9c3b4',
  woolShade: '#aaa496',
  faceDark: '#3b3229',
  horseCoat: '#7c5c3e',
  horseCoatDark: '#5f4429',
  horseMane: '#3b2d1f',
  horseBlanket: '#914736',

  // --- Characters ---------------------------------------------------------------------------------
  skin: '#d8a37a',
  skinShade: '#b98762',
  hairDark: '#3b2d1f',
  hairGray: '#bab2a6',
  shirtEli: '#7c4b3d',
  shirtPete: '#515c42',
  shirtTraveler: '#56647c',
  pantsEli: '#4c3d2e',
  pantsDark: '#3d3326',
  boots: '#2f2519',
  hatBrown: '#704f32',
  hatDark: '#4d3927',
  bandana: '#914736',
  coatEli: '#604831',        // dusty duster coat
  coatEliDark: '#4a3720',
  vestPete: '#5f4c31',
  vestPeteDark: '#473b25',
  poncho: '#7c6c50',
  ponchoDark: '#615438',
  outline: '#241a10',

  // --- UI ---------------------------------------------------------------------------------------------
  parchment: '#e9dab2',
  parchmentDark: '#cab285',
  parchmentDeep: '#a89167',
  ink: '#392c1b',
  panel: 'rgba(30, 24, 14, 0.82)',
  panelBorder: '#8a6f46',
  health: '#b0402c',
  healthBg: '#3a2c1a',
  leather: '#6b4a2c',
  leatherDark: '#523822',
  leatherLight: '#825c38',
  brassUi: '#c4a650',
  woodUi: '#5a4126',
  woodUiDark: '#44301b',
  woodUiLight: '#6f5231',

  // --- Time-of-day grades (used by world/Atmosphere.ts) -------------------------------------------------
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
