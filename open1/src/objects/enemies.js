// Gegner & Kreaturen: Plünderer, Panzer, Brecher, Nachtalien, Laserdrohne, Gegnerfestung (der Sandwurm steht in worm.js).
import * as THREE from 'three';
import { tube } from '../core/helpers.js';
import { env } from '../core/forge.js';
import {
  M, box, cyl, sph, torus, mk, cloth, mulberry32, hazardMat, railing, ladder, strut, lampPost,
  addWheels, vehicleSpec, flag, emit, flicker, alive, pulse,
} from './kit.js';
import { damageParam, seedParam, PAL_OPTIONS } from './_common.js';

const CAT = 'Gegner & Kreaturen';
const RED = 0x9a2a1c;

/* ───────────────────────── Plünderer ───────────────────────── */
export const raider = {
  id: 'raider',
  label: 'Plünderer',
  category: CAT,
  tag: 'Gegner',
  hint: 'Schnelle Angreifer auf Gewürzpfaden. Fahrbar (WASD).',
  params: [
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'rust' },
    { key: 'rider', label: 'Fahrer', type: 'bool', value: true },
    { key: 'spikes', label: 'Stacheln', type: 'bool', value: true },
    { key: 'pennant', label: 'Wimpel', type: 'bool', value: true },
    { key: 'lights', label: 'Scheinwerfer', type: 'bool', value: true },
    damageParam(0.6),
    seedParam(61),
  ],
  build(obj, p) {
    obj.mode = 'vehicle';
    const R = 0.52, rest = 0.34, dm = p.damage;
    obj.originY = R + rest + 0.25;
    const rng = mulberry32(p.seed);
    const paint = M.metal(p.pal), gray = M.metal('gray'), dark = M.metal('black'), rust = M.metal('rust'), red = M.metal('red');
    const cl = M.cloth(0x4a3a30), skin = M.cloth(0x8f6648), scarf = M.cloth(RED);
    const Y = 2 * R + 0.1;
    // Rahmen
    obj.add(box(0.5, 0.3, 3.8, dark, { y: Y + 0.25, z: -0.2, dmg: dm * 0.03, seed: p.seed }), { mass: 120 });
    obj.add(box(2.1, 0.12, 1.5, paint, { y: Y + 0.15, z: -1.3, dmg: dm * 0.06, seed: p.seed + 1 }), { mass: 60 });
    for (const s of [-1, 1]) {
      obj.add(strut([s * 0.25, Y + 0.25, -0.3], [s * 1.0, Y + 0.2, -1.5], 0.06, dark), { mass: 6, collider: 'none' });
      obj.add(box(0.7, 0.07, 1.4, paint, { x: s * 1.0, y: 2 * R + 0.35, z: -1.0, dmg: dm * 0.08, seed: p.seed + 2 + s }), { mass: 8, collider: 'none' });
    }
    // Tank + Motor
    obj.add(cyl(0.3, 0.3, 0.9, rust, { y: Y + 0.75, z: 0.35, rz: Math.PI / 2, radial: 12, dmg: dm * 0.03, seed: p.seed + 4 }), { mass: 30, collider: 'none' });
    obj.add(box(0.9, 0.6, 0.8, dark, { y: Y + 0.55, z: -0.7, dmg: dm * 0.03, seed: p.seed + 5 }), { mass: 60 });
    for (const s of [-1, 1]) {
      obj.add(cyl(0.16, 0.16, 0.5, gray, { x: s * 0.55, y: Y + 0.68, z: -0.7, rz: Math.PI / 2 + s * 0.35, radial: 10 }), { mass: 8, collider: 'none' });
      obj.add(tube([[s * 0.8, Y + 0.8, -0.7], [s * 1.0, Y + 1.0, -1.5], [s * 0.85, Y + 1.4, -2.3]], 0.07, rust, { segs: 14 }), { mass: 4, collider: 'none' });
    }
    obj.anim.exh = [[-0.85, Y + 1.5, -2.35], [0.85, Y + 1.5, -2.35]];
    // Sitz, Lenker, Gabel
    obj.add(box(0.5, 0.14, 0.7, cl, { y: Y + 0.55, z: -1.45, rx: 0.1 }), { mass: 5, surf: 'cloth', collider: 'none' });
    obj.add(box(0.5, 0.5, 0.1, cl, { y: Y + 0.9, z: -1.85, rx: -0.2 }), { mass: 4, surf: 'cloth', collider: 'none' });
    obj.add(tube([[0, Y + 0.45, 1.0], [0, Y + 1.0, 1.15], [0, Y + 1.15, 1.0]], 0.045, gray, { segs: 10 }), { mass: 4, collider: 'none' });
    obj.add(box(1.0, 0.05, 0.05, gray, { y: Y + 1.15, z: 1.0 }), { mass: 3, collider: 'none' });
    obj.add(strut([0.0, Y + 0.7, 1.05], [0.0, R, 2.0], 0.05, gray), { mass: 4, collider: 'none' });
    obj.add(strut([0.12, Y + 0.7, 1.05], [0.1, R, 2.0], 0.04, gray), { mass: 4, collider: 'none' });
    obj.add(box(0.7, 0.55, 0.06, paint, { y: Y + 0.65, z: 1.25, rx: -0.3, dmg: dm * 0.06, seed: p.seed + 6 }), { mass: 10, collider: 'none' });
    // Schrottpanzerung + Stacheln
    for (let i = 0; i < 4; i++) obj.add(box(0.5 + rng() * 0.5, 0.4, 0.05, i % 2 ? rust : red, { x: (i % 2 ? 1 : -1) * 0.85, y: Y + 0.55, z: -0.2 - i * 0.35, ry: Math.PI / 2, rz: (rng() - 0.5) * 0.4, dmg: dm * 0.05, seed: 30 + i }), { mass: 4, collider: 'none' });
    if (p.spikes) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) obj.add(cyl(0.0, 0.06, 0.35, dark, { x: s * 1.35, y: R + 0.3 + i * 0.12, z: -1.0 + i * 0.45, rz: s * -Math.PI / 2, radial: 6 }), { mass: 1, collider: 'none' });
    // Fahrer
    if (p.rider) {
      const g = new THREE.Group();
      g.position.set(0, Y + 0.6, -1.45);
      g.add(box(0.42, 0.56, 0.26, cl, { y: 0.45, z: 0.1, rx: 0.5 }));
      g.add(sph(0.12, skin, { y: 0.98, z: 0.38 }));
      g.add(sph(0.13, scarf, { y: 0.96, z: 0.38, thetaStart: 1.7, thetaLength: 0.9 }));
      g.add(sph(0.14, cl, { y: 1.02, z: 0.36, thetaLength: 1.5 }));
      g.add(torus(0.1, 0.02, dark, { y: 1.0, z: 0.47, rx: 0, ts: 12, rs: 4 }));
      g.add(cyl(0.04, 0.04, 0.55, cl, { x: 0.22, y: 0.55, z: 0.7, rx: Math.PI / 2 - 0.3, radial: 6 }));
      g.add(cyl(0.04, 0.04, 0.55, cl, { x: -0.22, y: 0.55, z: 0.7, rx: Math.PI / 2 - 0.3, radial: 6 }));
      obj.add(g, { mass: 70, surf: 'cloth', collider: 'none' });
    }
    if (p.pennant) {
      obj.add(cyl(0.012, 0.018, 2.2, dark, { x: 0.35, y: Y + 1.7, z: -1.9, radial: 4 }), { mass: 1, collider: 'none' });
      obj.add(flag(RED, 0.9, 0.5, { x: 0.8, y: Y + 2.55, z: -1.9, seed: p.seed }), { mass: 1, collider: 'none' });
    }
    const lampMat = M.glow(0xfff0c8, p.lights ? 3 : 0.25);
    obj.add(cyl(0.14, 0.16, 0.1, lampMat, { x: 0, y: Y + 0.65, z: 1.32, rx: Math.PI / 2 - 0.3, radial: 12 }), { mass: 1, collider: 'none' });
    if (p.lights) {
      const sp = new THREE.SpotLight(0xffe6bd, 450, 50, 0.5, 0.55, 1.4);
      sp.position.set(0, Y + 0.65, 1.4);
      sp.target.position.set(0, 0.1, 16);
      obj.root.add(sp.target);
      obj.light(sp);
    }
    const wheels = addWheels(obj, [
      { x: 0, z: 2.0, steer: true, drive: false, width: 0.3 },
      { x: 1.05, z: -1.1, width: 0.5 }, { x: -1.05, z: -1.1, width: 0.5 },
    ], { R, width: 0.4, rest, rimMat: rust, mass: 22 });
    obj.vehicle = vehicleSpec(380, wheels, { accel: 8.0, rest, travel: 0.3, maxSteer: 0.55, grip: 3.2, top: 30, steerK: 0.05 });
  },
  onFrame(obj, dt) {
    if (obj.anim.exh) obj.anim.exh.forEach((e, i) => emit(obj, 'e' + i, e, dt, 2.2, 'smoke', 0.5));
  },
};

/* ───────────────────────── Panzer ───────────────────────── */
export const tank = {
  id: 'tank',
  label: 'Panzer',
  category: CAT,
  tag: 'Gegner',
  hint: 'Gepanzert und gefährlich; Crawler sind stark dagegen. Fahrbar (WASD).',
  params: [
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'black' },
    { key: 'gun', label: 'Rohrlänge', type: 'range', min: 2.4, max: 5, step: 0.1, value: 3.8, unit: 'm' },
    { key: 'scan', label: 'Turm schwenkt', type: 'bool', value: true },
    { key: 'skirt', label: 'Seitenschürzen', type: 'bool', value: true },
    damageParam(0.35),
    seedParam(62),
  ],
  build(obj, p) {
    obj.mode = 'vehicle';
    const R = 0.46, rest = 0.4, dm = p.damage;
    obj.originY = R + rest + 0.5;
    const rng = mulberry32(p.seed);
    const paint = M.metal(p.pal), gray = M.metal('gray'), dark = M.metal('black'), rust = M.metal('rust'), red = M.metal('red');
    const Y = 2 * R + 0.12;
    const eye = M.glow(0xff3a2a, 2.2);
    // Wanne: flacher Keil
    obj.add(box(2.4, 0.7, 4.6, paint, { y: Y + 0.2, z: -0.3, dmg: dm * 0.05, seed: p.seed }), { mass: 1300 });
    obj.add(box(2.3, 0.14, 1.7, paint, { y: Y + 0.22, z: 1.95, rx: 0.62, dmg: dm * 0.05, seed: p.seed + 1 }), { mass: 120, collider: 'none' });
    obj.add(box(2.3, 0.14, 1.2, paint, { y: Y + 0.32, z: -2.9, rx: -0.55, dmg: dm * 0.05, seed: p.seed + 2 }), { mass: 80, collider: 'none' });
    obj.add(box(2.0, 0.28, 3.6, paint, { y: Y + 0.68, z: -0.2, dmg: dm * 0.05, seed: p.seed + 3 }), { mass: 300, collider: 'none' });
    // Ketten, Schürzen mit Zacken
    for (const s of [-1, 1]) {
      obj.add(box(0.6, 0.1, 5.6, M.tread(), { x: s * 1.45, y: 2 * R + 0.05, z: 0 }), { mass: 50, collider: 'none' });
      if (p.skirt) for (let i = 0; i < 4; i++) {
        const w = box(0.07, 0.55, 1.25, i % 2 ? rust : paint, { x: s * 1.85, y: R + 0.1, z: -2.0 + i * 1.3, rx: (rng() - 0.5) * dm * 0.4, dmg: dm * 0.05, seed: p.seed + 10 + i + (s + 1) * 4 });
        obj.add(w, { mass: 20, collider: 'none' });
        obj.add(cyl(0.0, 0.1, 0.35, dark, { x: s * 1.9, y: R - 0.15, z: -2.0 + i * 1.3, rz: s * -Math.PI / 2, radial: 4 }), { mass: 2, collider: 'none' });
      }
    }
    // Turm: sechseckiger Block
    const tur = new THREE.Group();
    tur.position.set(0, Y + 0.95, -0.2);
    tur.add(cyl(1.05, 1.25, 0.7, paint, { y: 0.35, radial: 6, ry: 0.5, dmg: dm * 0.04, seed: p.seed + 20 }));
    tur.add(box(1.5, 0.5, 1.3, paint, { y: 0.45, z: 0.85, rx: -0.2, dmg: dm * 0.04, seed: p.seed + 21 }));
    const gl = p.gun;
    tur.add(cyl(0.14, 0.16, gl, dark, { y: 0.5, z: 1.3 + gl / 2, rx: Math.PI / 2, radial: 10 }));
    tur.add(cyl(0.24, 0.24, 0.8, gray, { y: 0.5, z: 1.7, rx: Math.PI / 2, radial: 10 }));
    tur.add(box(0.36, 0.36, 0.55, dark, { y: 0.5, z: 1.3 + gl + 0.1 }));
    tur.add(box(0.5, 0.2, 0.06, eye, { y: 0.7, z: 1.58 }));
    for (const s of [-1, 1]) tur.add(cyl(0.0, 0.1, 0.6, dark, { x: s * 1.1, y: 0.75, z: 0.4, rz: s * -Math.PI / 2 + s * 0.3, radial: 4 }));
    tur.add(box(1.0, 0.5, 0.5, rust, { y: 0.55, z: -1.2, dmg: dm * 0.03, seed: p.seed + 22 }));
    tur.add(cyl(0.02, 0.02, 2.4, dark, { x: -0.7, y: 1.5, z: -1.0, radial: 4 }));
    tur.add(flag(RED, 0.8, 0.45, { x: -0.3, y: 2.4, z: -1.0, ry: 0, seed: p.seed }));
    obj.add(tur, { mass: 500, collider: 'none' });
    obj.anim.turret = tur;
    // Frontlicht, Auspuff
    for (const s of [-1, 1]) obj.add(box(0.5, 0.12, 0.08, eye, { x: s * 0.7, y: Y + 0.6, z: 3.12, rx: -0.5 }), { mass: 1, collider: 'none' });
    for (const s of [-1, 1]) obj.add(box(0.5, 0.3, 0.4, rust, { x: s * 0.6, y: Y + 0.85, z: -2.2 }), { mass: 8, collider: 'none' });
    obj.anim.exh = [[-0.6, Y + 1.15, -2.3], [0.6, Y + 1.15, -2.3]];
    const wheels = addWheels(obj, [
      { x: 1.45, z: 1.9, steer: true }, { x: -1.45, z: 1.9, steer: true },
      { x: 1.45, z: 0 }, { x: -1.45, z: 0 },
      { x: 1.45, z: -1.9 }, { x: -1.45, z: -1.9 },
    ], { R, width: 0.5, rest, rimMat: gray, mass: 80 });
    obj.vehicle = vehicleSpec(2900, wheels, { accel: 3.8, rest, travel: 0.35, maxSteer: 0.32, stiffness: 36, grip: 3.6, top: 14, steerK: 0.14 });
  },
  onFrame(obj, dt) {
    if (!alive(obj)) return;
    const t = obj.anim.turret;
    if (t) t.rotation.y = obj.params.scan ? Math.sin(obj.time * 0.4 + 1) * 0.6 : 0;
    if (obj.anim.exh) obj.anim.exh.forEach((e, i) => emit(obj, 'e' + i, e, dt, 1.6, 'smoke', 0.7));
  },
};

/* ───────────────────────── Brecher ───────────────────────── */
export const breaker = {
  id: 'breaker',
  label: 'Brecher',
  category: CAT,
  tag: 'Gegner',
  hint: 'Sehr robuste Angreifer für große Gefechte. Fahrbar (WASD).',
  params: [
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'rust' },
    { key: 'roller', label: 'Rollendrehzahl', type: 'range', min: 0, max: 6, step: 0.1, value: 2.4, unit: ' rad/s' },
    { key: 'spikes', label: 'Dornen je Reihe', type: 'range', min: 6, max: 12, step: 1, value: 9 },
    { key: 'smoke', label: 'Rauch', type: 'bool', value: true },
    damageParam(0.45),
    seedParam(63),
  ],
  build(obj, p) {
    obj.mode = 'vehicle';
    const R = 0.95, rest = 0.55, dm = p.damage;
    obj.originY = R + rest + 0.7;
    const rng = mulberry32(p.seed);
    const paint = M.metal(p.pal), gray = M.metal('gray'), dark = M.metal('black'), rust = M.metal('rust'), red = M.metal('red');
    const Y = 2 * R + 0.2;
    const eye = M.glow(0xff3a2a, 2.2);
    // Rumpf
    obj.add(box(4.2, 1.5, 8.2, paint, { y: Y + 0.7, z: -0.4, dmg: dm * 0.07, seed: p.seed }), { mass: 3000 });
    obj.add(box(4.0, 0.2, 5.0, dark, { y: Y + 1.55, z: -1.4, dmg: dm * 0.04, seed: p.seed + 1 }), { mass: 200, collider: 'none' });
    for (const s of [-1, 1]) {
      obj.add(box(0.3, 1.2, 8.0, rust, { x: s * 2.3, y: R + 0.55, z: -0.2, dmg: dm * 0.06, seed: p.seed + 2 + s }), { mass: 150, collider: 'none' });
      for (let i = 0; i < 4; i++) obj.add(box(0.22, 0.9, 1.6, paint, { x: s * 2.5, y: R + 0.9, z: -3.0 + i * 1.9, rz: s * 0.1, dmg: dm * 0.07, seed: p.seed + 8 + i }), { mass: 30, collider: 'none' });
    }
    // Kabine
    obj.add(box(2.6, 1.6, 2.6, paint, { y: Y + 2.1, z: 1.0, dmg: dm * 0.05, seed: p.seed + 4 }), { mass: 500 });
    obj.add(box(1.9, 0.28, 0.08, eye, { y: Y + 2.35, z: 2.33 }), { mass: 1, collider: 'none' });
    obj.add(box(2.8, 0.25, 2.8, dark, { y: Y + 3.0, z: 1.0 }), { mass: 60, collider: 'none' });
    obj.add(cyl(0.03, 0.04, 3.0, dark, { x: -1.0, y: Y + 4.4, z: 0.2, radial: 4 }), { mass: 2, collider: 'none' });
    obj.add(flag(RED, 1.2, 0.7, { x: -0.4, y: Y + 5.4, z: 0.2, seed: p.seed }), { mass: 1, collider: 'none' });
    // Mörser
    obj.add(cyl(0.38, 0.3, 2.0, dark, { y: Y + 2.4, z: -2.4, rx: -0.6, radial: 12 }), { mass: 60, collider: 'none' });
    obj.add(cyl(0.7, 0.7, 0.4, gray, { y: Y + 1.75, z: -2.2, radial: 12 }), { mass: 60, collider: 'none' });
    // Schlote
    obj.anim.exh = [];
    for (const s of [-1, 1]) {
      obj.add(cyl(0.36, 0.42, 2.4, rust, { x: s * 1.3, y: Y + 2.9, z: -3.2, radial: 12, dmg: dm * 0.03, seed: 40 + s }), { mass: 60, collider: 'none' });
      obj.add(torus(0.34, 0.06, dark, { x: s * 1.3, y: Y + 4.1, z: -3.2, rx: Math.PI / 2, ts: 12, rs: 4 }), { mass: 3, collider: 'none' });
      obj.anim.exh.push([s * 1.3, Y + 4.4, -3.2]);
    }
    // Rammbock-Rolle vorn mit Dornen (dreht)
    const roller = new THREE.Group();
    roller.position.set(0, 1.35, 5.4);
    roller.add(cyl(1.0, 1.0, 4.6, rust, { rz: Math.PI / 2, radial: 18, dmg: dm * 0.05, seed: p.seed + 30 }));
    for (const x of [-2.35, 2.35]) roller.add(cyl(1.15, 1.15, 0.15, dark, { x, rz: Math.PI / 2, radial: 18 }));
    const rows = 7;
    for (let r = 0; r < rows; r++) {
      const x = -2.0 + (r * 4.0) / (rows - 1);
      for (let i = 0; i < p.spikes; i++) {
        const a = (i / p.spikes) * Math.PI * 2 + (r % 2) * (Math.PI / p.spikes);
        const sp = cyl(0.0, 0.17, 0.75, dark, { radial: 6 });
        sp.position.set(x, Math.sin(a) * 1.25, Math.cos(a) * 1.25);
        sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, Math.sin(a), Math.cos(a)));
        roller.add(sp);
      }
    }
    obj.add(roller, { mass: 800, collider: { type: 'box', size: [4.6, 2.4, 2.4], offset: [0, 0, 0] } });
    obj.anim.roller = roller;
    for (const s of [-1, 1]) {
      obj.add(box(0.3, 0.4, 2.4, gray, { x: s * 2.2, y: 1.45, z: 4.3, dmg: dm * 0.03, seed: 50 + s }), { mass: 60, collider: 'none' });
      obj.add(strut([s * 2.2, Y + 0.6, 2.6], [s * 2.2, 1.4, 5.4], 0.11, dark), { mass: 20, collider: 'none' });
    }
    // Keilschild + Ketten + Warnstreifen
    obj.add(box(4.0, 1.1, 0.2, red, { y: 1.3, z: 3.9, rx: -0.4, dmg: dm * 0.06, seed: p.seed + 31 }), { mass: 100, collider: 'none' });
    for (let i = 0; i < 6; i++) obj.add(tube([[-1.9 + i * 0.75, Y + 0.4, 3.9], [-1.9 + i * 0.75 + (rng() - 0.5) * 0.2, Y - 0.4 - rng() * 0.3, 4.1], [-1.9 + i * 0.75, 0.6, 4.2]], 0.04, dark, { segs: 8 }), { mass: 1, collider: 'none' });
    obj.add(box(4.0, 0.4, 0.1, hazardMat(), { y: Y + 0.2, z: -4.55 }), { mass: 4, collider: 'none' });
    obj.add(ladder(2.6, dark, { x: 1.6, y: Y + 0.0, z: -4.6 }), { mass: 8, collider: 'none' });
    for (const s of [-1, 1]) obj.add(cyl(0.2, 0.22, 0.14, M.glow(0xffc078, 3), { x: s * 1.5, y: Y + 1.5, z: 2.5, rx: Math.PI / 2, radial: 10 }), { mass: 1, collider: 'none' });

    const wheels = addWheels(obj, [
      { x: 2.45, z: 2.6, steer: true }, { x: -2.45, z: 2.6, steer: true },
      { x: 2.45, z: 0 }, { x: -2.45, z: 0 },
      { x: 2.45, z: -2.6 }, { x: -2.45, z: -2.6 },
    ], { R, width: 0.8, rest, rimMat: rust, mass: 140 });
    obj.vehicle = vehicleSpec(5200, wheels, { accel: 2.6, rest, travel: 0.5, maxSteer: 0.25, stiffness: 40, grip: 4, top: 9, steerK: 0.2 });
  },
  onFrame(obj, dt) {
    if (!alive(obj)) return;
    if (obj.anim.roller) obj.anim.roller.rotation.x += dt * obj.params.roller;
    if (obj.params.smoke && obj.anim.exh) obj.anim.exh.forEach((e, i) => emit(obj, 'e' + i, e, dt, 3.0, 'smoke', 1.2));
  },
};

/* ───────────────────────── Nachtalien ───────────────────────── */
function wingGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.08);
  s.lineTo(0.35, 0.34);
  s.lineTo(0.85, 0.46);
  s.lineTo(1.4, 0.3);
  s.lineTo(1.55, 0.18);
  s.lineTo(1.2, 0.02);
  s.lineTo(1.28, -0.16);
  s.lineTo(0.9, -0.04);
  s.lineTo(0.8, -0.24);
  s.lineTo(0.5, -0.08);
  s.lineTo(0.3, -0.28);
  s.lineTo(0.0, -0.12);
  s.closePath();
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(-Math.PI / 2);
  return g;
}

export const nightAliens = {
  id: 'nightAliens',
  label: 'Nachtalien',
  category: CAT,
  tag: 'Fluggegner',
  hint: 'Geflügelte Schwärme, die nachts angreifen.',
  params: [
    { key: 'count', label: 'Anzahl', type: 'range', min: 1, max: 40, step: 1, value: 14 },
    { key: 'radius', label: 'Schwarmradius', type: 'range', min: 2, max: 18, step: 0.5, value: 8, unit: 'm' },
    { key: 'height', label: 'Flughöhe', type: 'range', min: 2, max: 12, step: 0.5, value: 5.5, unit: 'm' },
    { key: 'flap', label: 'Flügelschlag', type: 'range', min: 3, max: 16, step: 0.5, value: 9, unit: ' Hz' },
    { key: 'eye', label: 'Augenfarbe', type: 'select', options: [['red', 'Rot'], ['violet', 'Violett'], ['green', 'Grün'], ['amber', 'Bernstein']], value: 'red' },
    seedParam(64),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed);
    const eyeC = { red: 0xff3a3a, violet: 0xb06aff, green: 0x6aff8a, amber: 0xffb43a }[p.eye];
    const skin = M.cloth(0x2c2430), wingM = M.cloth(0x3b2d45), bone = M.cloth(0x6a6058);
    const eye = M.glow(eyeC, 3);
    const wgeo = wingGeometry();
    obj.anim.list = [];
    for (let i = 0; i < p.count; i++) {
      const s = 0.8 + rng() * 0.5;
      const g = new THREE.Group();
      g.rotation.order = 'YXZ';
      g.add(sph(0.2, skin, { sx: 0.8, sy: 0.75, sz: 1.6, ws: 10, hs: 8 }));
      g.add(sph(0.13, skin, { y: 0.05, z: 0.42, ws: 10, hs: 8 }));
      for (const x of [-1, 1]) {
        g.add(sph(0.035, eye, { x: x * 0.06, y: 0.08, z: 0.53, ws: 6, hs: 5, cast: false }));
        g.add(cyl(0.0, 0.05, 0.2, skin, { x: x * 0.08, y: 0.22, z: 0.4, rz: x * -0.3, radial: 4 }));
      }
      g.add(cyl(0.0, 0.06, 0.7, skin, { z: -0.65, rx: -Math.PI / 2, radial: 6 }));
      g.add(cyl(0.0, 0.03, 0.18, bone, { y: -0.12, z: 0.52, rx: 3.0, radial: 4 }));
      const wl = new THREE.Group(), wr = new THREE.Group();
      wr.position.set(0.14, 0.08, 0.08);
      wl.position.set(-0.14, 0.08, 0.08);
      const mr = mk(wgeo, wingM, { cast: true });
      const ml = mk(wgeo, wingM, { cast: true });
      ml.scale.x = -1;
      wr.add(mr);
      wl.add(ml);
      g.add(wl, wr);
      g.scale.setScalar(s);
      const o = { g, wl, wr, r: p.radius * (0.35 + rng() * 0.65), a: rng() * Math.PI * 2, sp: (0.35 + rng() * 0.45) * (rng() < 0.5 ? -1 : 1) * (p.radius < 6 ? 1.4 : 1), h: p.height + (rng() - 0.5) * 3, ph: rng() * 6.28, fq: 0.85 + rng() * 0.3 };
      obj.anim.list.push(o);
      pose(o, 0, p, 0);
      obj.add(g, { mass: 3, surf: 'cloth', collider: 'none' });
    }
    // Dunkler Horst-Nebel: ein schwaches Licht im Zentrum des Schwarms
    const L = new THREE.PointLight(eyeC, 4, 14, 2);
    L.position.set(0, p.height, 0);
    obj.light(L);
  },
  onFrame(obj, dt) {
    if (!alive(obj)) return;
    const t = obj.time, p = obj.params;
    for (const o of obj.anim.list) {
      o.a += dt * o.sp;
      pose(o, t, p, dt);
    }
  },
};

const _a = new THREE.Vector3();
function pose(o, t, p, dt) {
  const x = Math.cos(o.a) * o.r, z = Math.sin(o.a) * o.r;
  const y = o.h + Math.sin(t * 0.9 + o.ph) * 0.8;
  o.g.position.set(x, y, z);
  const dir = Math.sign(o.sp) || 1;
  const dx = -Math.sin(o.a) * dir, dz = Math.cos(o.a) * dir;
  o.g.rotation.y = Math.atan2(dx, dz);
  o.g.rotation.z = -dir * 0.35 + Math.sin(t * 1.3 + o.ph) * 0.12;
  o.g.rotation.x = Math.cos(t * 0.9 + o.ph) * 0.12;
  const f = Math.sin(t * p.flap * o.fq * Math.PI * 2 + o.ph);
  o.wr.rotation.z = f * 0.9 + 0.1;
  o.wl.rotation.z = -f * 0.9 - 0.1;
}

/* ───────────────────────── Laserdrohne ───────────────────────── */
export const laserDrone = {
  id: 'laserDrone',
  label: 'Laserdrohne',
  category: CAT,
  tag: 'Fluggegner',
  hint: 'Fliegender Gegner mit Laserangriff. Testflug mit WASD.',
  params: [
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'black' },
    { key: 'hoverH', label: 'Schwebehöhe', type: 'range', min: 1, max: 5, step: 0.1, value: 2.4, unit: 'm' },
    { key: 'laser', label: 'Laser feuert', type: 'bool', value: true },
    { key: 'range', label: 'Laserreichweite', type: 'range', min: 4, max: 24, step: 0.5, value: 11, unit: 'm' },
    damageParam(0.3),
    seedParam(65),
  ],
  build(obj, p) {
    obj.mode = 'hover';
    obj.originY = 0.7;
    const dm = p.damage;
    const paint = M.metal(p.pal), gray = M.metal('gray'), dark = M.metal('black'), red = M.metal('red'), rust = M.metal('rust');
    const eye = M.glow(0xff3a2a, 3);
    const Y = 0.85;
    // Kern
    obj.add(sph(0.55, paint, { y: Y, sy: 0.85, ws: 18, hs: 12, dmg: dm * 0.02, seed: p.seed }), { mass: 30, collider: { type: 'sph', r: 0.55, offset: [0, Y, 0] } });
    obj.add(sph(0.56, dark, { y: Y - 0.12, sy: 0.5, ws: 16, hs: 8, thetaStart: Math.PI / 2, thetaLength: Math.PI / 2 }), { mass: 5, collider: 'none' });
    obj.add(torus(0.58, 0.07, gray, { y: Y, rx: Math.PI / 2, ts: 24, rs: 6 }), { mass: 5, collider: 'none' });
    // Sensorauge vorn
    obj.add(cyl(0.2, 0.24, 0.12, dark, { y: Y + 0.04, z: 0.5, rx: Math.PI / 2, radial: 14 }), { mass: 2, collider: 'none' });
    obj.add(cyl(0.14, 0.14, 0.06, eye, { y: Y + 0.04, z: 0.57, rx: Math.PI / 2, radial: 14 }), { mass: 1, collider: 'none' });
    // Laserkanone unten
    obj.add(cyl(0.09, 0.11, 0.8, dark, { y: Y - 0.5, z: 0.35, rx: Math.PI / 2 + 0.2, radial: 10 }), { mass: 6, collider: 'none' });
    obj.add(cyl(0.12, 0.12, 0.12, red, { y: Y - 0.57, z: 0.75, rx: Math.PI / 2 + 0.2, radial: 10 }), { mass: 2, collider: 'none' });
    // Rotorausleger
    obj.anim.rotors = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4, x = Math.sin(a) * 1.15, z = Math.cos(a) * 1.15;
      obj.add(strut([Math.sin(a) * 0.45, Y, Math.cos(a) * 0.45], [x, Y + 0.05, z], 0.05, gray), { mass: 2, collider: 'none' });
      obj.add(cyl(0.38, 0.38, 0.14, dark, { x, y: Y + 0.05, z, radial: 16, open: true }), { mass: 4, collider: 'none' });
      obj.add(cyl(0.1, 0.1, 0.2, paint, { x, y: Y + 0.02, z, radial: 8 }), { mass: 3, collider: 'none' });
      const rot = new THREE.Group();
      rot.position.set(x, Y + 0.14, z);
      rot.add(box(0.7, 0.015, 0.09, gray));
      rot.add(box(0.09, 0.015, 0.7, gray));
      obj.add(rot, { mass: 1, collider: 'none' });
      obj.anim.rotors.push({ g: rot, dir: i % 2 ? 1 : -1 });
    }
    // Antenne und Warnlicht
    obj.add(cyl(0.015, 0.02, 0.5, dark, { x: -0.2, y: Y + 0.75, z: -0.2, radial: 4 }), { mass: 1, collider: 'none' });
    const beacon = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2a12, emissiveIntensity: 2 });
    obj.anim.beacon = beacon;
    obj.add(sph(0.05, beacon, { x: -0.2, y: Y + 1.02, z: -0.2, ws: 6, hs: 5 }), { mass: 1, collider: 'none' });
    // Laserstrahl (additiv)
    const tilt = 0.2;
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const bg = new THREE.Group();
    bg.position.set(0, Y - 0.57, 0.8);
    bg.rotation.x = tilt;
    const beam = mk(new THREE.CylinderGeometry(0.035, 0.035, 1, 8, 1, true), beamMat, { cast: false, recv: false });
    beam.rotation.x = Math.PI / 2;
    bg.add(beam);
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xff2a2a, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    glow.rotation.x = Math.PI / 2;
    bg.add(glow);
    obj.add(bg, { mass: 1, collider: 'none', vanish: true, order: 99 });
    obj.anim.beam = { bg, beam, glow, mat: beamMat };
    // Lichter
    const Lg = new THREE.PointLight(0xff3a2a, 5, 9, 2);
    Lg.position.set(0, Y - 0.6, 0.9);
    obj.light(Lg);
    const under = new THREE.PointLight(0xff5a3a, 3, 5, 2);
    under.position.set(0, 0.3, 0);
    obj.light(under);

    const pts = [];
    for (const [x, z] of [[-0.6, 0.6], [0.6, 0.6], [-0.6, -0.6], [0.6, -0.6]]) pts.push([x, 0.35, z]);
    obj.hover = { mass: 60, height: p.hoverH, points: pts, k: 14, c: 3.6, thrust: 520, turn: 1.9, level: 45 };
  },
  onFrame(obj, dt) {
    if (!alive(obj)) return;
    const a = obj.anim, t = obj.time, p = obj.params;
    for (const r of a.rotors) r.g.rotation.y += dt * 40 * r.dir;
    pulse(a.beacon, t, 0.2, 3, 4);
    const b = a.beam;
    const on = p.laser;
    b.bg.visible = on;
    if (on) {
      const len = p.range;
      b.beam.scale.set(1, len, 1);
      b.beam.position.z = len / 2;
      b.glow.scale.set(1, len, 1);
      b.glow.position.z = len / 2;
      b.mat.opacity = 0.7 + 0.25 * Math.sin(t * 40);
    }
    const l = obj.lights[0];
    if (l) l.light.intensity = on ? l.base * (0.8 + 0.2 * Math.sin(t * 38)) : 0;
  },
};

/* ───────────────────────── Gegnerfestung ───────────────────────── */
export const fortress = {
  id: 'fortress',
  label: 'Gegnerfestung',
  category: CAT,
  tag: 'Level 7/10',
  hint: 'Eigenständige Stadt mit Versorgung und Verteidigung.',
  params: [
    { key: 'size', label: 'Kantenlänge', type: 'range', min: 14, max: 26, step: 1, value: 20, unit: ' m' },
    { key: 'houses', label: 'Häuser', type: 'range', min: 2, max: 14, step: 1, value: 7 },
    { key: 'turrets', label: 'Geschütze auf der Mauer', type: 'bool', value: true },
    { key: 'banners', label: 'Banner', type: 'bool', value: true },
    { key: 'barricade', label: 'Stachelsperren', type: 'bool', value: true },
    { key: 'pal', label: 'Mauerwerk', type: 'select', options: [['dark', 'Dunkel'], ['adobe', 'Lehmbraun'], ['red', 'Rötlich'], ['white', 'Gekalkt']], value: 'dark' },
    damageParam(0.4),
    seedParam(66),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed), dm = p.damage, S = p.size / 2;
    const wall = M.clay(p.pal), adobe = M.clay('adobe'), conc = M.clay('white');
    const gray = M.metal('gray'), dark = M.metal('black'), rust = M.metal('rust'), red = M.metal('red'), olive = M.metal('olive');
    const wood = M.wood(0xb89c76), glow = M.glow(0xff8a3a, 1.5), cl = M.cloth(RED);
    const WH = 4.2, WT = 1.3;
    obj.add(box(2 * S + 8, 0.3, 2 * S + 8, M.clay('dark', { sandBias: 0.5 }), { y: 0.15, dmg: dm * 0.03, seed: p.seed }), { mass: 30000, surf: 'clay', fracture: [8, 1, 8] });

    // Mauern (Tor an der Südseite = +Z)
    const gate = 2.8;
    const seg = (cx, cz, w, d, seed) => {
      obj.add(box(w, WH, d, wall, { x: cx, y: 0.3 + WH / 2, z: cz, dmg: dm * 0.07, seed }), { mass: 4000, surf: 'clay', fracture: [Math.max(2, Math.round(Math.max(w, d) / 2.5)), 2, 1] });
      const crenN = Math.floor(Math.max(w, d) / 1.2);
      const g = new THREE.Group();
      for (let i = 0; i < crenN; i++) {
        if (rng() < dm * 0.3) continue;
        const t = (i + 0.5) / crenN - 0.5, along = Math.max(w, d) * t;
        g.add(box(w > d ? 0.7 : WT * 0.7, 0.55, w > d ? WT * 0.7 : 0.7, wall, { x: cx + (w > d ? along : 0), y: 0.3 + WH + 0.28, z: cz + (w > d ? 0 : along), dmg: 0.02, seed: i + seed }));
      }
      obj.add(g, { mass: 200, surf: 'clay', collider: 'none' });
    };
    seg(0, -S, 2 * S, WT, p.seed + 1);
    seg(-S, 0, WT, 2 * S, p.seed + 2);
    seg(S, 0, WT, 2 * S, p.seed + 3);
    const wl = S - gate;
    seg(-(gate + wl / 2), S, wl, WT, p.seed + 4);
    seg(gate + wl / 2, S, wl, WT, p.seed + 5);

    // Ecktürme
    for (const [x, z] of [[-S, -S], [S, -S], [-S, S], [S, S]]) {
      const g = new THREE.Group();
      g.position.set(x, 0.3, z);
      g.add(cyl(2.0, 2.3, 7.4, wall, { y: 3.7, radial: 10, hseg: 4, dmg: dm * 0.05, seed: p.seed + 20 + x + z }));
      g.add(cyl(2.5, 2.2, 0.5, dark, { y: 7.6, radial: 10 }));
      g.add(cyl(0.0, 2.4, 1.8, rust, { y: 8.9, radial: 10 }));
      for (let i = 0; i < 4; i++) g.add(box(0.25, 0.8, 0.12, glow, { x: Math.sin(i * 1.57 + 0.4) * 2.0, y: 5.5, z: Math.cos(i * 1.57 + 0.4) * 2.0, ry: i * 1.57 + 0.4 }));
      g.add(cyl(0.04, 0.05, 2.0, dark, { y: 10.4, radial: 5 }));
      obj.add(g, { mass: 3500, surf: 'clay', collider: { type: 'cyl', r: 2.1, h: 7.4, offset: [0, 3.7, 0] } });
    }

    // Tortürme, Fallgatter
    for (const s of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(s * (gate + 1.5), 0.3, S);
      g.add(box(3.0, 7.0, 3.2, wall, { y: 3.5, dmg: dm * 0.05, seed: p.seed + 30 + s }));
      g.add(box(3.4, 0.4, 3.6, dark, { y: 7.2 }));
      for (let i = 0; i < 4; i++) g.add(box(0.7, 0.55, 0.7, wall, { x: -1.2 + i * 0.8, y: 7.65, z: 1.5 }));
      g.add(box(0.5, 0.9, 0.1, glow, { y: 5.0, z: 1.62 }));
      obj.add(g, { mass: 3200, surf: 'clay', fracture: [2, 3, 2], collider: { type: 'box', size: [3.0, 7.0, 3.2], offset: [0, 3.5, 0] } });
    }
    obj.add(box(2 * gate, 0.8, 1.4, dark, { y: 0.3 + 3.9, z: S }), { mass: 400, collider: 'none' });
    for (let i = 0; i < 8; i++) obj.add(box(0.1, 2.4, 0.1, dark, { x: -gate + 0.35 + i * ((2 * gate - 0.7) / 7), y: 0.3 + 2.6 + 0.9, z: S + 0.2 }), { mass: 3, collider: 'none' });
    obj.add(box(2 * gate, 0.1, 0.1, dark, { y: 4.2, z: S + 0.2 }), { mass: 3, collider: 'none' });
    obj.add(box(2 * gate, 0.1, 0.1, dark, { y: 3.4, z: S + 0.2 }), { mass: 3, collider: 'none' });

    // Bergfried
    {
      const g = new THREE.Group();
      g.position.set(0, 0.3, -S * 0.35);
      g.add(box(7, 4.6, 7, wall, { y: 2.3, dmg: dm * 0.05, seed: p.seed + 40 }));
      g.add(box(4.8, 4.0, 4.8, wall, { y: 6.6, dmg: dm * 0.05, seed: p.seed + 41 }));
      g.add(box(5.4, 0.35, 5.4, dark, { y: 8.8 }));
      for (let i = 0; i < 6; i++) g.add(cyl(0.0, 0.28, 1.4, dark, { x: -2.0 + i * 0.8, y: 9.7, z: 2.55, radial: 4 }));
      g.add(box(1.8, 2.6, 0.2, dark, { y: 1.6, z: 3.55 }));
      for (const s of [-1, 1]) g.add(box(0.4, 1.1, 0.12, glow, { x: s * 1.8, y: 6.6, z: 2.45 }));
      g.add(box(0.8, 0.12, 0.12, M.glow(0xff3a2a, 2), { y: 7.4, z: 2.45 }));
      g.add(cyl(0.06, 0.08, 5.0, gray, { x: 1.8, y: 11.5, z: -1.2, radial: 6 }));
      obj.add(g, { mass: 9000, surf: 'clay', collider: { type: 'box', size: [7, 9, 7], offset: [0, 4.5, 0] } });
      obj.add(flag(RED, 2.6, 1.6, { x: 3.2, y: 13.2, z: -S * 0.35 - 1.2, seed: p.seed }), { mass: 5, collider: 'none' });
    }

    // Häuser (Rejection Sampling, Torgasse und Bergfried freihalten)
    const placed = [[0, -S * 0.35, 5.5]];
    let tries = 0;
    while (placed.length < p.houses + 1 && tries++ < 400) {
      const x = (rng() * 2 - 1) * (S - 3.2), z = (rng() * 2 - 1) * (S - 3.2);
      if (Math.abs(x) < gate + 0.5 && z > 0) continue;
      if (placed.some((q) => Math.hypot(x - q[0], z - q[1]) < q[2] + 3.2)) continue;
      placed.push([x, z, 2.6]);
      const w = 2.6 + rng() * 1.4, d = 2.6 + rng() * 1.4, h = 2.2 + rng() * 1.2, ry = Math.round(rng() * 4) * 1.57 + (rng() - 0.5) * 0.1;
      const g = new THREE.Group();
      g.position.set(x, 0.3, z);
      g.rotation.y = ry;
      g.add(box(w, h, d, rng() < 0.5 ? adobe : wall, { y: h / 2, dmg: dm * 0.05, seed: p.seed + 100 + tries }));
      if (rng() < 0.5) g.add(sph(Math.min(w, d) * 0.62, adobe, { y: h, thetaLength: Math.PI / 2, ws: 14, hs: 6, sy: 0.6 }));
      else g.add(box(w + 0.3, 0.25, d + 0.3, dark, { y: h + 0.1 }));
      g.add(box(0.8, 1.5, 0.1, dark, { x: 0.3, y: 0.75, z: d / 2 + 0.03 }));
      g.add(box(0.5, 0.5, 0.08, glow, { x: -0.8, y: h * 0.62, z: d / 2 + 0.03 }));
      obj.add(g, { mass: 1500, surf: 'clay', collider: { type: 'box', size: [w, h, d], offset: [0, h / 2, 0] } });
    }

    // Versorgung: Wassertank, Silo, Generator mit Schlot, Vorräte
    const sx = S - 3.4;
    {
      const g = new THREE.Group();
      g.position.set(sx, 0.3, -S + 3.4);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(strut([x * 1.0, 0, z * 1.0], [x * 0.8, 2.6, z * 0.8], 0.08, gray));
      g.add(cyl(1.4, 1.4, 1.8, M.metal('blue'), { y: 3.5, radial: 16, hseg: 3, dmg: dm * 0.03, seed: p.seed + 60 }));
      g.add(cyl(1.4, 0.2, 0.5, M.metal('blue'), { y: 2.35, radial: 16 }));
      g.add(sph(1.4, M.metal('blue'), { y: 4.4, thetaLength: Math.PI / 2, ws: 16, hs: 5, sy: 0.35 }));
      obj.add(g, { mass: 900, surf: 'metal', collider: { type: 'cyl', r: 1.4, h: 5, offset: [0, 2.6, 0] } });
      obj.add(cyl(1.2, 1.2, 4.0, olive, { x: sx - 3.4, y: 2.3, z: -S + 3.4, radial: 14, hseg: 3, dmg: dm * 0.03, seed: p.seed + 61 }), { mass: 700, surf: 'metal' });
      obj.add(cyl(0.0, 1.25, 0.8, rust, { x: sx - 3.4, y: 4.7, z: -S + 3.4, radial: 14 }), { mass: 40, collider: 'none' });
      obj.add(box(2.4, 1.5, 1.4, dark, { x: sx - 0.4, y: 1.05, z: -S + 7.0, dmg: dm * 0.03, seed: p.seed + 62 }), { mass: 500 });
      obj.add(cyl(0.3, 0.38, 3.6, rust, { x: sx + 0.4, y: 3.0, z: -S + 7.0, radial: 10 }), { mass: 50, collider: 'none' });
      obj.anim.stack = [sx + 0.4, 5.1, -S + 7.0];
      for (let i = 0; i < 5; i++) obj.add(box(0.9, 0.7, 0.8, i % 2 ? olive : wood, { x: sx - 3.0 + (i % 3) * 1.0, y: 0.65 + Math.floor(i / 3) * 0.7, z: -S + 9.6, ry: (rng() - 0.5) * 0.4, dmg: 0.01, seed: i }), { mass: 40, surf: 'wood', collider: { type: 'box', size: [0.9, 0.7, 0.8] } });
    }

    // Geschütze auf den Mauern
    if (p.turrets) {
      obj.anim.guns = [];
      for (const [x, z, ry] of [[-S * 0.5, -S, Math.PI], [S * 0.5, -S, Math.PI], [-S, S * 0.3, -Math.PI / 2], [S, S * 0.3, Math.PI / 2]]) {
        const g = new THREE.Group();
        g.position.set(x, 0.3 + WH + 0.4, z);
        g.rotation.y = ry;
        g.add(cyl(0.5, 0.6, 0.4, dark, { radial: 10 }));
        const head = new THREE.Group();
        head.position.y = 0.45;
        head.add(box(0.8, 0.5, 0.8, rust, { dmg: dm * 0.03, seed: 5 }));
        for (const s of [-1, 1]) head.add(cyl(0.07, 0.07, 1.5, dark, { x: s * 0.2, z: 0.9, rx: Math.PI / 2, radial: 8 }));
        g.add(head);
        obj.add(g, { mass: 150, surf: 'metal', collider: { type: 'cyl', r: 0.55, h: 1.2, offset: [0, 0.4, 0] } });
        obj.anim.guns.push({ head, ph: rng() * 6 });
      }
    }
    // Banner
    if (p.banners) for (const [x, z, ry] of [[-S * 0.55, S + 0.7, 0], [S * 0.55, S + 0.7, 0], [-S - 0.7, -S * 0.4, -Math.PI / 2], [S + 0.7, -S * 0.4, Math.PI / 2]]) {
      obj.add(cloth(1.7, 3.0, cl, { x, y: 3.2, z, ry, sag: 0, ripple: 0.12, segX: 4, segY: 8, seed: x }), { mass: 3, surf: 'cloth', collider: 'none' });
      obj.add(box(1.9, 0.08, 0.08, dark, { x, y: 4.75, z, ry }), { mass: 2, collider: 'none' });
    }
    // Stachelsperren vor dem Tor
    if (p.barricade) for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      const x = -5 + i * 2 + (rng() - 0.5) * 0.7, z = S + 4.4 + (rng() - 0.5) * 1.5;
      g.position.set(x, 0.3, z);
      g.rotation.y = rng() * 3;
      for (const [rx, rz] of [[0.8, 0], [0, 0.8], [-0.8, 0.8]]) g.add(strut([-rx, 0.5 - rz * 0.3, -rz], [rx, 1.0 + rz * 0.3, rz], 0.07, rust));
      g.add(strut([0, 0.1, 0.8], [0, 1.1, -0.8], 0.07, rust));
      obj.add(g, { mass: 40, surf: 'metal', collider: { type: 'sph', r: 0.85, offset: [0, 0.6, 0] } });
    }
    // Fackeln am Tor + Licht im Hof
    for (const x of [-gate + 0.2, gate - 0.2]) obj.add(lampPost(3.0, dark, 0xffa050, 3, [x, 0.3, S + 2.4]), { mass: 10, collider: 'none' });
    const L1 = new THREE.PointLight(0xff8a3a, 60, 26, 2);
    L1.position.set(0, 5, S * 0.4);
    obj.light(L1);
    const L2 = new THREE.PointLight(0xff9a50, 40, 22, 2);
    L2.position.set(0, 4, -S * 0.2);
    obj.light(L2);
  },
  onFrame(obj, dt) {
    if (!alive(obj)) return;
    if (obj.anim.stack) emit(obj, 'sm', obj.anim.stack, dt, 2.2, 'smoke', 1.1);
    for (const g of obj.anim.guns ?? []) g.head.rotation.y = Math.sin(obj.time * 0.5 + g.ph) * 0.6;
    flicker(obj, 0.14, 7);
  },
};
