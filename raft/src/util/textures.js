import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

// Deterministic PRNG so the world looks the same every run (and in tests).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTex(w, h, draw, { srgb = true, repeat = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/** Weathered driftwood planks. Grain runs along U (x on box top faces). */
export function makeWoodTexture(seed = 1) {
  const noise = createNoise2D(mulberry32(seed));
  const rnd = mulberry32(seed + 7);
  return canvasTex(512, 128, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const grain = noise(x * 0.012, y * 0.55) * 0.5 + noise(x * 0.05, y * 1.4) * 0.3 + noise(x * 0.2, y * 3.0) * 0.12;
        const bleach = noise(x * 0.004 + 9, y * 0.05) * 0.5 + 0.5;       // sun-bleached patches
        const v = 0.5 + grain * 0.5;
        const r = 118 + v * 78 + bleach * 12, g = 86 + v * 54 + bleach * 10, b = 54 + v * 36 + bleach * 12;
        const i = (y * w + x) * 4;
        img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // dark cracks + knots
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      ctx.strokeStyle = `rgba(40,28,18,${0.25 + rnd() * 0.3})`; ctx.lineWidth = 0.8 + rnd() * 1.2;
      const y = rnd() * h, x = rnd() * w, len = 40 + rnd() * 160;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y + (rnd() - 0.5) * 6); ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const x = rnd() * w, y = 12 + rnd() * (h - 24);
      const gr = ctx.createRadialGradient(x, y, 1, x, y, 11);
      gr.addColorStop(0, 'rgba(40,26,14,0.9)'); gr.addColorStop(1, 'rgba(40,26,14,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y, 16, 8, 0, 0, 6.3); ctx.fill();
    }
  });
}

/** Rusty ribbed oil-barrel metal. */
export function makeRustTexture(seed = 3) {
  const noise = createNoise2D(mulberry32(seed));
  return canvasTex(256, 256, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const n = noise(x * 0.03, y * 0.03) * 0.5 + noise(x * 0.12, y * 0.12) * 0.3 + noise(x * 0.5, y * 0.5) * 0.1;
        const rust = THREE.MathUtils.smoothstep(n, -0.1, 0.45);
        const rib = 1 - 0.25 * Math.pow(Math.abs(Math.sin((y / h) * Math.PI * 6)), 8);
        // base: faded blue paint -> orange rust
        const r = (60 + rust * 130) * rib, g = (92 - rust * 20 + rust * 22) * rib, b = (112 - rust * 90) * rib;
        const i = (y * w + x) * 4;
        img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = Math.max(b, 20); img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });
}

/** Palm frond: leaflets as a comb with alpha. */
export function makeFrondTexture() {
  return canvasTex(256, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#5a7a2c'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
    for (let i = 0; i < 46; i++) {
      const y = 10 + (i / 46) * (h - 20);
      const taper = Math.sin((i / 46) * Math.PI) * 0.6 + 0.4;
      const len = (w / 2 - 6) * taper;
      for (const s of [-1, 1]) {
        const g = ctx.createLinearGradient(w / 2, y, w / 2 + s * len, y + 26);
        g.addColorStop(0, '#6f9a2e'); g.addColorStop(1, i % 3 ? '#3f7a2a' : '#8ba23a');
        ctx.strokeStyle = g; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(w / 2, y); ctx.quadraticCurveTo(w / 2 + s * len * 0.6, y + 4, w / 2 + s * len, y + 26 * taper + 8); ctx.stroke();
      }
    }
  }, { repeat: false });
}

/** Faded patched canvas tarp. */
export function makeTarpTexture() {
  const noise = createNoise2D(mulberry32(11));
  return canvasTex(256, 256, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const n = noise(x * 0.02, y * 0.02) * 0.5 + noise(x * 0.4, y * 0.4) * 0.1;
      const weave = 0.93 + 0.07 * Math.sin(x * 1.9) * Math.sin(y * 1.9);
      const i = (y * w + x) * 4;
      img.data[i] = (105 + n * 40) * weave; img.data[i + 1] = (178 + n * 40) * weave; img.data[i + 2] = (184 + n * 36) * weave; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    ctx.fillStyle = 'rgba(214,120,60,0.9)'; ctx.fillRect(150, 60, 70, 60);   // orange patch
    ctx.strokeStyle = 'rgba(30,30,30,0.5)'; ctx.setLineDash([4, 3]); ctx.strokeRect(150, 60, 70, 60);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 8; i++) ctx.fillRect(0, i * 32 + 14, w, 2); // seams
  });
}
