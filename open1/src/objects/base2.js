// Basis & Wirtschaft, Teil 2: Energiespeicher, Fabrik, Sandbohrer, Schmelzofen, Kristalldepot.
import * as THREE from 'three';
import { tube } from '../core/helpers.js';
import {
  M, box, cyl, sph, torus, mk, mulberry32, crystal, crystalCluster, crystalMat, hazardMat,
  railing, ladder, strut, lampPost, emit, flicker, alive,
} from './kit.js';
import { damageParam, seedParam, PAL_OPTIONS } from './_common.js';

const CAT = 'Basis & Wirtschaft';

/* ───────────────────────── Energiespeicher ───────────────────────── */
export const battery = {
  id: 'battery',
  label: 'Energiespeicher',
  category: CAT,
  tag: 'Level 10',
  hint: 'Speichert Stromüberschuss und hilft bei Engpässen.',
  params: [
    { key: 'cells', label: 'Speicherzellen', type: 'range', min: 2, max: 6, step: 1, value: 4 },
    { key: 'charge', label: 'Ladestand', type: 'range', min: 0, max: 1, step: 0.01, value: 0.7, fmt: (v) => Math.round(v * 100) + ' %' },
    { key: 'fans', label: 'Kühllüfter', type: 'bool', value: true },
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'olive' },
    damageParam(0.35),
    seedParam(21),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed), dm = p.damage, n = p.cells;
    const paint = M.metal(p.pal), gray = M.metal('gray'), dark = M.metal('black'), rust = M.metal('rust'), white = M.metal('white');
    const conc = M.clay('white');
    const sp = 2.5, c0 = -((n - 1) * sp) / 2 - 1.3, cN = c0 + (n - 1) * sp;
    const left = c0 - 1.6, right = cN + 4.4;
    obj.add(box(right - left, 0.4, 7.0, conc, { x: (left + right) / 2, y: 0.2, dmg: dm * 0.04, seed: p.seed }), { mass: 4500, surf: 'clay', fracture: [4, 1, 2] });

    obj.anim.fans = [];
    for (let i = 0; i < n; i++) {
      const cx = c0 + i * sp;
      const g = new THREE.Group();
      g.position.set(cx, 0.4, 0);
      g.add(cyl(1.0, 1.0, 3.4, paint, { y: 1.7, radial: 22, hseg: 6, dmg: dm * 0.02, seed: p.seed + i }));
      g.add(cyl(1.1, 1.1, 0.3, dark, { y: 0.15, radial: 22 }));
      for (const y of [0.55, 2.9]) g.add(torus(1.01, 0.05, dark, { y, rx: Math.PI / 2, ts: 22, rs: 5 }));
      g.add(cyl(0.82, 1.0, 0.3, gray, { y: 3.55, radial: 22 }));
      for (const s of [-1, 1]) g.add(cyl(0.12, 0.12, 0.45, rust, { x: s * 0.62, y: 3.9, radial: 8 }));
      // Ladeanzeige: dunkler Schlitz + leuchtender Füllbalken
      const ch = Math.min(1, Math.max(0, p.charge * (0.88 + rng() * 0.24)));
      const col = ch > 0.5 ? 0x62ffb0 : ch > 0.2 ? 0xffc040 : 0xff4030;
      g.add(box(0.38, 2.4, 0.1, dark, { y: 1.8, z: 0.99 }));
      const h = Math.max(0.03, 2.2 * ch);
      g.add(box(0.24, h, 0.06, M.glow(col, 1.7), { y: 0.7 + h / 2, z: 1.05 }));
      if (p.fans) {
        g.add(torus(0.42, 0.05, dark, { y: 3.74, rx: Math.PI / 2, ts: 16, rs: 5 }));
        const fan = new THREE.Group();
        fan.position.y = 3.72;
        for (let b = 0; b < 3; b++) fan.add(box(0.8, 0.02, 0.16, gray, { x: Math.cos((b * Math.PI * 2) / 3) * 0.2, z: Math.sin((b * Math.PI * 2) / 3) * 0.2, ry: -(b * Math.PI * 2) / 3 }));
        g.add(fan);
        obj.anim.fans.push({ g: fan, dir: i % 2 ? -1 : 1 });
      }
      obj.add(g, { mass: 900, surf: 'metal', collider: { type: 'cyl', r: 1.0, h: 3.4, offset: [0, 1.7, 0] } });
    }

    // Sammelschiene auf Pfosten + Kabel zu den Polen
    const busY = 4.7, mid = (c0 + cN) / 2, len = cN - c0 + 3.4;
    for (const x of [c0 - 1.5, cN + 1.5]) obj.add(box(0.24, busY - 0.4, 0.24, gray, { x, y: 0.4 + (busY - 0.4) / 2, z: -1.2 }), { mass: 80, surf: 'metal' });
    obj.add(box(len, 0.16, 0.2, rust, { x: mid, y: busY, z: -1.2 }), { mass: 60, collider: 'none' });
    for (let i = 0; i < n; i++) {
      const cx = c0 + i * sp;
      obj.add(tube([[cx + 0.62, 4.75, 0], [cx + 0.55, busY + 0.3, -0.6], [cx + 0.3, busY, -1.2]], 0.045, dark, { segs: 12 }), { mass: 3, collider: 'none' });
      obj.add(tube([[cx - 0.62, 4.75, 0], [cx - 0.4, busY + 0.5, -0.7], [cx - 0.1, busY, -1.2]], 0.045, dark, { segs: 12 }), { mass: 3, collider: 'none' });
    }

    // Schaltkabine
    const hx = cN + 3.1;
    obj.add(box(2.6, 2.7, 2.4, paint, { x: hx, y: 1.75, z: 1.0, dmg: dm * 0.05, seed: p.seed + 30 }), { mass: 500, fracture: [2, 2, 2] });
    obj.add(box(0.95, 1.9, 0.1, dark, { x: hx - 0.4, y: 1.35, z: 2.25 }), { mass: 15, collider: 'none' });
    obj.add(box(1.0, 0.5, 0.06, hazardMat(), { x: hx + 0.65, y: 2.2, z: 2.22 }), { mass: 2, collider: 'none' });
    obj.add(box(2.8, 0.14, 2.6, gray, { x: hx, y: 3.17, z: 1.0 }), { mass: 30, collider: 'none' });
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x112211, emissive: 0x62ffb0, emissiveIntensity: 2 });
    obj.anim.lamp = lampMat;
    obj.add(sph(0.13, lampMat, { x: hx + 0.9, y: 3.35, z: 1.9, ws: 10, hs: 8 }), { mass: 1, collider: 'none' });
    obj.add(cyl(0.03, 0.04, 2.2, dark, { x: hx - 0.9, y: 4.3, z: 0.4, radial: 6 }), { mass: 3, collider: 'none' });

    // Transformator hinter der Kabine
    {
      const g = new THREE.Group();
      g.position.set(hx, 0.4, -2.2);
      g.add(box(1.7, 1.5, 1.3, white, { y: 0.75, dmg: dm * 0.03, seed: p.seed + 40 }));
      for (const x of [-0.5, 0, 0.5]) {
        g.add(cyl(0.1, 0.13, 0.7, M.metal('sand'), { x, y: 1.85, radial: 8 }));
        g.add(cyl(0.16, 0.16, 0.08, dark, { x, y: 1.5, radial: 8 }));
      }
      for (let k = 0; k < 6; k++) g.add(box(0.05, 1.1, 0.3, gray, { x: 0.9, y: 0.75, z: -0.5 + k * 0.2 }));
      obj.add(g, { mass: 450, surf: 'metal', collider: { type: 'box', size: [1.8, 2.2, 1.3], offset: [0, 1.1, 0] } });
      obj.add(tube([[right - 7.6 + (n - 1) * sp - 0.2, busY, -1.2], [hx - 0.5, 4.2, -1.6], [hx - 0.5, 2.5, -2.2]], 0.07, dark, { segs: 16 }), { mass: 4, collider: 'none' });
    }
    for (const x of [left + 0.6, right - 0.6]) obj.add(lampPost(3.6, gray, 0xfff0c8, 2.2, [x, 0.4, 3.0]), { mass: 20 });

    const L = new THREE.PointLight(0x62ffb0, 12, 12, 2);
    L.position.set(mid, 2.4, 3.2);
    obj.light(L);
  },
  onFrame(obj, dt) {
    if (!alive(obj)) return;
    for (const f of obj.anim.fans ?? []) f.g.rotation.y += dt * 9 * f.dir;
    if (obj.anim.lamp) obj.anim.lamp.emissiveIntensity = 0.5 + 2.2 * (0.5 + 0.5 * Math.sin(obj.time * 2.4));
  },
};

/* ───────────────────────── Fabrik ───────────────────────── */
export const factory = {
  id: 'factory',
  label: 'Fabrik',
  category: CAT,
  tag: 'Munition',
  hint: 'Baut Crawler und produziert Munition.',
  params: [
    { key: 'chimneys', label: 'Schornsteine', type: 'range', min: 1, max: 3, step: 1, value: 2 },
    { key: 'teeth', label: 'Sheddächer', type: 'range', min: 2, max: 4, step: 1, value: 3 },
    { key: 'crawler', label: 'Crawler im Bau', type: 'bool', value: true },
    { key: 'smoke', label: 'Rauch', type: 'bool', value: true },
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'gray' },
    damageParam(0.4),
    seedParam(23),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed), dm = p.damage;
    const paint = M.metal(p.pal), gray = M.metal('gray'), dark = M.metal('black'), rust = M.metal('rust'), olive = M.metal('olive');
    const conc = M.clay('white'), wood = M.wood(0xb89c76), hz = hazardMat();
    obj.add(box(23, 0.4, 15.5, conc, { x: 0.5, y: 0.2, dmg: dm * 0.04, seed: p.seed }), { mass: 9000, surf: 'clay', fracture: [5, 1, 3] });

    // Halle
    const hallW = p.teeth * 4, hx = -9.5 + hallW / 2 - 1.5 + 0.0, hz0 = -2.0;
    const hallL = 9;
    const hall = box(hallW, 5.5, hallL, paint, { x: hx, y: 3.15, z: hz0, dmg: dm * 0.06, seed: p.seed + 1 });
    obj.add(hall, { mass: 4500, fracture: [3, 2, 3] });
    obj.add(box(hallW + 0.2, 0.3, hallL + 0.2, dark, { x: hx, y: 1.5, z: hz0 }), { mass: 60, collider: 'none' });
    const front = hz0 + hallL / 2;
    // Tor
    obj.add(box(4.2, 4.4, 0.1, dark, { x: hx, y: 2.6, z: front + 0.04 }), { mass: 20, collider: 'none' });
    for (const s of [-1, 1]) obj.add(box(0.5, 4.8, 0.5, hz, { x: hx + s * 2.35, y: 2.8, z: front + 0.1 }), { mass: 60, collider: 'none' });
    obj.add(box(5.2, 0.6, 0.5, hz, { x: hx, y: 5.3, z: front + 0.1 }), { mass: 40, collider: 'none' });
    obj.add(box(4.1, 2.0, 0.12, gray, { x: hx, y: 4.2, z: front + 0.2, dmg: dm * 0.02, seed: p.seed + 2 }), { mass: 60, collider: 'none' });
    // Fenster
    const win = M.glow(0xffa04a, 1.3);
    for (const s of [-1, 1]) for (let k = 0; k < 2; k++) {
      const x = hx + s * (3.4 + k * 1.5);
      if (Math.abs(x - hx) < hallW / 2 - 0.6) obj.add(box(1.0, 0.5, 0.06, win, { x, y: 4.3, z: front + 0.04 }), { mass: 1, collider: 'none' });
    }
    // Sheds
    for (let i = 0; i < p.teeth; i++) {
      const xt = hx - hallW / 2 + 2 + i * 4;
      obj.add(box(4.15, 0.14, hallL + 0.4, paint, { x: xt, y: 6.45, z: hz0, rz: 0.28, dmg: dm * 0.03, seed: p.seed + 10 + i }), { mass: 120, collider: 'none' });
      obj.add(box(0.08, 1.15, hallL - 0.2, M.glass(0x4b5f64, 0.6), { x: xt + 2.0, y: 6.45, z: hz0, cast: false }), { mass: 8, collider: 'none' });
    }

    // Schornsteine hinter der Halle
    const stacks = [];
    obj.anim.stacks = stacks;
    for (let i = 0; i < p.chimneys; i++) {
      const x = hx + hallW / 2 + 2.0 + i * 1.9, z = -6.2, H = 9.5 + i * 1.4;
      const g = new THREE.Group();
      g.position.set(x, 0.4, z);
      for (let k = 0; k < 4; k++) g.add(cyl(0.62 - k * 0.04, 0.68 - k * 0.04, H / 4, k % 2 ? rust : paint, { y: (H / 4) * (k + 0.5), radial: 14, dmg: dm * 0.015, seed: p.seed + 20 + i * 4 + k }));
      g.add(torus(0.52, 0.07, dark, { y: H, rx: Math.PI / 2, ts: 14, rs: 5 }));
      g.add(ladder(H - 1, dark, { z: 0.78 }));
      obj.add(g, { mass: 800, surf: 'metal', collider: { type: 'cyl', r: 0.68, h: H, offset: [0, H / 2, 0] } });
      stacks.push([x, 0.4 + H + 0.3, z]);
      obj.add(tube([[hx + hallW / 2, 3.0 + i * 0.4, -4.6 - i * 0.3], [x - 1.2, 2.2, z + 0.9], [x - 0.5, 1.6, z + 0.2]], 0.3, gray, { segs: 16 }), { mass: 30, collider: 'none' });
    }

    // Portalkran auf dem Hof (Laufkatze fährt)
    {
      const cxm = hx + hallW / 2 + 5.4, cz = 4.2;
      for (const s of [-1, 1]) {
        obj.add(box(0.45, 6.4, 0.45, hz, { x: cxm + s * 3.4, y: 3.6, z: cz }), { mass: 120, surf: 'metal' });
        obj.add(box(0.7, 0.2, 1.8, dark, { x: cxm + s * 3.4, y: 0.5, z: cz }), { mass: 60, collider: 'none' });
        obj.add(strut([cxm + s * 3.4, 2.5, cz], [cxm + s * 2.2, 6.7, cz], 0.07, gray), { mass: 6, collider: 'none' });
      }
      obj.add(box(7.4, 0.5, 0.6, paint, { x: cxm, y: 6.9, z: cz, dmg: dm * 0.02, seed: p.seed + 40 }), { mass: 200, collider: 'none' });
      const tr = new THREE.Group();
      tr.position.set(cxm, 6.3, cz);
      tr.add(box(0.9, 0.4, 0.9, dark, { y: 0.45 }));
      tr.add(cyl(0.015, 0.015, 3.0, gray, { y: -1.2, radial: 4 }));
      tr.add(box(0.3, 0.3, 0.2, rust, { y: -2.8 }));
      tr.add(box(1.3, 0.9, 1.1, wood, { y: -3.55, dmg: dm * 0.015, seed: p.seed + 41 }));
      obj.add(tr, { mass: 80, collider: 'none' });
      obj.anim.trolley = { g: tr, x0: cxm };
    }

    // Munition vor der Halle
    for (let i = 0; i < 5; i++) {
      const c = box(1.2, 0.8, 1.0, i % 2 ? olive : wood, { x: hx - hallW / 2 + 1.0 + (i % 3) * 1.3, y: 0.8 + Math.floor(i / 3) * 0.8, z: front + 2.6, ry: (rng() - 0.5) * 0.3, dmg: dm * 0.015, seed: p.seed + 50 + i });
      obj.add(c, { mass: 60, surf: 'wood', collider: { type: 'box', size: [1.2, 0.8, 1.0] } });
      obj.add(box(1.0, 0.18, 0.04, hz, { x: c.position.x, y: c.position.y + 0.15, z: c.position.z + 0.53 * Math.cos(c.rotation.y), ry: c.rotation.y }), { mass: 1, collider: 'none' });
    }
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      g.position.set(hx - hallW / 2 + 0.6 + i * 0.36, 0.55 + r * 0.32, front + 4.6);
      g.rotation.z = Math.PI / 2;
      g.add(cyl(0.15, 0.15, 1.0, M.metal('sand'), { radial: 10 }));
      g.add(cyl(0.0, 0.15, 0.3, rust, { y: 0.65, radial: 10 }));
      obj.add(g, { mass: 12, surf: 'metal', collider: { type: 'cyl', r: 0.15, h: 1.3, axis: 'x' } });
    }

    // Crawler im Gerüst
    if (p.crawler) {
      const g = new THREE.Group();
      g.position.set(hx + hallW / 2 + 5.4, 0.4, -1.0);
      g.rotation.y = 0.2;
      g.add(box(2.4, 0.6, 4.4, rust, { y: 1.0, dmg: dm * 0.03, seed: p.seed + 60 }));
      g.add(box(1.6, 0.55, 1.8, paint, { y: 1.55, z: -0.6 }));
      for (const s of [-1, 1]) {
        g.add(box(0.8, 0.95, 4.8, dark, { x: s * 1.55, y: 0.55, dmg: dm * 0.02, seed: p.seed + 61 + s }));
        for (let k = 0; k < 4; k++) g.add(cyl(0.34, 0.34, 0.86, gray, { x: s * 1.55, y: 0.6, z: -1.7 + k * 1.15, rz: Math.PI / 2, radial: 10 }));
      }
      for (const [x, z] of [[-2.4, -2.5], [2.4, -2.5], [-2.4, 2.5], [2.4, 2.5]]) g.add(cyl(0.07, 0.07, 3.4, gray, { x, y: 1.7, z, radial: 6 }));
      g.add(box(5.0, 0.1, 0.1, gray, { y: 3.4, z: -2.5 }));
      g.add(box(5.0, 0.1, 0.1, gray, { y: 3.4, z: 2.5 }));
      obj.add(g, { mass: 1400, surf: 'metal', collider: { type: 'box', size: [3.6, 1.6, 4.8], offset: [0, 0.9, 0] } });
    }

    const L = new THREE.PointLight(0xff9a50, 30, 14, 2);
    L.position.set(hx, 3.2, front + 2.4);
    obj.light(L);
  },
  onFrame(obj, dt) {
    if (!alive(obj)) return;
    const t = obj.anim.trolley;
    if (t) t.g.position.x = t.x0 + Math.sin(obj.time * 0.35) * 2.6;
    if (obj.params.smoke && obj.anim.stacks) obj.anim.stacks.forEach((s, i) => emit(obj, 's' + i, s, dt, 2.6, 'smoke', 1.4));
  },
};

/* ───────────────────────── Sandbohrer ───────────────────────── */
export const sandDriller = {
  id: 'sandDriller',
  label: 'Sandbohrer',
  category: CAT,
  tag: 'Industrie',
  hint: 'Fördert Sand auf freigelegtem Treibsand.',
  params: [
    { key: 'height', label: 'Turmhöhe', type: 'range', min: 7, max: 13, step: 0.5, value: 10, unit: 'm' },
    { key: 'speed', label: 'Bohrtempo', type: 'range', min: 0, max: 8, step: 0.1, value: 3, unit: ' rad/s' },
    { key: 'dust', label: 'Staub', type: 'bool', value: true },
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'rust' },
    damageParam(0.4),
    seedParam(27),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed), dm = p.damage, H = p.height;
    const paint = M.metal(p.pal), gray = M.metal('gray'), dark = M.metal('black'), rust = M.metal('rust'), blue = M.metal('blue');
    const adobe = M.clay('adobe'), qs = M.clay('dark', { sandBias: 6 });

    // Treibsandgrube
    obj.add(mk(new THREE.CylinderGeometry(3.9, 3.9, 0.06, 40), qs, { y: 0.03, cast: false }), { mass: 5, collider: 'none', order: 0 });
    for (const R of [1.3, 2.3, 3.2]) obj.add(torus(R, 0.035, M.clay('dark'), { y: 0.07, rx: Math.PI / 2, ts: 40, rs: 4, cast: false }), { mass: 1, collider: 'none', order: 0 });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + rng() * 0.3, r = 0.5 + rng() * 0.6;
      obj.add(sph(r, adobe, { x: Math.cos(a) * 4.4, y: r * 0.25, z: Math.sin(a) * 4.4, sy: 0.6, ws: 10, hs: 7, dmg: 0.12, seed: p.seed + i }), { mass: 150, surf: 'clay', collider: { type: 'sph', r: r * 0.7 } });
    }

    // Bohrturm (Gitter)
    {
      const g = new THREE.Group();
      const hw0 = 1.8, hw1 = 0.75, levels = Math.max(3, Math.round(H / 2.6));
      const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
      const pt = (c, t) => { const w = hw0 + (hw1 - hw0) * t; return [c[0] * w, t * H, c[1] * w]; };
      for (const c of corners) g.add(strut(pt(c, 0), pt(c, 1), 0.1, paint, 7));
      for (let l = 0; l <= levels; l++) {
        const t = l / levels;
        for (let k = 0; k < 4; k++) g.add(strut(pt(corners[k], t), pt(corners[(k + 1) % 4], t), 0.045, gray));
        if (l < levels) {
          const t2 = (l + 1) / levels;
          for (let k = 0; k < 4; k++) {
            const flip = (l + k) % 2;
            g.add(strut(pt(corners[k], flip ? t : t2), pt(corners[(k + 1) % 4], flip ? t2 : t), 0.035, dark));
          }
        }
      }
      g.add(box(2.2, 1.2, 2.2, paint, { y: H + 0.6, dmg: dm * 0.03, seed: p.seed + 20 }));
      g.add(cyl(0.7, 0.7, 0.6, dark, { y: H + 1.5, radial: 14 }));
      g.add(box(2.4, 0.14, 2.4, gray, { y: H + 1.25 }));
      g.add(ladder(H, dark, { x: 1.0, y: 0, z: 1.7, ry: 0 }));
      obj.add(g, { mass: 1400, surf: 'metal', collider: { type: 'box', size: [3.4, H, 3.4], offset: [0, H / 2, 0] } });
      // Plattform
      obj.add(box(3.6, 0.12, 3.6, gray, { y: H * 0.5, dmg: dm * 0.015, seed: p.seed + 21 }), { mass: 80, collider: 'none' });
      obj.add(railing(3.6, dark, { y: H * 0.5 + 0.06, z: 1.8 }), { mass: 15, collider: 'none' });
    }

    // Bohrer (rotierend, hebt und senkt sich)
    {
      const g = new THREE.Group();
      g.add(cyl(0.2, 0.2, H - 0.5, gray, { y: (H - 0.5) / 2 + 0.9, radial: 10 }));
      for (let k = 0; k < Math.floor((H - 1.5) / 0.38); k++) {
        const a = k * 0.95;
        for (const o of [0, Math.PI]) g.add(box(0.6, 0.07, 0.3, rust, { x: Math.cos(a + o) * 0.45, z: Math.sin(a + o) * 0.45, y: 1.0 + k * 0.38, ry: -(a + o) }));
      }
      g.add(cyl(0.55, 0.0, 1.0, dark, { y: 0.45, radial: 10 }));
      obj.add(g, { mass: 250, surf: 'metal', collider: 'none' });
      obj.anim.drill = g;
    }

    // Förderrohr zum Silo
    obj.add(tube([[0.7, H + 0.9, 0], [3.0, H - 1.5, 0.2], [5.6, H * 0.45, 0.3], [6.4, 4.6, 0.2]], 0.28, gray, { segs: 28 }), { mass: 60, collider: 'none' });
    {
      const g = new THREE.Group();
      g.position.set(6.8, 0, 0.2);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(strut([x * 1.2, 0, z * 1.2], [x * 0.9, 2.6, z * 0.9], 0.08, gray));
      g.add(cyl(1.5, 0.4, 1.2, paint, { y: 2.2, radial: 16, dmg: dm * 0.02, seed: p.seed + 30 }));
      g.add(cyl(1.5, 1.5, 2.4, paint, { y: 4.0, radial: 16, hseg: 4, dmg: dm * 0.02, seed: p.seed + 31 }));
      g.add(cyl(1.5, 0.1, 0.5, rust, { y: 5.45, radial: 16 }));
      for (const y of [3.2, 4.8]) g.add(torus(1.51, 0.05, dark, { y, rx: Math.PI / 2, ts: 16, rs: 4 }));
      obj.add(g, { mass: 700, surf: 'metal', collider: { type: 'cyl', r: 1.5, h: 5.6, offset: [0, 2.8, 0] } });
      obj.add(sph(1.0, adobe, { x: 6.8, y: 0.1, z: 0.2, sx: 1.9, sy: 0.55, sz: 1.5, ws: 14, hs: 8, cast: true }), { mass: 100, surf: 'clay', collider: 'none', order: 0 });
      obj.anim.dustAt = [[0, 0.3, 0.5], [6.8, 0.8, 0.4]];
    }

    // Pumpe, Tank, Steuerkabine
    obj.add(box(1.5, 1.1, 1.0, dark, { x: -5.4, y: 0.55, z: 2.2, dmg: dm * 0.03, seed: p.seed + 40 }), { mass: 120, surf: 'metal' });
    obj.add(cyl(0.55, 0.55, 1.6, blue, { x: -4.2, y: 0.8, z: 2.2, radial: 16, dmg: dm * 0.03, seed: p.seed + 41 }), { mass: 100, surf: 'metal' });
    obj.add(tube([[-4.6, 1.6, 2.2], [-3.0, 3.0, 1.3], [-1.9, 1.5, 0.6]], 0.1, rust, { segs: 16 }), { mass: 6, collider: 'none' });
    obj.add(box(2.3, 2.3, 2.0, paint, { x: -6.1, y: 1.15, z: -2.2, dmg: dm * 0.05, seed: p.seed + 42 }), { mass: 400, fracture: [2, 2, 2] });
    obj.add(box(1.2, 0.7, 0.06, M.glow(0xffb060, 1.4), { x: -6.1, y: 1.6, z: -1.18 }), { mass: 1, collider: 'none' });
    obj.add(box(0.8, 1.6, 0.08, dark, { x: -5.4, y: 0.8, z: -1.18 }), { mass: 10, collider: 'none' });
    obj.add(lampPost(4.2, gray, 0xfff0c8, 2.4, [-3.8, 0, -3.2]), { mass: 20, collider: 'none' });

    const L = new THREE.PointLight(0xffa860, 18, 14, 2);
    L.position.set(-4.5, 3.2, -0.6);
    obj.light(L);
  },
  onFrame(obj, dt) {
    if (!alive(obj)) return;
    const d = obj.anim.drill;
    if (d) {
      d.rotation.y += dt * obj.params.speed;
      d.position.y = Math.sin(obj.time * 0.9) * 0.35 - 0.15;
    }
    if (obj.params.dust && obj.params.speed > 0.2 && obj.anim.dustAt) obj.anim.dustAt.forEach((pos, i) => emit(obj, 'd' + i, pos, dt, 5 * Math.min(1, obj.params.speed / 3), 'dust', 1.2));
  },
};

/* ───────────────────────── Schmelzofen ───────────────────────── */
export const smelter = {
  id: 'smelter',
  label: 'Schmelzofen',
  category: CAT,
  tag: 'Industrie',
  hint: 'Verarbeitet Sand zu Energiekristallen.',
  params: [
    { key: 'heat', label: 'Hitze', type: 'range', min: 0.3, max: 1, step: 0.01, value: 0.8, fmt: (v) => Math.round(v * 100) + ' %' },
    { key: 'chimneyH', label: 'Schornsteinhöhe', type: 'range', min: 5, max: 12, step: 0.5, value: 8.5, unit: 'm' },
    { key: 'crystals', label: 'Kristalle im Behälter', type: 'range', min: 0, max: 12, step: 1, value: 6 },
    { key: 'smoke', label: 'Rauch & Flammen', type: 'bool', value: true },
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'black' },
    damageParam(0.4),
    seedParam(31),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed), dm = p.damage, hv = p.heat;
    const paint = M.metal(p.pal), gray = M.metal('gray'), dark = M.metal('black'), rust = M.metal('rust');
    const brick = M.clay('dark'), conc = M.clay('white'), adobe = M.clay('adobe');
    obj.add(box(10.5, 0.4, 8.5, conc, { x: 0, y: 0.2, dmg: dm * 0.04, seed: p.seed }), { mass: 5000, surf: 'clay', fracture: [4, 1, 3] });

    // Ofenkörper
    obj.add(cyl(1.9, 2.3, 4.4, brick, { y: 2.6, radial: 22, hseg: 5, dmg: dm * 0.02, seed: p.seed + 1 }), { mass: 3000, surf: 'clay' });
    for (const y of [1.0, 2.5, 4.0]) obj.add(torus(2.12 - (y - 1) * 0.045, 0.07, dark, { y: 0.4 + y, rx: Math.PI / 2, ts: 22, rs: 5 }), { mass: 30, collider: 'none' });
    // Feuermund
    obj.add(box(2.1, 1.4, 0.7, dark, { y: 1.15, z: 2.1 }), { mass: 100, collider: 'none' });
    obj.add(box(1.5, 0.9, 0.1, M.glow(0xff7a1c, 1.2 + hv * 2.4), { y: 1.1, z: 2.46 }), { mass: 2, collider: 'none' });
    obj.add(box(2.6, 0.18, 1.1, rust, { y: 0.5, z: 2.5 }), { mass: 60, collider: 'none' });
    for (const s of [-1, 1]) obj.add(box(0.14, 1.5, 0.14, dark, { x: s * 1.2, y: 1.15, z: 2.5 }), { mass: 10, collider: 'none' });
    obj.add(box(2.6, 0.2, 0.3, dark, { y: 1.95, z: 2.45 }), { mass: 10, collider: 'none' });
    obj.anim.mouth = [0, 1.45, 2.7];
    // Trichter oben
    obj.add(cyl(1.0, 0.55, 1.0, gray, { y: 5.4, radial: 14, dmg: dm * 0.02, seed: p.seed + 2 }), { mass: 60, collider: 'none' });
    obj.add(cyl(0.5, 0.5, 0.3, dark, { y: 5.95, radial: 12 }), { mass: 10, collider: 'none' });

    // Silo mit Sand
    {
      const g = new THREE.Group();
      g.position.set(4.0, 0.4, -1.6);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(strut([x * 1.1, 0, z * 1.1], [x * 0.9, 2.2, z * 0.9], 0.08, gray));
      g.add(cyl(1.2, 0.3, 1.1, paint, { y: 2.55, radial: 14 }));
      g.add(cyl(1.2, 1.2, 3.0, paint, { y: 4.6, radial: 14, hseg: 4, dmg: dm * 0.02, seed: p.seed + 3 }));
      g.add(cyl(0.1, 1.25, 0.6, rust, { y: 6.4, radial: 14 }));
      g.add(ladder(6.0, dark, { z: 1.3 }));
      obj.add(g, { mass: 700, surf: 'metal', collider: { type: 'cyl', r: 1.2, h: 6.3, offset: [0, 3.1, 0] } });
      obj.add(tube([[4.0, 2.4, -1.6], [2.6, 3.8, -1.0], [1.2, 5.2, -0.2], [0.4, 5.6, 0]], 0.2, gray, { segs: 20 }), { mass: 20, collider: 'none' });
    }

    // Schornstein + Abgasrohr
    {
      const H = p.chimneyH, x = -1.6, z = -3.0;
      const g = new THREE.Group();
      g.position.set(x, 0.4, z);
      for (let k = 0; k < 4; k++) g.add(cyl(0.6 - k * 0.04, 0.68 - k * 0.04, H / 4, k % 2 ? rust : paint, { y: (H / 4) * (k + 0.5), radial: 14, dmg: dm * 0.015, seed: p.seed + 10 + k }));
      g.add(torus(0.5, 0.07, dark, { y: H, rx: Math.PI / 2, ts: 14, rs: 5 }));
      obj.add(g, { mass: 700, surf: 'metal', collider: { type: 'cyl', r: 0.68, h: H, offset: [0, H / 2, 0] } });
      obj.anim.stack = [x, 0.4 + H + 0.3, z];
      obj.add(tube([[0.4, 5.0, -1.0], [-0.6, 5.3, -2.2], [-1.4, 4.2, -2.8], [-1.6, 3.0, -3.0]], 0.34, gray, { segs: 20 }), { mass: 30, collider: 'none' });
    }

    // Auslaufrinne + Kristallbehälter
    obj.add(box(2.6, 0.18, 0.9, rust, { x: -3.2, y: 1.65, z: 1.2, rz: 0.32 }), { mass: 30, collider: 'none' });
    for (const s of [-1, 1]) obj.add(box(2.6, 0.2, 0.08, rust, { x: -3.2, y: 1.8, z: 1.2 + s * 0.45, rz: 0.32 }), { mass: 8, collider: 'none' });
    obj.add(box(0.1, 1.6, 0.1, gray, { x: -3.8, y: 0.9, z: 1.2 }), { mass: 10, collider: 'none' });
    {
      const g = new THREE.Group();
      g.position.set(-4.6, 0.4, 1.2);
      g.add(box(2.2, 0.7, 1.7, dark, { y: 0.35, dmg: dm * 0.03, seed: p.seed + 20 }));
      g.add(box(2.0, 0.04, 1.5, M.glow(0x3ad8ff, 0.5), { y: 0.72 }));
      if (p.crystals) {
        const cc = crystalCluster(p.crystals, p.seed + 3, 0.6, 1.1);
        cc.position.y = 0.72;
        cc.scale.set(1, 1, 0.8);
        g.add(cc);
      }
      obj.add(g, { mass: 300, surf: 'metal', collider: { type: 'box', size: [2.2, 0.7, 1.7], offset: [0, 0.35, 0] } });
    }

    // Schlacke, Armaturen
    for (let i = 0; i < 6; i++) obj.add(sph(0.25 + rng() * 0.3, rust, { x: 3.2 + rng() * 1.4, y: 0.55, z: 2.4 + rng() * 1.2, sy: 0.6, ws: 8, hs: 6, dmg: 0.06, seed: i }), { mass: 40, surf: 'clay', collider: 'auto' });
    obj.add(tube([[1.8, 1.0, 1.2], [3.0, 0.9, 1.6], [3.2, 1.6, 0.4]], 0.1, rust, { segs: 14 }), { mass: 6, collider: 'none' });
    obj.add(cyl(0.3, 0.3, 0.1, gray, { x: 1.6, y: 2.6, z: 2.05, rx: Math.PI / 2, radial: 14 }), { mass: 2, collider: 'none' });
    obj.add(cyl(0.22, 0.22, 0.06, M.glow(0xffc060, 1.1), { x: 1.6, y: 2.6, z: 2.12, rx: Math.PI / 2, radial: 14 }), { mass: 1, collider: 'none' });

    const L = new THREE.PointLight(0xff7a2a, 20 + hv * 60, 16, 2);
    L.position.set(0, 1.6, 4.0);
    obj.light(L);
  },
  onFrame(obj, dt) {
    if (!alive(obj)) return;
    flicker(obj, 0.28, 9);
    if (obj.params.smoke) {
      if (obj.anim.stack) emit(obj, 'st', obj.anim.stack, dt, 3.4 * (0.5 + obj.params.heat), 'smoke', 1.5);
      if (obj.anim.mouth) emit(obj, 'fl', obj.anim.mouth, dt, 10 * obj.params.heat, 'flame', 0.55);
    }
  },
};

/* ───────────────────────── Kristalldepot ───────────────────────── */
const GEM = { cyan: 0x3ad8ff, violet: 0xa266ff, amber: 0xffb43a, green: 0x4dffa0 };
export const crystalDepot = {
  id: 'crystalDepot',
  label: 'Kristalldepot',
  category: CAT,
  tag: 'Industrie',
  hint: 'Lagert Kristalle und schickt sie zum Quartier.',
  params: [
    { key: 'gem', label: 'Kristallfarbe', type: 'select', options: [['cyan', 'Cyan'], ['violet', 'Violett'], ['amber', 'Bernstein'], ['green', 'Grün']], value: 'cyan' },
    { key: 'fill', label: 'Füllstand', type: 'range', min: 2, max: 20, step: 1, value: 13 },
    { key: 'glow', label: 'Leuchtkraft', type: 'range', min: 0.4, max: 3, step: 0.05, value: 1.7 },
    { key: 'pal', label: 'Mauerwerk', type: 'select', options: [['white', 'Gekalkt'], ['adobe', 'Lehmbraun'], ['dark', 'Dunkel'], ['red', 'Rötlich']], value: 'white' },
    damageParam(0.3),
    seedParam(33),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed), dm = p.damage;
    const col = GEM[p.gem];
    const wall = M.clay(p.pal), gray = M.metal('gray'), dark = M.metal('black'), rust = M.metal('rust'), conc = M.clay('white');
    obj.add(cyl(6.3, 6.5, 0.4, conc, { y: 0.2, radial: 28, dmg: dm * 0.04, seed: p.seed }), { mass: 5000, surf: 'clay' });
    // Mauerring + Leuchtband
    obj.add(cyl(4.4, 4.6, 1.9, wall, { y: 1.35, radial: 28, hseg: 3, dmg: dm * 0.03, seed: p.seed + 1 }), { mass: 3500, surf: 'clay' });
    obj.add(cyl(4.48, 4.48, 0.16, M.glow(col, 1.3), { y: 1.55, radial: 28 }), { mass: 5, collider: 'none' });
    obj.add(torus(4.45, 0.12, gray, { y: 2.3, rx: Math.PI / 2, ts: 28, rs: 5 }), { mass: 40, collider: 'none' });
    // Glaskuppel + Rippen
    obj.add(sph(4.4, M.glass(0x72c4d4, 0.26), { y: 2.3, thetaLength: Math.PI / 2, ws: 30, hs: 10, cast: false }), { mass: 60, collider: { type: 'box', size: [8, 3.2, 8], offset: [0, 1.6, 0] } });
    for (let r = 0; r < 8; r++) {
      const a = (r / 8) * Math.PI * 2, pts = [];
      for (let k = 0; k <= 8; k++) {
        const th = (k / 8) * (Math.PI / 2);
        pts.push([Math.cos(a) * Math.cos(th) * 4.42, 2.3 + Math.sin(th) * 4.42, Math.sin(a) * Math.cos(th) * 4.42]);
      }
      obj.add(tube(pts, 0.06, gray, { segs: 18, radial: 5 }), { mass: 8, collider: 'none' });
    }
    obj.add(torus(0.6, 0.1, dark, { y: 6.68, rx: Math.PI / 2, ts: 14, rs: 5 }), { mass: 10, collider: 'none' });
    // Kristalle im Inneren (Mitte groß, Rand klein)
    {
      const big = crystalCluster(Math.max(3, Math.round(p.fill * 0.6)), p.seed + 2, 1.6, 3.6, col, p.glow);
      big.position.y = 0.7;
      obj.add(big, { mass: 120, surf: 'clay', collider: { type: 'cyl', r: 1.6, h: 3.4, offset: [0, 2.2, 0] } });
      const ring = new THREE.Group();
      const m = Math.max(2, Math.round(p.fill * 0.5));
      for (let i = 0; i < m; i++) {
        const a = (i / m) * Math.PI * 2 + rng() * 0.3;
        const c = crystalCluster(2, p.seed + 10 + i, 0.35, 1.3, col, p.glow);
        c.position.set(Math.cos(a) * 3.2, 0.5, Math.sin(a) * 3.2);
        ring.add(c);
      }
      obj.add(ring, { mass: 60, collider: 'none' });
    }
    // Eingang mit Rampe
    obj.add(box(2.1, 1.7, 0.7, dark, { y: 1.25, z: 4.4 }), { mass: 60, collider: 'none' });
    obj.add(box(2.6, 0.25, 0.7, gray, { y: 2.15, z: 4.4 }), { mass: 30, collider: 'none' });
    obj.add(box(2.6, 0.2, 2.8, conc, { y: 0.5, z: 5.7, rx: 0.12, dmg: dm * 0.03, seed: p.seed + 4 }), { mass: 300, surf: 'clay', collider: { type: 'box', size: [2.6, 0.4, 2.8], offset: [0, 0, 0] } });
    // Förderband zum Quartier (kurzer Anschluss)
    {
      const g = new THREE.Group();
      g.position.set(-5.2, 0.4, 1.8);
      g.rotation.y = -Math.PI / 2 + 0.55;
      g.add(box(1.2, 0.2, 3.4, dark, { y: 0.8 }));
      for (const s of [-1, 1]) g.add(box(0.1, 0.22, 3.4, gray, { x: s * 0.62, y: 0.95 }));
      for (const s of [-1, 1]) for (const z of [-1.4, 1.4]) g.add(cyl(0.05, 0.05, 0.7, gray, { x: s * 0.55, z, y: 0.35, radial: 6 }));
      g.add(crystalCluster(2, p.seed + 7, 0.2, 0.55, col, p.glow));
      g.children[g.children.length - 1].position.set(0, 0.9, 0.4);
      obj.add(g, { mass: 200, surf: 'metal', collider: { type: 'box', size: [1.3, 1.0, 3.4], offset: [0, 0.5, 0] } });
    }
    // Leuchtmasten
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const m = lampPost(3.3, gray, col, 2.4);
      m.position.set(Math.sin(a) * 5.8, 0.4, Math.cos(a) * 5.8);
      obj.add(m, { mass: 20, collider: 'none' });
    }
    const L = new THREE.PointLight(col, 34, 16, 2);
    L.position.set(0, 2.6, 0);
    obj.light(L);
  },
  onFrame(obj) {
    if (!alive(obj)) return;
    const l = obj.lights[0];
    if (l) l.light.intensity = l.base * (0.88 + 0.12 * Math.sin(obj.time * 1.7));
  },
};
