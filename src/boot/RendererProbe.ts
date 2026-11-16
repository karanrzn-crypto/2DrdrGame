/**
 * RendererProbe.ts — boot-time verification that the browser's rendering
 * pipeline actually produces visible output (master directive §54:
 * verify in a real browser; §16: honest state, never assumed).
 *
 * Why this exists: on some machines (hardware acceleration disabled,
 * GPU driver blacklisted, remote-desktop sessions, broken SwiftShader)
 * `canvas.getContext('webgl')` returns a valid context, Phaser boots
 * normally and every scene reports RUNNING — yet nothing is ever drawn
 * and the console stays silent. Phaser's AUTO→Canvas fallback only
 * triggers when getContext returns *null*, never when the pipeline is
 * silently dead. The result was the deployed blank-screen bug.
 *
 * This module draws a known pattern with a raw WebGL context and reads
 * the pixels back. If the readback disagrees with what was drawn, WebGL
 * is declared unusable and the game boots on the (deprecated but fully
 * functional) Canvas renderer instead. Pure DOM — no Phaser import, so
 * the decision function stays unit-testable.
 */

export type RendererChoice = 'auto' | 'canvas' | 'none';

export interface ProbeResult {
  /** Raw WebGL context draws and reads back the exact pattern drawn. */
  webglDraws: boolean;
  /** Canvas2D context draws and reads back the exact pattern drawn. */
  canvas2dDraws: boolean;
  /** Human-readable GL strings for diagnostics (Persian error panel). */
  glInfo: string;
}

const PROBE_SIZE = 4;
/** Full-viewport triangle in clip space: covers the whole 4x4 canvas. */
const TRIANGLE = new Float32Array([-1, -1, 3, -1, -1, 3]);
/** Center pixel of a 4x4 canvas, read as RGBA. */
const READ_X = 2;
const READ_Y = 2;

const VERT_SRC = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;
const FRAG_SRC = `
precision mediump float;
void main() {
  gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
}`;

/**
 * Create a small offscreen canvas, get a WebGL context, draw a solid
 * green full-screen triangle and read the center pixel back.
 * Returns true only if the readback is exactly what was drawn.
 */
export function probeWebGL(): boolean {
  const gl = createProbeContext();
  if (!gl) return false;
  try {
    return drawAndReadGreen(gl) && readbackIsGreen(gl);
  } catch {
    return false;
  } finally {
    disposeProbe(gl);
  }
}

function createProbeContext(): WebGLRenderingContext | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = PROBE_SIZE;
    canvas.height = PROBE_SIZE;
    const attrs: WebGLContextAttributes = { preserveDrawingBuffer: true, antialias: false };
    return (canvas.getContext('webgl', attrs)
      || canvas.getContext('experimental-webgl', attrs)) as WebGLRenderingContext | null;
  } catch {
    return null;
  }
}

function drawAndReadGreen(gl: WebGLRenderingContext): boolean {
  const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  if (!vs || !fs) return false;
  const prog = gl.createProgram();
  if (!prog) return false;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, TRIANGLE, gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  gl.viewport(0, 0, PROBE_SIZE, PROBE_SIZE);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  return true;
}

function readbackIsGreen(gl: WebGLRenderingContext): boolean {
  const px = new Uint8Array(4);
  gl.readPixels(READ_X, READ_Y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  // Exactly what was drawn: opaque green. Anything else (e.g. all zeros
  // from a pipeline that rasterizes nothing) means the GPU is silent.
  return px[0] === 0 && px[1] === 255 && px[2] === 0 && px[3] === 255;
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

/** Free GPU resources and release the probe context immediately. */
function disposeProbe(gl: WebGLRenderingContext): void {
  try {
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  } catch {
    /* releasing the context is best-effort */
  }
}

/**
 * Sanity-check the 2D fallback path the same way (draw red, read red).
 * A browser that fails even this cannot run the game at all.
 */
export function probeCanvas2D(): boolean {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 2, 2);
    const px = ctx.getImageData(0, 0, 1, 1).data;
    return px[0] === 255 && px[1] === 0 && px[2] === 0 && px[3] === 255;
  } catch {
    return false;
  }
}

/** Pure decision over probe results (unit-tested in tests/renderer.test.ts). */
export function chooseRenderer(p: { webglDraws: boolean; canvas2dDraws: boolean }): RendererChoice {
  if (p.webglDraws) return 'auto';
  if (p.canvas2dDraws) return 'canvas';
  return 'none';
}

/**
 * Pure boot-retry policy over *actual* Phaser boot outcomes, not just the
 * probe (unit-tested in tests/renderer.test.ts).
 *
 * Why: Phaser's WebGLRenderer.init throws synchronously ('WebGL unsupported')
 * when its own canvas.getContext('webgl') returns null or a lost context —
 * a state the 4x4 probe cannot fully predict (the GPU process can die
 * between the probe and the game boot, and Phaser's AUTO only falls back
 * when its import-time Features flag was false). The boot sequence must
 * therefore react to the failure itself: one honest retry on Canvas —
 * a renderer the probe already proved (canvas2dDraws) — before giving up.
 *
 * attempt 0: the probe-based choice.
 * attempt 1: only a failed AUTO (WebGL) boot may retry on Canvas; a Canvas
 *            boot that already failed has nothing left to fall back to.
 * attempt ≥ 2: no renderer remains → error panel.
 */
export function retryRenderer(initial: RendererChoice, attempt: number): RendererChoice | 'none' {
  if (attempt <= 0) return initial;
  if (attempt === 1 && initial === 'auto') return 'canvas';
  return 'none';
}

/** Collect GL identity strings for the error panel / console diagnostics. */
export function describeGL(): string {
  const gl = createProbeContext();
  if (!gl) return 'WebGL context: none';
  try {
    const version = String(gl.getParameter(gl.VERSION));
    const vendor = String(gl.getParameter(gl.VENDOR));
    let renderer = '';
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
    }
    return ['VERSION: ' + version, 'VENDOR: ' + vendor, renderer ? 'RENDERER: ' + renderer : '']
      .filter(Boolean)
      .join(' | ');
  } catch {
    return 'WebGL info unavailable';
  } finally {
    disposeProbe(gl);
  }
}

/** Run both probes and gather diagnostics. Synchronous, fast (<50ms). */
export function probeRenderer(): ProbeResult {
  const webglDraws = probeWebGL();
  const canvas2dDraws = probeCanvas2D();
  const glInfo = describeGL();
  return { webglDraws, canvas2dDraws, glInfo };
}
