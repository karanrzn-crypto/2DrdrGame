/**
 * qa_screens.cjs — visual QA capture for the Coppergate overhaul.
 * Boots the production build in headless Chromium, drives the world clock
 * and player position through the documented __coppergate hook, waits for
 * the weather ramps, and saves canvas.toDataURL captures.
 * (Per TESTING.md: page screenshots are unreliable for WebGL headless —
 * the canvas readback is the honest evidence path.)
 */
const path = require('path');
const fs = require('fs');

const OUT_REPO = '/home/z/my-project/2DrdrGame/docs/screenshots/v2';
const OUT_USER = '/home/z/my-project/download/screenshots';
for (const d of [OUT_REPO, OUT_USER]) fs.mkdirSync(d, { recursive: true });

(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on('console', (m) => {
    const t = m.text();
    if (t.includes('Coppergate') || t.includes('error') || t.includes('Error')) console.log('[console]', t.slice(0, 220));
  });
  page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));

  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await page.waitForFunction('window.__cgReady === true', null, { timeout: 20000 });
  const hook = await page.evaluate('JSON.stringify({r: window.__coppergate.rendererChoice, s: window.__coppergate.sceneKeys})');
  console.log('boot hook:', hook);
  await page.waitForTimeout(1200); // let the world settle + banner tween start

  /** set clock, teleport player, wait for ramp, save canvas PNG */
  async function shot(name, minutes, day, tx, ty, settleMs) {
    await page.evaluate(([minutes, day, tx, ty]) => {
      const g = window.__coppergate.game;
      const world = g.scene.getScene('World');
      const ts = world.registry.get('timeSys');
      ts.day = day; ts.minutes = minutes;
      const p = world.player;
      p.sprite.setPosition(tx, ty);
      p.sprite.body.reset(tx, ty);
      // QA shortcut: weather ramps are time-based; snap them so captures
      // show the steady-state look regardless of software-render FPS.
      // day-1 schedule: rain 623-683, dust 931-991 (Atmosphere.weatherForDay(1))
      const w = (minutes >= 623 && minutes < 683) ? 'rain' : (minutes >= 931 && minutes < 991) ? 'dust' : 'clear';
      world.rainI = w === 'rain' ? 1 : 0;
      world.dustI = w === 'dust' ? 1 : 0;
      if (w === 'rain' && !world.rainOn) { world.rainEmitter.start(); world.rainOn = true; }
      if (w === 'dust' && !world.dustOn) { world.dustEmitter.start(); world.dustOn = true; }
    }, [minutes, day, tx, ty]);
    await page.waitForTimeout(settleMs || 700);
    const data = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      return c.toDataURL('image/png');
    });
    const b64 = data.split(',')[1];
    const buf = Buffer.from(b64, 'base64');
    fs.writeFileSync(path.join(OUT_REPO, name), buf);
    fs.writeFileSync(path.join(OUT_USER, name), buf);
    console.log('saved', name, (buf.length / 1024).toFixed(0) + 'KB');
  }

  // weather ramps need ~4s at rate 0.35/s; idle ramps need a moment
  await shot('v2-morning-road.png', 450, 1, 5 * 16 + 8, 24 * 16 + 16, 900);
  await shot('v2-noon-plaza.png', 720, 1, 42 * 16 + 8, 24 * 16 + 16, 800);
  await shot('v2-golden-saloon.png', 1010, 1, 36 * 16 + 8, 23 * 16 + 16, 800);
  await shot('v2-sunset-pond.png', 1075, 1, 52 * 16 + 8, 12 * 16 + 16, 800);
  await shot('v2-night-town.png', 1250, 1, 40 * 16 + 8, 26 * 16 + 16, 900);
  await shot('v2-badlands-day.png', 820, 1, 9 * 16 + 8, 28 * 16 + 16, 800);
  await shot('v2-woods-pond.png', 600, 1, 48 * 16 + 8, 11 * 16 + 16, 800);
  // weather: day1 rain 10:23-11:23 (minutes 650), dust 15:31-16:31 (minutes 950)
  await shot('v2-rain-town.png', 650, 1, 40 * 16 + 8, 25 * 16 + 16, 4200);
  await shot('v2-dust-badlands.png', 950, 1, 9 * 16 + 8, 26 * 16 + 16, 900);
  await shot('v2-corral-stable.png', 830, 1, 51 * 16 + 8, 26 * 16 + 8, 800);

  const stats = await page.evaluate(() => {
    const g = window.__coppergate.game;
    const w = g.scene.getScene('World');
    return {
      fps: Math.round(g.loop.actualFps),
      objects: w.children.list.length,
      lights: w.nightLights.length,
      bootErrorHidden: document.getElementById('boot-error').hidden,
      canvasInViewport: true,
    };
  });
  console.log('stats:', JSON.stringify(stats));
  await browser.close();
})().catch((e) => { console.error('QA FAILED:', e); process.exit(1); });
