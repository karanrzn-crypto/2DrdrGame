/**
 * qa_screens.cjs — visual QA capture for the v3 rebuild.
 * Boots the production build in headless Chromium, drives the world clock
 * and player position through the documented __coppergate hook, waits for
 * the weather ramps, and saves canvas.toDataURL captures.
 */
const path = require('path');
const fs = require('fs');

const OUT_REPO = '/home/z/my-project/2DrdrGame/docs/screenshots/v3';
const OUT_USER = '/home/z/my-project/download/screenshots/after';
for (const d of [OUT_REPO, OUT_USER]) fs.mkdirSync(d, { recursive: true });

(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  let errors = 0;
  page.on('console', (m) => {
    const t = m.text();
    if (t.toLowerCase().includes('error')) { errors++; console.log('[console]', t.slice(0, 240)); }
  });
  page.on('pageerror', (e) => { errors++; console.log('[pageerror]', String(e).slice(0, 300)); });

  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await page.waitForFunction('window.__cgReady === true', null, { timeout: 25000 });
  console.log('boot: ready');
  await page.waitForTimeout(1400);

  async function shot(name, minutes, day, tx, ty, settleMs = 900) {
    await page.evaluate(([minutes, day, tx, ty]) => {
      const g = window.__coppergate.game;
      const world = g.scene.getScene('World');
      const ts = world.registry.get('timeSys');
      ts.day = day; ts.minutes = minutes;
      const p = world.player;
      p.sprite.setPosition(tx, ty);
      p.sprite.body.reset(tx, ty);
      // QA shortcut: snap weather ramps to steady state
      const w = (minutes >= 623 && minutes < 683) ? 'rain' : (minutes >= 931 && minutes < 991) ? 'dust' : 'clear';
      world.rainI = w === 'rain' ? 1 : 0;
      world.dustI = w === 'dust' ? 1 : 0;
      if (w === 'rain' && !world.rainOn) { world.rainEmitter.start(); world.rainOn = true; }
      if (w === 'dust' && !world.dustOn) { world.dustEmitter.start(); world.dustOn = true; }
      if (w !== 'rain' && world.rainOn) { world.rainEmitter.stop(); world.rainOn = false; }
      if (w !== 'dust' && world.dustOn) { world.dustEmitter.stop(); world.dustOn = false; }
    }, [minutes, day, tx, ty]);
    await page.waitForTimeout(settleMs);
    const data = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
    const buf = Buffer.from(data.split(',')[1], 'base64');
    fs.writeFileSync(path.join(OUT_REPO, name), buf);
    fs.writeFileSync(path.join(OUT_USER, name), buf);
    console.log('saved', name, (buf.length / 1024).toFixed(0) + 'KB');
  }

  // towns, regions, times, weathers
  await shot('v3-town-noon.png', 720, 1, 42 * 16 + 8, 24 * 16 + 16);
  await shot('v3-road-morning.png', 450, 1, 12 * 16 + 8, 25 * 16 + 16);
  await shot('v3-golden-saloon.png', 1010, 1, 36 * 16 + 8, 23 * 16 + 16);
  await shot('v3-badlands-ruin.png', 820, 1, 6 * 16 + 8, 32 * 16 + 16);
  await shot('v3-pond-woods.png', 600, 1, 52 * 16 + 8, 12 * 16 + 16);
  await shot('v3-night-town.png', 1250, 1, 40 * 16 + 8, 26 * 16 + 16, 1100);
  await shot('v3-sunset-pond.png', 1075, 1, 56 * 16 + 8, 10 * 16 + 16);
  await shot('v3-corral-farm.png', 830, 1, 51 * 16 + 8, 28 * 16 + 8);
  await shot('v3-rain-town.png', 650, 1, 40 * 16 + 8, 25 * 16 + 16, 4200);
  await shot('v3-dust-badlands.png', 950, 1, 9 * 16 + 8, 26 * 16 + 16);
  await shot('v3-spawn-camp.png', 430, 1, 5 * 16 + 8, 25 * 16 + 16);
  await shot('v3-plaza-well.png', 760, 1, 40 * 16 + 8, 23 * 16 + 16);

  const stats = await page.evaluate(() => {
    const g = window.__coppergate.game;
    const w = g.scene.getScene('World');
    return {
      fps: Math.round(g.loop.actualFps),
      objects: w.children.list.length,
      lights: w.nightLights.length,
      renderer: window.__coppergate.rendererChoice,
      bootErrorHidden: document.getElementById('boot-error').hidden,
    };
  });
  console.log('stats:', JSON.stringify(stats), 'consoleErrors:', errors);
  await browser.close();
  if (errors > 0) process.exit(2);
})().catch((e) => { console.error('QA FAILED:', e); process.exit(1); });
