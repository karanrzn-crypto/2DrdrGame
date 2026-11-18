/**
 * main.ts — application entry point.
 * Original game: Coppergate (Phase 1 playable prototype).
 *
 * Boot sequence (root-cause fix for the deployed blank-screen bug, then
 * hardened against the "WebGL unsupported" field failure, then hardened
 * against "game context dead after the probe passed"):
 * 1. installBootGuard  — global errors become a visible Persian panel.
 * 2. probeRenderer     — verify a RAW WebGL pipeline actually draws and
 *                        reads back a known pattern. On machines where a
 *                        WebGL context exists but rasterizes nothing,
 *                        Phaser's AUTO fallback never fires (it only
 *                        checks for a null context), which used to leave
 *                        players with a silent blank screen.
 * 3. chooseRenderer    — AUTO (WebGL works) / CANVAS (silently dead GPU)
 *                        / none (no usable 2D output → error panel).
 * 4. Boot with feedback — Phaser's WebGLRenderer.init throws synchronously
 *                        ('WebGL unsupported') when its own context
 *                        creation fails or is lost, even though the probe
 *                        passed milliseconds earlier (GPU process crash,
 *                        context churn). Every boot attempt is therefore
 *                        wrapped: a failed AUTO boot retries ONCE with the
 *                        Canvas renderer (retryRenderer policy), and only
 *                        a boot that fails on BOTH renderers opens the
 *                        error panel.
 * 5. Verify visible output — scene status alone is NOT success: Phaser's
 *                        real context can die or present nothing AFTER the
 *                        4x4 probe passed while every scene keeps reporting
 *                        RUNNING (no error is ever thrown — CPU-side logic
 *                        is unaffected). Once the World scene is up, the
 *                        readiness flow samples the game canvas through the
 *                        compositor path (2D drawImage — VisibleCheck.ts)
 *                        and only marks the game ready when real game
 *                        content is on screen. A canvas that stays at the
 *                        clear color triggers the SAME one-shot Canvas
 *                        retry; the panel opens only if that fails too.
 * 6. armBootWatchdog   — if the World scene is not running within
 *                        BOOT_WATCHDOG_MS, the same Canvas retry runs
 *                        once; the panel shows only if that fails too.
 *                        (Stale watchdogs from superseded attempts are
 *                        silenced by a token, never firing a premature
 *                        panel over a healthy in-flight retry.)
 */
import Phaser from 'phaser';
import { createGameConfig, SCENES, GAME } from './config/GameConfig';
import { AppLifecycle } from './core/AppLifecycle';
import { BootScene } from './scenes/BootScene';
import { WorldScene } from './scenes/WorldScene';
import { UIScene } from './scenes/UIScene';
import {
  probeRenderer,
  chooseRenderer,
  retryRenderer,
  describeGL,
  RendererChoice,
} from './boot/RendererProbe';
import {
  countVisiblePixels,
  visibleOutputDead,
  canvasInViewport,
  VISIBLE_CHECK,
  SampleResult,
} from './boot/VisibleCheck';
import {
  installBootGuard,
  armBootWatchdog,
  markGameReady,
  showBootError,
  isWorldRunning,
  BOOT_WATCHDOG_MS,
} from './boot/BootGuard';

installBootGuard();

/** Shape of the intentional, documented browser-test hook (see AGENTS.md). */
interface CoppergateHook {
  game: Phaser.Game;
  sceneKeys: string[];
  rendererChoice: RendererChoice;
  /** Phase 2: boot state machine — browser tests assert lifecycle.phase. */
  lifecycle: AppLifecycle;
}

function boot(): void {
  /** Phase 2: explicit boot phases — illegal flows now throw instead of
   *  silently double-firing a panel or a ready flag (see AppLifecycle). */
  const lifecycle = new AppLifecycle();
  /** Terminal failure: record the phase, then open the visible panel. */
  const panelFailure = (title: string, detail: string): void => {
    lifecycle.transition('failed'); // one-shot from any active phase
    showBootError(title, detail);
  };

  const probe = probeRenderer();
  const initial = chooseRenderer(probe);

  if (initial === 'none') {
    lifecycle.transition('probing'); // idle → probing → failed (recorded)
    panelFailure(
      'مرورگر شما امکان رندر بازی را ندارد',
      'نه WebGL و نه Canvas 2D در این مرورگر قابل استفاده نبود.\n'
      + describeGL() + '\n'
      + 'userAgent: ' + navigator.userAgent,
    );
    return;
  }

  const hook = window as unknown as { __coppergate?: CoppergateHook };
  const glInfo = probe.glInfo;
  let attempt = 0; // 0-based index of the CURRENT boot attempt
  let game: Phaser.Game | null = null;
  const failures: string[] = [];
  let poll = 0;
  let sampleTimer = 0;
  let confirmed = false;
  let samples: SampleResult[] = [];
  /** Supersedes stale watchdogs when a newer attempt takes over. */
  let watchdogToken = 0;

  const stopPoll = (): void => {
    if (poll) {
      window.clearInterval(poll);
      poll = 0;
    }
  };

  const stopSampleTimer = (): void => {
    if (sampleTimer) {
      window.clearTimeout(sampleTimer);
      sampleTimer = 0;
    }
  };

  const disarmAll = (): void => {
    stopPoll();
    stopSampleTimer();
  };

  /** Success = World scene running AND real content verified on screen. */
  const confirmReady = (): void => {
    if (confirmed) return;
    confirmed = true;
    disarmAll();
    lifecycle.transition('ready'); // one-shot: verifying → ready, final
    markGameReady();
  };

  /** Persian summary of what the sampler saw (error panel / debugging). */
  const visualDiagnostics = (): string => {
    if (!samples.length) return 'visible-output check: no samples taken';
    return 'visible-output samples: '
      + samples.map((s) => (s.status === 'ok' ? s.detail : 'skipped (' + s.detail + ')')).join('; ');
  };

  /** One boot attempt. Returns false only when Phaser threw synchronously. */
  const tryBoot = (choice: RendererChoice): boolean => {
    const rendererType = choice === 'auto' ? Phaser.AUTO : Phaser.CANVAS;
    try {
      game = new Phaser.Game(createGameConfig([BootScene, WorldScene, UIScene], rendererType));
      // The game object exists — World may still fail, but the boot phase is real.
      lifecycle.transition('booting');
    } catch (err) {
      game = null;
      const msg = err instanceof Error ? err.message : String(err);
      failures.push('attempt ' + (attempt + 1) + ' (' + choice + '): ' + msg);
      return false;
    }
    if (attempt > 0) {
      // Honest trace of the fallback, per directive §54.
      console.warn(
        '[Coppergate] Boot attempt ' + (attempt + 1) + ': using the Canvas renderer '
        + 'after the previous renderer failed. ' + glInfo,
      );
    }
    hook.__coppergate = { game, sceneKeys: Object.values(SCENES), rendererChoice: choice, lifecycle };
    armWatchdog(choice);
    startReadinessPoll();
    return true;
  };

  /**
   * The single retry path — used by BOTH failure detectors:
   * (a) the watchdog (World never even starts) and
   * (b) the visible-output check (World runs but the screen stays empty).
   * Returns true when a Canvas retry is underway, false when the policy
   * says nothing is left (caller must open the panel).
   */
  const retryWithCanvas = (reason: string): boolean => {
    const next = retryRenderer(initial, attempt + 1);
    if (next !== 'canvas' || !probe.canvas2dDraws || !game) return false;
    // From 'booting' (watchdog fired) or 'verifying' (dead output) — both legal.
    lifecycle.transition('recovering');
    attempt += 1;
    confirmed = false;
    samples = [];
    disarmAll();
    console.warn('[Coppergate] ' + reason + ' — retrying with the Canvas renderer. ' + glInfo);
    // Teardown: destroy may be deferred to the game's next step, so any
    // canvas that exists NOW belongs to the failed attempt and is removed
    // shortly after — before the retry appends its own.
    const stale = Array.from(document.querySelectorAll('canvas'));
    try {
      game.destroy(true, false);
    } catch {
      /* best-effort teardown of a stuck boot */
    }
    game = null;
    window.setTimeout(() => {
      for (const c of stale) c.remove();
    }, 50);
    return tryBoot('canvas');
  };

  /** Watchdog for one attempt: World not running → one Canvas retry, else panel. */
  const armWatchdog = (choice: RendererChoice): void => {
    const bootInfo = 'attempt: ' + (attempt + 1) + '/' + choice + '\n' + glInfo
      + (failures.length ? '\n' + failures.join('\n') : '');
    const token = ++watchdogToken;
    armBootWatchdog(bootInfo, () => {
      if (token !== watchdogToken) return true; // superseded — a newer attempt owns the boot
      return retryWithCanvas(
        'World scene did not start within ' + BOOT_WATCHDOG_MS + 'ms (watchdog)',
      );
    });
  };

  /** One compositor-path sample of the live game canvas. */
  const takeSample = (): void => {
    if (confirmed || !game || !game.canvas) return;
    const s = countVisiblePixels(game.canvas, GAME.backgroundColor);
    samples.push(s);
    if (s.status === 'ok' && s.ratio >= VISIBLE_CHECK.MIN_VISIBLE_RATIO) {
      // Content is on the canvas — but content alone is not success: a
      // layout bug can park the fully-rendered canvas OUTSIDE the viewport
      // (field bug #7: the player then sees only the page background while
      // every scene reports healthy). Ready requires BOTH.
      const pos = canvasInViewport(game.canvas);
      if (!pos.ok) {
        disarmAll();
        panelFailure(
          'بازی اجرا شد ولی بوم آن خارج از صفحهٔ نمایش قرار گرفت',
          'دنیای بازی فعال بود و محتوا تولید می‌کرد، اما بوم بازی داخل پنجرهٔ مرورگر نبود'
          + ' — این یک ایراد چیدمان صفحه است، نه شتاب‌دهی سخت‌افزاری.\n'
          + pos.detail + '\n'
          + visualDiagnostics() + '\n'
          + glInfo,
        );
        return;
      }
      confirmReady();
    }
  };

  const finishSampling = (): void => {
    const verdict = visibleOutputDead(samples);
    if (!verdict.dead) {
      confirmReady(); // only reachable via the fail-open branch — stay honest
      return;
    }
    const reason = 'World scene is running but its canvas presents no visible output '
      + '(' + verdict.detail + ')';
    if (!retryWithCanvas(reason)) {
      disarmAll();
      panelFailure(
        'مرورگر شما امکان رندر بازی را ندارد',
        'دنیای بازی فعال بود ولی هیچ خروجی قابل‌مشاهده‌ای روی صفحه تولید نشد — حتی پس از تلاش مجدد با Canvas.\n'
        + visualDiagnostics() + '\n'
        + (failures.length ? failures.join('\n') + '\n' : '')
        + glInfo + '\n'
        + 'userAgent: ' + navigator.userAgent,
      );
    }
  };

  const runSampleChain = (): void => {
    if (confirmed || !game) return;
    takeSample();
    if (confirmed) return;
    const okCount = samples.filter((s) => s.status === 'ok').length;
    if (okCount >= VISIBLE_CHECK.SAMPLES) {
      finishSampling();
      return;
    }
    sampleTimer = window.setTimeout(runSampleChain, VISIBLE_CHECK.INTERVAL_MS);
  };

  /**
   * Readiness flow: wait for the World scene, give it a short grace period
   * (font wait is done, World create finished), then verify through the
   * compositor path that real game content reached the screen. Ready is
   * confirmed at the FIRST healthy sample; only samples that stay at the
   * clear color continue the chain toward the Canvas retry.
   */
  const startReadinessPoll = (): void => {
    disarmAll();
    samples = [];
    poll = window.setInterval(() => {
      if (confirmed) {
        stopPoll();
        return;
      }
      if (!isWorldRunning()) return;
      stopPoll();
      // World is up — sampling/verification phase begins (booting → verifying).
      lifecycle.transition('verifying');
      sampleTimer = window.setTimeout(runSampleChain, VISIBLE_CHECK.GRACE_MS);
    }, 250);
  };

  // Attempt 0 — the probe-based choice.
  lifecycle.transition('probing'); // idle → probing: the decision is made below
  if (tryBoot(initial)) {
    return;
  }

  // Attempt 1 — Phaser's WebGL boot threw synchronously ('WebGL unsupported'
  // or 'Cannot create WebGL context'). Canvas is the last resort, and only
  // if the probe proved 2D output actually works on this machine.
  const retry = retryRenderer(initial, 1);
  if (retry === 'canvas' && probe.canvas2dDraws) {
    attempt = 1;
    console.warn(
      '[Coppergate] WebGL boot threw synchronously (' + failures[0] + '). '
      + 'Retrying with the Canvas renderer. ' + glInfo,
    );
    if (tryBoot('canvas')) {
      return;
    }
  }

  // No renderer booted — open the panel with everything we collected.
  disarmAll();
  panelFailure(
    'مرورگر شما امکان رندر بازی را ندارد',
    'هیچ‌یک از رندررهای بازی اجرا نشد.\n'
    + failures.join('\n') + '\n'
    + describeGL() + '\n'
    + 'userAgent: ' + navigator.userAgent,
  );
}

boot();
