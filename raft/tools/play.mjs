// Scripted playthrough: drives real keyboard events and captures screenshots + state.
// usage: node tools/play.mjs <outDir>
import { createRequire } from 'node:module';
import fs from 'node:fs';
const { chromium } = createRequire('/opt/npm-tools/')('playwright');
const out = process.argv[2] || '.';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/GL Driver|deprecated|swiftshader/i.test(m.text())) logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto('http://localhost:5173/?autostart', { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
await page.evaluate(() => { document.getElementById('hud').style.display = 'none'; });
await page.waitForTimeout(1500);

const state = () => page.evaluate(() => { const g = window.__game, p = g.player; return {
  pos: p.pos.toArray().map((v) => +v.toFixed(2)), grounded: p.grounded, speed: +p.speed.toFixed(2), vy: +p.vy.toFixed(2),
  rollDeg: +(g.raft.roll * 57.3).toFixed(2), pitchDeg: +(g.raft.pitch * 57.3).toFixed(2), raftY: +g.raft.y.toFixed(3),
  fp: g.camRig.first, anim: { fall: +p.anim.fall.toFixed(2), air: +p.anim.air.toFixed(2) }, fps: g.fps, near: p.nearby?.name ?? null }; });
const shot = async (name) => page.screenshot({ path: `${out}/${name}.png` });

console.log('start', await state());
// 1) walk forward + run
await page.keyboard.down('KeyW'); await page.keyboard.down('ShiftLeft');
await page.waitForTimeout(1400); console.log('running', await state()); await shot('run');
await page.keyboard.up('ShiftLeft'); await page.waitForTimeout(600); console.log('walking', await state()); await shot('walk');
await page.keyboard.up('KeyW');
// 2) jump
await page.keyboard.press('Space'); await page.waitForTimeout(260); console.log('jump apex', await state()); await shot('jump');
await page.waitForTimeout(1200); console.log('landed', await state());
// 3) walk into the edge (must be blocked), many frames
await page.keyboard.down('KeyD'); await page.waitForTimeout(4500); await page.keyboard.up('KeyD'); console.log('after walking right 4.5s', await state());
await page.keyboard.down('KeyS'); await page.waitForTimeout(4500); await page.keyboard.up('KeyS'); console.log('after walking back 4.5s', await state());
// 4) interact near water (go to the +z edge)
await page.evaluate(() => { window.__game.player.pos.set(0.0, 0.37, 1.8); window.__game.player.vel.set(0, 0); });
await page.waitForTimeout(300); console.log('near edge', await state());
await page.keyboard.press('KeyE'); await page.waitForTimeout(700); await shot('interact'); await page.waitForTimeout(1500);
// 5) first person
await page.keyboard.press('KeyV'); await page.waitForTimeout(1500); console.log('first person', await state()); await shot('firstperson');
await page.keyboard.press('KeyV'); await page.waitForTimeout(1200);
// 6) sunset + night
await page.evaluate(() => window.__game.sky.setTime(18.6)); await page.waitForTimeout(900); await shot('sunset');
await page.evaluate(() => window.__game.sky.setTime(23.0)); await page.waitForTimeout(900); await shot('night');
console.log(logs.length ? logs.join('\n').slice(0, 3000) : 'no console errors');
await browser.close();
