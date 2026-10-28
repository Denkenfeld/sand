// Kondensator-Turm: Mast mit Kühlrippen, der Wasser aus der Wüstenluft zieht. Statisch.
import * as THREE from 'three';
import { M } from '../core/materials.js';
import { box, cyl, sph, torus, tube, mk } from '../core/helpers.js';
import { mulberry32 } from '../core/noise.js';
import { damageParam, seedParam, PAL_OPTIONS } from './_common.js';

export default {
  id: 'condenserTower',
  label: 'Kondensator-Turm',
  category: 'Kulisse & Beispiele',
  tag: 'statisch',
  hint: 'Wasserkondensator mit Kühlrippen, Pumpe und Abspannseilen',
  buildStyle: 'rise',
  params: [
    { key: 'height', label: 'Masthöhe', type: 'range', min: 3, max: 10, step: 0.1, value: 6.5, unit: 'm' },
    { key: 'fins', label: 'Rippenpaare', type: 'range', min: 2, max: 12, step: 1, value: 6 },
    { key: 'finW', label: 'Rippenbreite', type: 'range', min: 0.5, max: 1.5, step: 0.05, value: 0.9, unit: 'm' },
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'gray' },
    { key: 'lean', label: 'Neigung', type: 'range', min: 0, max: 0.25, step: 0.01, value: 0.03, fmt: (v) => (v * 57.3).toFixed(1) + '°' },
    { key: 'tank', label: 'Wassertank', type: 'bool', value: true },
    damageParam(0.4),
    seedParam(21),
  ],

  build(obj, p) {
    const rng = mulberry32(p.seed);
    const dm = p.damage, Hm = p.height;
    const paint = M.metal(p.pal);
    const gray = M.metal('gray');
    const dark = M.metal('black');
    const rust = M.metal('rust');
    const concrete = M.clay('white');

    // Fundament + Gehäuse
    obj.add(cyl(1.0, 1.1, 0.35, concrete, { y: 0.175, radial: 20, dmg: dm * 0.04, seed: p.seed }), { mass: 900, surf: 'clay' });
    obj.add(box(0.95, 1.1, 0.95, paint, { y: 0.9, dmg: dm * 0.05, seed: p.seed + 1 }), { mass: 120, fracture: [2, 2, 2] });
    obj.add(box(0.6, 0.55, 0.05, dark, { y: 0.9, z: 0.5 }), { mass: 4, collider: 'none' });
    obj.add(box(0.12, 0.12, 0.04, M.glow(0x62ffb0, 1.4), { x: 0.2, y: 1.05, z: 0.53 }), { mass: 0.5, collider: 'none' });

    // Mast, leicht geneigt – alles weitere sitzt in dieser Gruppe
    const mastTop = 1.45 + Hm;
    const mast = new THREE.Group();
    mast.position.set(0, 1.45, 0);
    mast.rotation.z = p.lean;
    mast.add(cyl(0.11, 0.15, Hm, paint, { y: Hm / 2, radial: 14, hseg: 8, dmg: dm * 0.02, seed: p.seed + 2 }));
    // Rippenpaare, nach oben kleiner
    for (let i = 0; i < p.fins; i++) {
      const t = i / Math.max(1, p.fins - 1);
      const y = Hm * (0.35 + 0.62 * t);
      const w = p.finW * (1 - 0.35 * t);
      const ry = i * 0.55 + rng() * 0.2;
      const fin = box(w, 0.04, 0.34, gray, { y, ry, dmg: dm * 0.04, seed: p.seed + 40 + i });
      for (let j = -3; j <= 3; j += 2) fin.add(box(0.03, 0.24, 0.32, gray, { x: (j * w) / 7, y: 0.13, tpm: 0.5 }));
      if (dm > 0.45 && rng() < 0.25) {
        fin.rotation.z += (rng() - 0.5) * 0.9; // verbogen
        fin.rotation.x += (rng() - 0.5) * 0.4;
      }
      mast.add(fin);
    }
    // Spitze
    mast.add(cyl(0.025, 0.04, 1.2, gray, { y: Hm + 0.5, radial: 8 }));
    mast.add(sph(0.05, M.glow(0xff3a22, 2), { y: Hm + 1.12, ws: 8, hs: 6 }));
    obj.anim.beacon = mast.children[mast.children.length - 1];
    obj.add(mast, { mass: 260, surf: 'metal', collider: { type: 'cyl', r: 0.14, h: Hm, offset: [0, Hm / 2, 0] }, fracture: null });

    // Abspannseile
    const top = new THREE.Vector3(Math.sin(p.lean) * (Hm * 0.78), 1.45 + Math.cos(p.lean) * Hm * 0.78, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.6;
      const R2 = Hm * 0.5 + 1;
      const sag = [top.x, top.y, top.z], mid = [top.x * 0.5 + Math.sin(a) * R2 * 0.5, top.y * 0.5 - 0.1, top.z * 0.5 + Math.cos(a) * R2 * 0.5];
      obj.add(tube([sag, mid, [Math.sin(a) * R2, 0.1, Math.cos(a) * R2]], 0.012, dark), { mass: 2, collider: 'none' });
      obj.add(cyl(0.08, 0.08, 0.25, concrete, { x: Math.sin(a) * R2, y: 0.12, z: Math.cos(a) * R2, radial: 8 }), { mass: 60, surf: 'clay', collider: 'none' });
    }

    // Tank + Rohre
    if (p.tank) {
      const tank = cyl(0.5, 0.5, 1.1, M.metal('white'), { x: 1.7, y: 0.7, z: 0.2, radial: 20, hseg: 5, dmg: dm * 0.03, seed: p.seed + 60 });
      tank.add(torus(0.505, 0.03, gray, { y: 0.3, rx: Math.PI / 2, ts: 18, rs: 5 }));
      tank.add(torus(0.505, 0.03, gray, { y: -0.3, rx: Math.PI / 2, ts: 18, rs: 5 }));
      obj.add(tank, { mass: 140 });
      obj.add(sph(0.5, M.metal('white'), { x: 1.7, y: 1.25, z: 0.2, thetaLength: Math.PI / 2, ws: 20, hs: 6 }), { mass: 30, collider: 'none' });
      obj.add(tube([[0.45, 0.35, 0.1], [1.0, 0.25, 0.15], [1.4, 0.4, 0.2]], 0.07, rust, { segs: 16 }), { mass: 10, collider: 'none' });
    }
    // Kabel und Pumpe
    obj.add(tube([[-0.5, 0.5, 0.2], [-1.2, 0.1, 0.8], [-2.2, 0.06, 1.4]], 0.04, dark, { segs: 14 }), { mass: 3, collider: 'none' });
    obj.add(box(0.5, 0.4, 0.4, dark, { x: -1.6, y: 0.2, z: -0.3, ry: 0.4, dmg: dm * 0.03, seed: p.seed + 70 }), { mass: 40 });
  },

  onFrame(obj) {
    const b = obj.anim.beacon;
    if (b && obj.state !== 'exploded') b.material.emissiveIntensity = Math.sin(obj.time * 2.4) > 0.3 ? 2.6 : 0.2;
  },
};
