/**
 * VisibleCheck.ts — post-boot verification that the GAME's own canvas
 * actually presents visible output (master directive §16/§54: honest
 * state, never assumed; failures observable).
 *
 * Why this exists (the gap behind the remaining "brown page" field report):
 * RendererProbe verifies that a RAW WebGL context rasterizes — on a fresh
 * 4x4 offscreen canvas it draws a triangle and reads it back. But Phaser
 * creates its own context later, on its own canvas, with its own
 * attributes, size and pipeline. That real context can die or silently
 * present nothing AFTER the probe passed (GPU process crash between probe
 * and boot, late driver blacklist, context churn) while every scene keeps
 * reporting RUNNING — the CPU-side simulation is unaffected, so no error
 * is ever thrown. The boot sequence used to treat "World scene active" as
 * success: it marked the game ready and disarmed every guard, leaving the
 * player on a uniform background with no panel and no Canvas fallback.
 *
 * Detection: draw the game canvas onto a small 2D scratch canvas and count
 * pixels that differ from the clear color. drawImage() reads exactly what
 * the compositor presents — the same bytes the player would see — unlike
 * gl.readPixels, which reads whatever framebuffer is currently bound
 * (Phaser's internal render target), not the screen. If essentially the
 * whole frame equals the clear color while the World scene is RUNNING,
 * output is declared dead and main.ts reruns the boot on the Canvas
 * renderer (retryRenderer policy).
 *
 * Pure decision logic (visibleOutputDead) is unit-tested in
 * tests/visiblecheck.test.ts; the DOM-touching sampler is verified in a
 * real browser (docs/TESTING.md, boot matrix v3). No Phaser import —
 * keeps the module unit-testable per AGENTS.md.
 */

/** Tuning constants — single place to adjust sensitivity. */
export const VISIBLE_CHECK = {
  /** Grace after the World scene starts before sampling begins: BootScene's
   * font wait is over, World create ran, the camera sits on the tiled town
   * (spawn is fully tiled — MapData spawn 5,24 inside the built area). */
  GRACE_MS: 1200,
  /** Samples taken while no visible output is confirmed. */
  SAMPLES: 3,
  /** Interval between samples (a dead pipeline never recovers between them;
   * a slow first frame is covered by the grace period). */
  INTERVAL_MS: 400,
  /** Downsampled probe size — fast and robust against single-pixel noise. */
  SAMPLE_W: 96,
  SAMPLE_H: 54,
  /** Color distance from the clear color beyond which a sampled pixel
   * counts as game content. Far above downsampling noise, far below the
   * grass/road palette (measured: road ≈ (184,156,114) vs bg (20,16,11)). */
  TOLERANCE: 32,
  /** A healthy frame at spawn is ~100% tiles; a dead frame is ~0%. The
   * threshold sits at 2% so even a HUD-only frame would pass. */
  MIN_VISIBLE_RATIO: 0.02,
} as const;

export interface SampleResult {
  /** Downsampled pixels differing from the clear color beyond tolerance. */
  visible: number;
  /** Total pixels in the sample grid. */
  total: number;
  /** visible / total (0 when skipped). */
  ratio: number;
  /** 'ok' — sampled; 'skipped' — sampler could not run (fail-open). */
  status: 'ok' | 'skipped';
  /** Human-readable detail for the error panel. */
  detail: string;
}

/** Parse '#rrggbb' (the format of GAME.backgroundColor) into RGB bytes. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}

/**
 * Sample the game canvas through the compositor path (2D drawImage) and
 * count pixels that are not the clear color. Never throws: if the sampler
 * itself cannot run, it returns a 'skipped' result and the caller must
 * fail open (a broken sampler must never kill a healthy boot).
 */
export function countVisiblePixels(
  canvas: HTMLCanvasElement,
  bgColor: string,
): SampleResult {
  const fail = (detail: string): SampleResult =>
    { return { visible: 0, total: 0, ratio: 0, status: 'skipped', detail }; };
  try {
    if (!canvas || !canvas.width || !canvas.height) {
      return fail('game canvas missing or zero-sized');
    }
    const scratch = document.createElement('canvas');
    scratch.width = VISIBLE_CHECK.SAMPLE_W;
    scratch.height = VISIBLE_CHECK.SAMPLE_H;
    const ctx = scratch.getContext('2d');
    if (!ctx) return fail('2d scratch context unavailable');
    ctx.drawImage(canvas, 0, 0, scratch.width, scratch.height);
    const data = ctx.getImageData(0, 0, scratch.width, scratch.height).data;
    const bg = hexToRgb(bgColor);
    const tol2 = VISIBLE_CHECK.TOLERANCE * VISIBLE_CHECK.TOLERANCE;
    let visible = 0;
    for (let i = 0; i < data.length; i += 4) {
      const dr = data[i] - bg.r;
      const dg = data[i + 1] - bg.g;
      const db = data[i + 2] - bg.b;
      if (dr * dr + dg * dg + db * db > tol2) visible += 1;
    }
    const total = VISIBLE_CHECK.SAMPLE_W * VISIBLE_CHECK.SAMPLE_H;
    return {
      visible,
      total,
      ratio: visible / total,
      status: 'ok',
      detail: 'visible ' + visible + '/' + total,
    };
  } catch (err) {
    return fail('sampler threw: ' + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Pure viewport-overlap decision (unit-tested in tests/visiblecheck.test.ts).
 * A canvas that renders content but sits entirely outside the viewport
 * (field bug #7: canvas pushed one viewport down by an empty full-height
 * sibling block) is invisible to the player and must never count as ready.
 */
export interface RectLike {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

export function rectInViewport(r: RectLike, viewportW: number, viewportH: number): boolean {
  if (!(r.width > 0 && r.height > 0)) return false;
  if (!(viewportW > 0 && viewportH > 0)) return false;
  return r.top < viewportH && r.bottom > 0 && r.left < viewportW && r.right > 0;
}

/**
 * DOM wrapper: does the live canvas actually overlap the viewport?
 * Never throws — an unreadable geometry is reported as NOT in viewport
 * with the reason in the detail string (position failures are layout
 * bugs; the panel shows the measured numbers, per directive §16).
 */
export function canvasInViewport(canvas: HTMLCanvasElement): { ok: boolean; detail: string } {
  try {
    const r = canvas.getBoundingClientRect();
    const ok = rectInViewport(
      { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height },
      window.innerWidth,
      window.innerHeight,
    );
    const detail = 'canvas rect ' + Math.round(r.left) + ',' + Math.round(r.top)
      + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)
      + ' / viewport ' + window.innerWidth + 'x' + window.innerHeight
      + (ok ? ' (in viewport)' : ' (OUTSIDE viewport)');
    return { ok, detail };
  } catch (err) {
    return { ok: false, detail: 'canvas geometry unreadable: '
      + (err instanceof Error ? err.message : String(err)) };
  }
}

/**
 * Pure verdict over collected samples.
 *
 * dead = at least one usable sample AND every usable sample shows less
 * than MIN_VISIBLE_RATIO game content. All-skipped / no samples → alive
 * (fail-open): the sampler must never be the reason a healthy boot dies;
 * the BootGuard watchdog still covers the total-hang case.
 */
export function visibleOutputDead(samples: SampleResult[]): { dead: boolean; detail: string } {
  const ok = samples.filter((s) => s.status === 'ok');
  const skipped = samples.filter((s) => s.status === 'skipped');
  if (ok.length === 0) {
    return {
      dead: false,
      detail: 'no usable samples'
        + (skipped.length ? ' (' + skipped.map((s) => s.detail).join('; ') + ')' : ''),
    };
  }
  const allBelow = ok.every((s) => s.ratio < VISIBLE_CHECK.MIN_VISIBLE_RATIO);
  const detail = ok.map((s) => s.detail).join('; ')
    + (skipped.length ? ' (skipped: ' + skipped.map((s) => s.detail).join('; ') + ')' : '');
  return { dead: allBelow, detail };
}
