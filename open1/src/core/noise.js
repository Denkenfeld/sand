// Seed-basiertes Rauschen. Die "p"-Varianten sind kachelbar (nahtlose Texturen).

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash3(x, y, z, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 1274126177) + Math.imul(s | 0, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const fade = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

export function noise3(x, y, z, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
  const a = lerp(hash3(xi, yi, zi, s), hash3(xi + 1, yi, zi, s), xf);
  const b = lerp(hash3(xi, yi + 1, zi, s), hash3(xi + 1, yi + 1, zi, s), xf);
  const c = lerp(hash3(xi, yi, zi + 1, s), hash3(xi + 1, yi, zi + 1, s), xf);
  const d = lerp(hash3(xi, yi + 1, zi + 1, s), hash3(xi + 1, yi + 1, zi + 1, s), xf);
  return lerp(lerp(a, b, yf), lerp(c, d, yf), zf);
}

export function noise2(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = fade(x - xi), yf = fade(y - yi);
  return lerp(
    lerp(hash3(xi, yi, 0, s), hash3(xi + 1, yi, 0, s), xf),
    lerp(hash3(xi, yi + 1, 0, s), hash3(xi + 1, yi + 1, 0, s), xf),
    yf
  );
}

export function fbm2(x, y, oct = 4, s = 0) {
  let sum = 0, amp = 0.5, tot = 0;
  for (let i = 0; i < oct; i++) {
    sum += amp * noise2(x, y, s + i * 31);
    tot += amp;
    x = x * 2.03 + 17.1;
    y = y * 2.03 + 3.7;
    amp *= 0.5;
  }
  return sum / tot;
}

export function fbm3(x, y, z, oct = 4, s = 0) {
  let sum = 0, amp = 0.5, tot = 0;
  for (let i = 0; i < oct; i++) {
    sum += amp * noise3(x, y, z, s + i * 31);
    tot += amp;
    x = x * 2.03 + 17.1;
    y = y * 2.03 + 3.7;
    z = z * 2.03 + 9.2;
    amp *= 0.5;
  }
  return sum / tot;
}

// kachelbar: x in [0,px), y in [0,py)
export function pnoise2(x, y, px, py, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = fade(x - xi), yf = fade(y - yi);
  const x0 = ((xi % px) + px) % px, x1 = (x0 + 1) % px;
  const y0 = ((yi % py) + py) % py, y1 = (y0 + 1) % py;
  return lerp(
    lerp(hash3(x0, y0, 0, s), hash3(x1, y0, 0, s), xf),
    lerp(hash3(x0, y1, 0, s), hash3(x1, y1, 0, s), xf),
    yf
  );
}

// u,v in [0,1), freq = Zellen pro Kachel (ganzzahlig)
export function pfbm2(u, v, freq, oct = 4, s = 0) {
  let sum = 0, amp = 0.5, tot = 0, f = freq;
  for (let i = 0; i < oct; i++) {
    sum += amp * pnoise2(u * f, v * f, f, f, s + i * 31);
    tot += amp;
    f *= 2;
    amp *= 0.5;
  }
  return sum / tot;
}

// Worley, kachelbar. Gibt F1 und F2 (Abstände in Zelleneinheiten) zurück.
const _w = { f1: 0, f2: 0 };
export function worley2(u, v, freq, s = 0) {
  const px = u * freq, py = v * freq;
  const cx = Math.floor(px), cy = Math.floor(py);
  let f1 = 9, f2 = 9;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const ix = cx + dx, iy = cy + dy;
      const wx = ((ix % freq) + freq) % freq, wy = ((iy % freq) + freq) % freq;
      const fx = ix + hash3(wx, wy, 1, s);
      const fy = iy + hash3(wx, wy, 2, s);
      const d = Math.hypot(fx - px, fy - py);
      if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
    }
  }
  _w.f1 = f1; _w.f2 = f2;
  return _w;
}
