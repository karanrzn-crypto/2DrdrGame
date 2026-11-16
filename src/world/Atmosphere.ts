/**
 * Atmosphere.ts — the continuous lighting / weather engine (pure, no Phaser).
 *
 * Replaces the old 4-phase flat overlay with a keyframed day cycle: every
 * minute of the day maps to a smooth {grade color, strength, night factor}
 * via linear interpolation between keys. The renderer (WorldScene) samples
 * this every frame and never owns lighting state itself.
 *
 * Also owns the weather machine: CLEAR / RAIN / DUST with timed, smooth
 * transitions driven by the world clock (not frame counts), so weather is
 * stable across hitches and frame drops.
 */
import { PAL } from '../assets/Palette';

export interface DayVisual {
  /** Screen-wide tint color (hex number). */
  tint: number;
  /** Tint strength 0..1. */
  alpha: number;
  /** 0 = full day, 1 = deep night (drives lanterns, windows, firelight). */
  night: number;
}

function hex(color: string): number {
  return parseInt(color.slice(1), 16);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpolate two hex colors channel-wise. */
function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return (Math.round(lerp(ar, br, t)) << 16)
    | (Math.round(lerp(ag, bg, t)) << 8)
    | Math.round(lerp(ab, bb, t));
}

interface GradeKey {
  /** Minute of day (0..1440). */
  m: number;
  color: string;
  alpha: number;
  night: number;
}

/**
 * The cinematic keyframe track. Late-afternoon bias: golden light lingers,
 * dusk is long and warm, night is genuinely dark but readable.
 */
const TRACK: GradeKey[] = [
  { m: 0,    color: PAL.gradeNight,     alpha: 0.62, night: 1.0 },
  { m: 260,  color: PAL.gradeNight,     alpha: 0.62, night: 1.0 },
  { m: 300,  color: PAL.gradePreDawn,   alpha: 0.42, night: 0.9 },
  { m: 340,  color: PAL.gradeDawn,      alpha: 0.30, night: 0.55 },
  { m: 395,  color: PAL.gradeSunrise,   alpha: 0.20, night: 0.12 },
  { m: 450,  color: PAL.gradeMorning,   alpha: 0.08, night: 0.0 },
  { m: 720,  color: PAL.gradeNoon,      alpha: 0.03, night: 0.0 },
  { m: 900,  color: PAL.gradeAfternoon, alpha: 0.07, night: 0.0 },
  { m: 1005, color: PAL.gradeGolden,    alpha: 0.15, night: 0.04 },
  { m: 1055, color: PAL.gradeSunset,    alpha: 0.27, night: 0.22 },
  { m: 1105, color: PAL.gradeDusk,      alpha: 0.36, night: 0.6 },
  { m: 1155, color: PAL.gradeTwilight,  alpha: 0.50, night: 0.88 },
  { m: 1215, color: PAL.gradeNight,     alpha: 0.62, night: 1.0 },
  { m: 1440, color: PAL.gradeNight,     alpha: 0.62, night: 1.0 },
];

/** Sample the day-cycle track at `minutes` (0..1440). */
export function dayVisual(minutes: number): DayVisual {
  const m = ((minutes % 1440) + 1440) % 1440;
  let i = 0;
  while (i < TRACK.length - 2 && TRACK[i + 1].m <= m) i++;
  const a = TRACK[i];
  const b = TRACK[i + 1];
  const t = b.m === a.m ? 0 : (m - a.m) / (b.m - a.m);
  return {
    tint: lerpColor(hex(a.color), hex(b.color), t),
    alpha: lerp(a.alpha, b.alpha, t),
    night: lerp(a.night, b.night, t),
  };
}

// ---------------------------------------------------------------------------
// weather machine
// ---------------------------------------------------------------------------

export type Weather = 'clear' | 'rain' | 'dust';

export interface WeatherVisual {
  /** Rain streak intensity 0..1 (emitter rate + overlay strength). */
  rain: number;
  /** Dust-haze intensity 0..1 (badland gusts + warm haze). */
  dust: number;
  /** Extra cool darkening 0..1 while raining. */
  darken: number;
}

export const WEATHER_IDLE: Record<Weather, WeatherVisual> = {
  clear: { rain: 0, dust: 0, darken: 0 },
  rain:  { rain: 1, dust: 0, darken: 0.16 },
  dust:  { rain: 0, dust: 1, darken: 0 },
};

export interface WeatherSpan {
  weather: Weather;
  /** Inclusive start minute of day. */
  from: number;
  /** Exclusive end minute of day. */
  to: number;
}

/**
 * Deterministic daily weather schedule for a given day number.
 * Every day gets one chance of rain and one chance of a badlands dust
 * gust, at stable hours, so QA can reproduce conditions. Day 1 starts
 * clear (the player's first impression must be clean).
 */
export function weatherForDay(day: number): WeatherSpan[] {
  // deterministic hash of the day
  const h = (day * 2654435761) % 1000;
  const spans: WeatherSpan[] = [];
  const rainRoll = (h >> 3) % 10;
  if (rainRoll >= 3) spans.push({ weather: 'rain', from: 600 + ((h >> 5) % 240), to: 660 + ((h >> 5) % 240) });
  const dustRoll = (h >> 7) % 10;
  if (dustRoll >= 5) spans.push({ weather: 'dust', from: 930 + ((h >> 9) % 180), to: 990 + ((h >> 9) % 180) });
  return spans;
}

/** Active weather at a (day, minute) pair. */
export function weatherAt(day: number, minutes: number): Weather {
  for (const s of weatherForDay(day)) {
    if (minutes >= s.from && minutes < s.to) return s.weather;
  }
  return 'clear';
}

// ---------------------------------------------------------------------------
// wind / sway tuning
// ---------------------------------------------------------------------------

/** Global wind phase speed (radians/second) used by vegetation sway. */
export const WIND_SPEED = 0.9;
/** Maximum sway angle in radians (~1.1deg) for trees, less for bushes. */
export const WIND_MAX_ANGLE = 0.02;
