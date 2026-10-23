// Stadtplan-Generator: Distrikte, Straßennetz, Plätze, Mauerring mit Toren, Parzellen und Platzierung aller Objekte.
// Reine Berechnung (kein three.js): bekommt nur die Grundflächen der gebackenen Bausteine und liefert eine
// Platzierungsliste. Deterministisch je Seed. Koordinaten in Metern, Norden = −z, Osten = +x, Boden bei y = 0.
import { mulberry32, fbm2, noise2, smoothstep } from '../core/noise.js';
import { KINDS } from './catalog.js';

export const EXTENT = 520; // Kantenlänge/2 der Kartenfelder
const TAU = Math.PI * 2;
const rad = (d) => (d * Math.PI) / 180;
const polar = (deg, r) => [r * Math.cos(rad(deg)), -r * Math.sin(rad(deg))];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

/* ───────────── Distrikte ───────────── */
// seeds: [Winkel° (0 = Osten, 90 = Norden), Radius, Gewicht]
export const DISTRICTS = {
  core: { name: 'Stadtplatz', seeds: [[0, 0, 2.2]], color: '#f0c060', blurb: 'Das Herz der Stadt: Brunnen, Gründerstein und das Hauptquartier' },
  crystal: { name: 'Kristallviertel', seeds: [[96, 70, 0.95]], color: '#6fd0d8', blurb: 'Labor, Kristalldepot und leuchtende Türme' },
  bazaar: { name: 'Basarviertel', seeds: [[196, 66, 1.1]], color: '#e0803a', blurb: 'Marktstände, Zelte und enge Gassen' },
  old: { name: 'Altstadt', seeds: [[-96, 78, 1.15]], color: '#c9a46a', blurb: 'Dicht gedrängte Lehmhäuser' },
  workers: { name: 'Arbeiterviertel', seeds: [[-38, 108, 1.1]], color: '#b98a5a', blurb: 'Mietskasernen, Wäscheleinen und Brunnenplätze' },
  slum: { name: 'Blechstadt', seeds: [[-142, 140, 1.1]], color: '#8a6a52', blurb: 'Hütten aus Schrott am Mauerrand' },
  caravan: { name: 'Karawanserei', seeds: [[-90, 164, 0.85]], color: '#d9a05a', blurb: 'Südtor, Lagerhallen, Wurmstall und Karawanen' },
  industrial: { name: 'Werksviertel', seeds: [[4, 136, 1.3]], color: '#8e949c', blurb: 'Fabriken, Raffinerie, Schmelzen und Förderbänder' },
  oberstadt: { name: 'Kuppelgärten', seeds: [[46, 108, 1.0]], color: '#e6d3a8', blurb: 'Gepflegte Häuser, Kuppelbauten und Springbrunnen' },
  garrison: { name: 'Garnison', seeds: [[84, 146, 1.05]], color: '#c06a4a', blurb: 'Kaserne, Geschütze, Radar und Exerzierplatz' },
  port: { name: 'Raumhafen', seeds: [[136, 146, 1.15]], color: '#c8d8e8', blurb: 'Startrampe, Hangars und Relaisstationen' },
  water: { name: 'Wasserviertel', seeds: [[176, 130, 1.0]], color: '#5a88b8', blurb: 'Kondenstürme, Zisternen und Solarfelder' },
};
export const DISTRICT_IDS = Object.keys(DISTRICTS);

// Zusammensetzung je Distrikt. Einträge: [Art, Gewicht, Filter]. Filter: { g: [Zustandsstufen] } (0 verfallen … 2 gepflegt)
const MIX = {
  core: { front: [['shop', 26, { g: [1, 2] }], ['stackHouse', 26, { g: [2] }], ['adobeHouse', 20, { g: [2] }], ['cantina', 5], ['stall', 23]], fill: [['stall', 30], ['shop', 20, { g: [1, 2] }], ['adobeHouse', 26, { g: [2] }], ['stackHouse', 24, { g: [2] }]], target: 24, gap: 3, setback: [1.2, 2.6], pFront: 0.9, dense: true },
  crystal: { front: [['stackHouse', 24, { g: [2] }], ['adobeHouse', 22, { g: [1, 2] }], ['shop', 20, { g: [2] }], ['spire', 5], ['cantina', 4]], fill: [['adobeHouse', 40, { g: [1, 2] }], ['stackHouse', 30, { g: [2] }], ['shop', 20, { g: [1, 2] }]], target: 22, gap: 3.0, setback: [2, 4], pFront: 0.75 },
  bazaar: { front: [['stall', 38], ['shop', 20, { g: [1, 2] }], ['tent', 14], ['adobeHouse', 14], ['stackHouse', 8, { g: [1, 2] }], ['cantina', 4]], fill: [['stall', 28], ['tent', 24], ['adobeHouse', 22], ['shop', 14], ['stackHouse', 6], ['shack', 6]], target: 44, gap: 2.2, setback: [0.6, 1.8], pFront: 0.92, dense: true },
  old: { front: [['adobeHouse', 62], ['stackHouse', 12], ['shop', 10], ['shack', 10], ['cantina', 2], ['tent', 4]], fill: [['adobeHouse', 70], ['stackHouse', 10], ['shack', 12], ['shop', 5], ['tent', 3]], target: 44, gap: 2.6, setback: [0.8, 2.2], pFront: 0.88, dense: true },
  workers: { front: [['tenement', 50, { g: [0, 1] }], ['adobeHouse', 22, { g: [0, 1] }], ['shack', 14], ['shop', 8, { g: [0, 1] }], ['cantina', 3]], fill: [['tenement', 42, { g: [0, 1] }], ['adobeHouse', 32, { g: [0, 1] }], ['shack', 20], ['shop', 6]], target: 56, gap: 3.0, setback: [0.8, 2.2], pFront: 0.85, dense: true },
  slum: { front: [['shack', 60], ['tent', 14], ['adobeHouse', 12, { g: [0] }], ['ruin', 6], ['stall', 8]], fill: [['shack', 68], ['tent', 14], ['adobeHouse', 10, { g: [0] }], ['ruin', 8]], target: 88, gap: 1.6, setback: [0.4, 1.6], pFront: 0.9, dense: true },
  caravan: { front: [['warehouse', 24], ['stall', 26], ['tent', 18], ['adobeHouse', 14, { g: [1] }], ['cantina', 5], ['cistern', 6], ['workshop', 7]], fill: [['tent', 30], ['stall', 24], ['warehouse', 14], ['adobeHouse', 14, { g: [0, 1] }], ['workshop', 10], ['shack', 8]], target: 36, gap: 2.8, setback: [1.5, 4], pFront: 0.75 },
  industrial: { front: [['warehouse', 32], ['workshop', 28], ['cistern', 5], ['hangar', 3], ['shack', 4], ['tenement', 4, { g: [0, 1] }]], fill: [['warehouse', 36], ['workshop', 34], ['shack', 8], ['cistern', 8]], target: 44, gap: 2.8, setback: [2, 5], pFront: 0.8 },
  oberstadt: { front: [['adobeHouse', 42, { g: [2] }], ['stackHouse', 30, { g: [2] }], ['shop', 8, { g: [2] }], ['domeHouse', 12]], fill: [['adobeHouse', 50, { g: [2] }], ['stackHouse', 34, { g: [2] }], ['domeHouse', 8]], target: 46, gap: 3.0, setback: [2.5, 5], pFront: 0.78 },
  garrison: { front: [['workshop', 20], ['warehouse', 14], ['adobeHouse', 34, { g: [1] }], ['watchTower', 8], ['shack', 6]], fill: [['adobeHouse', 52, { g: [1] }], ['workshop', 22], ['warehouse', 16], ['shack', 6]], target: 34, gap: 2.8, setback: [2, 4], pFront: 0.75 },
  port: { front: [['hangar', 18], ['warehouse', 22], ['workshop', 16], ['stackHouse', 18, { g: [1, 2] }], ['cantina', 4], ['shop', 12, { g: [1, 2] }]], fill: [['warehouse', 28], ['workshop', 22], ['stackHouse', 24, { g: [1, 2] }], ['shack', 8], ['hangar', 6]], target: 32, gap: 2.8, setback: [2, 5], pFront: 0.75 },
  water: { front: [['cistern', 22], ['adobeHouse', 30, { g: [0, 1] }], ['stackHouse', 14, { g: [1] }], ['shop', 8], ['workshop', 12], ['waterTower', 8], ['shack', 6]], fill: [['adobeHouse', 44, { g: [0, 1] }], ['cistern', 18], ['workshop', 14], ['shack', 14], ['stackHouse', 10]], target: 44, gap: 2.8, setback: [1.5, 4], pFront: 0.8 },
};

/* ───────────── Geometrie-Helfer ───────────── */
function makeObb(x, z, hx, hz, ry, h = 1) {
  const c = Math.cos(ry), s = Math.sin(ry);
  return { x, z, hx, hz, c, s, h, ex: hx * Math.abs(c) + hz * Math.abs(s), ez: hx * Math.abs(s) + hz * Math.abs(c) };
}
// Footprint-Mitte eines Bausteins in der Welt (Ursprung + gedrehter Versatz)
function obbOf(fp, ox, oz, ry, sx = 1, sz = 1, sy = 1) {
  const c = Math.cos(ry), s = Math.sin(ry);
  const a = fp.cx * sx, b = fp.cz * sz;
  return makeObb(ox + a * c + b * s, oz - a * s + b * c, fp.hx * sx, fp.hz * sz, ry, fp.h * sy);
}
function originFor(cx, cz, fp, ry, sx = 1, sz = 1) {
  const c = Math.cos(ry), s = Math.sin(ry);
  const a = fp.cx * sx, b = fp.cz * sz;
  return [cx - (a * c + b * s), cz - (-a * s + b * c)];
}
function obbHit(a, b, gap) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const axes = [a.c, -a.s, a.s, a.c, b.c, -b.s, b.s, b.c];
  for (let i = 0; i < 8; i += 2) {
    const ax = axes[i], az = axes[i + 1];
    const ra = a.hx * Math.abs(ax * a.c - az * a.s) + a.hz * Math.abs(ax * a.s + az * a.c);
    const rb = b.hx * Math.abs(ax * b.c - az * b.s) + b.hz * Math.abs(ax * b.s + az * b.c);
    if (Math.abs(dx * ax + dz * az) > ra + rb + gap) return false;
  }
  return true;
}
function obbPoints(o, grow = 0) {
  const hx = o.hx + grow, hz = o.hz + grow, c = o.c, s = o.s;
  const ux = c, uz = -s, vx = s, vz = c;
  const pts = [[o.x, o.z]];
  for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]) pts.push([o.x + ux * hx * a + vx * hz * b, o.z + uz * hx * a + vz * hz * b]);
  return pts;
}

class Hash {
  constructor(cell = 16) { this.cell = cell; this.map = new Map(); }
  _k(ix, iz) { return ix * 4096 + iz; }
  add(o) {
    const c = this.cell;
    for (let ix = Math.floor((o.x - o.ex) / c); ix <= Math.floor((o.x + o.ex) / c); ix++)
      for (let iz = Math.floor((o.z - o.ez) / c); iz <= Math.floor((o.z + o.ez) / c); iz++) {
        const k = this._k(ix, iz);
        let l = this.map.get(k);
        if (!l) this.map.set(k, (l = []));
        l.push(o);
      }
  }
  hit(o, gap) {
    const c = this.cell, e = gap + 1;
    const seen = new Set();
    for (let ix = Math.floor((o.x - o.ex - e) / c); ix <= Math.floor((o.x + o.ex + e) / c); ix++)
      for (let iz = Math.floor((o.z - o.ez - e) / c); iz <= Math.floor((o.z + o.ez + e) / c); iz++) {
        const l = this.map.get(this._k(ix, iz));
        if (!l) continue;
        for (const b of l) {
          if (seen.has(b)) continue;
          seen.add(b);
          if (obbHit(o, b, gap)) return b;
        }
      }
    return null;
  }
}

// Abstandsfeld zu allen Straßen (Meter bis zum Straßenrand, negativ = auf der Straße)
class Field {
  constructor(extent, res) {
    this.e = extent; this.res = res; this.n = Math.ceil((2 * extent) / res);
    this.d = new Float32Array(this.n * this.n).fill(60);
  }
  stamp(ax, az, bx, bz, hw, reach = 30) {
    const { e, res, n } = this;
    const x0 = Math.floor((Math.min(ax, bx) - hw - reach + e) / res), x1 = Math.ceil((Math.max(ax, bx) + hw + reach + e) / res);
    const z0 = Math.floor((Math.min(az, bz) - hw - reach + e) / res), z1 = Math.ceil((Math.max(az, bz) + hw + reach + e) / res);
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
    for (let iz = Math.max(0, z0); iz <= Math.min(n - 1, z1); iz++) {
      const pz = (iz + 0.5) * res - e;
      for (let ix = Math.max(0, x0); ix <= Math.min(n - 1, x1); ix++) {
        const px = (ix + 0.5) * res - e;
        const t = clamp(((px - ax) * dx + (pz - az) * dz) / L2, 0, 1);
        const d = Math.hypot(px - (ax + dx * t), pz - (az + dz * t)) - hw;
        const k = iz * n + ix;
        if (d < this.d[k]) this.d[k] = d;
      }
    }
  }
  at(x, z) {
    const ix = Math.floor((x + this.e) / this.res), iz = Math.floor((z + this.e) / this.res);
    if (ix < 0 || iz < 0 || ix >= this.n || iz >= this.n) return 60;
    return this.d[iz * this.n + ix];
  }
  grad(x, z) {
    const h = 2;
    return [this.at(x + h, z) - this.at(x - h, z), this.at(x, z + h) - this.at(x, z - h)];
  }
}

function catmull(pts, closed, seg = 6) {
  const out = [];
  const n = pts.length;
  const get = (i) => (closed ? pts[((i % n) + n) % n] : pts[clamp(i, 0, n - 1)]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const steps = Math.max(2, Math.round(L / seg));
    for (let k = 0; k < steps; k++) {
      const t = k / steps, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  if (!closed) out.push(pts[n - 1].slice());
  return out;
}

/* ───────────── Generator ───────────── */
export function generateCity(lib, seed = 1, opts = {}) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const rngMaster = mulberry32(seed * 7919 + 13);
  const sub = () => mulberry32((rngMaster() * 4294967296) >>> 0);
  const rR = sub(), rH = sub(), rF = sub(), rI = sub(), rP = sub(), rV = sub(), rO = sub(), rW = sub();
  const nz = (x, z, s = 0) => fbm2(x, z, 3, s + seed * 3);
  const WALL = opts.wallR ?? 230;
  const SC = WALL / 205; // Skalierung der festen Maße gegenüber dem Referenzradius
  const ROAD_BAND = 13; // Abstand Mauer → Ringstraße innen

  const wallR = (deg) => {
    const a = rad(deg);
    return WALL + 18 * (fbm2(Math.cos(a) * 1.25 + 5 + seed * 0.37, Math.sin(a) * 1.25 + 3.3, 3, 77) - 0.5) * 2;
  };
  const wallRxz = (x, z) => wallR((Math.atan2(-z, x) * 180) / Math.PI);

  /* Distrikt-Raster (4 m) */
  const DG = 4, DN = Math.ceil((2 * EXTENT) / DG);
  const dgrid = new Uint8Array(DN * DN); // 0 = außerhalb, sonst Index+1
  const seeds = [];
  DISTRICT_IDS.forEach((id, i) => { for (const [a, r, w] of DISTRICTS[id].seeds) { const [x, z] = polar(a, r * SC); seeds.push({ id, i, x, z, w }); } });
  const districtCompute = (x, z) => {
    const r = Math.hypot(x, z);
    if (r > wallRxz(x, z) - 5) return -1;
    let best = 1e9, bi = 0;
    for (const s of seeds) {
      const d = Math.hypot(x - s.x, z - s.z) / s.w + 26 * (nz(x * 0.011 + s.i * 7.7, z * 0.011, 5 + s.i) - 0.5);
      if (d < best) { best = d; bi = s.i; }
    }
    return bi;
  };
  for (let iz = 0; iz < DN; iz++) for (let ix = 0; ix < DN; ix++) {
    const x = (ix + 0.5) * DG - EXTENT, z = (iz + 0.5) * DG - EXTENT;
    const d = districtCompute(x, z);
    dgrid[iz * DN + ix] = d < 0 ? 0 : d + 1;
  }
  const districtAt = (x, z) => {
    const ix = Math.floor((x + EXTENT) / DG), iz = Math.floor((z + EXTENT) / DG);
    if (ix < 0 || iz < 0 || ix >= DN || iz >= DN) return null;
    const v = dgrid[iz * DN + ix];
    return v ? DISTRICT_IDS[v - 1] : null;
  };
  const dbounds = {}; // Bounding-Box je Distrikt für Zufallspunkte
  for (let iz = 0; iz < DN; iz++) for (let ix = 0; ix < DN; ix++) {
    const v = dgrid[iz * DN + ix];
    if (!v) continue;
    const id = DISTRICT_IDS[v - 1];
    const b = (dbounds[id] ??= { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 });
    const x = (ix + 0.5) * DG - EXTENT, z = (iz + 0.5) * DG - EXTENT;
    b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.z0 = Math.min(b.z0, z); b.z1 = Math.max(b.z1, z);
  }
  const randIn = (id, rng) => {
    const b = dbounds[id];
    for (let k = 0; k < 40; k++) {
      const x = lerp(b.x0, b.x1, rng()), z = lerp(b.z0, b.z1, rng());
      if (districtAt(x, z) === id) return [x, z];
    }
    return null;
  };

  /* Zustand */
  const field = new Field(EXTENT, 1.5);
  const hash = new Hash(16);
  const roads = [];
  const plazas = [];
  const placements = [];
  const counts = {}; // Gebäude je Distrikt
  const pois = [];
  const lights = [];
  const fires = [];
  const warnings = [];

  /* Plätze: signierter Abstand (negativ = innen) */
  const plazaSd = (p, x, z) => {
    if (p.type === 'circle') return Math.hypot(x - p.x, z - p.z) - p.r;
    const c = Math.cos(p.rot), s = Math.sin(p.rot);
    const dx = x - p.x, dz = z - p.z;
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    return Math.max(Math.abs(lx) - p.w / 2, Math.abs(lz) - p.d / 2);
  };
  const addPlaza = (p) => { plazas.push(p); return p; };

  /* Straßen */
  const addRoad = (name, pts, hw, cls, closed = false) => {
    const dense = catmull(pts, closed, 5);
    const len = [0];
    for (let i = 1; i < dense.length; i++) len.push(len[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
    const r = { id: roads.length, name, pts: dense, len, L: len[len.length - 1], hw, cls, closed };
    roads.push(r);
    for (let i = 1; i < dense.length; i++) field.stamp(dense[i - 1][0], dense[i - 1][1], dense[i][0], dense[i][1], hw);
    return r;
  };
  const roadAt = (r, s) => {
    const { pts, len } = r;
    s = clamp(s, 0, r.L);
    let lo = 0, hi = len.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (len[m] <= s) lo = m; else hi = m; }
    const t = (s - len[lo]) / (len[hi] - len[lo] || 1);
    const a = pts[lo], b = pts[hi];
    const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
    return { x: lerp(a[0], b[0], t), z: lerp(a[1], b[1], t), tx: tx / l, tz: tz / l };
  };

  /* Plätze und Straßen anlegen */
  const gateAngles = [180 + (rR() - 0.5) * 12, 0 + (rR() - 0.5) * 12, 90 + (rR() - 0.5) * 14, -90 + (rR() - 0.5) * 14];
  const [gW, gE, gN, gS] = gateAngles;
  const gatePt = (deg, off = 0) => polar(deg, wallR(deg) + off);

  addPlaza({ id: 'stadtplatz', type: 'circle', x: 0, z: 0, r: 24, name: 'Stadtplatz', kind: 'paving' });

  // Hauptachsen
  const axis = (a0, a1, tag, jitter) => {
    const g0 = gatePt(a0), g1 = gatePt(a1);
    const pts = [g0];
    const N = 9;
    for (let i = 1; i < N; i++) {
      const t = i / N;
      const x = lerp(g0[0], g1[0], t), z = lerp(g0[1], g1[1], t);
      const w = Math.sin(t * Math.PI) * (1 - Math.exp(-Math.abs(0.5 - t) * 14));
      const off = (nz(x * 0.02 + tag * 11, z * 0.02, 3) - 0.5) * 2 * jitter * w;
      const tx = g1[0] - g0[0], tz = g1[1] - g0[1], l = Math.hypot(tx, tz);
      pts.push([x - (tz / l) * off, z + (tx / l) * off]);
    }
    pts.push(g1);
    return pts;
  };
  const rEW = addRoad('Hauptstraße', axis(gW, gE, 1, 26), 6.2, 'main');
  const rNS = addRoad('Karawanenstraße', axis(gN, gS, 2, 26), 6.2, 'main');

  // Ringstraßen
  const ring = (R, name, hw, wob, cls = 'ring') => {
    const pts = [];
    const n = Math.max(18, Math.round((TAU * R) / 22));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 360;
      const rr = R * (1 + wob * (fbm2(Math.cos(rad(a)) * 1.7 + R * 0.013, Math.sin(rad(a)) * 1.7 + 8, 3, 21 + seed) - 0.5) * 2);
      pts.push(polar(a, rr));
    }
    return addRoad(name, pts, hw, cls, true);
  };
  const R1 = ring(45, 'Innerer Ring', 3.1, 0.05);
  const R2 = ring(104 * SC, 'Mittelring', 3.1, 0.06);
  const wallRoadPts = [];
  for (let i = 0; i < 72; i++) { const a = (i / 72) * 360; wallRoadPts.push(polar(a, wallR(a) - ROAD_BAND)); }
  const RW = addRoad('Mauerweg', wallRoadPts, 2.7, 'ring', true);

  // Radiale Straßen
  const radialAngles = [];
  for (let a = 14; a < 360; a += 360 / 10) {
    const aa = a + (rR() - 0.5) * 8;
    if (gateAngles.some((g) => Math.abs((((aa - g) % 360) + 540) % 360 - 180) < 11)) continue;
    radialAngles.push(aa);
  }
  radialAngles.forEach((a0, k) => {
    const pts = [];
    const r0 = rR() < 0.5 ? 26 : 45;
    const rEnd = wallR(a0) - ROAD_BAND;
    const n = Math.ceil((rEnd - r0) / 36);
    for (let i = 0; i <= n; i++) {
      const r = lerp(r0, rEnd, i / n);
      const a = a0 + (nz(r * 0.02 + k * 3, k * 5.1, 9) - 0.5) * 7;
      pts.push(polar(a, r));
    }
    addRoad('Radialstraße ' + (k + 1), pts, 2.5 + rR() * 0.6, 'radial');
  });

  // Straßenraster in Werksviertel und Garnison
  const gridRoads = (id, deg, spacingA, spacingB, hw, name) => {
    const [cx, cz] = polar(deg, DISTRICTS[id].seeds[0][1] * SC);
    const ang = rad(-deg + 90); // Achse zeigt radial nach außen
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const lines = [];
    for (let u = -80; u <= 80; u += spacingA) lines.push({ u, along: true });
    for (let v = -100; v <= 100; v += spacingB) lines.push({ v, along: false });
    for (const ln of lines) {
      let cur = [];
      const flush = () => { if (cur.length >= 4) addRoad(name, cur.length > 2 ? cur.filter((_, i) => i % 3 === 0 || i === cur.length - 1) : cur, hw, 'grid'); cur = []; };
      for (let t = -140; t <= 140; t += 4) {
        const lx = ln.along ? ln.u : t, lz = ln.along ? t : ln.v;
        const x = cx + lx * ca - lz * sa, z = cz + lx * sa + lz * ca;
        const r = Math.hypot(x, z);
        if (districtAt(x, z) === id && r > 55 && r < wallR(Math.atan2(-z, x) * 57.2958) - ROAD_BAND - 6) cur.push([x, z]); else flush();
      }
      flush();
    }
  };
  gridRoads('industrial', 4, 46, 40, 3.2, 'Werkstraße');
  gridRoads('garrison', 84, 40, 34, 2.8, 'Wachstraße');

  // Gassen: kurze, enge Verbindungen in dichten Vierteln
  const dense = ['bazaar', 'old', 'workers', 'slum', 'water', 'oberstadt', 'caravan', 'crystal', 'port'];
  let alleys = 0;
  for (let tries = 0; tries < 700 && alleys < 26; tries++) {
    const id = dense[Math.floor(rR() * dense.length)];
    const p = randIn(id, rR);
    if (!p) continue;
    const dd = field.at(p[0], p[1]);
    if (dd < 5 || dd > 30) continue;
    const [gx, gz] = field.grad(p[0], p[1]);
    const gl = Math.hypot(gx, gz) || 1;
    const along = rR() < 0.5;
    const dirx = along ? -gz / gl : gx / gl, dirz = along ? gx / gl : gz / gl;
    const len = 30 + rR() * 40;
    const sign = along ? (rR() < 0.5 ? 1 : -1) : -1; // quer: Richtung zur Straße hin
    const pts = [];
    for (let i = 0; i <= 3; i++) {
      const t = (i / 3) * len;
      const wob = Math.sin(i * 1.7 + tries) * 3;
      pts.push([p[0] + sign * dirx * t - dirz * wob, p[1] + sign * dirz * t + dirx * wob]);
    }
    const ok = pts.every((q) => { const r = Math.hypot(q[0], q[1]); return r < wallRxz(q[0], q[1]) - ROAD_BAND - 6 && districtAt(q[0], q[1]) && plazas.every((pl) => plazaSd(pl, q[0], q[1]) > 2); });
    if (!ok) continue;
    if (field.at(pts[0][0], pts[0][1]) > 8 && field.at(pts[3][0], pts[3][1]) > 8) continue; // muss anschließen
    addRoad('Gasse', pts, 1.4 + rR() * 0.4, 'alley');
    alleys++;
  }

  // Straßen vor den Toren (Karawanenwege) bis weit in die Wüste
  const outRoads = [];
  for (const [a, tag] of [[gW, 'West'], [gE, 'Ost'], [gN, 'Nord'], [gS, 'Süd']]) {
    const pts = [];
    const r0 = wallR(a);
    for (let r = r0; r <= 320; r += 40) { pts.push(polar(a + (nz(r * 0.01, a, 4) - 0.5) * 9 * ((r - r0) / 80), r)); }
    outRoads.push(addRoad(tag + 'weg', pts, 4, 'out'));
  }

  /* Zusatz-Plätze */
  const seedPos = (id) => polar(DISTRICTS[id].seeds[0][0], DISTRICTS[id].seeds[0][1] * SC);
  const [bzx, bzz] = seedPos('bazaar'); addPlaza({ id: 'basar', type: 'circle', x: bzx, z: bzz, r: 15, name: 'Basarplatz', kind: 'paving' });
  const [crx, crz] = seedPos('crystal'); addPlaza({ id: 'kristallplatz', type: 'circle', x: crx, z: crz, r: 13, name: 'Kristallplatz', kind: 'paving' });
  const [gax, gaz] = polar(84, 118 * SC); addPlaza({ id: 'exerzier', type: 'rect', x: gax, z: gaz, w: 50, d: 28, rot: rad(-84 + 90), name: 'Exerzierplatz', kind: 'dirt' });
  const [wax, waz] = seedPos('water'); addPlaza({ id: 'wasserplatz', type: 'circle', x: wax, z: waz, r: 11, name: 'Wasserplatz', kind: 'paving' });
  const [obx, obz] = seedPos('oberstadt'); addPlaza({ id: 'park', type: 'circle', x: obx, z: obz, r: 14, name: 'Kuppelpark', kind: 'paving' });
  const [wkx, wkz] = seedPos('workers'); addPlaza({ id: 'brunnenhof', type: 'circle', x: wkx, z: wkz, r: 10, name: 'Brunnenhof', kind: 'paving' });
  const [olx, olz] = seedPos('old'); addPlaza({ id: 'altmarkt', type: 'circle', x: olx, z: olz, r: 11, name: 'Altmarkt', kind: 'paving' });
  const [cvx, cvz] = [gatePt(gS, -36)[0], gatePt(gS, -36)[1]]; addPlaza({ id: 'karawanenplatz', type: 'circle', x: cvx, z: cvz, r: 19, name: 'Karawanenplatz', kind: 'dirt' });
  const [slx, slz] = seedPos('slum'); addPlaza({ id: 'schrottmarkt', type: 'circle', x: slx, z: slz, r: 9, name: 'Schrottmarkt', kind: 'dirt' });
  const [inx, inz] = polar(4, 116 * SC); addPlaza({ id: 'werkshof', type: 'rect', x: inx, z: inz, w: 40, d: 26, rot: rad(-4 + 90), name: 'Werkshof', kind: 'dirt' });
  const [pox, poz] = polar(136, wallR(136) - 52); addPlaza({ id: 'landefeld', type: 'circle', x: pox, z: poz, r: 27, name: 'Landefeld', kind: 'dirt' });
  for (const [a, nm] of [[gW, 'Westtor'], [gE, 'Osttor'], [gN, 'Nordtor'], [gS, 'Südtor']]) {
    const [x, z] = gatePt(a, -26);
    addPlaza({ id: 'torplatz-' + nm, type: 'circle', x, z, r: 11, name: 'Torplatz ' + nm.replace('tor', ''), kind: 'dirt' });
  }

  /* ───────────── Platzieren ───────────── */
  const variantsOf = (kind) => lib.variants(kind);
  const pickVariant = (kind, rng, filt) => {
    const all = variantsOf(kind);
    if (!all.length) return null;
    let list = all;
    if (filt && filt.g) { const f = all.filter((v) => filt.g.includes(v.tags.grade)); if (f.length) list = f; }
    if (filt && filt.pred) { const f = list.filter(filt.pred); if (f.length) list = f; }
    return list[Math.floor(rng() * list.length)];
  };
  const wpick = (rng, table) => {
    let t = 0;
    for (const e of table) t += e[1];
    let x = rng() * t;
    for (const e of table) { x -= e[1]; if (x <= 0) return e; }
    return table[table.length - 1];
  };
  const cycle = {};
  const nextVariant = (kind) => { const n = variantsOf(kind).length; const i = (cycle[kind] = (cycle[kind] ?? -1) + 1) % n; return variantsOf(kind)[i]; };

  const hash0 = hash;
  const why = {};
  const legal = (o, { gap = 2, road = 1.2, plaza = 1, maxR = null, minR = 0, noHash = false } = {}) => {
    const r = Math.hypot(o.x, o.z);
    const ext = Math.max(o.hx, o.hz) * 1.42;
    if (maxR != null && r + ext > maxR) { why.maxR = (why.maxR ?? 0) + 1; return false; }
    if (r - ext < minR) { why.minR = (why.minR ?? 0) + 1; return false; }
    for (const [x, z] of obbPoints(o)) {
      if (road > -50 && field.at(x, z) < road) { why.road = (why.road ?? 0) + 1; return false; }
      if (plaza > -50) for (const p of plazas) if (plazaSd(p, x, z) < plaza) { why.plaza = (why.plaza ?? 0) + 1; return false; }
    }
    if (!noHash && hash0.hit(o, gap)) { why.hash = (why.hash ?? 0) + 1; return false; }
    return true;
  };

  const instIdx = {}; // Art → Anzahl (nur Statistik)
  const commit = (kind, rec, ox, oz, ry, o = {}) => {
    const sx = o.sx ?? 1, sy = o.sy ?? 1, sz = o.sz ?? 1;
    const ob = obbOf(rec.fp, ox, oz, ry, sx, sz, sy);
    const info = KINDS[kind];
    const p = { id: placements.length, kind, vi: variantsOf(kind).indexOf(rec), x: ox, y: o.y ?? 0, z: oz, ry, sx, sy, sz, d: o.d ?? districtAt(ox, oz) ?? 'out', live: !!info.live, solid: o.solid ?? (info.type !== 'figure' && ob.h > 0.5 && kind !== 'scrub' && kind !== 'banner'), ob, tag: o.tag ?? null, hero: !!o.hero };
    placements.push(p);
    if (!o.noHash) hash.add(ob);
    instIdx[kind] = (instIdx[kind] ?? 0) + 1;
    if (info.type === 'building' && p.d !== 'out' && !o.hero) counts[p.d] = (counts[p.d] ?? 0) + 1;
    return p;
  };
  // Platzierung mit Footprint-Mitte (cx, cz)
  const place = (kind, rec, cx, cz, ry, o = {}) => {
    const [ox, oz] = originFor(cx, cz, rec.fp, ry, o.sx ?? 1, o.sz ?? 1);
    return commit(kind, rec, ox, oz, ry, o);
  };
  const tryPlace = (kind, rec, cx, cz, ry, lo = {}, o = {}) => {
    const [ox, oz] = originFor(cx, cz, rec.fp, ry, o.sx ?? 1, o.sz ?? 1);
    const ob = obbOf(rec.fp, ox, oz, ry, o.sx ?? 1, o.sz ?? 1, o.sy ?? 1);
    if (!legal(ob, lo)) return null;
    return commit(kind, rec, ox, oz, ry, o);
  };
  const poi = (name, x, z, kind, desc, d) => pois.push({ id: pois.length, name, x, z, kind, desc, d: d ?? districtAt(x, z) ?? 'out' });
  const scaleFor = (kind, rng) => {
    const sc = { adobeHouse: [0.04, 0.08], stackHouse: [0.03, 0.07], tenement: [0.03, 0.08], shop: [0.04, 0.06], shack: [0.08, 0.08], workshop: [0.04, 0.05], warehouse: [0.04, 0.04], stall: [0.05, 0.05], tent: [0.06, 0.06], ruin: [0.05, 0.1] }[kind];
    if (!sc) return {};
    return { sx: 1 + (rng() - 0.5) * 2 * sc[0], sz: 1 + (rng() - 0.5) * 2 * sc[0], sy: 1 + (rng() - 0.3) * 2 * sc[1] };
  };

  /* 1) Mauerring mit Türmen und Toren */
  const wallPts = [];
  for (let i = 0; i < 720; i++) { const a = (i / 720) * 360; wallPts.push(polar(a, wallR(a))); }
  const wallLen = [0];
  for (let i = 1; i <= 720; i++) { const p = wallPts[i % 720], q = wallPts[i - 1]; wallLen.push(wallLen[i - 1] + Math.hypot(p[0] - q[0], p[1] - q[1])); }
  const WL = wallLen[720];
  const wallAtLen = (s) => {
    s = ((s % WL) + WL) % WL;
    let lo = 0, hi = 720;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (wallLen[m] <= s) lo = m; else hi = m; }
    const t = (s - wallLen[lo]) / (wallLen[hi] - wallLen[lo] || 1);
    const a = wallPts[lo], b = wallPts[hi % 720];
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  };
  const gateSpans = gateAngles.map((a) => { const [gx, gz] = gatePt(a); let best = 0, bd = 1e9; for (let i = 0; i < 720; i++) { const d = Math.hypot(wallPts[i][0] - gx, wallPts[i][1] - gz); if (d < bd) { bd = d; best = i; } } return wallLen[best]; });
  const GATE_HALF = 17.5;
  const inGate = (s) => gateSpans.some((g) => { const d = Math.abs(((s - g + WL / 2) % WL + WL) % WL - WL / 2); return d < GATE_HALF; });
  const wallPlacements = [];
  const gateRec = lib.variants('gate');
  const names = ['Westtor', 'Osttor', 'Nordtor', 'Südtor'];
  gateAngles.forEach((a, i) => {
    const [gx, gz] = gatePt(a);
    // Torachse: Richtung der Straße (nach außen); Außenseite des Tors zeigt in +Z
    const a2 = gatePt(a, 6), a1 = gatePt(a, -6);
    const ry = Math.atan2(a2[0] - a1[0], a2[1] - a1[1]);
    const rec = gateRec[i % gateRec.length];
    const p = commit('gate', rec, gx, gz, ry, { d: 'out', hero: true, solid: false, tag: names[i] });
    // Kollisionsblöcke links/rechts der Durchfahrt
    const c = Math.cos(ry), s = Math.sin(ry);
    p.blocks = [-1, 1].map((sg) => makeObb(gx + c * sg * 9.5, gz - s * sg * 9.5, 6.3, 3.8, ry, 13));
    p.blocks.forEach((b) => hash.add(b));
    poi(names[i], gx, gz, 'gate', 'Stadttor mit Fallgitter und Wachtürmen', 'out');
    wallPlacements.push(p);
  });
  // Mauerabschnitte
  {
    const lens = [14, 16, 18, 20, 22, 24, 26];
    let s = 0;
    // beim ersten Tor beginnen, damit der Ring dort sauber schließt
    s = gateSpans[0] + GATE_HALF;
    const end = s + WL;
    let sinceTower = 0;
    while (s < end - 3) {
      if (inGate(s + 1)) { s += 1; continue; }
      // maximale Länge bis zum nächsten Tor
      let maxL = 26;
      for (const g of gateSpans) { const d = (((g - GATE_HALF - s) % WL) + WL) % WL; if (d < maxL) maxL = d; }
      const choices = lens.filter((l) => l <= maxL);
      if (!choices.length) { s += Math.max(1, maxL); continue; }
      const len = choices[Math.min(choices.length - 1, Math.floor(rW() * (choices.length + 1)))];
      const p0 = wallAtLen(s), p1 = wallAtLen(s + len);
      const mx = (p0[0] + p1[0]) / 2, mz = (p0[1] + p1[1]) / 2;
      const tx = p1[0] - p0[0], tz = p1[1] - p0[1];
      // Mauer: lange Achse lokal X; Außenseite +Z. Außennormale (von der Mitte weg) bestimmt die Drehung.
      let nx = tz, nz = -tx;
      if (nx * mx + nz * mz < 0) { nx = -nx; nz = -nz; }
      const ry = Math.atan2(nx, nz);
      const cand = lib.variants('wallSection').filter((v) => v.tags.len === len);
      const rec = cand[Math.floor(rW() * cand.length)] ?? lib.variants('wallSection')[0];
      const p = commit('wallSection', rec, mx, mz, ry, { d: 'out', solid: true });
      wallPlacements.push(p);
      sinceTower += len;
      s += len;
      if (sinceTower > 40 || rW() < 0.25) {
        sinceTower = 0;
        if (!inGate(s)) {
          const tp = wallAtLen(s);
          const trec = pickVariant('wallTower', rW);
          const rt = commit('wallTower', trec, tp[0] + (nx / Math.hypot(nx, nz)) * 0.6, tp[1] + (nz / Math.hypot(nx, nz)) * 0.6, ry, { d: 'out', hero: true });
          wallPlacements.push(rt);
        }
      }
    }
  }

  /* 2) Wahrzeichen und Betriebe (Spielmodelle) an passenden Orten */
  const heroSites = [];
  const siteScore = (o, wantRoad) => {
    const front = field.at(o.x + o.s * (o.hz + 2.5), o.z + o.c * (o.hz + 2.5));
    const dr = field.at(o.x, o.z);
    return wantRoad ? Math.abs(Math.min(dr - o.hz, 12) - 3) : 0;
  };
  // Sucht einen Platz im Distrikt (oder um einen Punkt) und setzt das Objekt; face: 'road' | 'center' | 'out' | 'free'
  const placeHeroAt = (kind, rec, d, o = {}) => {
    let best = null, bs = 1e9;
    const tries = o.tries ?? 520;
    for (let k = 0; k < tries; k++) {
      let p;
      if (o.at) { const a = rH() * TAU, rr = Math.sqrt(rH()) * (o.spread ?? 24); p = [o.at[0] + Math.cos(a) * rr, o.at[1] + Math.sin(a) * rr]; }
      else p = randIn(d, rH);
      if (!p) continue;
      let ry;
      const dr = field.at(p[0], p[1]);
      const g = field.grad(p[0], p[1]);
      const face = o.face ?? 'road';
      if (face === 'center') ry = Math.atan2(-p[0], -p[1]);
      else if (face === 'out') ry = Math.atan2(p[0], p[1]);
      else if (face === 'free') ry = rH() * TAU;
      else ry = Math.hypot(g[0], g[1]) > 0.2 ? Math.atan2(-g[0], -g[1]) : Math.atan2(-p[0], -p[1]);
      if (o.snap) ry = Math.round(ry / (Math.PI / 2)) * (Math.PI / 2) + (o.snapOff ?? 0);
      const [ox, oz] = originFor(p[0], p[1], rec.fp, ry);
      const ob = obbOf(rec.fp, ox, oz, ry);
      const maxR = wallRxz(p[0], p[1]) - ROAD_BAND - 3;
      if (!legal(ob, { gap: o.gap ?? 5, road: o.road ?? 1.5, plaza: o.plaza ?? 1, maxR: o.maxR ?? maxR, minR: o.minR ?? 0 })) continue;
      if (d && !o.any && districtAt(p[0], p[1]) !== d) continue;
      let sc = o.at ? Math.hypot(p[0] - o.at[0], p[1] - o.at[1]) : Math.abs(Math.min(dr - Math.max(ob.hx, ob.hz) * 0.5, 14) - (o.road0 ?? 4)) + rH() * 3;
      if (sc < bs) { bs = sc; best = { ox, oz, ry }; if (o.first) break; }
    }
    if (!best && !o.any && !o.at && d) { const sp = DISTRICTS[d].seeds[0]; return placeHeroAt(kind, rec, d, { ...o, any: true, at: polar(sp[0], sp[1] * SC), spread: 70, tries: 500 }); }
    if (!best) { warnings.push(`Kein Platz für ${kind} in ${d}`); return null; }
    return commit(kind, rec, best.ox, best.oz, best.ry, { hero: true, d: districtAt(best.ox, best.oz) ?? 'out', tag: o.tag });
  };

  // Mittelpunkt: Brunnen, Gründerstein, Hauptquartier
  {
    const fo = pickVariant('fountain', rH);
    const pf = commit('fountain', fo, 0, 0, 0, { d: 'core', hero: true, tag: 'Zentralbrunnen' });
    poi('Zentralbrunnen', 0, 0, 'fountain', 'Das Herz der Stadt – Treffpunkt aller Karawanen', 'core');
    const mo = pickVariant('monument', rH);
    const mp = tryPlace('monument', mo, 0, -15.5, 0, { gap: 1.5, road: -99, plaza: -99 }, { d: 'core' }) ?? tryPlace('monument', mo, 0, 15.5, Math.PI, { gap: 1.5, road: -99, plaza: -99 }, { d: 'core' });
    if (mp) { mp.hero = true; poi('Gründerstein', mp.x, mp.z, 'monument', 'Der Stein, an dem die Stadt gegründet wurde', 'core'); }
  }
  const mk = (kind, d, n, o = {}) => {
    const out = [];
    for (let i = 0; i < n; i++) { const p = placeHeroAt(kind, o.recs ? o.recs[i % o.recs.length] : nextVariant(kind), d, o); if (p) out.push(p); }
    return out;
  };
  {
    // Große Anlagen zuerst
    const sp = mk('spaceport', 'port', 1, { at: [pox, poz], spread: 4, face: 'center', plaza: -99, road: -99, gap: 3, tries: 40, tag: 'Raumhafen' })[0];
    if (sp) poi('Raumhafen', sp.x, sp.z, 'spaceport', 'Startrampe mit Rakete, Gerüst und Treibstofftanks', 'port');
    const hq = mk('hq', 'core', 1, { at: polar(58, 72), spread: 22, any: true, face: 'center', tries: 400, tag: 'Hauptquartier' })[0];
    if (hq) poi('Hauptquartier', hq.x, hq.z, 'hq', 'Verwaltungssitz der Stadt', 'core');
    for (const p of mk('factory', 'industrial', 2, { road0: 5 })) poi('Fabrik', p.x, p.z, 'factory', 'Montagehalle mit Schornsteinen und Sheddächern', 'industrial');
    for (const p of mk('refinery', 'industrial', 2)) poi('Raffinerie', p.x, p.z, 'refinery', 'Lagertanks, Rohrleitungen und Rauch', 'industrial');
    for (const p of mk('smelter', 'industrial', 2)) poi('Schmelze', p.x, p.z, 'smelter', 'Glühender Ofen für Kristall und Erz', 'industrial');
    mk('sandDriller', 'industrial', 1); mk('battery', 'industrial', 1); mk('crystalDepot', 'industrial', 1);
    mk('hangar', 'industrial', 1);
    const cd = mk('crystalDepot', 'crystal', 1)[0];
    if (cd) poi('Kristalldepot', cd.x, cd.z, 'crystalDepot', 'Gläserne Lagerkammer voller leuchtender Kristalle', 'crystal');
    const lb = mk('lab', 'crystal', 1)[0];
    if (lb) poi('Forschungslabor', lb.x, lb.z, 'lab', 'Grabung mit leuchtendem Relikt', 'crystal');
    for (let i = 0; i < 2; i++) { const p = mk('spire', 'crystal', 1)[0]; if (p) poi('Kristallturm', p.x, p.z, 'spire', 'Hoher Turm mit leuchtender Kristallspitze', 'crystal'); }
    for (const p of mk('barracks', 'garrison', 3)) poi('Kaserne', p.x, p.z, 'barracks', 'Unterkunft der Stadtwache mit Übungspuppen', 'garrison');
    mk('shieldGen', 'garrison', 1, { road0: 6 }); mk('radar', 'garrison', 1);
    mk('watchTower', 'garrison', 3, { face: 'out' });
    mk('turret', 'garrison', 3, { gap: 3 });
    mk('hangar', 'port', 2); mk('radar', 'port', 1); mk('relay', 'port', 2); mk('lab', 'port', 1); mk('battery', 'port', 1);
    for (const p of mk('domeHouse', 'oberstadt', 5, { road0: 5 })) if (p) poi('Kuppelhaus', p.x, p.z, 'domeHouse', 'Wohnkuppel der Oberstadt', 'oberstadt');
    mk('fountain', 'oberstadt', 1, { at: [obx, obz], spread: 3, plaza: -99, road: -99, gap: 1, tries: 30, first: true });
    mk('condenserTower', 'water', 7, { road0: 3, gap: 3.5 });
    mk('dewCatcher', 'water', 2); mk('battery', 'water', 1); mk('solarField', 'water', 2); mk('waterTower', 'water', 3);
    const tw = mk('tamedWorm', 'caravan', 1, { face: 'center', gap: 4 })[0];
    if (tw) poi('Wurmstall', tw.x, tw.z, 'tamedWorm', 'Gezähmter Sandwurm als Lasttier der Karawanen', 'caravan');
    mk('warehouse', 'caravan', 2); mk('cistern', 'caravan', 2); mk('cantina', 'caravan', 1);
    for (const id of ['bazaar', 'old', 'workers', 'port', 'water']) { const c = mk('cantina', id, id === 'bazaar' ? 2 : 1, { road0: 3 }); for (const p of c) poi('Cantina', p.x, p.z, 'cantina', 'Lärmende Kneipe der Spacer und Händler', id); }
    for (const id of ['old', 'workers', 'water', 'slum']) mk('well', id, 3, { road0: 2, gap: 2 });
    mk('conveyor', 'industrial', 4, { gap: 2 });
  }

  /* 3) Frontlinien: Gebäudezeilen entlang der Straßen */
  const countOf = (d) => counts[d] ?? 0;
  const capFront = (d) => Math.round(MIX[d].target * 0.72);
  const order = { main: 0, ring: 1, radial: 2, grid: 3, alley: 9, out: 9 };
  const pickBuilding = (d, table, rng) => {
    const e = wpick(rng, table);
    return [e[0], pickVariant(e[0], rng, e[2])];
  };
  // Platzrandbebauung: Häuser rund um die Plätze, Eingang zum Platz
  {
    const PM = { stadtplatz: ['core', 1.0], basar: ['bazaar', 0.7], kristallplatz: ['crystal', 1.2], altmarkt: ['old', 0.8], brunnenhof: ['workers', 0.9], park: ['oberstadt', 1.5], wasserplatz: ['water', 1.0], schrottmarkt: ['slum', 0.6], karawanenplatz: ['caravan', 1.5] };
    for (const [pid, [mid, off]] of Object.entries(PM)) {
      const pl = plazas.find((q) => q.id === pid);
      const mix = MIX[mid];
      let a = rF() * TAU;
      const end = a + TAU;
      let guard = 0;
      while (a < end && guard++ < 200) {
        const [kind, rec] = pickBuilding(mid, mix.front, rF);
        if (!rec) { a += 0.1; continue; }
        const hxw = rec.fp.hx, hzw = rec.fp.hz;
        const R = pl.r + off + hzw;
        const da = (2 * hxw + (mix.dense ? 0.5 : 2.0)) / R;
        const ang = a + da / 2;
        const cx = pl.x + Math.cos(ang) * R, cz = pl.z + Math.sin(ang) * R;
        const ry = Math.atan2(pl.x - cx, pl.z - cz);
        const sc = scaleFor(kind, rF);
        const placed = tryPlace(kind, rec, cx, cz, ry, { gap: 0.6, road: 0.3, plaza: 0.2, maxR: wallRxz(cx, cz) - ROAD_BAND - 2 }, { ...sc, d: districtAt(cx, cz) ?? mid });
        a += placed ? da : Math.min(da, 0.08);
      }
    }
  }
  const roadsSorted = roads.filter((r) => ['main', 'ring', 'radial', 'grid'].includes(r.cls)).sort((a, b) => order[a.cls] - order[b.cls]);
  for (const r of roadsSorted) {
    for (const side of [1, -1]) {
      let s = rF() * 8;
      while (s < r.L - 3) {
        const p0 = roadAt(r, s);
        const nx0 = -p0.tz * side, nz0 = p0.tx * side;
        const d = districtAt(p0.x + nx0 * 9, p0.z + nz0 * 9);
        if (!d || d === 'core' && false) { s += 6; continue; }
        const mix = MIX[d];
        if (!mix || countOf(d) >= capFront(d)) { s += 10; continue; }
        if (rF() > mix.pFront) { s += 4 + rF() * 8; continue; }
        const [kind, rec] = pickBuilding(d, mix.front, rF);
        if (!rec) { s += 6; continue; }
        const sc = scaleFor(kind, rF);
        const sx = sc.sx ?? 1, sz = sc.sz ?? 1;
        const hxw = rec.fp.hx * sx, hzw = rec.fp.hz * sz;
        const pc = roadAt(r, s + hxw);
        const nx = -pc.tz * side, nz = pc.tx * side;
        const setback = r.hw + mix.setback[0] + rF() * (mix.setback[1] - mix.setback[0]);
        const cx = pc.x + nx * (setback + hzw), cz = pc.z + nz * (setback + hzw);
        const ry = Math.atan2(-nx, -nz) + (rF() - 0.5) * 0.06;
        const placed = tryPlace(kind, rec, cx, cz, ry, { gap: Math.min(mix.gap, 1.4), road: 0.25, maxR: wallRxz(cx, cz) - ROAD_BAND - 2 }, { ...sc, d });
        if (placed) s += 2 * hxw + (mix.dense ? 0.4 + rF() * 1.4 : 1.5 + rF() * 4.5);
        else s += 2.5 + rF() * 2;
      }
    }
  }

  /* 4) Auffüllen (zufällig sequentielle Packung) – zweiter Durchgang mit engeren Abständen für Lücken */
  for (const id of DISTRICT_IDS) {
    const mix = MIX[id];
    for (const pass of [0, 1]) {
      if (pass === 1 && countOf(id) >= mix.target * 0.9) break;
      const gapUse = pass ? Math.max(1.5, mix.gap * 0.55) : mix.gap;
      const roadUse = pass ? 0.5 : 1.0;
      let guard = 0;
      const budget = pass ? mix.target * 90 + 400 : mix.target * 160 + 600;
      while (countOf(id) < mix.target && guard++ < budget) {
        const pt = randIn(id, rI);
        if (!pt) break;
        const [kind, rec] = pickBuilding(id, mix.fill, rI);
        if (!rec) continue;
        const g = field.grad(pt[0], pt[1]);
        const dr = field.at(pt[0], pt[1]);
        let ry;
        if (dr < 45 && Math.hypot(g[0], g[1]) > 0.2) ry = Math.atan2(-g[0], -g[1]) + (rI() - 0.5) * 0.12;
        else ry = rI() * TAU;
        if (rI() < 0.12) ry = Math.round(ry / (Math.PI / 2)) * (Math.PI / 2);
        const sc = scaleFor(kind, rI);
        tryPlace(kind, rec, pt[0], pt[1], ry, { gap: gapUse, road: roadUse, maxR: wallRxz(pt[0], pt[1]) - ROAD_BAND - 2 }, { ...sc, d: id });
      }
    }
    if (countOf(id) < mix.target * 0.9) warnings.push(`${DISTRICTS[id].name}: nur ${countOf(id)} von ${mix.target} Gebäuden`);
  }

  /* 5) Requisiten */
  const propLegal = { gap: 0.3, road: -99, plaza: -99 };
  const placeProp = (kind, x, z, ry, o = {}) => {
    const rec = o.rec ?? pickVariant(kind, rP, o.filt);
    if (!rec) return null;
    return tryPlace(kind, rec, x, z, ry, o.lo ?? { gap: 0.3, road: -99, plaza: -99 }, { d: o.d, ...(o.o ?? {}) });
  };
  // Straßenlampen und Strommasten entlang der Hauptwege
  const alongRoad = (r, step, fn, startOff = 0) => {
    for (let s = startOff + 2; s < r.L - 2; s += step) fn(roadAt(r, s), s);
  };
  for (const r of [rEW, rNS]) {
    let side = 1;
    alongRoad(r, 38, (p, s) => {
      const d = districtAt(p.x, p.z); if (!d) return;
      const nx = -p.tz * side, nz = p.tx * side;
      placeProp('streetLamp', p.x + nx * (r.hw + 1.1), p.z + nz * (r.hw + 1.1), Math.atan2(-nx, -nz), { d });
      side = -side;
    });
  }
  for (const r of [R1, R2]) { let side = 1; alongRoad(r, 42, (p) => { const d = districtAt(p.x, p.z); if (!d) return; const nx = -p.tz * side, nz = p.tx * side; placeProp('streetLamp', p.x + nx * (r.hw + 1.1), p.z + nz * (r.hw + 1.1), Math.atan2(-nx, -nz), { d }); side = -side; }); }
  for (const r of roads.filter((q) => q.cls === 'grid')) { alongRoad(r, 36, (p) => { const d = districtAt(p.x, p.z); if (!d) return; const nx = -p.tz, nz = p.tx; placeProp('powerPole', p.x + nx * (r.hw + 1.3), p.z + nz * (r.hw + 1.3), Math.atan2(p.tx, p.tz), { d }); }); }
  for (const r of outRoads) { alongRoad(r, 42, (p, s) => { if (p.x * p.x + p.z * p.z < (WALL + 8) ** 2) return; placeProp('powerPole', p.x - p.tz * 6.5, p.z + p.tx * 6.5, Math.atan2(p.tx, p.tz), { d: 'out' }); }); }
  // Banner an den Hauptachsen nahe dem Platz und vor dem HQ
  for (const r of [rEW, rNS]) {
    alongRoad(r, 55, (p, s) => { if (Math.hypot(p.x, p.z) > 120) return; for (const side of [1, -1]) { const nx = -p.tz * side, nz = p.tx * side; placeProp('banner', p.x + nx * (r.hw + 0.9), p.z + nz * (r.hw + 0.9), Math.atan2(-nx, -nz), { d: districtAt(p.x, p.z) }); } }, 10);
  }
  // Plätze ausstatten
  const ringProps = (pl, kind, n, rr, faceIn = true, o = {}) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + (o.rot ?? 0);
      const x = pl.x + Math.cos(a) * rr, z = pl.z + Math.sin(a) * rr;
      placeProp(kind, x, z, faceIn ? Math.atan2(pl.x - x, pl.z - z) : a, { d: districtAt(x, z) ?? 'core', ...o });
    }
  };
  const P = Object.fromEntries(plazas.map((p) => [p.id, p]));
  ringProps(P.stadtplatz, 'bench', 8, 10.5, true, { rot: 0.2 });
  ringProps(P.stadtplatz, 'brazier', 6, 15, true, { rot: 0.5 });
  ringProps(P.stadtplatz, 'torchTower', 4, 21.5, true, { rot: 0.8 });
  ringProps(P.stadtplatz, 'streetLamp', 8, 19, true, { rot: 0.1 });
  ringProps(P.basar, 'stall', 6, 10.5, true);
  ringProps(P.basar, 'brazier', 3, 5, true);
  ringProps(P.basar, 'cart', 3, 8, false);
  ringProps(P.kristallplatz, 'bench', 4, 7, true);
  ringProps(P.kristallplatz, 'streetLamp', 4, 11, true, { rot: 0.4 });
  ringProps(P.wasserplatz, 'barrels', 3, 5.5, false);
  ringProps(P.park, 'bench', 5, 8.5, true);
  ringProps(P.park, 'scrub', 5, 11, false);
  ringProps(P.brunnenhof, 'bench', 3, 6, true);
  ringProps(P.altmarkt, 'stall', 4, 7.5, true);
  ringProps(P.karawanenplatz, 'brazier', 4, 8, true);
  ringProps(P.karawanenplatz, 'cart', 5, 12, false);
  ringProps(P.karawanenplatz, 'tent', 6, 15, true);
  ringProps(P.schrottmarkt, 'junkPile', 4, 6, false);
  ringProps(P.exerzier, 'sandbags', 6, 11, false, { rot: 0.3 });
  for (const id of Object.keys(P)) if (id.startsWith('torplatz')) { ringProps(P[id], 'brazier', 2, 5, true); ringProps(P[id], 'barricade', 2, 8.5, true, { rot: 1 }); }
  // Brunnen in Plätzen (Mitte)
  for (const [id, kind] of [['basar', 'well'], ['wasserplatz', 'well'], ['brunnenhof', 'well'], ['altmarkt', 'well'], ['schrottmarkt', 'well']]) {
    const pl = P[id];
    const p = placeProp(kind, pl.x, pl.z, 0, { d: districtAt(pl.x, pl.z) });
  }
  placeProp('fountain', P.kristallplatz.x, P.kristallplatz.z, 0, { d: 'crystal' });
  // Kleinkram vor Läden, Werkstätten, Lagern
  const fronts = placements.filter((p) => ['shop', 'cantina', 'workshop', 'warehouse', 'stall', 'tenement', 'hangar'].includes(p.kind));
  for (const b of fronts) {
    const n = b.kind === 'stall' ? (rP() < 0.35 ? 1 : 0) : b.kind === 'warehouse' || b.kind === 'workshop' ? 1 + (rP() < 0.5) : rP() < 0.55 ? 1 : 0;
    for (let i = 0; i < n; i++) {
      const kind = wpick(rP, b.kind === 'cantina' ? [['barrels', 5], ['crates', 2], ['bench', 4]] : b.kind === 'workshop' || b.kind === 'warehouse' ? [['crates', 6], ['barrels', 4], ['junkPile', 3], ['supplyPile', 2]] : [['crates', 5], ['barrels', 4], ['cart', 1]])[0];
      const side = (rP() - 0.5) * 2 * (b.ob.hx * 0.8);
      const out = b.ob.hz + 1.1 + rP() * 1.8;
      // vorn = lokale +Z
      const fx = Math.sin(b.ry), fz = Math.cos(b.ry), ux = Math.cos(b.ry), uz = -Math.sin(b.ry);
      const cx = b.ob.x + fx * out + ux * side, cz = b.ob.z + fz * out + uz * side;
      if (field.at(cx, cz) < 0.6) continue;
      placeProp(kind, cx, cz, b.ry + (rP() - 0.5) * 1.2, { d: b.d });
    }
  }
  // Wasserleitungen und Rohre im Werks- und Wasserviertel
  for (const id of ['industrial', 'water']) for (let k = 0, n = 0; k < 60 && n < 5; k++) { const p = randIn(id, rP); if (!p) continue; if (placeProp('pipeRun', p[0], p[1], Math.round(rP() * 2) * Math.PI / 2 + (rP() - 0.5) * 0.1, { d: id, lo: { gap: 1.2, road: 1.2, plaza: 1 } })) n++; }
  // Vorratsstapel, Förderbänder-Zubehör, Sandsäcke und Sperren im Militärviertel / Hafen / Werk
  for (const [id, kind, n] of [['garrison', 'supplyPile', 4], ['port', 'supplyPile', 3], ['industrial', 'supplyPile', 3], ['garrison', 'sandbags', 6], ['garrison', 'barricade', 3], ['industrial', 'junkPile', 5], ['slum', 'junkPile', 12], ['slum', 'barrels', 7], ['slum', 'crates', 5], ['slum', 'scrub', 8], ['workers', 'barrels', 4], ['old', 'barrels', 4], ['old', 'crates', 3], ['water', 'barrels', 5], ['bazaar', 'crates', 6], ['bazaar', 'cart', 5], ['caravan', 'cart', 4], ['caravan', 'crates', 5], ['caravan', 'barrels', 4], ['caravan', 'supplyPile', 3], ['oberstadt', 'bench', 8], ['oberstadt', 'scrub', 10], ['crystal', 'bench', 5], ['crystal', 'scrub', 5], ['industrial', 'crates', 10], ['industrial', 'barrels', 10], ['industrial', 'sandbags', 4], ['garrison', 'crates', 7], ['garrison', 'barrels', 5], ['garrison', 'bench', 3], ['port', 'crates', 9], ['port', 'barrels', 6], ['port', 'junkPile', 4], ['water', 'scrub', 6], ['water', 'crates', 4], ['water', 'bench', 3], ['core', 'barrels', 4], ['core', 'crates', 4]]) {
    for (let k = 0, c = 0; k < n * 40 && c < n; k++) {
      const p = randIn(id, rP); if (!p) continue;
      if (placeProp(kind, p[0], p[1], rP() * TAU, { d: id, lo: { gap: 1.0, road: 1.5, plaza: 1 } })) c++;
    }
  }
  // Wegweiser an Kreuzungen der Hauptachsen
  for (const r of [rEW, rNS]) alongRoad(r, 90, (p) => { const d = districtAt(p.x, p.z); if (d) placeProp('signpost', p.x - p.tz * (r.hw + 2), p.z + p.tx * (r.hw + 2), rP() * TAU, { d }); }, 30);

  /* 6) Fahrzeuge und Figuren */
  const park = (kind, id, n, o = {}) => {
    for (let k = 0, c = 0; k < n * 60 && c < n; k++) {
      const p = o.at ? [o.at[0] + (rV() - 0.5) * 2 * (o.spread ?? 20), o.at[1] + (rV() - 0.5) * 2 * (o.spread ?? 20)] : randIn(id, rV);
      if (!p) continue;
      const dr = field.at(p[0], p[1]);
      if (!o.free && (dr > 12 || dr < 1.6)) continue; // am Straßenrand
      const g = field.grad(p[0], p[1]);
      const rec = o.rec ?? (o.cycle ? nextVariant(kind) : pickVariant(kind, rV));
      const ry = o.free ? rV() * TAU : Math.atan2(-g[1], g[0]) + (rV() < 0.5 ? 0 : Math.PI) + (rV() - 0.5) * 0.2;
      const pl = tryPlace(kind, rec, p[0], p[1], ry, { gap: 1.2, road: o.free ? 1.2 : 0.4, plaza: o.plaza ?? -99, maxR: o.maxR }, { d: districtAt(p[0], p[1]) ?? 'out', y: o.y ?? 0 });
      if (pl) c++;
    }
  };
  park('duneBuggy', 'bazaar', 3); park('duneBuggy', 'old', 2); park('duneBuggy', 'slum', 2); park('duneBuggy', 'caravan', 3); park('duneBuggy', 'workers', 2);
  park('hoverSkiff', 'port', 3); park('hoverSkiff', 'oberstadt', 2); park('hoverSkiff', 'core', 1); park('hoverSkiff', 'crystal', 1);
  park('harvester', 'industrial', 2, { cycle: true }); park('crawler', 'garrison', 2, { cycle: true }); park('crawler', 'industrial', 1, { cycle: true });
  park('tank', 'garrison', 1, { cycle: true });
  park('laserDrone', 'garrison', 2, { free: true, cycle: true }); park('laserDrone', 'core', 1, { free: true, cycle: true }); park('laserDrone', 'port', 1, { free: true, cycle: true });

  // Figuren: Gruppen am Markt, Wachtposten, Arbeiter
  const crowd = (kind, cx, cz, n, rr, o = {}) => {
    for (let k = 0, c = 0; k < n * 25 && c < n; k++) {
      const a = rV() * TAU, r = Math.sqrt(rV()) * rr;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      const rec = pickVariant(kind, rV);
      const ry = o.face != null ? Math.atan2(o.face[0] - x, o.face[1] - z) + (rV() - 0.5) * 0.6 : rV() * TAU;
      if (tryPlace(kind, rec, x, z, ry, { gap: 0.35, road: -99, plaza: -99 }, { d: districtAt(x, z) ?? 'out', solid: false })) c++;
    }
  };
  crowd('wanderer', 0, 0, 5, 10); crowd('wanderer', P.basar.x, P.basar.z, 6, 12); crowd('wanderer', P.altmarkt.x, P.altmarkt.z, 3, 7);
  crowd('wanderer', P.karawanenplatz.x, P.karawanenplatz.z, 4, 14); crowd('wanderer', P.brunnenhof.x, P.brunnenhof.z, 2, 6); crowd('wanderer', P.kristallplatz.x, P.kristallplatz.z, 2, 8);
  crowd('wanderer', P.park.x, P.park.z, 2, 9); crowd('wanderer', P.schrottmarkt.x, P.schrottmarkt.z, 2, 6);
  for (const b of placements.filter((p) => p.kind === 'cantina' || p.kind === 'shop').filter((_, i) => i % 2 === 0)) {
    const fx = Math.sin(b.ry), fz = Math.cos(b.ry);
    crowd('wanderer', b.ob.x + fx * (b.ob.hz + 2.4), b.ob.z + fz * (b.ob.hz + 2.4), 1 + (rV() < 0.4 ? 1 : 0), 2.2, { face: [b.ob.x, b.ob.z] });
  }
  for (const pl of Object.values(P)) if (pl.id.startsWith('torplatz')) crowd('warrior', pl.x, pl.z, 2, 5, { face: [0, 0] });
  crowd('warrior', P.exerzier.x, P.exerzier.z, 7, 12, { face: [P.exerzier.x, P.exerzier.z + 40] });
  const hqp = placements.find((p) => p.kind === 'hq');
  if (hqp) crowd('warrior', hqp.ob.x + Math.sin(hqp.ry) * (hqp.ob.hz + 3), hqp.ob.z + Math.cos(hqp.ry) * (hqp.ob.hz + 3), 2, 4);
  for (const b of placements.filter((p) => p.kind === 'barracks' || p.kind === 'turret' || p.kind === 'watchTower')) crowd('warrior', b.ob.x + Math.sin(b.ry) * (b.ob.hz + 2.2), b.ob.z + Math.cos(b.ry) * (b.ob.hz + 2.2), b.kind === 'barracks' ? 2 : 1, 2.5);
  for (const b of placements.filter((p) => ['factory', 'workshop', 'sandDriller', 'refinery', 'smelter', 'hangar', 'warehouse'].includes(p.kind)).filter((_, i) => i % 3 === 0)) crowd('utilityDroid', b.ob.x + Math.sin(b.ry) * (b.ob.hz + 1.8), b.ob.z + Math.cos(b.ry) * (b.ob.hz + 1.8), 1, 2);
  for (const b of placements.filter((p) => ['spaceport', 'lab', 'crystalDepot', 'battery'].includes(p.kind))) crowd('utilityDroid', b.ob.x + Math.sin(b.ry) * (b.ob.hz + 2), b.ob.z + Math.cos(b.ry) * (b.ob.hz + 2), 1, 3);
  crowd('wanderer', P.landefeld.x, P.landefeld.z, 3, 18);
  crowd('wanderer', 0, 0, 0, 1);
  for (let i = 0; i < 18; i++) { const r = roadsSorted[Math.floor(rV() * roadsSorted.length)]; const p = roadAt(r, rV() * r.L); if (districtAt(p.x, p.z)) crowd(rV() < 0.85 ? 'wanderer' : 'utilityDroid', p.x, p.z, 1, 3, { face: [p.x + p.tx * 10, p.z + p.tz * 10] }); }

  /* 7) Außenbereich: Vorstadt, Solarfelder, Tauernte, Festung, Wrack, Wurmgrube, Ruinenfeld */
  const outerLegal = (extra = {}) => ({ gap: 3, road: 2.5, plaza: -99, minR: wallRxz(1, 1) * 0 + 0, ...extra });
  const outPlace = (kind, at, spread, o = {}) => {
    for (let k = 0; k < (o.tries ?? 80); k++) {
      const a = rO() * TAU, rr = Math.sqrt(rO()) * spread;
      const x = at[0] + Math.cos(a) * rr, z = at[1] + Math.sin(a) * rr;
      const rec = o.rec ?? (o.cycle ? nextVariant(kind) : pickVariant(kind, rO, o.filt));
      const face = o.face === 'center' ? Math.atan2(at[0] - x, at[1] - z) : o.face === 'out' ? Math.atan2(x, z) : rO() * TAU;
      const wr = wallRxz(x, z);
      if (Math.hypot(x, z) < wr + 10 || Math.hypot(x, z) > 455) continue;
      const pl = tryPlace(kind, rec, x, z, face, { gap: o.gap ?? 3, road: 3, plaza: -99 }, { d: 'out', hero: o.hero, ...(o.o ?? {}) });
      if (pl) return pl;
    }
    return null;
  };
  const outAt = (deg, r) => polar(deg, wallR(deg) + r);
  const outCluster = (kind, n, at, spread, o = {}) => { let c = 0; for (let i = 0; i < n; i++) if (outPlace(kind, at, spread, o)) c++; return c; };
  {
    // Vorstadt am Südtor und Südwest: Hütten und Zelte
    const s1 = outAt(gS - 14, 40), s2 = outAt(gS + 16, 45), s3 = outAt(-120, 40);
    for (const at of [s1, s2, s3]) { outCluster('shack', 13, at, 34, { gap: 2 }); outCluster('tent', 6, at, 36, { gap: 2.5 }); outCluster('junkPile', 3, at, 30, { gap: 1.5 }); outCluster('scrub', 3, at, 36, { gap: 1 }); outCluster('barrels', 2, at, 20, { gap: 1 }); }
    const camp = outAt(gS + 3, 62);
    outCluster('tent', 4, camp, 16, { gap: 2.5 }); outCluster('brazier', 3, camp, 10, { gap: 1 }); outCluster('cart', 2, camp, 14, { gap: 1 });
    for (let i = 0; i < 2; i++) outPlace('duneBuggy', camp, 22, { gap: 2 });
    poi('Vorstadt der Karawanen', camp[0], camp[1], 'camp', 'Zelte und Hütten vor dem Südtor', 'out');
    // Solarfelder und Tauernte im Westen
    const sol = outAt(gW + 22, 52), dew = outAt(gW - 24, 48);
    const solRecs = lib.variants('solarField');
    for (let i = 0; i < 4; i++) outPlace('solarField', sol, 34, { rec: solRecs[i % solRecs.length], face: 'center', gap: 3, hero: true });
    for (let i = 0; i < 3; i++) outPlace('dewCatcher', dew, 30, { cycle: true, gap: 4, hero: true });
    outPlace('battery', outAt(gW + 10, 38), 10, { cycle: true, hero: true, face: 'center' });
    poi('Solarfeld', sol[0], sol[1], 'solarField', 'Paneelreihen vor dem Westtor', 'out');
    poi('Tauernte', dew[0], dew[1], 'dewCatcher', 'Netze, die Wasser aus dem Nachtnebel fangen', 'out');
    // Förderfeld im Osten
    const mine = outAt(gE - 18, 70);
    outPlace('sandDriller', mine, 18, { cycle: true, hero: true, face: 'center' });
    for (let i = 0; i < 3; i++) outPlace('harvester', mine, 40, { cycle: true, gap: 4, hero: true });
    outCluster('crates', 3, mine, 20, { gap: 1 }); outCluster('rocks', 5, mine, 40, { gap: 2 });
    poi('Förderfeld', mine[0], mine[1], 'sandDriller', 'Sandbohrer und Erntemaschinen im Osten', 'out');
    // Relais/Radar als Außenposten
    outPlace('relay', outAt(gN + 22, 60), 8, { cycle: true, hero: true }); outPlace('radar', outAt(gN - 20, 55), 8, { cycle: true, hero: true });
    outPlace('shieldGen', outAt(gN, 36), 14, { cycle: true, hero: true, face: 'center' });
    for (let i = 0; i < 3; i++) outPlace('turret', outAt(gN - 6 + i * 6, 14), 6, { cycle: true, hero: true, face: 'out', gap: 3 });
    // Festung der Plünderer (Nordost) mit Lagerleben
    const fort = outAt(52, 118);
    const fp = outPlace('fortress', fort, 6, { cycle: true, hero: true, face: 'center', gap: 4, tries: 30 });
    const fortAt = fp ? [fp.ob.x, fp.ob.z] : fort;
    poi('Festung der Plünderer', fortAt[0], fortAt[1], 'fortress', 'Bastion einer Räuberbande – besser nicht zu nahe kommen', 'out');
    for (let i = 0; i < 5; i++) outPlace('raider', fortAt, 52, { cycle: true, gap: 3, face: 'free', hero: true });
    outPlace('tank', outAt(40, 80), 40, { cycle: true, hero: true, gap: 4 }); outPlace('breaker', outAt(64, 92), 30, { cycle: true, hero: true, gap: 5 });
    outCluster('tent', 6, outAt(60, 92), 36, { gap: 2.5 }); outCluster('sandbags', 4, fortAt, 40, { gap: 1.5 }); outCluster('barricade', 3, fortAt, 42, { gap: 1.5 }); outCluster('brazier', 3, fortAt, 40, { gap: 1 });
    outCluster('warrior', 6, fortAt, 36, { gap: 1, o: { solid: false } });
    // Absturzstelle im Südwesten: Wrack, Schrott, Ruinen, Nachtschwarm
    const crash = outAt(-168, 120);
    const cp = outPlace('wreckedHull', crash, 4, { cycle: true, hero: true, face: 'free', gap: 4, tries: 30 });
    const cAt = cp ? [cp.ob.x, cp.ob.z] : crash;
    poi('Absturzstelle', cAt[0], cAt[1], 'wreckedHull', 'Das Wrack eines Raumschiffs, halb im Sand begraben', 'out');
    outCluster('junkPile', 6, cAt, 26, { gap: 1 }); outCluster('rocks', 6, cAt, 40, { gap: 2 }); outCluster('scrub', 6, cAt, 40, { gap: 1 });
    outCluster('ruin', 7, outAt(-176, 96), 56, { gap: 4 });
    const swarm = outAt(-158, 78);
    const ns = outPlace('nightAliens', swarm, 14, { cycle: true, hero: true, gap: 2 });
    if (ns) poi('Nachtschwarm', ns.x, ns.z, 'nightAliens', 'Hier hausen die fliegenden Nachtkreaturen', 'out');
    // Wurmgrube im Südosten
    const pit = outAt(-62, 150);
    const sw = outPlace('sandworm', pit, 6, { cycle: true, hero: true, face: 'free', gap: 5, tries: 30 });
    if (sw) poi('Wurmgrube', sw.x, sw.z, 'sandworm', 'Ein ausgewachsener Sandwurm lauert unter der Düne', 'out');
    outCluster('rocks', 9, sw ? [sw.ob.x, sw.ob.z] : pit, 40, { gap: 2.5 }); outCluster('scrub', 4, pit, 50, { gap: 1.5 });
    // Ruinenfeld im Nordwesten und verstreute Reste
    const rf = outAt(150, 90);
    outCluster('ruin', 8, rf, 60, { gap: 4 }); outCluster('rocks', 6, rf, 70, { gap: 2 }); outCluster('scrub', 6, rf, 70, { gap: 1 });
    poi('Ruinenfeld', rf[0], rf[1], 'ruin', 'Überreste einer älteren Siedlung', 'out');
    for (let i = 0; i < 12; i++) outPlace(rO() < 0.6 ? 'scrub' : 'rocks', polar(rO() * 360, wallR(0) + 30 + rO() * 130), 6, { tries: 6, gap: 1 });
    for (let i = 0; i < 8; i++) outPlace('wanderer', outAt(rO() * 360, 20 + rO() * 60), 6, { tries: 6, gap: 1, o: { solid: false } });
  }

  /* 8) Lichter und Feuer sammeln (für Nacht und Effekte) */
  for (const p of placements) {
    const v = lib.variants(p.kind)[p.vi];
    if (!v) continue;
    const c = Math.cos(p.ry), s = Math.sin(p.ry);
    const w = (lx, lz) => [p.x + lx * c * p.sx + lz * s * p.sz, p.z - lx * s * p.sx + lz * c * p.sz];
    if (p.kind === 'streetLamp') { const [x, z] = w(0, 0); lights.push({ x, y: 3.7 * p.sy, z, k: 1, c: 0xffd9a0, id: p.id }); }
    else if (p.kind === 'brazier') { const [x, z] = w(0, 0); lights.push({ x, y: 1.1, z, k: 0.8, c: 0xff9a50, id: p.id }); fires.push({ x, y: 0.95, z, size: 0.55, id: p.id }); }
    else if (p.kind === 'torchTower') { const [x, z] = w(0, 0); const h = v.params.height ?? 6; lights.push({ x, y: h, z, k: 1.6, c: 0xff9040, id: p.id }); fires.push({ x, y: h, z, size: 0.8 * (v.params.flame ?? 1), id: p.id }); }
    else if (p.kind === 'cantina') { const [x, z] = w(0, v.fp.hz + 1); lights.push({ x, y: 2.6, z, k: 1.3, c: 0xffb060, id: p.id }); }
    else if (p.kind === 'spaceport' || p.kind === 'hq' || p.kind === 'smelter') { const [x, z] = w(0, 0); lights.push({ x, y: 5, z, k: 2.2, c: p.kind === 'smelter' ? 0xff7030 : 0xe8f0ff, id: p.id }); }
  }

  /* 9) Ergebnis */
  const byDistrict = {};
  const byKind = {};
  const byGroup = {};
  let buildings = 0;
  for (const p of placements) {
    byKind[p.kind] = (byKind[p.kind] ?? 0) + 1;
    byDistrict[p.d] = (byDistrict[p.d] ?? 0) + 1;
    const info = KINDS[p.kind];
    byGroup[info.group] = (byGroup[info.group] ?? 0) + 1;
    if (info.type === 'building') buildings++;
  }
  return {
    seed, wallR: WALL, placements, roads, plazas, pois, lights, fires, warnings, districtGrid: dgrid, districtGridInfo: { n: DN, cell: DG, extent: EXTENT },
    why, districtAt, wallRadius: wallR, gateAngles, gateNames: names, wallPts,
    stats: { total: placements.length, buildings, byKind, byDistrict, byGroup, roadLength: Math.round(roads.reduce((a, r) => a + r.L, 0)), ms: typeof performance !== 'undefined' ? Math.round(performance.now() - t0) : 0 },
  };
}
