/**
 * make_boot_fixture.mjs — boot-matrix fixtures for the visible-output
 * verification (docs/TESTING.md, boot matrix v3). Produces a copy of the
 * production build with a small hook injected BEFORE the module bundle.
 *
 * Modes:
 *   contextdied  — the game canvas gets a REAL WebGL context (so the 4x4
 *                  probe passes and Phaser boots WebGL "successfully"), and
 *                  150ms later the fixture kills it via WEBGL_lose_context.
 *                  This is the exact documented field-bug class: "GPU
 *                  process crash between probe and boot". Phaser keeps the
 *                  scene status RUNNING (CPU logic unaffected), no error is
 *                  ever thrown, and the screen shows nothing — the old boot
 *                  flow marked the game ready on scene status alone and the
 *                  player was left on a brown page with no fallback.
 *   deadpipeline — the game canvas gets a dead-pipeline proxy (queries
 *                  succeed, isContextLost() stays false, draws/clears are
 *                  no-ops, readPixels returns zeros). Simulates a GPU that
 *                  reports healthy but rasterizes nothing. NOTE: Phaser
 *                  polyfills WebGL1 contexts with extension methods; the
 *                  proxy therefore stores expandos on itself and forwards
 *                  everything else to the real context.
 *
 * Usage:  node scripts/make_boot_fixture.mjs <mode> [distDir] [outDir]
 * Then serve outDir statically and open it in a browser.
 */
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const mode = process.argv[2] ?? 'contextdied';
const distDir = process.argv[3] ?? 'dist';
const outDir = process.argv[4] ?? `fixture-dist/${mode}`;

const COMMON_HEAD = `/* fixture hook (${mode}) — see scripts/make_boot_fixture.mjs */`;
const COMMON_FOOT = `
  var orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type) {
    var ctx = orig.apply(this, arguments);
    if (!ctx) return ctx;
    var isGL = type === 'webgl' || type === 'experimental-webgl' || type === 'webgl2';
    if (!isGL) return ctx;
    /* The probe canvas is exactly 4x4 (RendererProbe.PROBE_SIZE) and must
       keep a REAL context so the boot-time self-test passes, matching the
       field report. */
    if (this.width === 4 && this.height === 4) return ctx;
    if (!this.__cgFixtureCtx) this.__cgFixtureCtx = decorate(this, ctx);
    return this.__cgFixtureCtx;
  };
})();`;

const CONTEXT_DIED = `${COMMON_HEAD}
(function () {
  'use strict';
  function decorate(canvas, ctx) {
    /* Kill the REAL context 150ms after creation — after Phaser's renderer
       init (which checks isContextLost()) and before the World scene. */
    setTimeout(function () {
      try {
        var lose = ctx.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
      } catch (e) { /* fixture best-effort */ }
    }, 150);
    return ctx;
  }
${COMMON_FOOT}`;

const DEAD_PIPELINE = `${COMMON_HEAD}
(function () {
  'use strict';
  var DRAW_RE = /^(draw|clear|blit|commit|multi)/;
  function decorate(canvas, gl) {
    /* Expando store: Phaser polyfills WebGL1 contexts with methods taken
       from extensions (gl.bindVertexArray = vaoExt.bindVertexArrayOES...).
       Those assignments must land on the proxy, not the native context. */
    var extra = {};
    return new Proxy({}, {
      get: function (t, prop) {
        if (prop === 'isContextLost') return function () { return false; };
        if (prop === 'readPixels') {
          return function (x, y, w, h, fmt, type, pixels) {
            if (pixels && pixels.fill) pixels.fill(0);
          };
        }
        if (typeof prop === 'string' && DRAW_RE.test(prop)) return function () {};
        if (prop in extra) {
          var v = extra[prop];
          return typeof v === 'function' ? v : v;
        }
        var rv = gl[prop];
        if (typeof rv === 'function') return rv.bind(gl);
        return rv;
      },
      set: function (t, prop, value) { extra[prop] = value; return true; },
      has: function (t, prop) { return prop in extra || prop in gl; },
    });
  }
${COMMON_FOOT}`;

const HOOKS = { contextdied: CONTEXT_DIED, deadpipeline: DEAD_PIPELINE };
const hook = HOOKS[mode];
if (!hook) {
  console.error('unknown mode:', mode, '(use contextdied | deadpipeline)');
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
await cp(distDir, outDir, { recursive: true });

await writeFile(join(outDir, 'assets', 'fixture-hook.js'), hook, 'utf8');

const htmlPath = join(outDir, 'index.html');
let html = await readFile(htmlPath, 'utf8');
if (!html.includes('fixture-hook.js')) {
  html = html.replace(
    '<script type="module"',
    '<script src="./assets/fixture-hook.js"></script>\n  <script type="module"',
  );
  await writeFile(htmlPath, html, 'utf8');
}
console.log('fixture ready:', outDir);
