/**
 * gameplay_smoke.cjs — real-input gameplay verification for the rebuild:
 * movement, collision, interaction + dialogue, pause/resume.
 */
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  let errors = 0;
  page.on('pageerror', (e) => { errors++; console.log('[pageerror]', String(e).slice(0, 200)); });
  await page.goto('http://localhost:4173/', { waitUntil: 'load' });
  await page.waitForFunction('window.__cgReady === true', null, { timeout: 25000 });
  await page.waitForTimeout(1000);
  const pos = () => page.evaluate(() => {
    const w = window.__coppergate.game.scene.getScene('World');
    return { x: Math.round(w.player.sprite.x), y: Math.round(w.player.sprite.y) };
  });

  // 1) movement with real keys
  const p0 = await pos();
  await page.keyboard.down('D');
  await page.waitForTimeout(700);
  await page.keyboard.up('D');
  const p1 = await pos();
  console.log('move right:', p0, '→', p1, p1.x > p0.x + 6 ? 'PASS' : 'FAIL');

  // 2) collision: teleport next to pond and push west into the water
  await page.evaluate(() => {
    const w = window.__coppergate.game.scene.getScene('World');
    // find the westernmost water tile of the pond
    const ts = w.registry.get('timeSys');
    ts.day = 1; ts.minutes = 600;
    w.player.sprite.setPosition(52 * 16 + 8, 8 * 16 + 16);
    w.player.sprite.body.reset(52 * 16 + 8, 8 * 16 + 16);
  });
  await page.waitForTimeout(300);
  const p2 = await pos();
  await page.keyboard.down('D'); // push east toward pond center (57,8)
  await page.waitForTimeout(900);
  await page.keyboard.up('D');
  const p3 = await pos();
  const blocked = p3.x < 56 * 16; // never reached deep water
  console.log('water collision:', p2, '→', p3, blocked ? 'PASS' : 'FAIL');

  // 3) interaction + dialogue at the road sign (7,22)
  await page.evaluate(() => {
    const w = window.__coppergate.game.scene.getScene('World');
    w.player.sprite.setPosition(7 * 16 + 8, 23 * 16 + 16);
    w.player.sprite.body.reset(7 * 16 + 8, 23 * 16 + 16);
  });
  await page.waitForTimeout(500);
  const promptVisible = await page.evaluate(() => {
    const ui = window.__coppergate.game.scene.getScene('UI');
    return ui.promptBox.visible;
  });
  console.log('prompt near sign:', promptVisible ? 'PASS' : 'FAIL');
  await page.keyboard.press('E');
  await page.waitForTimeout(400);
  const dlgOpen = await page.evaluate(() => {
    const ui = window.__coppergate.game.scene.getScene('UI');
    return ui.dialogue.panel.visible;
  });
  console.log('dialogue opened:', dlgOpen ? 'PASS' : 'FAIL');
  // advance through the dialogue
  for (let i = 0; i < 9; i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(240); }
  const dlgClosed = await page.evaluate(() => {
    const ui = window.__coppergate.game.scene.getScene('UI');
    return !ui.dialogue.panel.visible;
  });
  console.log('dialogue closes:', dlgClosed ? 'PASS' : 'FAIL');

  // 4) pause / resume (the guard resumes on the NEXT ESC press)
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const paused = await page.evaluate(() => {
    const ui = window.__coppergate.game.scene.getScene('UI');
    return ui.pauseOverlay.visible;
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const resumed = await page.evaluate(() => {
    const ui = window.__coppergate.game.scene.getScene('UI');
    const w = window.__coppergate.game.scene.getScene('World');
    // Phaser.Scenes.RUNNING === 5, PAUSED === 6
    return !ui.pauseOverlay.visible && w.scene.settings.status === 5;
  });
  console.log('pause/resume:', paused && resumed ? 'PASS' : `FAIL (paused=${paused} resumed=${resumed})`);

  const stats = await page.evaluate(() => {
    const g = window.__coppergate.game;
    return { fps: Math.round(g.loop.actualFps) };
  });
  console.log('fps (software):', stats.fps, 'consoleErrors:', errors);
  await browser.close();
  if (errors) process.exit(2);
})().catch((e) => { console.error('FAILED:', e); process.exit(1); });
