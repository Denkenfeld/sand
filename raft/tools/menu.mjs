import { createRequire } from 'node:module';
const { chromium } = createRequire('/opt/npm-tools/')('playwright');
const out = process.argv[2];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const logs = []; page.on('pageerror', (e) => logs.push('pageerror ' + e.message)); page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
await page.goto('http://localhost:4173/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/menu.png` });
await page.mouse.click(480, 270);               // start via the overlay
await page.waitForTimeout(1200);
console.log('overlay hidden:', await page.evaluate(() => document.getElementById('overlay').classList.contains('hidden')), 'started:', await page.evaluate(() => window.__game.started));
// mouse-look via drag fallback
await page.mouse.move(480, 270); await page.mouse.down(); await page.mouse.move(400, 255, { steps: 4 }); await page.mouse.up();
await page.keyboard.down('KeyW'); await page.waitForTimeout(1500); await page.keyboard.up('KeyW');
await page.screenshot({ path: `${out}/ingame.png` });
console.log('yaw after drag', await page.evaluate(() => +window.__game.camRig.yaw.toFixed(3)));
console.log(logs.length ? logs.join('\n') : 'no errors');
await browser.close();
