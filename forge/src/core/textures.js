// Prozedurale PBR-Texturen (Farbe + Normal + Rauheit/Metall), alles kachelbar, 512 px.
// surface(kind, pal) liefert { map, normalMap, orm }  – orm: G = Rauheit, B = Metall.
import * as THREE from 'three';
import { pfbm2, pnoise2, worley2, mulberry32, smoothstep } from './noise.js';

const N = 512;
const cache = new Map();
const patterns = new Map();

function canvas(n) {
  const c = document.createElement('canvas');
  c.width = c.height = n;
  return c;
}
function mkTex(c, srgb) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}
const arrs = (n, keys) => Object.fromEntries(keys.map((k) => [k, new Float32Array(n * n)]));

function colorCanvas(n, r, g, b) {
  const c = canvas(n), ctx = c.getContext('2d'), img = ctx.createImageData(n, n), d = img.data;
  for (let i = 0; i < n * n; i++) {
    d[i * 4] = Math.max(0, Math.min(255, r[i] * 255));
    d[i * 4 + 1] = Math.max(0, Math.min(255, g[i] * 255));
    d[i * 4 + 2] = Math.max(0, Math.min(255, b[i] * 255));
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
function normalCanvas(n, h, strength) {
  const c = canvas(n), ctx = c.getContext('2d'), img = ctx.createImageData(n, n), d = img.data;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const xl = (x - 1 + n) % n, xr = (x + 1) % n, yu = (y - 1 + n) % n, yd = (y + 1) % n;
      const dx = (h[y * n + xr] - h[y * n + xl]) * strength;
      const dy = (h[yd * n + x] - h[yu * n + x]) * strength;
      let nx = -dx, ny = dy, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nx /= l; ny /= l; nz /= l;
      const i = (y * n + x) * 4;
      d[i] = (nx * 0.5 + 0.5) * 255;
      d[i + 1] = (ny * 0.5 + 0.5) * 255;
      d[i + 2] = (nz * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
function ormCanvas(n, rough, metal) {
  const c = canvas(n), ctx = c.getContext('2d'), img = ctx.createImageData(n, n), d = img.data;
  for (let i = 0; i < n * n; i++) {
    d[i * 4] = 255;
    d[i * 4 + 1] = Math.max(0, Math.min(255, rough[i] * 255));
    d[i * 4 + 2] = Math.max(0, Math.min(255, metal[i] * 255));
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/* ───────────── Metall (Blechpaneele, Nieten, abgeplatzte Farbe, Rost) ───────────── */
export const METAL_PALETTES = {
  sand: [0.66, 0.56, 0.4],
  gray: [0.5, 0.52, 0.52],
  rust: [0.46, 0.26, 0.16],
  blue: [0.26, 0.38, 0.46],
  white: [0.78, 0.77, 0.72],
  olive: [0.36, 0.4, 0.28],
  red: [0.58, 0.22, 0.15],
  black: [0.16, 0.16, 0.17],
};

function metalPattern() {
  if (patterns.has('metal')) return patterns.get('metal');
  const n = N, P = 4, pxs = n / P, seed = 7;
  const rnd = mulberry32(seed);
  const tints = Array.from({ length: P * P }, () => 0.86 + rnd() * 0.28);
  const A = arrs(n, ['chip', 'rust', 'groove', 'rivet', 'mott', 'streak', 'grain', 'tint', 'h']);
  for (let y = 0; y < n; y++) {
    const v = y / n;
    for (let x = 0; x < n; x++) {
      const u = x / n, i = y * n + x;
      const fx = (u * P) % 1, fy = (v * P) % 1;
      const ix = Math.floor(u * P), iy = Math.floor(v * P);
      const e = Math.min(fx, 1 - fx, fy, 1 - fy) * pxs;
      const groove = smoothstep(2.4, 0.4, e);
      const rx = fx * pxs, ry = fy * pxs;
      let rivet = 0;
      const hx = ((rx + 16) % 32) - 16, vy = ((ry + 16) % 32) - 16;
      for (const cy of [10, pxs - 10]) rivet = Math.max(rivet, smoothstep(3.6, 1.6, Math.hypot(hx, ry - cy)));
      for (const cx of [10, pxs - 10]) rivet = Math.max(rivet, smoothstep(3.6, 1.6, Math.hypot(rx - cx, vy)));
      const cn = pfbm2(u, v, 12, 4, seed + 2) * 0.65 + pfbm2(u, v, 48, 3, seed + 3) * 0.35;
      const chip = smoothstep(0.6, 0.66, cn + smoothstep(16, 0, e) * 0.16);
      const rust = chip * smoothstep(0.4, 0.6, pfbm2(u, v, 6, 4, seed + 4));
      const grain = pnoise2(u * 256, v * 256, 256, 256, seed + 8);
      A.chip[i] = chip; A.rust[i] = rust; A.groove[i] = groove; A.rivet[i] = rivet;
      A.mott[i] = pfbm2(u, v, 5, 4, seed + 1);
      A.streak[i] = pnoise2(u * 40, v * 3, 40, 3, seed + 5) * 0.6 + pnoise2(u * 90, v * 5, 90, 5, seed + 6) * 0.4;
      A.grain[i] = grain;
      A.tint[i] = tints[iy * P + ix];
      A.h[i] = -groove * 1.0 + rivet * 1.4 - chip * 0.25 + (grain - 0.5) * 0.12 - rust * 0.2 + (grain - 0.5) * rust * 0.8;
    }
  }
  const rough = new Float32Array(n * n), metal = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) {
    const r = 0.52 + (A.grain[i] - 0.5) * 0.12;
    const withChip = r + (0.32 - r) * A.chip[i];
    const withRust = withChip + (0.88 - withChip) * A.rust[i];
    rough[i] = withRust + (0.92 - withRust) * A.groove[i];
    const m = 0.22 + (0.9 - 0.22) * A.chip[i];
    metal[i] = m + (0.3 - m) * A.rust[i];
  }
  const out = {
    A,
    normalMap: mkTex(normalCanvas(n, A.h, 2.6), false),
    orm: mkTex(ormCanvas(n, rough, metal), false),
  };
  patterns.set('metal', out);
  return out;
}

function metalSurface(pal) {
  const base = METAL_PALETTES[pal] || METAL_PALETTES.sand;
  const { A, normalMap, orm } = metalPattern();
  const n = N, R = new Float32Array(n * n), G = new Float32Array(n * n), B = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) {
    const mult = (0.82 + 0.36 * A.mott[i]) * A.tint[i] * (1 - 0.35 * smoothstep(0.45, 0.8, A.streak[i]));
    let r = base[0] * mult, g = base[1] * mult, b = base[2] * mult;
    const bl = 0.46 + 0.22 * A.grain[i];
    const c = A.chip[i];
    r += (bl - r) * c; g += (bl - g) * c; b += (bl * 1.04 - b) * c;
    const ru = A.rust[i], gr = A.grain[i];
    r += (0.4 + 0.15 * gr - r) * ru; g += (0.19 + 0.08 * gr - g) * ru; b += (0.08 + 0.04 * gr - b) * ru;
    const k = 1 - A.groove[i] * 0.55 + A.rivet[i] * 0.12 + (gr - 0.5) * 0.06;
    R[i] = r * k; G[i] = g * k; B[i] = b * k;
  }
  return { map: mkTex(colorCanvas(n, R, G, B), true), normalMap, orm };
}

/* ───────────── Lehm / Putz (Risse, abgeplatzte Stellen) ───────────── */
export const CLAY_PALETTES = {
  adobe: [0.72, 0.53, 0.35],
  white: [0.78, 0.73, 0.64],
  dark: [0.46, 0.36, 0.28],
  red: [0.58, 0.36, 0.26],
  sand: [0.93, 0.73, 0.47],  // Stadt: helle Sandfarbe, ruhigere Flecken
  ochre: [0.9, 0.6, 0.33], // Stadt: warmes Ocker
};
// Fleckenstärke je Palette (1 = Standard). Stadtfarben sind ruhiger, sonst wirken große Fassaden getarnt.
const CLAY_PATCH = { sand: 0.45, ochre: 0.5 };

function claySurface(pal) {
  const base = CLAY_PALETTES[pal] || CLAY_PALETTES.adobe;
  const n = N, seed = 21;
  const R = new Float32Array(n * n), G = new Float32Array(n * n), B = new Float32Array(n * n);
  const h = new Float32Array(n * n), rough = new Float32Array(n * n), metal = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    const v = y / n;
    for (let x = 0; x < n; x++) {
      const u = x / n, i = y * n + x;
      const mott = pfbm2(u, v, 4, 5, seed);
      const fine = pfbm2(u, v, 32, 3, seed + 1);
      const w = worley2(u, v, 7, seed + 2);
      const crack = smoothstep(0.045, 0.0, w.f2 - w.f1) * smoothstep(0.5, 0.72, pfbm2(u, v, 3, 3, seed + 3));
      const patch = smoothstep(0.58, 0.64, pfbm2(u, v, 5, 4, seed + 4));
      let m = (0.85 + 0.3 * mott) * (0.94 + 0.12 * fine);
      const pk = CLAY_PATCH[pal] ?? 1;
      m = 1 + (m - 1) * pk;
      let r = base[0] * m, g = base[1] * m, b = base[2] * m;
      r += (r * 0.82 - r) * patch * pk; g += (g * 0.74 - g) * patch * pk; b += (b * 0.68 - b) * patch * pk;
      const dark = 1 - crack * 0.4 * (pk < 1 ? 0.7 : 1);
      R[i] = r * dark; G[i] = g * dark; B[i] = b * dark;
      h[i] = (mott - 0.5) * 6 + (fine - 0.5) * 2.4 - crack * 2.2 - patch * 2;
      rough[i] = 0.93 + patch * 0.06;
    }
  }
  return {
    map: mkTex(colorCanvas(n, R, G, B), true),
    normalMap: mkTex(normalCanvas(n, h, 0.5), false),
    orm: mkTex(ormCanvas(n, rough, metal), false),
  };
}

/* ───────────── Stoff (neutral, wird über material.color eingefärbt) ───────────── */
function clothSurface() {
  const n = N, seed = 33, T = 96;
  const R = new Float32Array(n * n), h = new Float32Array(n * n), rough = new Float32Array(n * n), metal = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    const v = y / n;
    for (let x = 0; x < n; x++) {
      const u = x / n, i = y * n + x;
      const tx = u * T, ty = v * T;
      const over = (Math.floor(tx) + Math.floor(ty)) & 1;
      const weave = over ? Math.sin(Math.PI * (tx % 1)) : Math.sin(Math.PI * (ty % 1));
      const stain = pfbm2(u, v, 5, 4, seed);
      const fiber = pnoise2(u * 256, v * 256, 256, 256, seed + 1);
      R[i] = (0.88 + 0.12 * weave) * (0.82 + 0.3 * stain) * (0.96 + 0.08 * fiber);
      h[i] = weave * 1.1 + (fiber - 0.5) * 0.3;
      rough[i] = 0.92;
    }
  }
  return {
    map: mkTex(colorCanvas(n, R, R, R), true),
    normalMap: mkTex(normalCanvas(n, h, 1.2), false),
    orm: mkTex(ormCanvas(n, rough, metal), false),
  };
}

/* ───────────── Gummi / Reifenprofil ───────────── */
function treadSurface() {
  const n = N, seed = 44;
  const R = new Float32Array(n * n), h = new Float32Array(n * n), rough = new Float32Array(n * n), metal = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    const v = y / n;
    for (let x = 0; x < n; x++) {
      const u = x / n, i = y * n + x;
      const a = (u * 24 + Math.abs(v - 0.5) * 1.4) % 1;
      const block = smoothstep(0.62, 0.52, Math.abs(a - 0.5) * 2 - 0.1);
      const center = smoothstep(0.04, 0.0, Math.abs(v - 0.5) - 0.03);
      const grime = pfbm2(u, v, 8, 4, seed);
      const k = Math.max(block, center);
      R[i] = (0.1 + 0.07 * k) * (0.7 + 0.6 * grime);
      h[i] = k * 3.2 + (pnoise2(u * 128, v * 128, 128, 128, seed + 1) - 0.5) * 0.4;
      rough[i] = 0.92 - k * 0.1;
    }
  }
  return {
    map: mkTex(colorCanvas(n, R, R, R), true),
    normalMap: mkTex(normalCanvas(n, h, 0.9), false),
    orm: mkTex(ormCanvas(n, rough, metal), false),
  };
}

/* ───────────── Holz (Bretter, Nägel) ───────────── */
function woodSurface() {
  const n = N, seed = 55, P = 4;
  const rnd = mulberry32(seed);
  const tints = Array.from({ length: P }, () => 0.8 + rnd() * 0.35);
  const R = new Float32Array(n * n), G = new Float32Array(n * n), B = new Float32Array(n * n);
  const h = new Float32Array(n * n), rough = new Float32Array(n * n), metal = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    const v = y / n;
    for (let x = 0; x < n; x++) {
      const u = x / n, i = y * n + x;
      const plank = Math.floor(v * P), fy = (v * P) % 1;
      const gap = smoothstep(0.035, 0.0, Math.min(fy, 1 - fy));
      const warp = pfbm2(u, v, 3, 3, seed) * 2.0;
      const grain = pnoise2(u * 4 + warp, v * P * 48, 4, P * 48, seed + 1);
      const gr2 = pfbm2(u, v, 8, 4, seed + 2);
      const nail = Math.max(smoothstep(0.012, 0.004, Math.hypot((u - 0.06) * 1, (fy - 0.5) * P * 0.25)), smoothstep(0.012, 0.004, Math.hypot((u - 0.94) * 1, (fy - 0.5) * P * 0.25)));
      const m = tints[plank] * (0.78 + 0.3 * grain) * (0.85 + 0.3 * gr2);
      R[i] = (0.86 * m) * (1 - gap * 0.7) + nail * 0.25;
      G[i] = (0.72 * m) * (1 - gap * 0.7) + nail * 0.22;
      B[i] = (0.54 * m) * (1 - gap * 0.7) + nail * 0.2;
      h[i] = (grain - 0.5) * 1.6 - gap * 2 + nail * 1.2;
      rough[i] = 0.85 + (grain - 0.5) * 0.1;
    }
  }
  return {
    map: mkTex(colorCanvas(n, R, G, B), true),
    normalMap: mkTex(normalCanvas(n, h, 0.8), false),
    orm: mkTex(ormCanvas(n, rough, metal), false),
  };
}

/* ───────────── Wüstensand (Wellen, Körnung) ───────────── */
function sandSurface() {
  const n = N, seed = 66;
  const R = new Float32Array(n * n), G = new Float32Array(n * n), B = new Float32Array(n * n);
  const h = new Float32Array(n * n), rough = new Float32Array(n * n), metal = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    const v = y / n;
    for (let x = 0; x < n; x++) {
      const u = x / n, i = y * n + x;
      const warp = pfbm2(u, v, 3, 3, seed) * 1.3;
      const ripple = Math.sin((u * 18 + warp * 3 + v * 5) * Math.PI * 2);
      const mott = pfbm2(u, v, 8, 4, seed + 1);
      const grainN = pnoise2(u * 256, v * 256, 256, 256, seed + 2);
      const speck = grainN > 0.9 ? 0.82 : 1;
      const m = (0.9 + 0.2 * mott) * (1 + 0.04 * ripple) * speck;
      R[i] = 0.8 * m; G[i] = 0.64 * m; B[i] = 0.44 * m;
      h[i] = ripple * 1.0 + (pfbm2(u, v, 64, 3, seed + 3) - 0.5) * 1.6;
      rough[i] = 0.95;
    }
  }
  return {
    map: mkTex(colorCanvas(n, R, G, B), true),
    normalMap: mkTex(normalCanvas(n, h, 0.7), false),
    orm: mkTex(ormCanvas(n, rough, metal), false),
  };
}

export function surface(kind, pal = 'default') {
  const key = kind + ':' + pal;
  if (cache.has(key)) return cache.get(key);
  let s;
  switch (kind) {
    case 'metal': s = metalSurface(pal); break;
    case 'clay': s = claySurface(pal); break;
    case 'cloth': s = clothSurface(); break;
    case 'tread': s = treadSurface(); break;
    case 'wood': s = woodSurface(); break;
    case 'sand': s = sandSurface(); break;
    default: throw new Error('Unbekannte Oberfläche: ' + kind);
  }
  cache.set(key, s);
  return s;
}

// Alles vorbacken (der Aufrufer kann dazwischen der Oberfläche Zeit zum Zeichnen geben)
export const PREBAKE = [
  ['metal', 'sand'], ['metal', 'gray'], ['metal', 'rust'], ['metal', 'blue'], ['metal', 'white'], ['metal', 'olive'], ['metal', 'red'], ['metal', 'black'],
  ['clay', 'adobe'], ['clay', 'white'], ['clay', 'dark'], ['clay', 'red'], ['clay', 'sand'], ['clay', 'ochre'],
  ['cloth'], ['tread'], ['wood'], ['sand'],
];
