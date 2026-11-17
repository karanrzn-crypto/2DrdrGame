/**
 * baseline_before.cjs — capture "before" screenshots of the current build.
 * Same capture technique as qa_screens.cjs (canvas readback, headless
 * Chromium + SwiftShader).
 */
const path = require('path');
const fs = require('fs');

const OUT = '/home/z/my-project/download/screenshots/before';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)));

  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await page.waitForFunction('window.__cgReady === true', null, { timeout: 20000 });
  console.log('boot: ready');
  await page.waitForTimeout(1200);

  async function shot(name, minutes, day, tx, ty, settleMs = 800) {
    await page.evaluate(([minutes, day, tx, ty]) => {
      const g = window.__coppergate.game;
      const world = g.scene.getScene('World');
      const ts = world.registry.get('timeSys');
      ts.day = day; ts.minutes = minutes;
      const p = world.player;
      p.sprite.setPosition(tx, ty);
      p.sprite.body.reset(tx, ty);
    }, [minutes, day, tx, ty]);
    await page.waitForTimeout(settleMs);
    const data = await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
    const buf = Buffer.from(data.split(',')[1], 'base64');
    fs.writeFileSync(path.join(OUT, name), buf);
    console.log('saved', name, (buf.length / 1024).toFixed(0) + 'KB');
  }

  await shot('before-town-noon.png', 720, 1, 42 * 16 + 8, 24 * 16 + 16);
  await shot('before-road-morning.png', 450, 1, 12 * 16 + 8, 25 * 16 + 16);
  await shot('before-badlands.png', 820, 1, 9 * 16 + 8, 28 * 16 + 16);
  await shot('before-golden-saloon.png', 1010, 1, 36 * 16 + 8, 23 * 16 + 16);
  await shot('before-night-town.png', 1250, 1, 40 * 16 + 8, 26 * 16 + 16, 900);
  await shot('before-pond.png', 600, 1, 52 * 16 + 8, 12 * 16 + 16);

  const stats = await page.evaluate(() => {
    const g = window.__coppergate.game;
    const w = g.scene.getScene('World');
    return { fps: Math.round(g.loop.actualFps), objects: w.children.list.length };
  });
  console.log('stats:', JSON.stringify(stats));
  await browser.close();
})().catch((e) => { console.error('FAILED:', e); process.exit(1); });
