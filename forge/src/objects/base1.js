// Basis & Wirtschaft, Teil 1: Quartier, Fließband, Raffinerie, Sammler, Taufänger, Energiefeld.
import * as THREE from 'three';
import { tube, scaleUV } from '../core/helpers.js';
import {
  M, box, cyl, sph, torus, mk, cloth, mulberry32, crystal, solarMat, hazardMat, netMat, waterMat, spiceMat,
  railing, ladder, addWheels, vehicleSpec, flag, emit, alive, pulse,
} from './kit.js';
import { damageParam, seedParam, PAL_OPTIONS } from './_common.js';

const CAT = 'Basis & Wirtschaft';

/* ───────────────────────── Quartier ───────────────────────── */
export const hq = {
  id: 'hq',
  label: 'Quartier',
  category: CAT,
  tag: 'Basis',
  hint: 'Zentrale der Kolonie. Stellt Arbeiter bereit, verbindet das Netz und entscheidet über Sieg oder Niederlage.',
  buildStyle: 'rise',
  params: [
    { key: 'wings', label: 'Netzanschlüsse', type: 'range', min: 2, max: 6, step: 1, value: 4 },
    { key: 'towerH', label: 'Turmhöhe', type: 'range', min: 8, max: 18, step: 0.5, value: 12, unit: 'm' },
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'sand' },
    { key: 'banner', label: 'Banner', type: 'bool', value: true },
    damageParam(0.3),
    seedParam(1),
  ],
  build(obj, p) {
    const dm = p.damage;
    const paint = M.metal(p.pal), gray = M.metal('gray'), dark = M.metal('black');
    const conc = M.clay('white'), clay = M.clay('adobe');
    const glow = M.glow(0xffc070, 1.5);

    obj.add(cyl(9.4, 9.8, 0.5, conc, { y: 0.25, radial: 10, dmg: dm * 0.05, seed: p.seed }), { mass: 4000, surf: 'clay' });
    // Kuppel mit Ringbalken
    obj.add(sph(5, clay, { y: 0.5, thetaLength: Math.PI / 2, ws: 32, hs: 12, sy: 0.7, dmg: dm * 0.03, seed: p.seed + 1 }), { mass: 2500, surf: 'clay', collider: { type: 'box', size: [9, 3.2, 9], offset: [0, 1.6, 0] } });
    obj.add(torus(5.0, 0.2, gray, { y: 0.7, rx: Math.PI / 2, ts: 40, rs: 6 }), { mass: 60, collider: 'none' });

    // Turm
    const top = 4.0;
    obj.add(cyl(1.25, 1.7, p.towerH, paint, { y: top + p.towerH / 2, radial: 14, hseg: 6, dmg: dm * 0.02, seed: p.seed + 2 }), { mass: 900 });
    obj.add(cyl(1.32, 1.32, 0.7, glow, { y: top + p.towerH * 0.82, radial: 14 }), { mass: 20, collider: 'none' });
    obj.add(cyl(2.0, 1.5, 0.45, gray, { y: top + p.towerH + 0.22, radial: 14 }), { mass: 80, collider: 'none' });
    obj.add(cyl(0.05, 0.07, 4.5, gray, { y: top + p.towerH + 2.7, radial: 6 }), { mass: 10, collider: 'none' });
    obj.add(sph(0.75, gray, { y: top + p.towerH + 2.2, x: 0.5, thetaLength: 1.1, rx: -1.9, ry: 0.5, ws: 18, hs: 6 }), { mass: 20, collider: 'none' });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2a12, emissiveIntensity: 2 }));
    beacon.position.y = top + p.towerH + 5.0;
    obj.anim.beacon = beacon;
    obj.add(beacon, { mass: 1, collider: 'none' });

    // Eingang
    obj.add(box(2.4, 2.7, 0.6, dark, { y: 1.85, z: 4.55 }), { mass: 30, collider: 'none' });
    obj.add(box(2.7, 0.2, 0.7, glow, { y: 3.3, z: 4.55 }), { mass: 5, collider: 'none' });
    obj.add(box(3.4, 0.3, 1.3, conc, { y: 0.65, z: 5.4 }), { mass: 120, surf: 'clay' });
    obj.add(box(3.0, 0.3, 1.0, conc, { y: 0.8 - 0.3, z: 6.2 }), { mass: 100, surf: 'clay', collider: 'none' });

    // Netzanschlüsse
    for (let i = 0; i < p.wings; i++) {
      const a = ((i + 0.5) / p.wings) * Math.PI * 2;
      const g = new THREE.Group();
      g.rotation.y = a;
      g.add(box(3.4, 3.0, 3.6, paint, { y: 2.0, z: 7.2, dmg: dm * 0.05, seed: p.seed + 10 + i }));
      g.add(box(1.9, 1.9, 0.5, dark, { y: 1.5, z: 9.05 }));
      g.add(box(2.1, 0.18, 0.3, M.glow(0xffb020, 1.3), { y: 2.65, z: 9.1 }));
      g.add(cyl(0.38, 0.38, 3.0, gray, { y: 1.9, z: 5.3, rx: Math.PI / 2, radial: 10 }));
      obj.add(g, { mass: 700, surf: 'metal', collider: { type: 'box', size: [3.4, 3.0, 4.4], offset: [0, 2.0, 7.4] } });
    }

    // Banner
    if (p.banner) {
      const g = new THREE.Group();
      g.position.set(-6.8, 0.5, -5.2);
      g.add(cyl(0.07, 0.09, 7, gray, { y: 3.5, radial: 8 }));
      g.add(flag(0xc8472a, 2.4, 1.5, { x: 1.25, y: 5.7 }));
      obj.add(g, { mass: 60, surf: 'metal', collider: { type: 'cyl', r: 0.1, h: 7, offset: [0, 3.5, 0] } });
    }
    // Lichtmasten
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const g = new THREE.Group();
      g.position.set(Math.sin(a) * 8.9, 0.5, Math.cos(a) * 8.9);
      g.add(cyl(0.06, 0.09, 4, gray, { y: 2, radial: 6 }));
      g.add(box(0.7, 0.15, 0.35, M.glow(0xfff0c8, 2.4), { y: 4.05 }));
      obj.add(g, { mass: 20, collider: 'none' });
    }
    const L = new THREE.PointLight(0xffb868, 40, 26, 2);
    L.position.set(0, 7, 6);
    obj.light(L);
  },
  onFrame(obj) {
    if (alive(obj) && obj.anim.beacon) pulse(obj.anim.beacon.material, obj.time, 0.1, 3.2, 3);
  },
};

/* ───────────────────────── Fließband ───────────────────────── */
function beltMat() {
  if (beltMat.m) return beltMat.m;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#26221e';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#4c453c';
  g.fillRect(0, 0, 64, 9);
  g.fillStyle = '#1a1714';
  g.fillRect(0, 9, 64, 2);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 4);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  beltMat.tex = t;
  beltMat.m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, metalness: 0.1 });
  return beltMat.m;
}

export const conveyor = {
  id: 'conveyor',
  label: 'Fließband',
  category: CAT,
  tag: 'Netz',
  hint: 'Verbindet Gebäude, transportiert Nachschub und ist Weg für Figuren.',
  params: [
    { key: 'shape', label: 'Form', type: 'select', options: [['line', 'Gerade'], ['curve', 'Kurve'], ['tee', 'T-Stück']], value: 'line' },
    { key: 'segs', label: 'Länge (Segmente à 2 m)', type: 'range', min: 2, max: 8, step: 1, value: 4 },
    { key: 'cargo', label: 'Fracht', type: 'bool', value: true },
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'gray' },
    damageParam(0.3),
    seedParam(2),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed), dm = p.damage;
    const L = 2.0, W = 1.3, H = 0.9;
    const frame = M.metal(p.pal), dark = M.metal('black'), rust = M.metal('rust');
    const wood = M.wood(0xc2a47c);
    const cargo = [];
    obj.anim.cargo = cargo;
    obj.anim.speed = 0.8;

    const seg = (x, z, ry) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = ry;
      for (const s of [-1, 1]) g.add(box(0.12, 0.3, L, frame, { x: s * (W / 2 + 0.06), y: H - 0.1, dmg: dm * 0.03, seed: (rng() * 99) | 0, seg: [1, 1, 4] }));
      g.add(mk(new THREE.BoxGeometry(W, 0.1, L), beltMat(), { y: H - 0.06 }));
      for (const zz of [-L / 2 + 0.1, 0, L / 2 - 0.1]) g.add(box(W + 0.24, 0.07, 0.1, dark, { y: H - 0.3, z: zz }));
      for (const s of [-1, 1]) g.add(cyl(0.05, 0.06, H - 0.3, dark, { x: s * (W / 2 + 0.06), y: (H - 0.3) / 2, z: 0, radial: 8 }));
      g.add(cyl(0.09, 0.09, W, dark, { y: H - 0.06, z: -L / 2, rz: Math.PI / 2, radial: 10 }));
      if (p.cargo && rng() < 0.65) {
        const c = box(0.55, 0.38, 0.55, rng() < 0.5 ? wood : M.metal('olive'), { y: H + 0.2, dmg: dm * 0.02, seed: (rng() * 99) | 0 });
        g.add(c);
        cargo.push({ m: c, z0: (rng() - 0.5) * L });
      }
      obj.add(g, { mass: 150, surf: 'metal', collider: { type: 'box', size: [W + 0.4, 0.5, L], offset: [0, H - 0.15, 0] } });
    };

    // Pfad aus Segmenten: turns[i] = Drehung in Grad, je zur Hälfte vor und nach dem Segment
    const run = (x, z, theta, turns) => {
      for (const t of turns) {
        theta += (t * Math.PI) / 360;
        seg(x + (Math.sin(theta) * L) / 2, z + (Math.cos(theta) * L) / 2, theta);
        x += Math.sin(theta) * L;
        z += Math.cos(theta) * L;
        theta += (t * Math.PI) / 360;
      }
      return { x, z, theta };
    };
    const n = p.segs;
    if (p.shape === 'line') run(0, (-n * L) / 2, 0, new Array(n).fill(0));
    else if (p.shape === 'curve') run(-n * L * 0.25, (-n * L) / 2, 0, [...new Array(Math.ceil(n / 2)).fill(0), 30, 30, 30]);
    else {
      run(0, (-n * L) / 2, 0, new Array(n).fill(0));
      run(W / 2 + 0.2, 0, Math.PI / 2, new Array(Math.max(1, Math.ceil(n / 2))).fill(0));
    }
  },
  onFrame(obj, dt) {
    if (!alive(obj)) return;
    const a = obj.anim;
    if (beltMat.tex) beltMat.tex.offset.y += dt * a.speed * 2;
    for (const c of a.cargo) {
      c.z0 = ((c.z0 + dt * a.speed + 1) % 2) - 1;
      c.m.position.z = c.z0;
    }
  },
};

/* ───────────────────────── Raffinerie ───────────────────────── */
export const refinery = {
  id: 'refinery',
  label: 'Raffinerie',
  category: CAT,
  tag: 'Geld',
  hint: 'Schickt Sammler zu Gewürzadern im Umkreis.',
  params: [
    { key: 'tanks', label: 'Lagertanks', type: 'range', min: 1, max: 5, step: 1, value: 3 },
    { key: 'stackH', label: 'Schornsteinhöhe', type: 'range', min: 6, max: 16, step: 0.5, value: 11, unit: 'm' },
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'white' },
    { key: 'smoke', label: 'Rauch', type: 'bool', value: true },
    damageParam(0.4),
    seedParam(6),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed), dm = p.damage;
    const paint = M.metal(p.pal), gray = M.metal('gray'), dark = M.metal('black'), rust = M.metal('rust'), red = M.metal('red'), white = M.metal('white');
    const conc = M.clay('white'), clay = M.clay('adobe');
    obj.add(box(15, 0.4, 11.5, conc, { y: 0.2, dmg: dm * 0.04, seed: p.seed }), { mass: 5000, surf: 'clay', fracture: [4, 1, 3] });

    // Lagertanks
    const n = p.tanks, sp = 3.4;
    obj.anim.stackPos = [5.2, 0, -3.2];
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * sp - 1.5, z = -3.6, h = 4.2 + rng() * 1.6;
      const g = new THREE.Group();
      g.position.set(x, 0.4, z);
      g.add(cyl(1.5, 1.5, h, paint, { y: h / 2, radial: 22, hseg: 5, dmg: dm * 0.03, seed: p.seed + i }));
      g.add(sph(1.5, paint, { y: h, thetaLength: Math.PI / 2, ws: 22, hs: 6, sy: 0.4 }));
      for (const y of [0.25, 0.5, 0.75]) g.add(torus(1.51, 0.04, gray, { y: h * y, rx: Math.PI / 2, ts: 22, rs: 4 }));
      g.add(ladder(h, dark, { x: 0, y: 0, z: 1.55 }));
      g.add(cyl(0.18, 0.18, 0.5, rust, { x: 1.2, y: 0.6, z: 0.9, rz: Math.PI / 2, radial: 8 }));
      obj.add(g, { mass: 600, surf: 'metal', collider: { type: 'cyl', r: 1.5, h, offset: [0, h / 2, 0] } });
    }

    // Destillationskolonne
    {
      const g = new THREE.Group();
      g.position.set(3.5, 0.4, 0.8);
      g.add(cyl(0.8, 0.9, 9, white, { y: 4.5, radial: 16, hseg: 6, dmg: dm * 0.02, seed: p.seed + 30 }));
      for (let k = 1; k <= 4; k++) {
        g.add(torus(0.88, 0.06, gray, { y: k * 1.8, rx: Math.PI / 2, ts: 18, rs: 4 }));
        g.add(cyl(1.3, 1.3, 0.06, dark, { y: k * 1.8 - 0.05, radial: 14 }));
      }
      g.add(cyl(0.3, 0.8, 1, white, { y: 9.5, radial: 14 }));
      g.add(ladder(9, dark, { y: 0, z: 0.95 }));
      obj.add(g, { mass: 900, surf: 'metal', collider: { type: 'cyl', r: 0.9, h: 9.5, offset: [0, 4.7, 0] } });
    }

    // Schornstein mit Warnbändern
    {
      const g = new THREE.Group();
      const [sx, , sz] = obj.anim.stackPos;
      g.position.set(sx, 0.4, sz);
      const seg = p.stackH / 5;
      for (let k = 0; k < 5; k++) g.add(cyl(0.55 - k * 0.03, 0.6 - k * 0.03, seg, k % 2 ? white : red, { y: seg * (k + 0.5), radial: 14, dmg: dm * 0.02, seed: p.seed + 40 + k }));
      g.add(torus(0.5, 0.07, dark, { y: p.stackH, rx: Math.PI / 2, ts: 14, rs: 5 }));
      obj.add(g, { mass: 700, surf: 'metal', collider: { type: 'cyl', r: 0.6, h: p.stackH, offset: [0, p.stackH / 2, 0] } });
      obj.anim.stackTop = [sx, 0.4 + p.stackH + 0.3, sz];
    }

    // Ofenhaus mit glühendem Fenster
    obj.add(box(4.6, 3.2, 3.6, clay, { x: -1.0, y: 2.0, z: 2.6, dmg: dm * 0.05, seed: p.seed + 50 }), { mass: 900, surf: 'clay', fracture: [2, 2, 2] });
    obj.add(box(1.8, 1.1, 0.12, M.glow(0xff8a2a, 1.7), { x: -1.0, y: 2.3, z: 4.45 }), { mass: 3, collider: 'none' });
    obj.add(box(1.1, 2.1, 0.14, dark, { x: -2.9, y: 1.5, z: 4.42 }), { mass: 20, collider: 'none' });
    // Silo mit Gewürz
    obj.add(cyl(1.3, 1.3, 3.2, M.metal('rust'), { x: 6.0, y: 2.0, z: 2.8, radial: 18, hseg: 3, dmg: dm * 0.03, seed: p.seed + 60 }), { mass: 500, surf: 'metal' });
    obj.add(cyl(0.2, 1.35, 1.2, spiceMat(), { x: 6.0, y: 4.2, z: 2.8, radial: 18 }), { mass: 60, collider: 'none' });

    // Rohrleitungen
    obj.add(tube([[-3.5, 3.2, -3.6], [-1, 4.4, -1.6], [3.0, 5.0, 0.6]], 0.16, rust, { segs: 20 }), { mass: 30, collider: 'none' });
    obj.add(tube([[3.5, 1.2, 1.7], [4.6, 0.7, 2.4], [5.9, 1.2, 2.8]], 0.14, gray, { segs: 14 }), { mass: 20, collider: 'none' });
    obj.add(tube([[-1.5, 4.2, 4.1], [1.2, 4.6, 3.2], [3.0, 4.0, 1.2]], 0.1, dark, { segs: 14 }), { mass: 10, collider: 'none' });

    // Säcke und Fässer
    for (let i = 0; i < 6; i++) {
      const s = sph(0.34, M.cloth(0xb08a5a), { x: -6.2 + (i % 3) * 0.7, y: 0.65 + Math.floor(i / 3) * 0.55, z: -4.6, sx: 1.3, sy: 0.8, sz: 0.9, ws: 10, hs: 8 });
      obj.add(s, { mass: 15, surf: 'cloth', collider: { type: 'box', size: [0.9, 0.5, 0.6] } });
    }
    for (let i = 0; i < 3; i++) obj.add(cyl(0.3, 0.3, 0.9, M.metal(i % 2 ? 'rust' : 'blue'), { x: -6.6 + i * 0.75, y: 0.85, z: 3.6, radial: 14, dmg: dm * 0.02, seed: i + 70 }), { mass: 30, surf: 'metal' });
    const L = new THREE.PointLight(0xff9040, 26, 14, 2);
    L.position.set(-1, 2.6, 5.2);
    obj.light(L);
  },
  onFrame(obj, dt) {
    if (obj.params.smoke && obj.anim.stackTop) emit(obj, 'stack', obj.anim.stackTop, dt, 3.2, 'smoke', 1.5);
  },
};

/* ───────────────────────── Sammler (Fahrzeug) ───────────────────────── */
export const harvester = {
  id: 'harvester',
  label: 'Sammler',
  category: CAT,
  tag: 'Einheit',
  hint: 'Holt Gewürz von Adern und liefert es zum Quartier. Fahrbar (WASD).',
  params: [
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'sand' },
    { key: 'wheelR', label: 'Reifenradius', type: 'range', min: 0.6, max: 1.1, step: 0.01, value: 0.85, unit: 'm' },
    { key: 'load', label: 'Ladung', type: 'range', min: 0, max: 1, step: 0.01, value: 0.6, fmt: (v) => Math.round(v * 100) + ' %' },
    { key: 'arm', label: 'Saugarm', type: 'bool', value: true },
    damageParam(0.35),
    seedParam(8),
  ],
  build(obj, p) {
    obj.mode = 'vehicle';
    const R = p.wheelR, rest = 0.5;
    obj.originY = R + rest + 0.3;
    const dm = p.damage;
    const paint = M.metal(p.pal), gray = M.metal('gray'), dark = M.metal('black'), rust = M.metal('rust');
    const Y = R + rest + 0.1; // Oberkante Rahmen
    obj.add(box(2.9, 0.3, 6.4, gray, { y: Y, dmg: dm * 0.02, seed: p.seed }), { mass: 300 });
    for (const s of [-1, 1]) obj.add(box(0.25, 0.5, 6.2, dark, { x: s * 1.4, y: Y + 0.1 }), { mass: 60 });

    // Führerhaus
    obj.add(box(2.3, 1.8, 1.9, paint, { y: Y + 1.1, z: 2.3, dmg: dm * 0.05, seed: p.seed + 1 }), { mass: 200 });
    obj.add(box(2.0, 0.9, 0.06, M.glass(0x3b4c54, 0.6), { y: Y + 1.5, z: 3.27, rx: 0.12, cast: false }), { mass: 4, collider: 'none' });
    obj.add(box(2.5, 0.2, 2.1, gray, { y: Y + 2.1, z: 2.3 }), { mass: 30, collider: 'none' });
    for (const s of [-1, 1]) obj.add(cyl(0.14, 0.17, 0.12, M.glow(0xfff0c8, 3), { x: s * 0.8, y: Y + 0.9, z: 3.3, rx: Math.PI / 2, radial: 12 }), { mass: 1, collider: 'none' });

    // Saugschaufel
    if (p.arm) {
      obj.add(box(3.4, 0.22, 2.4, rust, { y: Y - 0.15, z: 4.6, rx: 0.3, dmg: dm * 0.05, seed: p.seed + 2 }), { mass: 140, collider: 'none' });
      for (const s of [-1, 1]) obj.add(box(0.14, 0.7, 2.3, rust, { x: s * 1.7, y: Y + 0.1, z: 4.55, rx: 0.3 }), { mass: 30, collider: 'none' });
      for (let i = 0; i < 7; i++) obj.add(cyl(0.0, 0.1, 0.5, dark, { x: -1.5 + i * 0.5, y: Y - 0.6, z: 5.7, rx: Math.PI / 2 + 0.3, radial: 6 }), { mass: 2, collider: 'none' });
      obj.add(tube([[0, Y + 0.1, 4.1], [0, Y + 1.3, 3.2], [0, Y + 2.7, 0.6], [0, Y + 2.2, -1.6]], 0.3, rust, { segs: 24 }), { mass: 40, collider: 'none' });
    }

    // Tank/Behälter hinten mit Gewürzhaufen
    obj.add(box(2.7, 0.2, 3.2, dark, { y: Y + 0.2, z: -1.6 }), { mass: 40, collider: 'none' });
    for (const s of [-1, 1]) obj.add(box(0.16, 1.5, 3.2, paint, { x: s * 1.35, y: Y + 0.95, z: -1.6, dmg: dm * 0.06, seed: p.seed + 3 + s }), { mass: 60 });
    obj.add(box(2.7, 1.5, 0.16, paint, { y: Y + 0.95, z: -3.1, dmg: dm * 0.06, seed: p.seed + 6 }), { mass: 60 });
    obj.add(box(2.7, 1.0, 0.16, paint, { y: Y + 0.7, z: 0.0 }), { mass: 60, collider: 'none' });
    const pile = sph(1.3, spiceMat(), { y: Y + 0.3, z: -1.6, sx: 1.0, sy: 0.15 + 0.5 * p.load, sz: 1.1, ws: 16, hs: 10 });
    obj.add(pile, { mass: 100, surf: 'cloth', collider: 'none' });

    // Motor + Auspuff
    obj.add(box(2.0, 1.0, 1.0, dark, { y: Y + 1.0, z: 0.9, dmg: dm * 0.03, seed: p.seed + 8 }), { mass: 120, collider: 'none' });
    for (const s of [-1, 1]) obj.add(cyl(0.1, 0.12, 1.6, rust, { x: s * 0.8, y: Y + 2.0, z: 0.6, radial: 8 }), { mass: 5, collider: 'none' });
    obj.anim.exh = [[-0.8, Y + 2.9, 0.6], [0.8, Y + 2.9, 0.6]];

    // Warnstreifen hinten
    obj.add(box(2.7, 0.3, 0.1, hazardMat(), { y: Y + 0.45, z: -3.2 }), { mass: 4, collider: 'none' });

    const wheels = addWheels(obj, [
      { x: 1.95, z: 2.3, steer: true }, { x: -1.95, z: 2.3, steer: true },
      { x: 1.95, z: -1.9 }, { x: -1.95, z: -1.9 },
    ], { R, width: 0.7, rest, rimMat: gray, mass: 60 });
    obj.vehicle = vehicleSpec(1300, wheels, { accel: 4.2, rest, travel: 0.45, maxSteer: 0.4, top: 13, steerK: 0.12 });
  },
  onFrame(obj, dt) {
    if (obj.anim.exh) for (let i = 0; i < obj.anim.exh.length; i++) emit(obj, 'e' + i, obj.anim.exh[i], dt, 1.2, 'smoke', 0.6);
  },
};

/* ───────────────────────── Taufänger ───────────────────────── */
export const dewCatcher = {
  id: 'dewCatcher',
  label: 'Taufänger',
  category: CAT,
  tag: 'Wasser',
  hint: 'Liefert Wasser und ist Trinkstelle für Arbeiter.',
  params: [
    { key: 'nets', label: 'Fangnetze', type: 'range', min: 3, max: 10, step: 1, value: 6 },
    { key: 'height', label: 'Netzhöhe', type: 'range', min: 3, max: 7, step: 0.1, value: 4.8, unit: 'm' },
    { key: 'trough', label: 'Trinkrinne', type: 'bool', value: true },
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'white' },
    damageParam(0.35),
    seedParam(14),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed), dm = p.damage, H = p.height;
    const paint = M.metal(p.pal), gray = M.metal('gray'), dark = M.metal('black');
    const conc = M.clay('white');
    obj.add(cyl(5.2, 5.5, 0.3, conc, { y: 0.15, radial: 24, dmg: dm * 0.04, seed: p.seed }), { mass: 3000, surf: 'clay' });
    // Becken
    obj.add(cyl(1.6, 1.7, 0.7, conc, { y: 0.65, radial: 24, dmg: dm * 0.03, seed: p.seed + 1 }), { mass: 900, surf: 'clay' });
    obj.add(cyl(1.4, 1.4, 0.04, waterMat(), { y: 1.02, radial: 24, cast: false }), { mass: 1, collider: 'none' });
    // Mast + Trichter
    obj.add(cyl(0.14, 0.18, H + 2, gray, { y: 0.3 + (H + 2) / 2, radial: 10, hseg: 4 }), { mass: 200 });
    obj.add(cyl(0.3, 1.6, 1.4, paint, { y: 1.8, radial: 20, dmg: dm * 0.02, seed: p.seed + 2 }), { mass: 120, collider: 'none' });
    obj.add(sph(0.18, M.glow(0x7fd6ff, 1.8), { y: H + 2.4, ws: 8, hs: 6 }), { mass: 1, collider: 'none' });

    // Fangnetze (radial)
    const net = netMat(0xd8d2c0);
    for (let i = 0; i < p.nets; i++) {
      const a = (i / p.nets) * Math.PI * 2;
      const g = new THREE.Group();
      g.rotation.y = a;
      const w = 3.2, y0 = 1.9;
      const geo = new THREE.PlaneGeometry(w, H);
      scaleUV(geo, w * net.userData.tpm, H * net.userData.tpm);
      const sheet = mk(geo, net, { x: 0, y: y0 + H / 2, z: 2.9 });
      sheet.rotation.y = Math.PI / 2;
      g.add(sheet);
      for (const s of [-1, 1]) g.add(cyl(0.04, 0.05, H + 0.2, gray, { x: 0, y: y0 + H / 2, z: 2.9 + s * (w / 2), radial: 6 }));
      g.add(box(0.06, 0.06, w + 0.1, gray, { y: y0 + H, z: 2.9 }));
      g.add(box(0.06, 0.06, w + 0.1, gray, { y: y0, z: 2.9 }));
      g.add(box(0.12, 0.12, w, dark, { y: y0 - 0.1, z: 2.9 })); // Auffangrinne
      g.add(tube([[0, y0 - 0.1, 1.3], [0, 1.4, 1.1]], 0.05, gray));
      obj.add(g, { mass: 40, surf: 'cloth', collider: { type: 'box', size: [0.3, H + 0.2, w], offset: [0, y0 + H / 2, 2.9] } });
    }
    // Verspannung
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      obj.add(tube([[0, H + 1.9, 0], [Math.sin(a) * 3, H * 0.5 + 1, Math.cos(a) * 3], [Math.sin(a) * 6, 0.35, Math.cos(a) * 6]], 0.015, dark), { mass: 1, collider: 'none' });
    }

    // Trinkrinne mit Hähnen
    if (p.trough) {
      const g = new THREE.Group();
      g.position.set(0, 0.3, -4.2);
      g.add(box(4.2, 0.6, 0.9, conc, { y: 0.3, dmg: dm * 0.03, seed: p.seed + 10 }));
      g.add(box(3.9, 0.04, 0.62, waterMat(), { y: 0.62, cast: false }));
      for (let i = 0; i < 3; i++) {
        g.add(cyl(0.04, 0.04, 0.8, gray, { x: -1.2 + i * 1.2, y: 1.0, z: -0.55, radial: 6 }));
        g.add(cyl(0.035, 0.035, 0.3, gray, { x: -1.2 + i * 1.2, y: 1.38, z: -0.4, rx: Math.PI / 2, radial: 6 }));
        g.add(sph(0.07, M.metal('rust'), { x: -1.2 + i * 1.2, y: 1.45, z: -0.55, ws: 8, hs: 6 }));
      }
      obj.add(g, { mass: 700, surf: 'clay', collider: { type: 'box', size: [4.2, 0.6, 0.9], offset: [0, 0.3, 0] } });
      obj.add(tube([[0, 0.4, -1.6], [0, 0.3, -2.8], [0, 0.9, -3.5]], 0.09, gray, { segs: 14 }), { mass: 10, collider: 'none' });
    }
    // Tonne
    obj.add(cyl(0.5, 0.5, 1.1, M.metal('blue'), { x: 3.4, y: 0.85, z: -2.6, radial: 16, dmg: dm * 0.03, seed: p.seed + 20 }), { mass: 60, surf: 'metal' });
  },
};

/* ───────────────────────── Energiefeld (Solar) ───────────────────────── */
export const solarField = {
  id: 'solarField',
  label: 'Energiefeld',
  category: CAT,
  tag: 'Strom',
  hint: 'Erzeugt Strom für das Netz.',
  params: [
    { key: 'rows', label: 'Reihen', type: 'range', min: 1, max: 6, step: 1, value: 3 },
    { key: 'cols', label: 'Paneele je Reihe', type: 'range', min: 1, max: 6, step: 1, value: 4 },
    { key: 'tilt', label: 'Neigung', type: 'range', min: 0.2, max: 0.9, step: 0.01, value: 0.55, fmt: (v) => Math.round(v * 57.3) + '°' },
    { key: 'pal', label: 'Rahmen', type: 'select', options: PAL_OPTIONS, value: 'gray' },
    damageParam(0.4),
    seedParam(17),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed), dm = p.damage;
    const frame = M.metal(p.pal), dark = M.metal('black'), gray = M.metal('gray');
    const sol = solarMat();
    const PW = 2.0, PD = 1.3, gx = 2.3, gz = 2.5;
    const w0 = ((p.cols - 1) * gx) / 2, d0 = ((p.rows - 1) * gz) / 2;
    for (let r = 0; r < p.rows; r++) {
      for (let c = 0; c < p.cols; c++) {
        const x = c * gx - w0, z = r * gz - d0 - 1.2;
        const broken = dm > 0.5 && rng() < (dm - 0.5) * 0.5;
        const tilt = p.tilt + (rng() - 0.5) * dm * 0.25;
        const g = new THREE.Group();
        g.position.set(x, 1.15, z);
        g.rotation.set(-tilt + (broken ? 0.35 : 0), (rng() - 0.5) * dm * 0.1, broken ? (rng() - 0.5) * 0.5 : 0);
        g.add(box(PW, 0.06, PD, sol, { dmg: dm * 0.015, seed: p.seed + r * 9 + c }));
        g.add(box(PW + 0.08, 0.1, 0.06, frame, { z: PD / 2 }));
        g.add(box(PW + 0.08, 0.1, 0.06, frame, { z: -PD / 2 }));
        for (const s of [-1, 1]) g.add(box(0.06, 0.1, PD, frame, { x: s * PW / 2 }));
        g.add(box(0.05, 0.05, PD, frame, { x: 0, y: -0.06 }));
        obj.add(g, { mass: 30, surf: 'metal', collider: { type: 'box', size: [PW, 0.1, PD] }, fracture: broken ? [3, 1, 2] : null });
        obj.add(cyl(0.05, 0.07, 1.15, dark, { x, y: 0.575, z, radial: 8 }), { mass: 8, surf: 'metal' });
        obj.add(box(0.7, 0.07, 0.5, dark, { x, y: 0.05, z, rx: 0 }), { mass: 20, surf: 'metal', collider: 'none' });
      }
    }
    // Wechselrichter + Kabel
    const ix = -w0 - 2.4;
    obj.add(box(1.2, 1.7, 0.8, M.metal('white'), { x: ix, y: 0.85, z: -1.2, dmg: dm * 0.04, seed: p.seed + 80 }), { mass: 150, fracture: [2, 2, 1] });
    obj.add(box(0.5, 0.3, 0.05, M.glow(0x62ffb0, 1.4), { x: ix, y: 1.3, z: -0.78 }), { mass: 1, collider: 'none' });
    for (let r = 0; r < p.rows; r++) {
      const z = r * gz - d0 - 1.2;
      obj.add(tube([[ix + 0.4, 0.1, -1.2], [ix + 1, 0.05, z], [-w0, 0.06, z]], 0.035, dark, { segs: 12 }), { mass: 2, collider: 'none' });
    }
    // Sandwehe
    obj.add(sph(1, M.clay('adobe', { sandBias: 3 }), { x: w0 + 1.8, y: 0.05, z: -0.5, sx: 2.4, sy: 0.22, sz: 1.2, ws: 14, hs: 8, cast: false }), { mass: 5, collider: 'none', order: 0 });
  },
};
