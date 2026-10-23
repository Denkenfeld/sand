// Verteidigung & Truppen, Teil 1: Kaserne, Krieger, Crawler, Geschützturm, Schildgenerator.
import * as THREE from 'three';
import { tube } from '../core/helpers.js';
import { env } from '../core/forge.js';
import {
  M, box, cyl, sph, torus, mk, cloth, mulberry32, crystal, hazardMat, shieldMat,
  railing, ladder, strut, lampPost, addWheels, vehicleSpec, flag, emit, flicker, alive, pulse, animateHumanoid,
} from './kit.js';
import { damageParam, seedParam, PAL_OPTIONS } from './_common.js';

const CAT = 'Verteidigung & Truppen';
const _v = new THREE.Vector3();

/* ───────────────────────── Kaserne ───────────────────────── */
export const barracks = {
  id: 'barracks',
  label: 'Kaserne',
  category: CAT,
  tag: 'Truppen',
  hint: 'Bildet Krieger aus.',
  params: [
    { key: 'annex', label: 'Mannschaftsflügel', type: 'range', min: 0, max: 3, step: 1, value: 2 },
    { key: 'dummies', label: 'Übungspuppen', type: 'range', min: 0, max: 6, step: 1, value: 3 },
    { key: 'tower', label: 'Wachturm', type: 'bool', value: true },
    { key: 'banner', label: 'Banner', type: 'bool', value: true },
    { key: 'pal', label: 'Mauerwerk', type: 'select', options: [['adobe', 'Lehmbraun'], ['white', 'Gekalkt'], ['dark', 'Dunkel'], ['red', 'Rötlich']], value: 'adobe' },
    damageParam(0.4),
    seedParam(41),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed), dm = p.damage;
    const wall = M.clay(p.pal), conc = M.clay('white'), gray = M.metal('gray'), dark = M.metal('black'), rust = M.metal('rust'), olive = M.metal('olive');
    const wood = M.wood(0xb89c76), cloth1 = M.cloth(0xb08a5a), glow = M.glow(0xffb060, 1.4);
    obj.add(box(17, 0.4, 13, conc, { x: 0, y: 0.2, dmg: dm * 0.04, seed: p.seed }), { mass: 7000, surf: 'clay', fracture: [5, 1, 4] });

    // Haupthalle
    obj.add(box(11, 3.8, 5.2, wall, { x: 0, y: 2.3, z: -3.2, dmg: dm * 0.06, seed: p.seed + 1 }), { mass: 5000, surf: 'clay', fracture: [4, 2, 2] });
    obj.add(box(11.4, 0.35, 5.6, gray, { x: 0, y: 4.35, z: -3.2, dmg: dm * 0.02, seed: p.seed + 2 }), { mass: 200, collider: 'none' });
    const cren = new THREE.Group();
    for (let i = 0; i < 12; i++) for (const z of [-0.5, 0.5]) {
      if (rng() < dm * 0.25) continue;
      cren.add(box(0.6, 0.5, 0.45, wall, { x: -5.5 + i * 1.0, y: 4.8, z: -3.2 + z * 5.4 + (z > 0 ? -0.1 : 0.1), dmg: dm * 0.02, seed: i + (z > 0 ? 40 : 0) }));
    }
    obj.add(cren, { mass: 300, surf: 'clay', collider: 'none' });
    // Tor
    obj.add(box(2.4, 2.8, 0.5, dark, { x: 0, y: 1.8, z: -0.55 }), { mass: 40, collider: 'none' });
    for (const s of [-1, 1]) obj.add(box(0.3, 3.0, 0.6, gray, { x: s * 1.35, y: 1.9, z: -0.5 }), { mass: 40, collider: 'none' });
    obj.add(box(3.0, 0.35, 0.6, gray, { x: 0, y: 3.35, z: -0.5 }), { mass: 40, collider: 'none' });
    for (let i = 0; i < 3; i++) obj.add(box(3.2 - i * 0.2, 0.2, 0.6, conc, { x: 0, y: 0.5 + i * 0.2, z: 0.0 + (2 - i) * 0.5 }), { mass: 60, surf: 'clay', collider: 'none' });
    // Schießscharten mit Licht
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) obj.add(box(0.3, 0.9, 0.1, glow, { x: s * (2.6 + i * 1.3), y: 3.0, z: -0.57 }), { mass: 1, collider: 'none' });

    // Mannschaftsflügel
    for (let i = 0; i < p.annex; i++) {
      const s = i % 2 ? -1 : 1, row = Math.floor(i / 2);
      obj.add(box(3.4, 2.8, 4.4, wall, { x: s * 7.0, y: 1.8, z: -2.6 + row * -0.0 - (i === 2 ? 3.6 : 0), dmg: dm * 0.05, seed: p.seed + 10 + i }), { mass: 2200, surf: 'clay', fracture: [2, 2, 2] });
      obj.add(box(1.0, 0.9, 0.08, glow, { x: s * 7.0, y: 2.2, z: -0.38 - (i === 2 ? 3.6 : 0) }), { mass: 1, collider: 'none' });
    }

    // Wachturm
    if (p.tower) {
      const g = new THREE.Group();
      g.position.set(-6.9, 0.4, -6.9);
      g.add(box(2.3, 6.2, 2.3, wall, { y: 3.1, dmg: dm * 0.04, seed: p.seed + 20 }));
      g.add(box(3.0, 0.3, 3.0, gray, { y: 6.35 }));
      g.add(railing(3.0, dark, { y: 6.5, z: 1.5 }));
      g.add(railing(3.0, dark, { y: 6.5, z: -1.5 }));
      g.add(cyl(0.0, 1.9, 1.5, rust, { y: 7.2, radial: 4, ry: Math.PI / 4 }));
      for (const s of [-1, 1]) g.add(cyl(0.06, 0.06, 1.0, gray, { x: s * 1.3, y: 6.9, z: s * 1.3, radial: 6 }));
      g.add(sph(0.14, M.glow(0xffc070, 2.4), { y: 6.7, ws: 8, hs: 6 }));
      g.add(ladder(6.2, dark, { x: 1.2, z: 1.2 }));
      obj.add(g, { mass: 2200, surf: 'clay', collider: { type: 'box', size: [2.3, 6.2, 2.3], offset: [0, 3.1, 0] } });
    }

    // Banner
    if (p.banner) {
      const g = new THREE.Group();
      g.position.set(5.2, 0.4, 2.8);
      g.add(cyl(0.07, 0.09, 6.5, gray, { y: 3.25, radial: 8 }));
      g.add(flag(0xc8472a, 2.2, 1.4, { x: 1.15, y: 5.5 }));
      obj.add(g, { mass: 60, surf: 'metal', collider: { type: 'cyl', r: 0.1, h: 6.5, offset: [0, 3.25, 0] } });
    }

    // Übungsplatz
    for (let i = 0; i < p.dummies; i++) {
      const g = new THREE.Group();
      g.position.set(-5 + i * 2.2, 0.4, 3.9 + (i % 2) * 1.2);
      g.rotation.y = (rng() - 0.5) * 0.5;
      g.add(cyl(0.06, 0.07, 1.8, wood, { y: 0.9, radial: 6 }));
      g.add(box(0.9, 0.08, 0.08, wood, { y: 1.45 }));
      g.add(sph(0.26, cloth1, { y: 1.2, sy: 1.5, sz: 0.8, ws: 10, hs: 8, dmg: 0.02, seed: i }));
      g.add(sph(0.14, cloth1, { y: 1.78, ws: 8, hs: 6 }));
      g.add(cyl(0.015, 0.015, 0.9, gray, { x: 0.15, y: 1.25, z: 0.2, rx: Math.PI / 2 - 0.2, radial: 4 })); // steckender Speer
      obj.add(g, { mass: 40, surf: 'wood', collider: { type: 'cyl', r: 0.3, h: 1.9, offset: [0, 0.95, 0] } });
    }
    // Waffenständer
    {
      const g = new THREE.Group();
      g.position.set(4.0, 0.4, 5.1);
      g.add(box(2.4, 0.08, 0.08, wood, { y: 1.5 }));
      g.add(box(2.4, 0.08, 0.08, wood, { y: 0.8 }));
      for (const s of [-1, 1]) g.add(box(0.1, 1.6, 0.1, wood, { x: s * 1.2, y: 0.8 }));
      for (let i = 0; i < 5; i++) {
        g.add(cyl(0.02, 0.02, 2.0, gray, { x: -0.9 + i * 0.45, y: 1.0, z: 0.12, radial: 4 }));
        g.add(cyl(0.0, 0.05, 0.3, rust, { x: -0.9 + i * 0.45, y: 2.1, z: 0.12, radial: 6 }));
      }
      g.add(cyl(0.34, 0.34, 0.05, olive, { x: -0.7, y: 0.45, z: -0.15, rx: Math.PI / 2 - 0.2, radial: 16 }));
      g.add(cyl(0.34, 0.34, 0.05, rust, { x: 0.2, y: 0.45, z: -0.15, rx: Math.PI / 2 - 0.2, radial: 16 }));
      obj.add(g, { mass: 80, surf: 'wood', collider: { type: 'box', size: [2.5, 1.6, 0.4], offset: [0, 0.8, 0] } });
    }
    // Sandsäcke
    for (let i = 0; i < 10; i++) {
      const s = sph(0.3, cloth1, { x: -7.5 + (i % 5) * 0.7, y: 0.6 + Math.floor(i / 5) * 0.32, z: 5.6, sx: 1.4, sy: 0.7, sz: 0.9, ws: 10, hs: 7 });
      obj.add(s, { mass: 18, surf: 'cloth', collider: { type: 'box', size: [0.84, 0.42, 0.54] } });
    }
    const L = new THREE.PointLight(0xffb868, 24, 14, 2);
    L.position.set(0, 3.2, 2.6);
    obj.light(L);
  },
};

/* ───────────────────────── Krieger ───────────────────────── */
const ARMOR = { sand: 0x9d8660, gray: 0x6d6a66, olive: 0x59603e, rust: 0x7a3f24, blue: 0x3e4a5c, black: 0x2c2a29 };
export const warrior = {
  id: 'warrior',
  label: 'Krieger',
  category: CAT,
  tag: 'Einheit',
  hint: 'Mobiler Kämpfer gegen Plünderer. Steuern mit WASD.',
  params: [
    { key: 'height', label: 'Körpergröße', type: 'range', min: 1.6, max: 2.05, step: 0.01, value: 1.85, unit: 'm' },
    { key: 'armor', label: 'Rüstung', type: 'select', options: [['sand', 'Sand'], ['gray', 'Grau'], ['olive', 'Oliv'], ['rust', 'Rost'], ['blue', 'Blau'], ['black', 'Schwarz']], value: 'olive' },
    { key: 'weapon', label: 'Waffe', type: 'select', options: [['rifle', 'Strahlgewehr'], ['spear', 'Stachelspeer'], ['blade', 'Klinge']], value: 'rifle' },
    { key: 'shield', label: 'Armschild', type: 'bool', value: true },
    { key: 'cape', label: 'Umhang', type: 'bool', value: true },
    { key: 'pack', label: 'Tornister', type: 'bool', value: true },
    { key: 'worn', label: 'Abgenutztheit', type: 'range', min: 0, max: 1, step: 0.01, value: 0.5, fmt: (v) => Math.round(v * 100) + ' %' },
    seedParam(42),
  ],
  build(obj, p) {
    obj.mode = 'character';
    const k = p.height / 1.8;
    obj.character = { radius: 0.32, height: p.height, speed: 2.6, jump: 4.4, mass: 90 };
    const rng = mulberry32(p.seed), w = p.worn;
    const ac = ARMOR[p.armor];
    const plate = M.metal(p.armor === 'black' ? 'black' : p.armor === 'blue' ? 'blue' : p.armor === 'rust' ? 'rust' : p.armor === 'gray' ? 'gray' : p.armor === 'sand' ? 'sand' : 'olive');
    const cl = M.cloth(new THREE.Color(ac).multiplyScalar(0.62).getHex());
    const cl2 = M.cloth(0x4a3c30), skin = M.cloth(0x8f6648), dark = M.metal('black'), gray = M.metal('gray');
    const visor = M.glow(0xffa24a, 1.4), wood = M.wood(0xb89c76);
    const ref = (n, g) => (obj.anim[n] = g);

    for (const s of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(s * 0.12 * k, 0.9 * k, 0);
      g.add(cyl(0.085 * k, 0.065 * k, 0.78 * k, cl, { y: -0.4 * k, radial: 10, dmg: w * 0.01 * k, seed: p.seed + s }));
      g.add(box(0.14 * k, 0.17 * k, 0.12 * k, plate, { y: -0.46 * k, z: 0.07 * k, dmg: w * 0.008, seed: 3 + s }));
      g.add(box(0.12 * k, 0.28 * k, 0.1 * k, plate, { y: -0.2 * k, z: 0.065 * k }));
      g.add(box(0.14 * k, 0.17 * k, 0.3 * k, dark, { y: -0.84 * k, z: 0.05 * k }));
      obj.add(g, { mass: 11, surf: 'metal' });
      ref(s < 0 ? 'legR' : 'legL', g);
    }
    // Rumpf
    obj.add(box(0.44 * k, 0.5 * k, 0.27 * k, cl, { y: 1.2 * k, dmg: w * 0.008, seed: p.seed + 4 }), { mass: 26, surf: 'cloth' });
    obj.add(box(0.5 * k, 0.36 * k, 0.12 * k, plate, { y: 1.27 * k, z: 0.165 * k, dmg: w * 0.012 * k, seed: p.seed + 5 }), { mass: 14, collider: 'none' });
    obj.add(box(0.4 * k, 0.2 * k, 0.1 * k, plate, { y: 1.0 * k, z: 0.15 * k, dmg: w * 0.01, seed: p.seed + 6 }), { mass: 8, collider: 'none' });
    obj.add(box(0.5 * k, 0.07 * k, 0.31 * k, cl2, { y: 0.93 * k }), { mass: 3, collider: 'none' });
    for (const s of [-1, 1]) obj.add(box(0.1 * k, 0.13 * k, 0.07 * k, cl2, { x: s * 0.22 * k, y: 0.93 * k, z: 0.16 * k }), { mass: 1, collider: 'none' });
    obj.add(box(0.2 * k, 0.04 * k, 0.04 * k, M.glow(0xffa24a, 1.1), { y: 1.38 * k, z: 0.23 * k }), { mass: 1, collider: 'none' });
    // Arme
    for (const s of [-1, 1]) {
      const g = new THREE.Group();
      g.position.set(s * 0.29 * k, 1.44 * k, 0);
      g.add(cyl(0.065 * k, 0.052 * k, 0.6 * k, cl, { y: -0.28 * k, radial: 10 }));
      g.add(cyl(0.062 * k, 0.062 * k, 0.24 * k, plate, { y: -0.5 * k, radial: 10, dmg: w * 0.005, seed: 8 + s }));
      g.add(sph(0.05 * k, cl2, { y: -0.62 * k, ws: 8, hs: 6 }));
      g.add(sph(0.14 * k, plate, { y: 0.02 * k, ws: 14, hs: 8, thetaLength: Math.PI * 0.55, sy: 0.7, dmg: w * 0.012 * k, seed: 10 + s }));
      const side = s < 0 ? 'R' : 'L';
      // Waffe
      if (side === 'R') {
        if (p.weapon === 'spear') {
          g.add(cyl(0.02 * k, 0.02 * k, 2.4 * k, wood, { y: -0.3 * k, z: 0.03 * k, radial: 6 }));
          g.add(cyl(0.0, 0.05 * k, 0.34 * k, gray, { y: 0.97 * k, z: 0.03 * k, radial: 6 }));
          g.add(box(0.12 * k, 0.03 * k, 0.03 * k, gray, { y: 0.82 * k, z: 0.03 * k }));
        } else if (p.weapon === 'blade') {
          g.add(box(0.04 * k, 0.8 * k, 0.012 * k, gray, { y: -1.05 * k, z: 0.03 * k, dmg: w * 0.004, seed: 20 }));
          g.add(box(0.16 * k, 0.03 * k, 0.04 * k, dark, { y: -0.67 * k, z: 0.03 * k }));
        }
      } else if (p.shield) {
        const sh = cyl(0.3 * k, 0.3 * k, 0.045 * k, plate, { x: 0.1 * k, y: -0.3 * k, rz: Math.PI / 2, radial: 20, dmg: w * 0.012, seed: 30 });
        g.add(sh);
        g.add(sph(0.07 * k, M.glow(0xffa24a, 1.2), { x: 0.14 * k, y: -0.3 * k, ws: 8, hs: 6 }));
      }
      obj.add(g, { mass: 6, surf: 'cloth' });
      ref('arm' + side, g);
    }
    // Gewehr vor der Brust
    if (p.weapon === 'rifle') {
      const g = new THREE.Group();
      g.position.set(-0.12 * k, 1.15 * k, 0.27 * k);
      g.rotation.x = -0.12;
      g.add(box(0.07 * k, 0.1 * k, 0.5 * k, dark, { z: 0.0 }));
      g.add(cyl(0.022 * k, 0.022 * k, 0.55 * k, gray, { z: 0.5 * k, rx: Math.PI / 2, radial: 8 }));
      g.add(box(0.06 * k, 0.15 * k, 0.07 * k, dark, { y: -0.1 * k, z: 0.1 * k }));
      g.add(box(0.07 * k, 0.1 * k, 0.28 * k, plate, { y: -0.02 * k, z: -0.32 * k }));
      g.add(box(0.05 * k, 0.05 * k, 0.12 * k, M.glow(0x62ffb0, 1.2), { y: 0.075 * k, z: 0.12 * k }));
      obj.add(g, { mass: 5, collider: 'none' });
      obj.anim.armRFixed = true;
      obj.anim.armR.rotation.x = -0.5;
      obj.anim.armR.rotation.z = -0.3;
    }
    // Kopf mit Helm
    const head = new THREE.Group();
    head.position.set(0, 1.66 * k, 0.01 * k);
    head.add(sph(0.1 * k, skin, { ws: 14, hs: 10 }));
    head.add(sph(0.135 * k, plate, { ws: 16, hs: 10, thetaLength: 1.95, y: 0.02 * k, dmg: w * 0.008 * k, seed: p.seed + 12 }));
    head.add(box(0.19 * k, 0.04 * k, 0.03 * k, visor, { y: 0.01 * k, z: 0.12 * k }));
    head.add(box(0.025 * k, 0.1 * k, 0.26 * k, plate, { y: 0.15 * k, z: -0.02 * k }));
    head.add(sph(0.12 * k, cl2, { ws: 12, hs: 8, thetaStart: 1.85, thetaLength: 0.7, y: -0.02 * k }));
    obj.add(head, { mass: 6, surf: 'metal' });
    ref('head', head);
    obj.add(torus(0.12 * k, 0.04 * k, cl2, { y: 1.55 * k, rx: Math.PI / 2, ts: 14, rs: 5 }), { mass: 2, collider: 'none' });

    if (p.pack) {
      const g = new THREE.Group();
      g.position.set(0, 1.25 * k, -0.22 * k);
      g.add(box(0.34 * k, 0.4 * k, 0.16 * k, cl2, { dmg: w * 0.01, seed: p.seed + 14 }));
      g.add(cyl(0.06 * k, 0.06 * k, 0.4 * k, plate, { x: 0.14 * k, y: 0.0, z: -0.14 * k, radial: 10 }));
      g.add(cyl(0.06 * k, 0.06 * k, 0.4 * k, plate, { x: -0.14 * k, y: 0.0, z: -0.14 * k, radial: 10 }));
      obj.add(g, { mass: 8, collider: 'none' });
    }
    if (p.cape) obj.add(cloth(0.46 * k, 0.9 * k, M.cloth(0x7a3a26), { y: 1.05 * k, z: -0.2 * k, sag: 0.04, ripple: 0.12 * (0.4 + w), segX: 6, segY: 8, seed: p.seed }), { mass: 3, surf: 'cloth', collider: 'none' });
    obj.anim.phase = 0;
  },
  onFrame(obj, dt) {
    animateHumanoid(obj, dt, { legAmp: 0.75 });
    const a = obj.anim;
    if (alive(obj) && a.armR && a.armRFixed) { a.armR.rotation.x = -0.5; a.armR.rotation.z = -0.3; }
    if (alive(obj) && a.armL && obj.character && !obj.character.grounded) a.armL.rotation.x = -1.6;
  },
};

/* ───────────────────────── Crawler ───────────────────────── */
export const crawler = {
  id: 'crawler',
  label: 'Crawler',
  category: CAT,
  tag: 'Fahrzeug',
  hint: 'Robustes Kampffahrzeug gegen Panzer. Fahrbar (WASD).',
  params: [
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'olive' },
    { key: 'scan', label: 'Turm schwenkt', type: 'bool', value: true },
    { key: 'cargo', label: 'Gepäck', type: 'bool', value: true },
    { key: 'skirt', label: 'Seitenschürzen', type: 'bool', value: true },
    damageParam(0.4),
    seedParam(43),
  ],
  build(obj, p) {
    obj.mode = 'vehicle';
    const R = 0.52, rest = 0.42, dm = p.damage;
    obj.originY = R + rest + 0.5;
    const rng = mulberry32(p.seed);
    const paint = M.metal(p.pal), gray = M.metal('gray'), dark = M.metal('black'), rust = M.metal('rust'), sand = M.metal('sand');
    const wood = M.wood(0xb89c76);
    const Y = 2 * R + 0.1;
    // Wanne
    obj.add(box(2.3, 0.8, 5.0, paint, { y: Y + 0.15, z: -0.1, dmg: dm * 0.05, seed: p.seed }), { mass: 1400 });
    obj.add(box(2.1, 0.12, 1.6, paint, { y: Y + 0.78, z: 2.15, rx: 0.58, dmg: dm * 0.05, seed: p.seed + 1 }), { mass: 120, collider: 'none' });
    obj.add(box(2.1, 0.12, 1.2, paint, { y: Y + 0.6, z: -2.6, rx: -0.45, dmg: dm * 0.04, seed: p.seed + 2 }), { mass: 100, collider: 'none' });
    obj.add(box(2.0, 0.55, 3.1, paint, { y: Y + 0.8, z: -0.3, dmg: dm * 0.05, seed: p.seed + 3 }), { mass: 500 });
    // Ketten (oberes Trum) und Schürzen
    for (const s of [-1, 1]) {
      obj.add(box(0.62, 0.1, 5.9, M.tread(), { x: s * 1.5, y: 2 * R + 0.05, z: 0 }), { mass: 60, collider: 'none' });
      obj.add(box(0.1, 0.38, 5.3, dark, { x: s * 1.85, y: Y - 0.12, z: -0.1 }), { mass: 20, collider: 'none' });
      if (p.skirt) for (let i = 0; i < 3; i++) obj.add(box(0.07, 0.6, 1.5, paint, { x: s * 1.9, y: R + 0.15, z: -1.9 + i * 1.8, dmg: dm * 0.05, seed: p.seed + 8 + i + s * 3, rx: (rng() - 0.5) * dm * 0.4 }), { mass: 25, collider: 'none' });
    }
    // Turm
    const tur = new THREE.Group();
    tur.position.set(0, Y + 1.1, 0.15);
    tur.add(cyl(1.05, 1.2, 0.6, paint, { y: 0.3, radial: 14, dmg: dm * 0.03, seed: p.seed + 20 }));
    tur.add(box(1.3, 0.55, 1.2, paint, { y: 0.55, z: 0.7, dmg: dm * 0.04, seed: p.seed + 21 }));
    tur.add(cyl(0.12, 0.14, 3.2, dark, { y: 0.55, z: 2.6, rx: Math.PI / 2, radial: 12 }));
    tur.add(cyl(0.2, 0.2, 1.2, gray, { y: 0.55, z: 1.7, rx: Math.PI / 2, radial: 12 }));
    tur.add(box(0.3, 0.3, 0.5, dark, { y: 0.55, z: 4.1 }));
    tur.add(cyl(0.4, 0.4, 0.2, gray, { x: -0.5, y: 0.75, z: -0.4, radial: 12 }));
    tur.add(cyl(0.015, 0.02, 0.1, dark, { x: -0.5, y: 0.95, z: -0.4, radial: 6 }));
    tur.add(cyl(0.025, 0.025, 1.0, dark, { x: -0.5, y: 1.0, z: -0.15, rx: Math.PI / 2, radial: 6 }));
    tur.add(box(0.5, 0.35, 0.6, rust, { x: 0.0, y: 0.45, z: -1.1, dmg: dm * 0.03, seed: p.seed + 22 }));
    tur.add(cyl(0.02, 0.02, 2.6, dark, { x: 0.8, y: 1.6, z: -0.9, radial: 4 }));
    tur.add(box(0.02, 0.35, 0.22, M.glow(0xff6a3a, 1.4), { x: 0.8, y: 2.7, z: -0.8 }));
    obj.add(tur, { mass: 400, collider: 'none' });
    obj.anim.turret = tur;
    // Scheinwerfer, Auspuff, Gepäck
    for (const s of [-1, 1]) obj.add(cyl(0.14, 0.16, 0.12, M.glow(0xfff0c8, 3), { x: s * 0.8, y: Y + 0.55, z: 3.0, rx: Math.PI / 2 - 0.4, radial: 12 }), { mass: 1, collider: 'none' });
    for (const s of [-1, 1]) obj.add(cyl(0.12, 0.14, 0.9, rust, { x: s * 0.8, y: Y + 0.95, z: -2.8, rx: 0.3, radial: 8 }), { mass: 4, collider: 'none' });
    obj.anim.exh = [[-0.8, Y + 1.5, -3.1], [0.8, Y + 1.5, -3.1]];
    if (p.cargo) {
      for (let i = 0; i < 3; i++) obj.add(cyl(0.28, 0.28, 0.8, M.metal(i % 2 ? 'rust' : 'blue'), { x: -0.7 + i * 0.7, y: Y + 1.4, z: -1.9, radial: 12, dmg: dm * 0.02, seed: i }), { mass: 30, collider: 'none' });
      obj.add(box(0.9, 0.5, 0.7, wood, { x: 0.45, y: Y + 1.2, z: 1.0, ry: 0.2, dmg: dm * 0.02, seed: 9 }), { mass: 20, collider: 'none' });
      obj.add(tube([[-1.0, Y + 0.8, 2.4], [-1.1, Y + 1.2, 1.4], [-1.0, Y + 1.0, 0.4]], 0.045, dark, { segs: 14 }), { mass: 3, collider: 'none' });
    }
    obj.add(box(2.1, 0.3, 0.1, hazardMat(), { y: Y + 0.15, z: -2.62 }), { mass: 3, collider: 'none' });

    const wheels = addWheels(obj, [
      { x: 1.5, z: 1.9, steer: true }, { x: -1.5, z: 1.9, steer: true },
      { x: 1.5, z: 0 }, { x: -1.5, z: 0 },
      { x: 1.5, z: -1.9 }, { x: -1.5, z: -1.9 },
    ], { R, width: 0.55, rest, rimMat: gray, mass: 90 });
    obj.vehicle = vehicleSpec(3200, wheels, { accel: 3.4, rest, travel: 0.35, maxSteer: 0.3, stiffness: 36, grip: 3.6, top: 12, steerK: 0.14 });
  },
  onFrame(obj, dt) {
    if (!alive(obj)) return;
    const t = obj.anim.turret;
    if (t && obj.params.scan) t.rotation.y = Math.sin(obj.time * 0.45) * 0.55;
    else if (t) t.rotation.y = 0;
    if (obj.anim.exh) obj.anim.exh.forEach((e, i) => emit(obj, 'e' + i, e, dt, 1.4, 'smoke', 0.7));
  },
};

/* ───────────────────────── Geschützturm ───────────────────────── */
export const turret = {
  id: 'turret',
  label: 'Geschützturm',
  category: CAT,
  tag: 'Verteidigung',
  hint: 'Schießt auf Feinde und braucht Munition.',
  params: [
    { key: 'barrels', label: 'Rohre', type: 'range', min: 1, max: 3, step: 1, value: 2 },
    { key: 'auto', label: 'Sucht Ziele (schwenkt)', type: 'bool', value: true },
    { key: 'aim', label: 'Richtung (wenn aus)', type: 'range', min: -180, max: 180, step: 1, value: 0, fmt: (v) => v + '°' },
    { key: 'fire', label: 'Feuert', type: 'bool', value: true },
    { key: 'ammo', label: 'Munitionskisten', type: 'range', min: 0, max: 4, step: 1, value: 2 },
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'sand' },
    damageParam(0.35),
    seedParam(44),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed), dm = p.damage;
    const paint = M.metal(p.pal), gray = M.metal('gray'), dark = M.metal('black'), rust = M.metal('rust'), olive = M.metal('olive');
    const conc = M.clay('white'), cloth1 = M.cloth(0xb08a5a);
    obj.add(cyl(2.7, 2.9, 0.5, conc, { y: 0.25, radial: 18, dmg: dm * 0.04, seed: p.seed }), { mass: 2500, surf: 'clay' });
    obj.add(cyl(1.3, 1.5, 1.2, paint, { y: 1.1, radial: 16, hseg: 2, dmg: dm * 0.03, seed: p.seed + 1 }), { mass: 700 });
    obj.add(torus(1.45, 0.1, dark, { y: 1.72, rx: Math.PI / 2, ts: 20, rs: 5 }), { mass: 40, collider: 'none' });
    // Kopf
    const head = new THREE.Group();
    head.position.set(0, 2.0, 0);
    head.add(cyl(1.0, 1.1, 0.35, gray, { y: 0, radial: 16 }));
    head.add(box(1.7, 0.9, 1.5, paint, { y: 0.65, z: -0.1, dmg: dm * 0.05, seed: p.seed + 2 }));
    head.add(box(1.8, 0.5, 0.5, paint, { y: 0.8, z: 0.9, rx: -0.4, dmg: dm * 0.05, seed: p.seed + 3 }));
    head.add(box(0.6, 0.25, 0.5, dark, { y: 1.25, z: -0.2 }));
    head.add(box(0.5, 0.06, 0.04, M.glow(0xff5a3a, 1.8), { y: 1.28, z: 0.06 }));
    const gun = new THREE.Group();
    gun.position.set(0, 0.8, 0.7);
    const n = p.barrels, muz = [];
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * 0.55;
      const b = new THREE.Group();
      b.position.x = x;
      b.add(cyl(0.12, 0.12, 2.6, dark, { z: 1.3, rx: Math.PI / 2, radial: 10 }));
      b.add(cyl(0.2, 0.2, 1.1, gray, { z: 0.6, rx: Math.PI / 2, radial: 10 }));
      b.add(cyl(0.2, 0.17, 0.35, rust, { z: 2.55, rx: Math.PI / 2, radial: 10 }));
      gun.add(b);
      muz.push(b);
    }
    head.add(gun);
    // Munitionsgurt und Kasten
    head.add(box(0.7, 0.55, 0.6, olive, { x: 1.2, y: 0.55, z: -0.1, dmg: dm * 0.02, seed: 6 }));
    head.add(tube([[1.0, 0.7, -0.1], [0.7, 1.1, 0.3], [0.3, 0.95, 0.7]], 0.05, gray, { segs: 14 }));
    for (let i = 0; i < 6; i++) head.add(cyl(0.025, 0.025, 0.14, M.metal('sand'), { x: 1.0 - i * 0.13, y: 0.72 + Math.sin(i * 0.6) * 0.18, z: -0.1 + i * 0.14, rz: Math.PI / 2, radial: 5 }));
    obj.add(head, { mass: 600, collider: { type: 'box', size: [1.8, 1.4, 1.8], offset: [0, 0.6, 0] } });
    obj.anim.head = head;
    obj.anim.gun = gun;
    obj.anim.muz = muz;
    obj.anim.fireT = 0;
    // Sandsäcke und Munition
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.1;
      if (Math.abs(a - Math.PI) < 0.35) continue;
      const s = sph(0.3, cloth1, { x: Math.sin(a) * 2.35, y: 0.7 + (i % 2) * 0.28, z: Math.cos(a) * 2.35, sx: 1.4, sy: 0.7, sz: 0.9, ry: a + Math.PI / 2, ws: 10, hs: 7 });
      obj.add(s, { mass: 15, surf: 'cloth', collider: 'none' });
    }
    for (let i = 0; i < p.ammo; i++) {
      const c = box(0.8, 0.5, 0.5, i % 2 ? olive : M.wood(0xb89c76), { x: -1.2 + i * 0.9, y: 0.75, z: -2.3, ry: (rng() - 0.5) * 0.5, dmg: dm * 0.02, seed: 10 + i });
      obj.add(c, { mass: 40, surf: 'wood', collider: { type: 'box', size: [0.8, 0.5, 0.5] } });
    }
    obj.add(lampPost(3.0, gray, 0xfff0c8, 2.4, [-2.2, 0.5, 1.6]), { mass: 15, collider: 'none' });
  },
  onFrame(obj, dt) {
    if (!alive(obj)) return;
    const a = obj.anim, t = obj.time;
    const yaw = obj.params.auto ? Math.sin(t * 0.5) * 1.5 + Math.sin(t * 1.3) * 0.2 : (obj.params.aim * Math.PI) / 180;
    a.head.rotation.y += (yaw - a.head.rotation.y) * Math.min(1, dt * 4);
    a.gun.rotation.x = -(0.1 + 0.06 * Math.sin(t * 0.8));
    if (!obj.params.fire) { a.gun.position.z = 0.7; return; }
    a.fireT += dt;
    const cycle = 2.6, ph = a.fireT % cycle;
    // Feuerstoß: 5 Schüsse in der ersten Sekunde
    const burst = ph < 1.0 ? Math.floor(ph / 0.2) : -1;
    const kick = ph < 1.0 ? Math.max(0, 1 - ((ph % 0.2) / 0.2) * 3) : 0;
    a.gun.position.z = 0.7 - kick * 0.18;
    if (burst >= 0 && burst !== a.lastBurst) {
      a.lastBurst = burst;
      for (const m of a.muz) {
        _v.set(m.position.x, 0, 2.8);
        a.gun.localToWorld(_v);
        env.fx.flame(_v, 0.5);
        env.fx.sparks(_v, 4, 0.5);
      }
    }
    if (ph >= 1.0) a.lastBurst = -1;
  },
};

/* ───────────────────────── Schildgenerator ───────────────────────── */
export const shieldGen = {
  id: 'shieldGen',
  label: 'Schildgenerator',
  category: CAT,
  tag: 'Level 10',
  hint: 'Fängt Schaden im Umkreis ab.',
  params: [
    { key: 'radius', label: 'Schildradius', type: 'range', min: 5, max: 16, step: 0.5, value: 10, unit: 'm' },
    { key: 'shield', label: 'Schild aktiv', type: 'bool', value: true },
    { key: 'color', label: 'Farbe', type: 'select', options: [['cyan', 'Cyan'], ['amber', 'Bernstein'], ['green', 'Grün'], ['violet', 'Violett']], value: 'cyan' },
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'white' },
    damageParam(0.25),
    seedParam(45),
  ],
  build(obj, p) {
    const dm = p.damage;
    const col = { cyan: 0x58c8ff, amber: 0xffb43a, green: 0x4dffa0, violet: 0xa266ff }[p.color];
    const paint = M.metal(p.pal), gray = M.metal('gray'), dark = M.metal('black'), conc = M.clay('white');
    obj.add(cyl(3.0, 3.3, 0.5, conc, { y: 0.25, radial: 8, dmg: dm * 0.04, seed: p.seed }), { mass: 3000, surf: 'clay', fracture: [3, 1, 3] });
    obj.add(cyl(1.0, 1.3, 3.2, paint, { y: 2.1, radial: 12, hseg: 3, dmg: dm * 0.03, seed: p.seed + 1 }), { mass: 900 });
    obj.add(cyl(1.15, 1.15, 0.2, gray, { y: 3.8, radial: 12 }), { mass: 60, collider: 'none' });
    // Kristallkern im Glasrohr
    obj.add(cyl(0.45, 0.45, 2.4, M.glass(0x78a8b8, 0.35), { y: 5.1, radial: 12, cast: false }), { mass: 20, collider: 'none' });
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x102028, emissive: col, emissiveIntensity: 2, roughness: 0.2, transparent: true, opacity: 0.95 });
    obj.anim.core = coreMat;
    const core = crystal(1.8, 0.32, { y: 5.1 }, col, 2);
    core.material = coreMat;
    obj.add(core, { mass: 10, collider: 'none' });
    obj.add(cyl(0.6, 0.45, 0.3, dark, { y: 6.45, radial: 12 }), { mass: 10, collider: 'none' });
    // Rotierende Ringe
    const rings = new THREE.Group();
    rings.position.y = 5.1;
    rings.add(torus(1.5, 0.08, gray, { rx: Math.PI / 2, ts: 32, rs: 6 }));
    const r2 = torus(1.25, 0.06, M.glow(col, 1.6), { ts: 32, rs: 5 });
    r2.rotation.x = 0.9;
    rings.add(r2);
    obj.add(rings, { mass: 40, collider: 'none' });
    obj.anim.rings = rings;
    // Vier Emitterpylone
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const g = new THREE.Group();
      g.position.set(Math.sin(a) * 2.4, 0.5, Math.cos(a) * 2.4);
      g.add(cyl(0.2, 0.3, 2.4, paint, { y: 1.2, radial: 8, dmg: dm * 0.02, seed: p.seed + 10 + i }));
      g.add(sph(0.26, M.glow(col, 2.2), { y: 2.6, ws: 10, hs: 8 }));
      g.add(cyl(0.05, 0.05, 0.5, gray, { y: 2.45, radial: 6 }));
      obj.add(g, { mass: 150, surf: 'metal', collider: { type: 'cyl', r: 0.28, h: 2.4, offset: [0, 1.2, 0] } });
      obj.add(tube([[Math.sin(a) * 2.4, 3.0, Math.cos(a) * 2.4], [Math.sin(a) * 1.5, 4.4 + (i % 2) * 0.4, Math.cos(a) * 1.5], [0, 5.1, 0]], 0.03, M.glow(col, 1.5), { segs: 14 }), { mass: 1, collider: 'none' });
    }
    // Schildkuppel (verschwindet beim Explodieren)
    const dome = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const wire = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, wireframe: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    obj.anim.dome = dome;
    obj.anim.wire = wire;
    const R = p.radius;
    const d1 = mk(new THREE.SphereGeometry(R, 40, 18, 0, Math.PI * 2, 0, Math.PI / 2), dome, { cast: false, recv: false });
    // Drahtgitter nur oberhalb des Bodens: Dreiecke der Ikosphäre mit y < 0 verwerfen
    const ico = new THREE.IcosahedronGeometry(R * 1.003, 3);
    const ip = ico.attributes.position, keep = [];
    for (let i = 0; i < ip.count; i += 3) {
      if (ip.getY(i) >= -0.01 && ip.getY(i + 1) >= -0.01 && ip.getY(i + 2) >= -0.01) for (let k = 0; k < 3; k++) keep.push(ip.getX(i + k), ip.getY(i + k), ip.getZ(i + k));
    }
    const hemi = new THREE.BufferGeometry();
    hemi.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3));
    const d2 = mk(hemi, wire, { cast: false, recv: false });
    d1.visible = d2.visible = p.shield;
    d1.renderOrder = d2.renderOrder = 5;
    obj.add(d1, { mass: 1, collider: 'none', vanish: true, order: 99 });
    obj.add(d2, { mass: 1, collider: 'none', vanish: true, order: 99 });
    obj.anim.domes = [d1, d2];

    const L = new THREE.PointLight(col, 26, 16, 2);
    L.position.set(0, 5.1, 0);
    obj.light(L);
  },
  onFrame(obj, dt) {
    if (!alive(obj)) return;
    const a = obj.anim, t = obj.time, on = obj.params.shield;
    a.rings.rotation.y += dt * 1.6;
    a.rings.rotation.z = Math.sin(t * 0.7) * 0.25;
    a.core.emissiveIntensity = 1.4 + 1.4 * (0.5 + 0.5 * Math.sin(t * 3));
    for (const d of a.domes) d.visible = on;
    a.dome.opacity = 0.1 + 0.06 * (0.5 + 0.5 * Math.sin(t * 1.9));
    a.wire.opacity = 0.22 + 0.16 * (0.5 + 0.5 * Math.sin(t * 2.7 + 1));
  },
};
