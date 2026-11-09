import { createRequire } from 'node:module';
const { chromium } = createRequire('/opt/npm-tools/')('playwright');
const out = process.argv[2];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const logs = []; page.on('pageerror', (e) => logs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
await page.goto('http://localhost:5173/?autostart', { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready === true);
await page.evaluate(() => { document.getElementById('hud').style.display = 'none'; const g = window.__game; g.camRig.yaw = 0.6; g.camRig.pitch = -0.12; g.camRig.thirdDist = 4.4; g.camRig.distTarget = 4.4; });
for (const [name, h] of [['dawn', 6.4], ['noon', 12.5], ['golden', 17.2], ['dusk', 18.3], ['night', 23.0]]) {
  await page.evaluate((h) => window.__game.sky.setTime(h), h);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${out}/tod_${name}.png` });
}
console.log(logs.length ? logs.join('\n') : 'no errors');
await browser.close();
