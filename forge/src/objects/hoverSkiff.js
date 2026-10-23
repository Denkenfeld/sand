// Schwebe-Skiff: offenes Transportgleiter-Boot. Hält die Höhe über Federkräfte an vier Punkten.
import * as THREE from 'three';
import { M } from '../core/materials.js';
import { box, cyl, sph, mk, tube } from '../core/helpers.js';
import { damageParam, seedParam, PAL_OPTIONS } from './_common.js';

export default {
  id: 'hoverSkiff',
  label: 'Schwebe-Skiff',
  category: 'Kulisse & Beispiele',
  tag: 'fliegt',
  hint: 'Offener Gleiter, schwebt knapp über dem Boden. Testfahrt mit WASD.',
  params: [
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'white' },
    { key: 'hoverH', label: 'Schwebehöhe', type: 'range', min: 0.5, max: 1.6, step: 0.05, value: 0.95, unit: 'm' },
    { key: 'shield', label: 'Windschutz', type: 'bool', value: true },
    damageParam(0.45),
    seedParam(9),
  ],

  build(obj, p) {
    obj.mode = 'hover';
    obj.originY = 0.6;
    const dm = p.damage;
    const paint = M.metal(p.pal);
    const dark = M.metal('black');
    const gray = M.metal('gray');
    const rust = M.metal('rust');
    const seat = M.cloth(0x6a5640);

    obj.add(box(1.7, 0.4, 3.6, paint, { y: 0.62, dmg: dm * 0.08, seed: p.seed }), { mass: 120 });
    obj.add(box(1.5, 0.3, 1.2, paint, { y: 0.7, z: 2.2, rx: -0.18, dmg: dm * 0.08, seed: p.seed + 1 }), { mass: 30 });
    obj.add(box(1.9, 0.08, 3.9, gray, { y: 0.4, dmg: dm * 0.02, seed: p.seed + 2 }), { mass: 40 });
    for (const s of [-1, 1]) {
      obj.add(box(0.16, 0.44, 3.2, paint, { x: s * 0.86, y: 0.95, z: -0.1, dmg: dm * 0.07, seed: p.seed + 3 + s }), { mass: 20, collider: 'none' });
      obj.add(box(0.1, 0.6, 0.9, paint, { x: s * 1.0, y: 1.0, z: -1.7, rz: s * -0.28, dmg: dm * 0.07, seed: p.seed + 5 + s }), { mass: 12, collider: 'none' });
    }
    obj.add(box(1.5, 0.12, 0.7, seat, { y: 0.88, z: -0.9 }), { mass: 8, collider: 'none', surf: 'cloth' });
    obj.add(box(1.5, 0.55, 0.12, seat, { y: 1.14, z: -1.25, rx: -0.1 }), { mass: 8, collider: 'none', surf: 'cloth' });
    obj.add(box(1.3, 0.3, 0.45, dark, { y: 0.98, z: 0.75, rx: 0.25 }), { mass: 20, collider: 'none' });

    if (p.shield) {
      obj.add(box(1.4, 0.55, 0.05, M.glass(0x4a6068, 0.45), { y: 1.35, z: 0.95, rx: -0.5, cast: false }), { mass: 6, collider: 'none', fracture: [3, 2, 1] });
      for (const s of [-1, 1]) obj.add(tube([[s * 0.7, 1.0, 0.8], [s * 0.7, 1.62, 1.15]], 0.025, gray), { mass: 2, collider: 'none' });
    }

    // Triebwerke
    const glow = M.glow(0x7fd6ff, 2.4);
    for (const s of [-1, 1]) {
      obj.add(cyl(0.3, 0.36, 1.5, gray, { x: s * 0.62, y: 0.98, z: -1.95, rx: Math.PI / 2, radial: 18, dmg: dm * 0.03, seed: p.seed + 10 + s }), { mass: 50 });
      obj.add(cyl(0.26, 0.26, 0.08, glow, { x: s * 0.62, y: 0.98, z: -2.72, rx: Math.PI / 2, radial: 16 }), { mass: 1, collider: 'none' });
      obj.add(cyl(0.05, 0.05, 0.9, rust, { x: s * 0.62, y: 1.42, z: -1.7, rx: Math.PI / 2, radial: 8 }), { mass: 3, collider: 'none' });
    }

    // Schwebepads
    const pts = [];
    for (const [x, z] of [[-0.7, 1.4], [0.7, 1.4], [-0.7, -1.4], [0.7, -1.4]]) {
      obj.add(cyl(0.26, 0.3, 0.12, dark, { x, y: 0.32, z, radial: 14 }), { mass: 8, collider: 'none' });
      obj.add(cyl(0.2, 0.2, 0.02, glow, { x, y: 0.255, z, radial: 14 }), { mass: 1, collider: 'none' });
      pts.push([x, 0.26, z]);
    }
    // Funzel unter dem Rumpf
    const under = new THREE.PointLight(0x7fd6ff, 6, 6, 2);
    under.position.set(0, 0.15, 0);
    obj.light(under);

    // Kleiner Bugsensor
    obj.add(sph(0.12, M.glow(0xff7a3a, 1.6), { y: 0.85, z: 2.75, ws: 10, hs: 8 }), { mass: 1, collider: 'none' });

    obj.hover = { mass: 280, height: p.hoverH, points: pts, k: 14, c: 3.6, thrust: 2400, turn: 1.7, level: 45 };
  },
};
