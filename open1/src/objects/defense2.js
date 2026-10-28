// Verteidigung & Truppen, Teil 2: Raumflughafen, Steuerrelais, Radarstation, Forschungsstation, Fackelturm.
import * as THREE from 'three';
import { tube } from '../core/helpers.js';
import {
  M, box, cyl, sph, torus, mk, mulberry32, crystal, crystalCluster, hazardMat,
  railing, ladder, strut, lattice, lampPost, emit, flicker, alive, pulse,
} from './kit.js';
import { damageParam, seedParam, PAL_OPTIONS } from './_common.js';

const CAT = 'Verteidigung & Truppen';

/* ───────────────────────── Raumflughafen ───────────────────────── */
export const spaceport = {
  id: 'spaceport',
  label: 'Raumflughafen',
  category: CAT,
  tag: 'Level 10',
  hint: 'Raketenbasis für den Start.',
  params: [
    { key: 'rocketH', label: 'Raketenhöhe', type: 'range', min: 14, max: 26, step: 0.5, value: 20, unit: 'm' },
    { key: 'boosters', label: 'Zusatzbooster', type: 'range', min: 0, max: 4, step: 1, value: 3 },
    { key: 'gantry', label: 'Startturm', type: 'bool', value: true },
    { key: 'tanks', label: 'Treibstofftanks', type: 'range', min: 0, max: 3, step: 1, value: 2 },
    { key: 'steam', label: 'Dampf & Warnlichter', type: 'bool', value: true },
    { key: 'pal', label: 'Raketenlack', type: 'select', options: PAL_OPTIONS, value: 'white' },
    damageParam(0.3),
    seedParam(51),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed), dm = p.damage, H = p.rocketH;
    const paint = M.metal(p.pal), gray = M.metal('gray'), dark = M.metal('black'), rust = M.metal('rust'), white = M.metal('white'), red = M.metal('red');
    const conc = M.clay('white');
    // Startplatte
    obj.add(cyl(13, 13.4, 0.5, conc, { y: 0.25, radial: 32, dmg: dm * 0.04, seed: p.seed }), { mass: 15000, surf: 'clay', fracture: [5, 1, 5] });
    obj.add(torus(10.2, 0.12, hazardMat(), { y: 0.52, rx: Math.PI / 2, ts: 48, rs: 4, cast: false }), { mass: 5, collider: 'none' });
    obj.add(cyl(3.6, 3.6, 0.1, dark, { y: 0.55, radial: 24, cast: false }), { mass: 20, collider: 'none' });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      obj.add(box(2.4, 0.12, 1.0, dark, { x: Math.sin(a) * 4.5, y: 0.56, z: Math.cos(a) * 4.5, ry: a }), { mass: 20, collider: 'none' });
    }

    // Rakete
    {
      const g = new THREE.Group();
      g.position.y = 0.5;
      const h1 = H * 0.46, h2 = H * 0.28, h3 = H * 0.2;
      g.add(cyl(1.4, 1.5, 1.0, dark, { y: 0.5, radial: 20 }));
      g.add(cyl(1.4, 1.4, h1, paint, { y: 1.0 + h1 / 2, radial: 22, hseg: 5, dmg: dm * 0.02, seed: p.seed + 1 }));
      g.add(cyl(1.42, 1.42, 0.8, red, { y: 1.0 + h1 * 0.62, radial: 22 }));
      g.add(cyl(1.15, 1.4, 0.5, dark, { y: 1.0 + h1 + 0.25, radial: 22 }));
      g.add(cyl(1.15, 1.15, h2, paint, { y: 1.5 + h1 + h2 / 2, radial: 22, hseg: 4, dmg: dm * 0.02, seed: p.seed + 2 }));
      g.add(cyl(0.12, 1.15, h3, paint, { y: 1.5 + h1 + h2 + h3 / 2, radial: 22, hseg: 2, dmg: dm * 0.015, seed: p.seed + 3 }));
      g.add(cyl(0.0, 0.14, 0.8, red, { y: 1.5 + h1 + h2 + h3 + 0.3, radial: 8 }));
      // Triebwerke
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        g.add(cyl(0.35, 0.6, 0.9, rust, { x: Math.sin(a) * 0.7, y: -0.1, z: Math.cos(a) * 0.7, radial: 12 }));
      }
      // Leitwerk
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const f = box(0.14, 2.6, 1.9, red, { x: Math.sin(a) * 1.9, y: 2.0, z: Math.cos(a) * 1.9, ry: a + Math.PI / 2, dmg: dm * 0.04, seed: p.seed + 8 + i });
        g.add(f);
      }
      // Booster
      for (let i = 0; i < p.boosters; i++) {
        const a = (i / p.boosters) * Math.PI * 2 + 0.5;
        const bh = h1 * 0.85;
        g.add(cyl(0.52, 0.55, bh, white, { x: Math.sin(a) * 1.95, y: 0.9 + bh / 2, z: Math.cos(a) * 1.95, radial: 14, dmg: dm * 0.02, seed: p.seed + 14 + i }));
        g.add(cyl(0.0, 0.52, 1.2, red, { x: Math.sin(a) * 1.95, y: 0.9 + bh + 0.6, z: Math.cos(a) * 1.95, radial: 14 }));
        g.add(cyl(0.3, 0.45, 0.6, dark, { x: Math.sin(a) * 1.95, y: 0.5, z: Math.cos(a) * 1.95, radial: 10 }));
      }
      // Nutzlast-Luken, Schriftbänder
      for (const y of [0.3, 0.45]) g.add(box(0.5, 0.18, 0.04, M.glow(0xffa24a, 1.1), { y: 1.0 + h1 * y + h1 * 0.55, z: 1.41 }));
      obj.add(g, { mass: 9000, surf: 'metal', collider: { type: 'cyl', r: 1.6, h: H, offset: [0, H / 2 - 0.1, 0] } });
    }

    // Startturm
    if (p.gantry) {
      const GH = H * 0.78, gx = 5.0;
      const g = new THREE.Group();
      g.position.set(gx, 0.5, 0);
      g.add(lattice(1.3, 1.0, GH, Math.max(4, Math.round(GH / 2.8)), gray, dark, 0.11));
      g.add(box(2.8, 0.2, 2.8, gray, { y: GH + 0.05 }));
      g.add(cyl(0.05, 0.07, 3.6, gray, { y: GH + 1.9, radial: 6 }));
      // Schwenkarme zur Rakete
      for (const y of [GH * 0.45, GH * 0.8]) {
        g.add(box(3.4, 0.28, 0.7, rust, { x: -2.2, y, dmg: dm * 0.02, seed: 4 }));
        g.add(box(0.7, 0.5, 0.9, hazardMat(), { x: -3.85, y }));
        g.add(tube([[-1.2, y - 0.2, 0.5], [-2.8, y - 0.9, 0.7], [-3.7, y - 0.3, 0.2]], 0.07, dark, { segs: 14 }));
      }
      g.add(ladder(GH, dark, { x: 1.0, z: 1.35 }));
      obj.add(g, { mass: 2400, surf: 'metal', collider: { type: 'box', size: [2.6, GH, 2.6], offset: [0, GH / 2, 0] } });
      const bc = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2a12, emissiveIntensity: 2 }));
      bc.position.set(gx, 0.5 + GH + 3.8, 0);
      obj.anim.beacons = [bc];
      obj.add(bc, { mass: 1, collider: 'none' });
    }

    // Tanks
    for (let i = 0; i < p.tanks; i++) {
      const g = new THREE.Group();
      g.position.set(-8.4 + (i % 2) * 0.0, 0.5, -3.2 + i * 3.6 - (p.tanks - 1) * 1.2);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(strut([x * 1.2, 0, z * 1.2], [x * 0.7, 1.4, z * 0.7], 0.09, gray));
      g.add(sph(1.7, white, { y: 3.0, ws: 22, hs: 16, dmg: dm * 0.02, seed: p.seed + 30 + i }));
      g.add(torus(1.7, 0.05, dark, { y: 3.0, rx: Math.PI / 2, ts: 22, rs: 4 }));
      obj.add(g, { mass: 1500, surf: 'metal', collider: { type: 'cyl', r: 1.7, h: 4.7, offset: [0, 2.4, 0] } });
      obj.add(tube([[-8.0, 1.2, g.position.z + 1.2], [-4.5, 0.7, g.position.z * 0.6], [-1.9, 0.9, 0.4]], 0.14, gray, { segs: 20 }), { mass: 15, collider: 'none' });
    }

    // Kontrollbunker + Schutzwall
    obj.add(box(5.4, 2.6, 3.4, conc, { x: 2, y: 1.8, z: -9.6, dmg: dm * 0.05, seed: p.seed + 40 }), { mass: 2600, surf: 'clay', fracture: [3, 2, 2] });
    obj.add(box(3.4, 0.9, 0.08, M.glass(0x4a6068, 0.5), { x: 2, y: 2.4, z: -7.9, rx: -0.3, cast: false }), { mass: 4, collider: 'none' });
    obj.add(box(3.0, 0.25, 0.1, M.glow(0x62ffb0, 1.1), { x: 2, y: 1.7, z: -7.88 }), { mass: 1, collider: 'none' });
    obj.add(cyl(0.04, 0.05, 3.5, gray, { x: 4.2, y: 4.4, z: -9.6, radial: 6 }), { mass: 4, collider: 'none' });
    // Blitzschutzmasten
    obj.anim.beacons ??= [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.8, x = Math.sin(a) * 11.5, z = Math.cos(a) * 11.5;
      obj.add(cyl(0.05, 0.09, 8, gray, { x, y: 4.5, z, radial: 6 }), { mass: 25, collider: 'none' });
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff2a12, emissiveIntensity: 2 }));
      b.position.set(x, 8.6, z);
      obj.anim.beacons.push(b);
      obj.add(b, { mass: 1, collider: 'none' });
    }
    // Dampfauslässe
    obj.anim.vents = [[-3.2, 0.7, -3.2], [3.2, 0.7, 3.2]];
    for (const [x, y, z] of obj.anim.vents) obj.add(cyl(0.25, 0.3, 0.4, dark, { x, y, z, radial: 10 }), { mass: 20, collider: 'none' });

    const L = new THREE.PointLight(0xfff0d0, 40, 28, 2);
    L.position.set(-6, 9, 6);
    obj.light(L);
  },
  onFrame(obj, dt) {
    if (!alive(obj)) return;
    const on = obj.params.steam;
    (obj.anim.beacons ?? []).forEach((b, i) => {
      b.material.emissiveIntensity = on ? 0.1 + 3 * Math.max(0, Math.sin(obj.time * 2.4 + i * 1.3)) : 0.1;
    });
    if (on) (obj.anim.vents ?? []).forEach((v, i) => emit(obj, 'v' + i, v, dt, 1.6, 'smoke', 0.9));
  },
};

/* ───────────────────────── Steuerrelais ───────────────────────── */
export const relay = {
  id: 'relay',
  label: 'Steuerrelais',
  category: CAT,
  tag: 'Level 10',
  hint: 'Aktivierungspunkt der Startmission.',
  params: [
    { key: 'active', label: 'Aktiviert', type: 'bool', value: true },
    { key: 'beamH', label: 'Strahlhöhe', type: 'range', min: 6, max: 40, step: 1, value: 22, unit: 'm' },
    { key: 'color', label: 'Farbe', type: 'select', options: [['amber', 'Bernstein'], ['cyan', 'Cyan'], ['green', 'Grün'], ['violet', 'Violett']], value: 'amber' },
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'gray' },
    damageParam(0.3),
    seedParam(52),
  ],
  build(obj, p) {
    const dm = p.damage;
    const col = { amber: 0xffb43a, cyan: 0x58c8ff, green: 0x4dffa0, violet: 0xa266ff }[p.color];
    const paint = M.metal(p.pal), gray = M.metal('gray'), dark = M.metal('black'), rust = M.metal('rust');
    const conc = M.clay('white'), glow = M.glow(col, 1.6);
    obj.add(cyl(4.2, 4.5, 0.5, conc, { y: 0.25, radial: 6, dmg: dm * 0.04, seed: p.seed }), { mass: 3500, surf: 'clay', fracture: [3, 1, 3] });
    // Bodensymbol: Ringe und Speichen
    for (const R of [2.4, 3.4]) obj.add(torus(R, 0.07, glow, { y: 0.52, rx: Math.PI / 2, ts: 40, rs: 4, cast: false }), { mass: 2, collider: 'none' });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      obj.add(box(0.1, 0.03, 1.0, glow, { x: Math.sin(a) * 2.9, y: 0.52, z: Math.cos(a) * 2.9, ry: a, cast: false }), { mass: 1, collider: 'none' });
    }
    // Sockel mit Pult
    obj.add(cyl(0.85, 1.05, 1.3, paint, { y: 1.15, radial: 10, hseg: 2, dmg: dm * 0.03, seed: p.seed + 1 }), { mass: 800 });
    obj.add(box(1.4, 0.18, 0.9, dark, { y: 1.9, z: 0.35, rx: -0.5 }), { mass: 40, collider: 'none' });
    obj.add(box(1.2, 0.04, 0.7, M.glow(col, 1.2), { y: 1.93, z: 0.38, rx: -0.5 }), { mass: 1, collider: 'none' });
    obj.add(cyl(0.3, 0.3, 0.3, gray, { y: 1.95, z: -0.4, radial: 10 }), { mass: 20, collider: 'none' });
    // schwebender Kern + Ringe
    const holo = new THREE.Group();
    holo.position.y = 3.4;
    const gem = crystal(1.0, 0.3, {}, col, 2);
    holo.add(gem);
    const r1 = torus(0.9, 0.04, glow, { rx: Math.PI / 2, ts: 32, rs: 4, cast: false });
    const r2 = torus(1.15, 0.03, glow, { rx: Math.PI / 2, ts: 32, rs: 4, cast: false });
    r2.rotation.x = 1.0;
    holo.add(r1, r2);
    obj.add(holo, { mass: 5, collider: 'none', vanish: true });
    obj.anim.holo = holo;
    obj.anim.r2 = r2;
    // Strahl
    const beamMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const beam = mk(new THREE.CylinderGeometry(0.16, 0.5, 1, 14, 1, true), beamMat, { cast: false, recv: false });
    beam.renderOrder = 4;
    obj.add(beam, { mass: 1, collider: 'none', vanish: true, order: 99 });
    obj.anim.beam = beam;
    obj.anim.beamMat = beamMat;
    // Pylone mit Schüsseln
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      const g = new THREE.Group();
      g.position.set(Math.sin(a) * 3.4, 0.5, Math.cos(a) * 3.4);
      g.rotation.y = a + Math.PI;
      g.add(cyl(0.12, 0.2, 2.8, paint, { y: 1.4, radial: 8, dmg: dm * 0.02, seed: p.seed + 10 + i }));
      g.add(sph(0.45, M.metal('white', { side: THREE.DoubleSide }), { y: 2.9, z: 0.1, rx: -(Math.PI / 2 + 0.3), thetaLength: 1.1, ws: 14, hs: 6 }));
      g.add(sph(0.1, glow, { y: 2.9, z: 0.45, ws: 8, hs: 6 }));
      obj.add(g, { mass: 150, surf: 'metal', collider: { type: 'cyl', r: 0.22, h: 3.0, offset: [0, 1.5, 0] } });
    }
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      obj.add(tube([[Math.sin(a) * 3.3, 0.55, Math.cos(a) * 3.3], [Math.sin(a) * 2.0, 0.5, Math.cos(a) * 2.0 + 0.3], [0, 0.7, 0.9]], 0.05, dark, { segs: 14 }), { mass: 2, collider: 'none' });
    }
    const L = new THREE.PointLight(col, 30, 18, 2);
    L.position.set(0, 3.4, 0);
    obj.light(L);
  },
  onFrame(obj, dt) {
    if (!alive(obj)) return;
    const a = obj.anim, on = obj.params.active, t = obj.time;
    a.holo.visible = on;
    a.beam.visible = on;
    const H = obj.params.beamH;
    a.beam.scale.set(1, H, 1);
    a.beam.position.y = 0.5 + H / 2;
    a.beamMat.opacity = 0.16 + 0.1 * Math.sin(t * 2.2);
    a.holo.rotation.y += dt * 1.1;
    a.holo.position.y = 3.4 + Math.sin(t * 1.3) * 0.12;
    a.r2.rotation.z += dt * 1.9;
    const l = obj.lights[0];
    if (l) l.light.intensity = on ? l.base * (0.85 + 0.15 * Math.sin(t * 2.2)) : l.base * 0.12;
  },
};

/* ───────────────────────── Radarstation ───────────────────────── */
export const radar = {
  id: 'radar',
  label: 'Radarstation',
  category: CAT,
  tag: 'Erkundung',
  hint: 'Findet Signale und erkundet Felder.',
  params: [
    { key: 'towerH', label: 'Turmhöhe', type: 'range', min: 4, max: 12, step: 0.5, value: 7, unit: 'm' },
    { key: 'dish', label: 'Schüsseldurchmesser', type: 'range', min: 3, max: 7, step: 0.1, value: 5, unit: 'm' },
    { key: 'speed', label: 'Drehtempo', type: 'range', min: 0, max: 2, step: 0.05, value: 0.6, unit: ' rad/s' },
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'white' },
    damageParam(0.35),
    seedParam(53),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed), dm = p.damage, TH = p.towerH, R = p.dish / 2;
    const paint = M.metal(p.pal), gray = M.metal('gray'), dark = M.metal('black'), rust = M.metal('rust'), olive = M.metal('olive');
    const conc = M.clay('white');
    obj.add(box(12, 0.4, 9, conc, { x: 0, y: 0.2, dmg: dm * 0.04, seed: p.seed }), { mass: 4500, surf: 'clay', fracture: [4, 1, 3] });
    // Turm
    {
      const g = new THREE.Group();
      g.position.set(0, 0.4, 0);
      g.add(lattice(1.5, 0.9, TH, Math.max(3, Math.round(TH / 2.2)), gray, dark, 0.1));
      g.add(box(2.4, 0.25, 2.4, gray, { y: TH + 0.1 }));
      g.add(railing(2.4, dark, { y: TH + 0.22, z: 1.2 }));
      g.add(railing(2.4, dark, { y: TH + 0.22, z: -1.2 }));
      g.add(ladder(TH, dark, { x: 1.0, z: 1.5 }));
      obj.add(g, { mass: 1400, surf: 'metal', collider: { type: 'box', size: [2.4, TH, 2.4], offset: [0, TH / 2, 0] } });
    }
    // Drehkopf mit Schüssel
    const ant = new THREE.Group();
    ant.position.set(0, 0.4 + TH + 0.35, 0);
    ant.add(cyl(0.5, 0.65, 0.7, dark, { y: 0.2, radial: 12 }));
    ant.add(box(0.2, 1.3, 0.3, gray, { x: R * 0.72, y: 1.0 }));
    ant.add(box(0.2, 1.3, 0.3, gray, { x: -R * 0.72, y: 1.0 }));
    ant.add(box(R * 1.6, 0.2, 0.3, gray, { y: 0.45 }));
    const dishG = new THREE.Group();
    dishG.position.set(0, 1.5, 0);
    dishG.rotation.x = -2.1;
    dishG.add(sph(R * 1.25, M.metal(p.pal, { side: THREE.DoubleSide }), { y: -R * 1.25, thetaLength: Math.asin(R / (R * 1.25)), ws: 28, hs: 8, dmg: dm * 0.01, seed: p.seed + 5 }));
    dishG.add(torus(R * 0.98, 0.05, gray, { y: -R * 1.25 * (1 - Math.cos(Math.asin(0.8))) , rx: Math.PI / 2, ts: 28, rs: 5 }));
    dishG.add(cyl(0.045, 0.05, R * 1.0, gray, { y: -R * 0.5, radial: 6 }));
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.3;
      dishG.add(strut([Math.sin(a) * R, -R * 0.5, Math.cos(a) * R], [0, -R * 1.0, 0], 0.025, dark));
    }
    dishG.add(box(0.24, 0.3, 0.24, dark, { y: -R * 1.02 }));
    dishG.add(sph(0.06, M.glow(0xff7a3a, 2), { y: -R * 1.15, ws: 6, hs: 5 }));
    ant.add(dishG);
    // Zusatzantenne und Warnlicht
    ant.add(cyl(0.025, 0.03, 1.8, gray, { x: 0.45, y: 1.2, z: -0.4, radial: 5 }));
    ant.add(box(1.0, 0.05, 0.05, gray, { x: 0.45, y: 2.0, z: -0.4 }));
    obj.add(ant, { mass: 500, collider: 'none' });
    obj.anim.ant = ant;
    // Container, Generator, Kabel
    obj.add(box(4.6, 2.7, 3.0, paint, { x: -4.2, y: 1.75, z: 1.2, dmg: dm * 0.05, seed: p.seed + 20 }), { mass: 900, fracture: [3, 2, 2] });
    obj.add(box(0.95, 1.9, 0.08, dark, { x: -3.3, y: 1.35, z: 2.74 }), { mass: 15, collider: 'none' });
    obj.add(box(1.0, 0.45, 0.06, M.glow(0xffb060, 1.3), { x: -5.2, y: 2.3, z: 2.72 }), { mass: 1, collider: 'none' });
    for (let i = 0; i < 3; i++) obj.add(box(0.7, 0.18, 0.08, gray, { x: -5.4 + i * 0.9, y: 2.9, z: 2.7 }), { mass: 2, collider: 'none' });
    obj.add(box(1.9, 1.3, 1.2, olive, { x: 3.8, y: 1.05, z: 2.2, dmg: dm * 0.04, seed: p.seed + 21 }), { mass: 300 });
    obj.add(cyl(0.1, 0.12, 1.5, rust, { x: 3.4, y: 2.4, z: 2.2, radial: 8 }), { mass: 5, collider: 'none' });
    obj.add(tube([[-1.9, 0.5, 0.8], [-0.8, 0.45, 0.3], [0.0, 0.8, 0.0]], 0.07, dark, { segs: 14 }), { mass: 3, collider: 'none' });
    obj.add(tube([[3.0, 0.8, 2.0], [1.4, 0.45, 1.2], [0.4, 0.6, 0.4]], 0.07, dark, { segs: 14 }), { mass: 3, collider: 'none' });
    obj.anim.exh = [[3.4, 3.25, 2.2]];
    obj.add(lampPost(3.4, gray, 0xfff0c8, 2.4, [-1.8, 0.4, 3.5]), { mass: 15, collider: 'none' });
    const L = new THREE.PointLight(0xffb868, 14, 12, 2);
    L.position.set(-3.5, 3.2, 3.4);
    obj.light(L);
  },
  onFrame(obj, dt) {
    if (!alive(obj)) return;
    obj.anim.ant.rotation.y += dt * obj.params.speed;
    obj.anim.exh.forEach((e, i) => emit(obj, 'e' + i, e, dt, 0.8, 'smoke', 0.5));
  },
};

/* ───────────────────────── Forschungsstation ───────────────────────── */
export const lab = {
  id: 'lab',
  label: 'Forschungsstation',
  category: CAT,
  tag: 'Erkundung',
  hint: 'Untersucht Relikte.',
  params: [
    { key: 'pods', label: 'Labormodule', type: 'range', min: 1, max: 3, step: 1, value: 2 },
    { key: 'relic', label: 'Relikt in der Grabung', type: 'bool', value: true },
    { key: 'glow', label: 'Relikt-Leuchten', type: 'range', min: 0, max: 3, step: 0.05, value: 1.6 },
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'white' },
    damageParam(0.3),
    seedParam(54),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed), dm = p.damage;
    const paint = M.metal(p.pal), gray = M.metal('gray'), dark = M.metal('black'), rust = M.metal('rust'), olive = M.metal('olive');
    const conc = M.clay('white'), adobe = M.clay('adobe'), stone = M.clay('dark'), wood = M.wood(0xb89c76);
    obj.add(box(22, 0.4, 14, conc, { x: 0, y: 0.2, dmg: dm * 0.04, seed: p.seed }), { mass: 9000, surf: 'clay', fracture: [5, 1, 3] });

    // Hauptlabor
    obj.add(box(6.4, 3.0, 4.4, paint, { x: -5.5, y: 1.9, z: -1.8, dmg: dm * 0.05, seed: p.seed + 1 }), { mass: 1800, fracture: [3, 2, 2] });
    obj.add(box(6.6, 0.2, 4.6, gray, { x: -5.5, y: 3.5, z: -1.8 }), { mass: 100, collider: 'none' });
    obj.add(box(3.4, 0.14, 2.2, M.glass(0x4b6670, 0.55), { x: -5.5, y: 3.65, z: -1.8, cast: false }), { mass: 8, collider: 'none' });
    for (let i = 0; i < 3; i++) obj.add(box(1.0, 0.8, 0.06, M.glow(0xffe0b0, 1.2), { x: -7.3 + i * 1.8, y: 2.3, z: 0.42 }), { mass: 1, collider: 'none' });
    obj.add(box(1.0, 2.0, 0.08, dark, { x: -3.4, y: 1.4, z: 0.42 }), { mass: 15, collider: 'none' });
    // Klimageräte
    for (let i = 0; i < 2; i++) obj.add(box(1.1, 0.7, 0.9, olive, { x: -7.5 + i * 1.5, y: 4.0, z: -2.6, dmg: dm * 0.03, seed: 30 + i }), { mass: 60, collider: 'none' });

    // Module (Kuppeln) mit Verbindungsgang
    for (let i = 0; i < p.pods; i++) {
      const x = -5.2 + i * 4.2, z = 4.0;
      const g = new THREE.Group();
      g.position.set(x, 0.4, z);
      g.add(cyl(1.7, 1.8, 1.4, paint, { y: 0.7, radial: 18, dmg: dm * 0.03, seed: p.seed + 10 + i }));
      g.add(sph(1.7, paint, { y: 1.4, thetaLength: Math.PI / 2, ws: 18, hs: 7, dmg: dm * 0.02, seed: p.seed + 14 + i }));
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + 0.4;
        g.add(cyl(0.2, 0.2, 0.1, M.glow(0xffd8a0, 1.3), { x: Math.sin(a) * 1.78, y: 0.85, z: Math.cos(a) * 1.78, rx: Math.PI / 2, ry: a, radial: 10 }));
      }
      g.add(cyl(0.03, 0.03, 1.0, gray, { y: 3.4, radial: 4 }));
      obj.add(g, { mass: 900, surf: 'metal', collider: { type: 'cyl', r: 1.75, h: 2.9, offset: [0, 1.4, 0] } });
      obj.add(cyl(0.4, 0.4, 1.9, gray, { x, y: 0.9, z: 2.3, rx: Math.PI / 2, radial: 10 }), { mass: 30, collider: 'none' });
    }

    // Grabungsstelle
    const pit = new THREE.Group();
    pit.position.set(6.0, 0.4, 0);
    pit.add(mk(new THREE.CylinderGeometry(3.6, 3.6, 0.05, 28), M.clay('dark', { sandBias: 6 }), { y: 0.03, cast: false }));
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2, r = 0.35 + rng() * 0.45;
      pit.add(sph(r, adobe, { x: Math.cos(a) * 3.8, y: r * 0.3, z: Math.sin(a) * 3.8, sy: 0.6, ws: 9, hs: 6, dmg: 0.1, seed: i }));
    }
    obj.add(pit, { mass: 300, surf: 'clay', collider: 'none', order: 0 });
    if (p.relic) {
      const g = new THREE.Group();
      g.position.set(6.0, 0.4, 0);
      g.rotation.set(0.06, 0.4, -0.08);
      g.add(box(1.6, 4.4, 0.8, stone, { y: 2.2, dmg: dm * 0.04, seed: p.seed + 40 }));
      g.add(box(1.0, 0.8, 0.8, stone, { x: 0.3, y: 4.7, ry: 0.4, rz: 0.4, dmg: 0.03, seed: p.seed + 41 }));
      const gl = M.glow(0xffb43a, p.glow);
      for (let i = 0; i < 7; i++) {
        g.add(box(0.7 - (i % 2) * 0.3, 0.07, 0.04, gl, { x: (i % 2 ? 0.2 : -0.15), y: 0.9 + i * 0.55, z: 0.42 }));
        if (i % 3 === 0) g.add(box(0.07, 0.4, 0.04, gl, { x: -0.5, y: 1.1 + i * 0.5, z: 0.42 }));
      }
      g.add(sph(0.22, gl, { y: 3.2, z: 0.42, ws: 10, hs: 8 }));
      obj.add(g, { mass: 2400, surf: 'clay', collider: { type: 'box', size: [1.6, 4.4, 0.8], offset: [0, 2.2, 0] } });
      // schwebende Bruchstücke
      const sh = new THREE.Group();
      sh.position.set(6.0, 5.6, 0);
      for (let i = 0; i < 3; i++) {
        const c = mk(new THREE.OctahedronGeometry(0.22 + i * 0.05, 0), stone, { x: Math.cos(i * 2.1) * 1.1, y: Math.sin(i * 1.7) * 0.3, z: Math.sin(i * 2.1) * 1.1, rx: i, rz: i * 2 });
        sh.add(c);
      }
      obj.add(sh, { mass: 8, collider: 'none', vanish: true });
      obj.anim.shards = sh;
      obj.anim.relicLight = true;
    }
    // Gerüst + Winde
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) obj.add(cyl(0.07, 0.08, 4.6, gray, { x: 6 + x * 2.6, y: 2.7, z: z * 2.6, radial: 6 }), { mass: 20, collider: 'none' });
    obj.add(box(5.4, 0.1, 0.12, gray, { x: 6, y: 4.9, z: 2.6 }), { mass: 20, collider: 'none' });
    obj.add(box(5.4, 0.1, 0.12, gray, { x: 6, y: 4.9, z: -2.6 }), { mass: 20, collider: 'none' });
    obj.add(box(0.12, 0.1, 5.4, gray, { x: 8.6, y: 4.9, z: 0 }), { mass: 20, collider: 'none' });
    obj.add(box(0.12, 0.1, 5.4, gray, { x: 3.4, y: 4.9, z: 0 }), { mass: 20, collider: 'none' });
    obj.add(strut([8.6, 4.9, 2.6], [10.0, 2.0, 2.6], 0.05, gray), { mass: 2, collider: 'none' });
    obj.add(tube([[6, 4.9, 2.6], [6.2, 3.6, 2.5], [6.3, 2.4, 2.4]], 0.02, dark, { segs: 10 }), { mass: 1, collider: 'none' });
    obj.add(box(0.6, 0.5, 0.6, rust, { x: 6.3, y: 2.2, z: 2.4, dmg: 0.02, seed: 4 }), { mass: 20, collider: 'none' });
    // Tisch mit Funden, Kisten
    obj.add(box(2.2, 0.08, 0.9, wood, { x: 9.6, y: 1.25, z: -3.0 }), { mass: 30, surf: 'wood', collider: 'none' });
    for (const s of [-1, 1]) obj.add(box(0.08, 0.85, 0.8, wood, { x: 9.6 + s * 1.0, y: 0.85, z: -3.0 }), { mass: 8, surf: 'wood', collider: 'none' });
    obj.add(box(2.3, 1.3, 1.0, wood, { x: 9.6, y: 1.05, z: -3.0 }), { mass: 60, surf: 'wood', collider: 'auto' });
    for (let i = 0; i < 4; i++) obj.add(sph(0.12 + rng() * 0.08, stone, { x: 9.0 + i * 0.4, y: 1.8, z: -3.0 + (rng() - 0.5) * 0.4, ws: 6, hs: 5, sy: 0.7 }), { mass: 1, collider: 'none' });
    for (let i = 0; i < 3; i++) obj.add(box(0.9, 0.7, 0.7, i % 2 ? olive : wood, { x: 3.2 + i * 1.0, y: 0.78, z: -5.2, ry: (rng() - 0.5) * 0.4, dmg: 0.01, seed: i }), { mass: 40, surf: 'wood', collider: { type: 'box', size: [0.9, 0.7, 0.7] } });
    // Mast + Schüssel
    obj.add(cyl(0.08, 0.1, 5.5, gray, { x: -9.4, y: 3.15, z: 2.0, radial: 6 }), { mass: 30, collider: 'none' });
    obj.add(sph(0.7, M.metal('white', { side: THREE.DoubleSide }), { x: -9.1, y: 5.3, z: 2.0, rx: -(Math.PI / 2 + 0.2), ry: 0.0, thetaLength: 1.1, ws: 16, hs: 6 }), { mass: 15, collider: 'none' });
    // Lampen
    obj.add(lampPost(4.2, gray, 0xfff0c8, 2.4, [3.2, 0.4, 2.8]), { mass: 15, collider: 'none' });
    const L1 = new THREE.PointLight(0xffb868, 18, 14, 2);
    L1.position.set(-4, 3.4, 2.2);
    obj.light(L1);
    if (p.relic) {
      const L2 = new THREE.PointLight(0xffb43a, 8 + p.glow * 14, 12, 2);
      L2.position.set(6, 3.4, 1.2);
      obj.light(L2);
    }
  },
  onFrame(obj, dt) {
    if (!alive(obj)) return;
    const a = obj.anim, t = obj.time;
    if (a.shards) {
      a.shards.rotation.y += dt * 0.6;
      a.shards.position.y = 5.6 + Math.sin(t * 1.1) * 0.18;
    }
    if (a.relicLight && obj.lights[1]) obj.lights[1].light.intensity = obj.lights[1].base * (0.85 + 0.15 * Math.sin(t * 1.6));
  },
};

/* ───────────────────────── Fackelturm ───────────────────────── */
export const torchTower = {
  id: 'torchTower',
  label: 'Fackelturm',
  category: CAT,
  tag: 'Licht',
  hint: 'Erhellt die Umgebung bei Nacht.',
  params: [
    { key: 'style', label: 'Bauart', type: 'select', options: [['pole', 'Mast'], ['tripod', 'Dreibein'], ['stone', 'Steinsockel']], value: 'pole' },
    { key: 'height', label: 'Höhe', type: 'range', min: 3, max: 9, step: 0.1, value: 6, unit: 'm' },
    { key: 'lit', label: 'Brennt', type: 'bool', value: true },
    { key: 'flame', label: 'Flammengröße', type: 'range', min: 0.5, max: 2.2, step: 0.05, value: 1.1 },
    { key: 'pal', label: 'Lack', type: 'select', options: PAL_OPTIONS, value: 'rust' },
    damageParam(0.35),
    seedParam(55),
  ],
  build(obj, p) {
    const rng = mulberry32(p.seed), dm = p.damage, H = p.height;
    const paint = M.metal(p.pal), gray = M.metal('gray'), dark = M.metal('black'), rust = M.metal('rust');
    const stone = M.clay('adobe'), conc = M.clay('white'), wood = M.wood(0xb89c76);
    obj.add(cyl(1.5, 1.7, 0.3, conc, { y: 0.15, radial: 14, dmg: dm * 0.04, seed: p.seed }), { mass: 900, surf: 'clay' });
    let topY = 0.3 + H;
    if (p.style === 'pole') {
      obj.add(cyl(0.12, 0.2, H, paint, { y: 0.3 + H / 2, radial: 10, hseg: 4, dmg: dm * 0.03, seed: p.seed + 1 }), { mass: 260 });
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.3;
        obj.add(strut([Math.sin(a) * 1.3, 0.3, Math.cos(a) * 1.3], [0, H * 0.55 + 0.3, 0], 0.04, dark), { mass: 6, collider: 'none' });
      }
      obj.add(ladder(H - 0.6, dark, { x: 0.0, y: 0.3, z: 0.25 }), { mass: 15, collider: 'none' });
    } else if (p.style === 'tripod') {
      const g = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.3;
        g.add(strut([Math.sin(a) * 1.3, 0.3, Math.cos(a) * 1.3], [Math.sin(a) * 0.25, 0.3 + H, Math.cos(a) * 0.25], 0.09, paint, 7));
      }
      for (const t of [0.35, 0.65]) {
        const w = 1.3 * (1 - t) + 0.25 * t;
        for (let i = 0; i < 3; i++) {
          const a0 = (i / 3) * Math.PI * 2 + 0.3, a1 = ((i + 1) / 3) * Math.PI * 2 + 0.3;
          g.add(strut([Math.sin(a0) * w, 0.3 + H * t, Math.cos(a0) * w], [Math.sin(a1) * w, 0.3 + H * t, Math.cos(a1) * w], 0.04, dark));
        }
      }
      obj.add(g, { mass: 400, surf: 'metal', collider: { type: 'cyl', r: 0.9, h: H, offset: [0, 0.3 + H / 2, 0] } });
    } else {
      obj.add(cyl(0.7, 1.15, H, stone, { y: 0.3 + H / 2, radial: 10, hseg: 4, dmg: dm * 0.06, seed: p.seed + 3 }), { mass: 1800, surf: 'clay' });
      obj.add(torus(0.75, 0.08, dark, { y: 0.3 + H * 0.92, rx: Math.PI / 2, ts: 14, rs: 5 }), { mass: 10, collider: 'none' });
    }
    // Feuerschale
    obj.add(cyl(0.75, 0.38, 0.55, rust, { y: topY + 0.28, radial: 14, open: false, dmg: dm * 0.03, seed: p.seed + 5 }), { mass: 60, collider: 'none' });
    obj.add(torus(0.75, 0.05, dark, { y: topY + 0.55, rx: Math.PI / 2, ts: 14, rs: 4 }), { mass: 5, collider: 'none' });
    obj.add(sph(0.6, M.glow(0xff5a1c, 1.5), { y: topY + 0.5, sy: 0.45, ws: 12, hs: 6 }), { mass: 1, collider: 'none' });
    for (let i = 0; i < 3; i++) obj.add(strut([Math.sin(i * 2.09) * 0.7, topY + 0.5, Math.cos(i * 2.09) * 0.7], [0, topY - 0.3, 0], 0.03, dark), { mass: 3, collider: 'none' });
    obj.anim.flameAt = [0, topY + 0.7, 0];
    obj.anim.topY = topY;
    // Brennstoff am Fuß
    for (let i = 0; i < 3; i++) obj.add(cyl(0.3, 0.3, 0.85, M.metal(i % 2 ? 'blue' : 'rust'), { x: 1.1 - i * 0.2, y: 0.75, z: 0.9 + i * 0.5, radial: 14, dmg: dm * 0.02, seed: 70 + i }), { mass: 35, surf: 'metal' });
    for (let i = 0; i < 4; i++) obj.add(cyl(0.07, 0.08, 1.0, wood, { x: -1.0 + i * 0.12, y: 0.55 + (i % 2) * 0.1, z: -0.4 - (i % 2) * 0.1, rz: Math.PI / 2 + (rng() - 0.5) * 0.4, ry: (rng() - 0.5) * 0.6, radial: 6 }), { mass: 4, surf: 'wood' });
    const L = new THREE.PointLight(0xff8a3a, 70, 32, 1.7);
    L.position.set(0, topY + 1.2, 0);
    obj.light(L);
  },
  onFrame(obj, dt) {
    if (!alive(obj)) return;
    const lit = obj.params.lit;
    const l = obj.lights[0];
    if (!lit) { if (l) l.light.intensity = 0; return; }
    flicker(obj, 0.34, 11);
    emit(obj, 'f', obj.anim.flameAt, dt, 16 * obj.params.flame, 'flame', obj.params.flame);
    emit(obj, 'sm', [0, obj.anim.topY + 1.9, 0], dt, 1.5 * obj.params.flame, 'smoke', 0.5);
  },
};
