// Headless screenshot + console/shader error report.
// usage: node tools/shot.mjs <out.png> [waitMs] [url] [jsToEvalBeforeShot]
import { createRequire } from 'node:module';
// Playwright is installed globally in this sandbox; resolve it from there.
const { chromium } = createRequire('/opt/npm-tools/')('playwright');

const [out = 'shot.png', wait = '4000', url = 'http://localhost:5173/', js = ''] = process.argv.slice(2);
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 }).catch(() => logs.push('[timeout] __ready never set'));
if (js) await page.evaluate(js).catch((e) => logs.push('[eval] ' + e.message));
await page.waitForTimeout(Number(wait));
await page.screenshot({ path: out });
console.log(logs.length ? logs.join('\n').slice(0, 4000) : 'no console errors');
await browser.close();
