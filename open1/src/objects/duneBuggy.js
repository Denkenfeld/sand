// Dünen-Buggy: Rohrrahmen, Blechkarosserie, Überrollkäfig, Heckmotor. Fahrbar (RaycastVehicle).
// Konvention aller Objekte: Vorderseite = +Z, rechts = -X, Boden = y 0.
import * as THREE from 'three';
import { M } from '../core/materials.js';
import { box, cyl, torus, tube, mk, cloth } from '../core/helpers.js';
import { mulberry32 } from '../core/noise.js';
import { damageParam, seedParam, PAL_OPTIONS } from './_common.js';

export default {
  id: 'duneBuggy',
  label: 'Dünen-Buggy',
  category: 'Kulisse & Beispiele',
  tag: 'fahrbar',
  hint: 'Zweisitziger Rohrrahmen-Buggy mit Heckmotor. Testfahrt mit WASD.',
  params: [
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'sand' },
    { key: 'wheelR', label: 'Reifenradius', type: 'range', min: 0.36, max: 0.62, step: 0.01, value: 0.48, unit: 'm' },
    { key: 'cage', label: 'Überrollkäfig', type: 'bool', value: true },
    { key: 'cargo', label: 'Ladung hinten', type: 'bool', value: true },
    { key: 'lights', label: 'Scheinwerfer an', type: 'bool', value: true },
    damageParam(0.4),
    seedParam(3),
  ],

  build(obj, p) {
    obj.mode = 'vehicle';
    obj.originY = 0.75;
    const rng = mulberry32(p.seed);
    const dm = p.damage, R = p.wheelR;
    const paint = M.metal(p.pal);
    const frame = M.metal('gray');
    const dark = M.metal('black');
    const rust = M.metal('rust');
    const seatMat = M.cloth(0x5a4636);
    const wood = M.wood(0xb89c76);

    // Boden und Rahmen
    obj.add(box(1.5, 0.1, 3.0, frame, { y: 0.62, dmg: dm * 0.02, seed: p.seed }), { mass: 120 });
    for (const s of [-1, 1]) obj.add(box(0.16, 0.2, 1.7, dark, { x: s * 0.72, y: 0.66, z: -0.1 }), { mass: 25 });

    // Karosserie
    obj.add(box(1.3, 0.34, 1.2, paint, { y: 0.88, z: 1.0, dmg: dm * 0.09, seed: p.seed + 1 }), { mass: 45 });
    obj.add(box(1.1, 0.26, 0.45, paint, { y: 0.8, z: 1.76, rx: -0.22, dmg: dm * 0.08, seed: p.seed + 2 }), { mass: 20, collider: 'none' });
    obj.add(box(1.42, 0.3, 0.26, paint, { y: 1.08, z: 0.4, dmg: dm * 0.05, seed: p.seed + 3 }), { mass: 20, collider: 'none' });
    obj.add(box(1.42, 0.42, 1.0, paint, { y: 0.9, z: -1.15, dmg: dm * 0.08, seed: p.seed + 4 }), { mass: 40 });

    // Sitze
    for (const s of [-1, 1]) {
      obj.add(box(0.5, 0.1, 0.5, seatMat, { x: s * 0.33, y: 0.8, z: -0.15 }), { mass: 6, collider: 'none', surf: 'cloth' });
      obj.add(box(0.5, 0.58, 0.1, seatMat, { x: s * 0.33, y: 1.08, z: -0.42, rx: -0.12 }), { mass: 6, collider: 'none', surf: 'cloth' });
    }

    // Motor mit Kühlrippen, Auspuff
    const engine = box(0.9, 0.5, 0.7, dark, { y: 1.02, z: -1.42, dmg: dm * 0.02, seed: p.seed + 5 });
    for (let i = 0; i < 5; i++) engine.add(box(0.94, 0.03, 0.74, frame, { y: -0.2 + i * 0.1, tpm: 0.5 }));
    obj.add(engine, { mass: 70 });
    for (const s of [-1, 1]) obj.add(cyl(0.055, 0.07, 0.9, rust, { x: s * 0.36, y: 1.22, z: -2.0, rx: Math.PI / 2 - 0.15, radial: 10 }), { mass: 5, collider: 'none' });

    // Lenkung
    obj.add(cyl(0.025, 0.025, 0.55, frame, { x: -0.33, y: 1.08, z: 0.28, rx: -0.9, radial: 8 }), { mass: 2, collider: 'none' });
    obj.add(torus(0.15, 0.022, dark, { x: -0.33, y: 1.3, z: 0.12, rx: -0.9, ts: 16, rs: 5 }), { mass: 2, collider: 'none' });

    // Überrollkäfig
    if (p.cage) {
      const hoop = (z0, z1) => [[-0.72, 0.68, z0], [-0.72, 1.62, z1], [0.72, 1.62, z1], [0.72, 0.68, z0]];
      obj.add(tube(hoop(0.5, 0.32), 0.04, frame, { segs: 24 }), { mass: 14, collider: 'none' });
      obj.add(tube(hoop(-0.78, -0.78), 0.04, frame, { segs: 24 }), { mass: 14, collider: 'none' });
      for (const s of [-1, 1]) {
        obj.add(tube([[s * 0.72, 1.62, 0.32], [s * 0.72, 1.62, -0.78]], 0.04, frame), { mass: 6, collider: 'none' });
        obj.add(tube([[s * 0.72, 0.68, 0.5], [s * 0.72, 0.9, 1.3], [s * 0.6, 0.8, 1.7]], 0.035, frame), { mass: 6, collider: 'none' });
      }
      obj.add(tube([[-0.72, 1.62, -0.78], [0, 1.2, -1.1], [0.72, 1.62, -0.78]], 0.03, frame), { mass: 4, collider: 'none' });
    }
    obj.add(tube([[-0.72, 0.68, 1.9], [-0.46, 0.68, 2.06], [0.46, 0.68, 2.06], [0.72, 0.68, 1.9]], 0.05, dark, { segs: 20 }), { mass: 8, collider: 'none' });

    // Antenne mit Fähnchen
    obj.add(cyl(0.012, 0.016, 2.0, frame, { x: -0.8, y: 2.0, z: -1.5, radial: 6 }), { mass: 1, collider: 'none' });
    {
      const f = cloth(0.4, 0.22, M.cloth(0xb23d22), { sag: 0, ripple: 0.05, segX: 6, segY: 2, x: -0.6, y: 2.85, z: -1.5, ry: Math.PI / 2 });
      obj.add(f, { mass: 0.5, collider: 'none', surf: 'cloth' });
    }

    // Ladung
    if (p.cargo) {
      const crate = box(1.1, 0.5, 0.8, wood, { y: 1.36, z: -1.05, dmg: dm * 0.03, seed: p.seed + 6 });
      for (const k of [-1, 1]) crate.add(box(1.13, 0.06, 0.83, frame, { y: k * 0.17, tpm: 0.5 }));
      obj.add(crate, { mass: 30, surf: 'wood', fracture: [2, 1, 2] });
      for (const s of [-1, 1]) obj.add(box(0.3, 0.42, 0.17, M.metal('olive'), { x: s * 0.62, y: 1.37, z: -1.8, ry: s * 0.1, dmg: dm * 0.04, seed: p.seed + 7 + s }), { mass: 5, collider: 'none' });
    }

    // Scheinwerfer
    const lampMat = M.glow(0xfff0c8, p.lights ? 3 : 0.25);
    for (const s of [-1, 1]) {
      obj.add(cyl(0.13, 0.15, 0.1, lampMat, { x: s * 0.5, y: 0.95, z: 1.8, rx: Math.PI / 2, radial: 16 }), { mass: 1, collider: 'none' });
      if (p.lights) {
        const sp = new THREE.SpotLight(0xffe6bd, 500, 55, 0.5, 0.55, 1.4);
        sp.position.set(s * 0.5, 0.96, 1.85);
        sp.target.position.set(s * 0.4, 0.1, 16);
        obj.root.add(sp.target);
        obj.light(sp);
      }
    }

    // Kotflügel über den Rädern
    const zs = [1.15, -1.15];
    for (const s of [-1, 1]) for (const z of zs) {
      obj.add(box(0.46, 0.05, 0.95, paint, { x: s * 1.0, y: 2 * R + 0.13, z, dmg: dm * 0.06, seed: p.seed + 20 + z * s }), { mass: 6, collider: 'none' });
    }

    // Räder
    const rest = 0.34;
    const wheels = [];
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const g = new THREE.Group();
      const tireGeo = new THREE.CylinderGeometry(R, R, 0.36, 28, 1);
      tireGeo.rotateZ(Math.PI / 2);
      g.add(mk(tireGeo, M.tread()));
      g.add(cyl(R * 0.58, R * 0.58, 0.38, frame, { rz: Math.PI / 2, radial: 16 }));
      g.add(cyl(R * 0.2, R * 0.2, 0.46, dark, { rz: Math.PI / 2, radial: 8 }));
      g.position.set(sx * 1.0, R, sz * 1.15);
      const part = obj.add(g, { group: 'wheel', collider: { type: 'cyl', r: R, h: 0.36, axis: 'x' }, mass: 18, surf: 'rubber' });
      wheels.push({ x: sx * 1.0, y: R + rest, z: sz * 1.15, part, drive: true, steer: sz > 0, radius: R });
    }
    obj.vehicle = { mass: 340, wheelRadius: R, wheels, rest, travel: 0.3, stiffness: 34, engine: 520, maxSteer: 0.5, brake: 40, grip: 3.4, compress: 4.4, relax: 2.4 };
  },
};
