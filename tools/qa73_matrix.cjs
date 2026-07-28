// #73 readability QA: pose matrix screenshots + hitbox audit for both sides.
// Run: NODE_PATH=$(npm root -g) node tools/qa73_matrix.cjs [side]
const { chromium } = require('playwright');
const fs = require('node:fs');

const OUT = 'tools/ref/qa73';
const ONLY = process.argv[2] || null;

const POSES = {
  human: ['idle', 'run', 'jump', 'climb', 'rope', 'hang', 'crawl', 'land', 'mantle'],
  stalker: ['idle', 'run', 'jump', 'cling', 'ceil', 'climb', 'hang', 'crawl', 'land', 'mantle'],
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  } catch (e) {
    browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  }
  const page = await browser.newPage({ viewport: { width: 1000, height: 620 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto('http://localhost:8765/');
  await page.waitForFunction(() => typeof loadProgress === 'function' && loadProgress() === 1, null, { timeout: 90000 });
  await page.waitForFunction(() => get('*').length > 0, null, { timeout: 30000 });

  const audit = {};
  for (const [side, anims] of Object.entries(POSES)) {
    if (ONLY && side !== ONLY) continue;
    await page.evaluate((s) => go('game', s), side);
    await page.waitForFunction(() => get('player').length === 1, null, { timeout: 20000 });
    await page.waitForTimeout(1400); // settle on the floor

    audit[side] = await page.evaluate(() => {
      const p = get('player')[0];
      return { hitW: Math.round(p.width * 10) / 10, hitH: Math.round(p.height * 10) / 10, anim: p.curAnim() };
    });
    console.log(side, 'audit', JSON.stringify(audit[side]));

    for (const anim of anims) {
      const ok = await page.evaluate((a) => {
        const p = get('player')[0];
        if (!p) return 'no-player';
        try {
          if (!p.__origPlay) p.__origPlay = p.play.bind(p);
          window.__forced = a;
          p.play = (n, o) => { if (n === window.__forced) p.__origPlay(n, o); };
          p.__origPlay(a);
          return 'ok';
        } catch (e) { return 'err: ' + e.message; }
      }, anim);
      if (ok !== 'ok') { console.log(side, anim, ok); continue; }
      await page.waitForTimeout(650); // mid-cycle frame

      const canvas = page.locator('canvas');
      await canvas.screenshot({ path: `${OUT}/${side}_${anim}.png` });

      const clip = await page.evaluate(() => {
        const p = get('player')[0];
        const c = document.querySelector('canvas').getBoundingClientRect();
        const sp = toScreen(p.pos);
        const kx = c.width / width(), ky = c.height / height();
        const s = 150;
        return {
          x: Math.max(0, c.left + sp.x * kx - s), y: Math.max(0, c.top + sp.y * ky - s * 1.35),
          width: s * 2, height: s * 2.5,
        };
      });
      await page.screenshot({ path: `${OUT}/${side}_${anim}_zoom.png`, clip });

      await page.evaluate(() => { const p = get('player')[0]; if (p && p.__origPlay) p.play = p.__origPlay; });
      const alive = await page.evaluate(() => get('player').length);
      if (alive !== 1) { console.log('PLAYER LOST after', side, anim, '— aborting side'); break; }
    }
  }
  console.log('console/page errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
